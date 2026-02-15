/**
 * Question Engine V1 — Deterministic Question Generation
 *
 * ═══════════════════════════════════════════════════════════════
 * Evaluates dictation signals against playbook requirements
 * and generates minimal, necessary questions.
 *
 * Deterministic: same inputs => same questions (order + IDs stable)
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    EngineInput,
    EngineOutput,
    EngineQuestion,
    DetectedFact,
    MissingField,
    EndoExtractedSignals,
    EndoPhase,
} from '../../contracts/questionEngineTypes';

import { parseEndoSignals } from '../playbooks/endo/endoSignalParser';
import {
    endoPlaybookV1,
    ENDO_QUESTIONS_BY_PHASE,
    PLAYBOOK_VERSION,
    PLAYBOOK_ID,
    type QuestionTemplate,
} from '../playbooks/endo/endoPlaybookV1';

// ═══════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════

export const ENGINE_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate dictation and generate questions.
 * Deterministic: same input => same output.
 *
 * @param input - Engine input with treatment, visit, dictation, and settings
 * @returns Questions, detected facts, and missing fields
 */
export function evaluateQuestions(input: EngineInput): EngineOutput {
    // 1. Parse signals from dictation (if not already parsed)
    const signals = input.extracted.tooth ? input.extracted : parseEndoSignals(input.dictationText);

    // 2. Determine phase
    const phase = signals.phase || input.visit.phase;

    // 3. Build detected facts
    const detected = buildDetectedFacts(signals);

    // 4. Get applicable questions for this phase
    const phaseQuestions = ENDO_QUESTIONS_BY_PHASE[phase] || [];

    // 5. Evaluate which questions to ask
    const { questions, missing } = evaluatePhaseQuestions(phaseQuestions, signals, input.settings);

    // 6. Sort questions by order
    questions.sort((a, b) => a.order - b.order);

    return {
        questions,
        detected,
        missing,
        version: {
            playbookVersionId: PLAYBOOK_ID,
            engineVersion: ENGINE_VERSION,
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Build list of detected facts from signals (for observability)
 */
function buildDetectedFacts(signals: EndoExtractedSignals): DetectedFact[] {
    const facts: DetectedFact[] = [];

    if (signals.tooth) {
        facts.push({ field: 'tooth', value: signals.tooth, evidence: `Zahn ${signals.tooth}` });
    }

    if (signals.visitNumber) {
        facts.push({ field: 'visitNumber', value: signals.visitNumber, evidence: `Termin ${signals.visitNumber}` });
    }

    if (signals.phase) {
        facts.push({ field: 'phase', value: signals.phase, evidence: `Phase: ${signals.phase}` });
    }

    if (signals.kofferdam) {
        facts.push({ field: 'kofferdam', value: true, evidence: 'Kofferdam angelegt' });
    }

    if (signals.medicament) {
        facts.push({ field: 'medicament', value: signals.medicament, evidence: `Medikament: ${signals.medicament}` });
    }

    if (signals.irrigationSolutions.length > 0) {
        facts.push({
            field: 'irrigationSolutions',
            value: signals.irrigationSolutions,
            evidence: `Spülung: ${signals.irrigationSolutions.join(', ')}`,
        });
    }

    if (signals.workingLengthsByCanal) {
        const lengths = Object.entries(signals.workingLengthsByCanal)
            .map(([canal, len]) => `${canal}: ${len}mm`)
            .join(', ');
        facts.push({ field: 'workingLengthsByCanal', value: signals.workingLengthsByCanal, evidence: lengths });
    }

    if (signals.workingLengthMethod) {
        facts.push({ field: 'workingLengthMethod', value: signals.workingLengthMethod, evidence: `Methode: ${signals.workingLengthMethod}` });
    }

    if (signals.instrumentationMode) {
        facts.push({ field: 'instrumentationMode', value: signals.instrumentationMode, evidence: `Aufbereitung: ${signals.instrumentationMode}` });
    }

    return facts;
}

/**
 * Evaluate which questions need to be asked based on signals
 */
function evaluatePhaseQuestions(
    templates: QuestionTemplate[],
    signals: EndoExtractedSignals,
    settings: Record<string, unknown>
): { questions: EngineQuestion[]; missing: MissingField[] } {
    const questions: EngineQuestion[] = [];
    const missing: MissingField[] = [];

    for (const template of templates) {
        // Check if question should be asked based on condition
        const shouldAsk = template.askCondition
            ? template.askCondition(signals as unknown as Record<string, unknown>)
            : true;

        if (!shouldAsk) {
            continue; // Signal already present, skip question
        }

        // Check settings override (e.g., if settings say "always NaOCl+EDTA", skip irrigation question)
        if (shouldSkipBasedOnSettings(template, settings)) {
            continue;
        }

        // Add to missing fields
        missing.push({
            field: template.field,
            severity: template.severity,
            phase: template.phase,
        });

        // Generate question
        questions.push({
            id: template.id,
            title: template.title,
            prompt: template.prompt,
            rationale: template.rationale,
            severity: template.severity,
            answerType: template.answerType,
            options: template.options,
            fieldsWritten: template.fieldsWritten,
            order: template.order,
        });
    }

    return { questions, missing };
}

/**
 * Check if a question should be skipped based on settings
 */
function shouldSkipBasedOnSettings(
    template: QuestionTemplate,
    settings: Record<string, unknown>
): boolean {
    // Check for settings-based auto-fill (e.g., endo.defaults.spuelprotokoll = 'naocl_edta')
    const endoSettings = settings.endo as Record<string, unknown> | undefined;
    if (!endoSettings) return false;

    const defaults = endoSettings.defaults as Record<string, unknown> | undefined;
    if (!defaults) return false;

    // If field has a default value in settings, skip the question
    if (template.field === 'irrigation' && defaults.spuelprotokoll && defaults.spuelprotokoll !== 'fragen') {
        return true;
    }

    if (template.field === 'instrumentationMode' && defaults.aufbereitung && defaults.aufbereitung !== 'fragen') {
        return true;
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPER
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate questions from raw dictation (parses signals internally)
 */
export function evaluateQuestionsFromDictation(
    dictationText: string,
    phase: EndoPhase = 't2',
    settings: Record<string, unknown> = {}
): EngineOutput {
    const signals = parseEndoSignals(dictationText);
    const visitNumber = signals.visitNumber || (phase === 't1' ? 1 : phase === 't2' ? 2 : 3);

    return evaluateQuestions({
        treatmentId: 'endo',
        visit: { number: visitNumber as 1 | 2 | 3, phase },
        dictationText,
        extracted: signals,
        settings,
    });
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    evaluateQuestions,
    evaluateQuestionsFromDictation,
    ENGINE_VERSION,
};
