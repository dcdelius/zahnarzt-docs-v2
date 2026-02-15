/**
 * Askback → DynamicQuestion Compiler
 *
 * Compiles medical askbacks (from engine) into DynamicQuestions (for UI).
 * Adds explainability meta: ruleId, sourceRefs, scope.
 */

import type { DynamicQuestion, QuestionOption } from '../../../contracts/questions';
import { getQuestionByKey, type QuestionBankEntry } from './questionBankAdapter';
import {
    getToothFromScopedId,
    stripToothScope,
} from '../../../medical_kb/engine/applyMedicalKb';
import { medicalKb } from '../../../medical_kb';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AskbackWithMeta {
    /** Askback ID (may be scoped, e.g., medical_ueberkappung::tooth:16) */
    id: string;
    /** Rule ID that triggered this askback */
    ruleId: string;
    /** Required or optional */
    required: boolean;
}

export interface CompiledQuestionBundle {
    /** Required questions (MUST answer) */
    required: DynamicQuestion[];
    /** Optional questions (SHOULD answer) */
    optional: DynamicQuestion[];
}

export interface CompileInput {
    /** Askbacks with metadata from engine */
    askbacks: {
        required: AskbackWithMeta[];
        optional: AskbackWithMeta[];
    };
    /** Treatment ID for question bank lookup */
    treatmentId: string;
    /** Optional defaults to apply */
    defaults?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// CANONICAL KEY MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Map medical askback ID to question bank canonical key.
 * Strips "medical_" prefix and any tooth scope.
 *
 * @example 'medical_ueberkappung::tooth:16' → 'ueberkappung'
 * @example 'medical_hemostasis' → 'hemostasis'
 */
function askbackIdToQuestionKey(askbackId: string): string {
    // Strip tooth scope first
    const baseId = stripToothScope(askbackId);

    // Strip "medical_" prefix if present
    if (baseId.startsWith('medical_')) {
        return baseId.slice('medical_'.length);
    }

    return baseId;
}

// ═══════════════════════════════════════════════════════════════
// SOURCE REF LOOKUP
// ═══════════════════════════════════════════════════════════════

interface SourceRefMeta {
    id: string;
    note?: string;
}

/**
 * Get source refs for an askback from medical KB.
 */
function getSourceRefsForAskback(askbackId: string): SourceRefMeta[] {
    const baseId = stripToothScope(askbackId);

    // Look up askback definition in medical KB
    const askbackDef = medicalKb.askbacks.find(a => a.id === baseId);
    if (askbackDef?.sourceRefs) {
        return askbackDef.sourceRefs.map(ref => ({
            id: ref.anchorId,
            note: ref.note,
        }));
    }

    // Fall back to rule's source refs if askback not found
    const rule = medicalKb.rules.find(r =>
        r.then.some(a =>
            (a.type === 'require_askback') &&
            a.target === baseId
        )
    );
    if (rule?.sourceRefs) {
        return rule.sourceRefs.map(ref => ({
            id: ref.anchorId,
            note: ref.note,
        }));
    }

    return [];
}

// ═══════════════════════════════════════════════════════════════
// COMPILER
// ═══════════════════════════════════════════════════════════════

/**
 * Compile askbacks to DynamicQuestions.
 *
 * @throws Error if an askback cannot be resolved to a question
 */
export function compileAskbacksToQuestions(input: CompileInput): CompiledQuestionBundle {
    const { askbacks, treatmentId, defaults } = input;

    const required = askbacks.required.map(ab =>
        compileOneAskback(ab, treatmentId, true, defaults)
    );

    const optional = askbacks.optional.map(ab =>
        compileOneAskback(ab, treatmentId, false, defaults)
    );

    // Sort deterministically: by id (canonical, then scoped)
    required.sort((a, b) => a.id.localeCompare(b.id));
    optional.sort((a, b) => a.id.localeCompare(b.id));

    return { required, optional };
}

/**
 * Compile a single askback to a DynamicQuestion.
 */
function compileOneAskback(
    askback: AskbackWithMeta,
    treatmentId: string,
    required: boolean,
    defaults?: Record<string, unknown>
): DynamicQuestion {
    const questionKey = askbackIdToQuestionKey(askback.id);
    const tooth = getToothFromScopedId(askback.id);
    const sourceRefs = getSourceRefsForAskback(askback.id);

    // Look up in question bank
    const qbEntry = getQuestionByKey(treatmentId, questionKey);

    if (!qbEntry) {
        // Log the issue but don't crash — return fallback question
        const warning = `Askback "${askback.id}" (key: "${questionKey}") not found in question_bank.json for treatment "${treatmentId}"`;
        console.warn('[ASKBACK COMPILER]', warning);

        // Return minimal fallback question that can be answered
        return {
            id: askback.id,
            questionKey,
            category: 'medical',
            question: `${questionKey}?`, // Simple prompt without [MISSING] prefix
            type: 'single',
            options: [
                { id: 'yes', label: 'Ja', dataValue: true },
                { id: 'no', label: 'Nein', dataValue: false },
            ],
            ruleId: askback.ruleId,
            medicalSeverity: required ? 'hard' : 'soft',
        };
    }

    // Build question from QB entry
    const question: DynamicQuestion = {
        id: askback.id,
        questionKey,
        category: 'medical',
        question: formatQuestionWithScope(qbEntry.prompt, tooth),
        type: qbEntry.type || 'single',
        options: qbEntry.options,
        ruleId: askback.ruleId,
        medicalSeverity: required ? 'hard' : 'soft',
        dataField: qbEntry.dataField,
    };

    // Apply default answer if available
    const defaultKey = questionKey;
    if (defaults?.[defaultKey] !== undefined) {
        question.answered = defaults[defaultKey];
    }

    // Attach explainability meta (via extension)
    (question as any).meta = {
        ruleId: askback.ruleId,
        sourceRefs,
        scope: tooth ? { tooth } : undefined,
    };

    return question;
}

/**
 * Format question text with tooth scope if present.
 */
function formatQuestionWithScope(prompt: string, tooth: string | null): string {
    if (!tooth) return prompt;

    // Prepend tooth number for clarity
    return `[Zahn ${tooth}] ${prompt}`;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS FOR PIPELINE INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Convert engine trace to AskbackWithMeta format.
 */
export function engineTraceToAskbackMeta(
    trace: {
        requiredAskbacks: Array<{ id: string; ruleId: string }>;
    },
    optionalAskbacks: string[] = []
): {
    required: AskbackWithMeta[];
    optional: AskbackWithMeta[];
} {
    // TODO: Engine currently doesn't track ruleId for optional askbacks
    // For now, use "unknown" as placeholder
    const optional: AskbackWithMeta[] = optionalAskbacks.map(id => ({
        id,
        ruleId: 'unknown',
        required: false,
    }));

    const required: AskbackWithMeta[] = trace.requiredAskbacks.map(ab => ({
        id: ab.id,
        ruleId: ab.ruleId,
        required: true,
    }));

    return { required, optional };
}
