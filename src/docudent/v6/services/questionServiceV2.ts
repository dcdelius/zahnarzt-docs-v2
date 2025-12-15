/**
 * V6 Question Service V2 — PURE ORCHESTRATOR
 *
 * RULES:
 * 1. NO hardcoded texts, options, or emojis in TS
 * 2. NO FIELD_QUESTION_MAP
 * 3. NO price logic, no BEMA/GOZ
 * 4. ALL question semantics come from QuestionBank (JSON)
 * 5. Uses Engine/ChipResolver for what to ask, QuestionBank for how to ask
 *
 * SSOT FLOW:
 * Rules → RequiredFields → QuestionBank → DynamicQuestion[]
 */

import type { DynamicQuestion, QuestionOption } from '../../contracts/questions';
import type { ExtractedDataV2, Field } from '../../contracts/extraction';
import {
    getQuestionDef,
    getQuestionDefOrNull,
    getQuestionsByCategory,
    getAllQuestionKeys,
    type QuestionDefinition
} from '../../core/billing/knowledgeBase/questions/questionBank';
import { getTreatmentChips } from '../../core/billing/knowledgeBase/logic/treatmentEngine';
import { inferChipsFromExtractedData } from '../../core/billing/knowledgeBase/logic/chipResolver';
import { getRequiredFieldsFromRules } from '../../core/billing/knowledgeBase/logic/ruleQuestionTrigger';
import { deriveDiagnosis } from '../../core/billing/knowledgeBase/logic/diagnosisDerivation';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';

export interface QuestionContext {
    treatmentId: string;
    insuranceType: InsuranceType;
    hasMKV: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Convert QuestionDefinition -> DynamicQuestion
// ═══════════════════════════════════════════════════════════════

function definitionToQuestion(
    def: QuestionDefinition,
    category: DynamicQuestion['category'],
    idPrefix: string
): DynamicQuestion {
    const options: QuestionOption[] = (def.options || []).map(o => ({
        id: o.id,
        label: o.label,
        dataValue: o.dataValue,
        chipActivation: o.chipActivation
    }));

    return {
        id: `${idPrefix}_${def.key}`,
        questionKey: def.key,
        category,
        question: def.prompt,
        type: def.type,
        options,
        dataField: def.dataField,
        // Number-specific
        min: def.min,
        max: def.max,
        step: def.step,
        unit: def.unit,
        presets: def.presets
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Check if field is missing in extracted data
// ═══════════════════════════════════════════════════════════════

function isFieldMissing(extracted: ExtractedDataV2, fieldPath: string): boolean {
    const parts = fieldPath.split('.');
    let current: unknown = extracted;

    for (const part of parts) {
        if (current === null || current === undefined) return true;
        if (typeof current !== 'object') return true;
        current = (current as Record<string, unknown>)[part];
    }

    // Check if it's a Field<T> with null value or needsConfirmation
    if (current && typeof current === 'object' && 'value' in current) {
        const field = current as Field<unknown>;
        return field.value === null || field.needsConfirmation;
    }

    return current === null || current === undefined;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Convert ExtractedDataV2 to legacy format
// ═══════════════════════════════════════════════════════════════

function convertToLegacyExtracted(v2: ExtractedDataV2): Record<string, unknown> {
    // Derive diagnosis from keyword flags (SSOT: Engine derives, Extraction extracts)
    const derivedDiagnosis = v2.keywordFlags
        ? deriveDiagnosis(v2.keywordFlags).label
        : null;

    return {
        tooth: v2.tooth?.value ?? null,
        surfaces: v2.surfaces?.value ?? [],
        diagnosis: derivedDiagnosis,  // Derived, not extracted
        costs: v2.costs?.value ?? null,
        mentioned: {
            vitality: v2.mentioned?.vitality?.value,
            percussion: v2.mentioned?.percussion?.value,
            kofferdam: v2.mentioned?.kofferdam?.value,
            tiefe: v2.mentioned?.tiefe?.value,
            anesthesia: v2.mentioned?.anesthesia?.value,
            capping: v2.mentioned?.capping?.value,
            material: v2.mentioned?.material?.value
        },
        gaps: []
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN: Generate Questions (Pure Orchestrator)
// ═══════════════════════════════════════════════════════════════

/**
 * generateQuestionsV2 - Pure orchestrator
 *
 * Pipeline:
 * A. Get active chips from extracted data (via ChipResolver)
 * B. Get rule-triggered questions (SSOT: Rules → Field → Question)
 * C. Fallback: category-based forensic questions (backwards compat)
 * D. Get MKV-specific questions (if MKV context)
 * E. Get upsell questions (if MKV or PKV)
 * F. Sort by category priority
 */
export function generateQuestionsV2(
    extracted: ExtractedDataV2,
    context: QuestionContext
): DynamicQuestion[] {
    const { treatmentId, insuranceType, hasMKV } = context;
    const questions: DynamicQuestion[] = [];
    const addedKeys = new Set<string>();

    console.log('[QuestionService V2] Generating questions for:', { treatmentId, insuranceType, hasMKV });

    // ═══════════════════════════════════════════════════════════════
    // STEP A: Infer active chips from extracted data
    // ═══════════════════════════════════════════════════════════════

    let activeChipIds: string[] = [];
    try {
        const legacyExtracted = convertToLegacyExtracted(extracted);
        activeChipIds = inferChipsFromExtractedData(treatmentId, legacyExtracted, { hasMKV, insuranceType });
    } catch (e) {
        console.warn('[QuestionService V2] ChipResolver failed:', e);
    }

    console.log('[QuestionService V2] Active chips:', activeChipIds);

    // ═══════════════════════════════════════════════════════════════
    // STEP B: Rule-triggered questions (SSOT: Rules → Field → Question)
    // ═══════════════════════════════════════════════════════════════

    const requiredFields = getRequiredFieldsFromRules(
        treatmentId,
        activeChipIds,
        extracted,
        insuranceType,
        hasMKV
    );

    for (const required of requiredFields) {
        const def = getQuestionDefOrNull(treatmentId, required.questionKey);
        if (def && !addedKeys.has(def.key)) {
            const question = definitionToQuestion(def, 'rule', 'rule');
            // Add rule metadata
            question.ruleId = required.ruleId;
            question.riskLevel = required.riskLevel;
            question.regressRisk = required.regressRisk;
            questions.push(question);
            addedKeys.add(def.key);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP C: Fallback - Category-based forensic questions
    // (for backwards compatibility, until all have rules)
    // ═══════════════════════════════════════════════════════════════

    const forensicDefs = getQuestionsByCategory(treatmentId, 'forensic');

    for (const def of forensicDefs) {
        if (def.dataField && isFieldMissing(extracted, def.dataField)) {
            if (!addedKeys.has(def.key)) {
                questions.push(definitionToQuestion(def, 'forensic', 'forensic'));
                addedKeys.add(def.key);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP D: MKV-specific questions
    // ═══════════════════════════════════════════════════════════════

    if (hasMKV) {
        const mkvDefs = getQuestionsByCategory(treatmentId, 'mkv');

        for (const def of mkvDefs) {
            if (!addedKeys.has(def.key)) {
                const question = definitionToQuestion(def, 'mkv', 'mkv');

                // Pre-fill mkv_betrag if costs were extracted
                if (def.key === 'mkv_betrag' && extracted.costs?.value !== null) {
                    question.defaultValue = extracted.costs.value;
                }

                questions.push(question);
                addedKeys.add(def.key);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP E: Upsell questions (if MKV or PKV)
    // ═══════════════════════════════════════════════════════════════

    if (hasMKV || insuranceType === 'PKV') {
        const allChips = getTreatmentChips(treatmentId);
        const upsellChips = allChips.filter(c => c.upsellCandidate && !activeChipIds.includes(c.id));

        for (const chip of upsellChips) {
            const questionKey = chip.questionKey || chip.id;
            const def = getQuestionDefOrNull(treatmentId, questionKey);

            if (def && !addedKeys.has(def.key)) {
                questions.push(definitionToQuestion(def, 'upsell', 'upsell'));
                addedKeys.add(def.key);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP F: Sort by category priority
    // ═══════════════════════════════════════════════════════════════

    const categoryOrder: Record<DynamicQuestion['category'], number> = {
        rule: 1,      // Rule-triggered first (highest priority)
        forensic: 2,  // Forensic second
        mkv: 3,
        upsell: 4
    };

    questions.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

    console.log('[QuestionService V2] Generated questions:', questions.map(q => q.id));

    return questions;
}

// Re-export for tests
export { getAllQuestionKeys, getQuestionDef };
