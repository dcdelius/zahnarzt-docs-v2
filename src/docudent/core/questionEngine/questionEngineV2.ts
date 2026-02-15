/**
 * Question Engine V2 — Enhanced Deterministic Question Generation
 *
 * ═══════════════════════════════════════════════════════════════
 * V2 adds:
 * - T1/T2/T3 phase support
 * - Apical ISO size questions
 * - Enhanced visit-aware logic
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
    endoPlaybookV2,
    ENDO_QUESTIONS_BY_PHASE_V2,
    PLAYBOOK_VERSION,
    PLAYBOOK_ID,
    type QuestionTemplate,
} from '../playbooks/endo/endoPlaybookV2';

// ═══════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════

export const ENGINE_VERSION = '2.0.0';

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE FUNCTION (V2)
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate dictation and generate questions (V2).
 * Deterministic: same input => same output.
 */
export function evaluateQuestionsV2(input: EngineInput): EngineOutput {
    // 1. Parse signals from dictation
    const signals = parseEndoSignals(input.dictationText);

    // 2. Determine phase
    const phase = signals.phase || input.visit.phase;

    // 3. Build detected facts
    const detected = buildDetectedFacts(signals);

    // 4. Get applicable questions for this phase (common + phase-specific)
    const commonQuestions = ENDO_QUESTIONS_BY_PHASE_V2.common || [];
    const phaseQuestions = ENDO_QUESTIONS_BY_PHASE_V2[phase] || [];
    const allTemplates = [...commonQuestions, ...phaseQuestions];

    // 5. Evaluate which questions to ask
    const { questions, missing } = evaluatePhaseQuestions(allTemplates, signals, input.settings);

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

    if (signals.kofferdamNotPossible) {
        facts.push({ field: 'kofferdamNotPossible', value: true, evidence: 'Kein Kofferdam möglich' });
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

    // V2: Apical sizes
    if (signals.apicalSizes && signals.apicalSizes.length > 0) {
        const sizes = signals.apicalSizes
            .map(s => `${s.canal}: ISO ${s.iso}${s.taper ? `/${s.taper}` : ''}`)
            .join(', ');
        facts.push({ field: 'apicalSizes', value: signals.apicalSizes, evidence: sizes });
    }

    // V2: Canal labels
    if (signals.canalLabels && signals.canalLabels.length > 0) {
        facts.push({
            field: 'canalLabels',
            value: signals.canalLabels,
            evidence: `Kanäle: ${signals.canalLabels.join(', ')}`,
        });
    }

    // V2: Obturation technique
    if (signals.obturationTechnique) {
        facts.push({
            field: 'obturationTechnique',
            value: signals.obturationTechnique,
            evidence: `Obturation: ${signals.obturationTechnique}`,
        });
    }

    // V2: Sealer type
    if (signals.sealerTypeClass) {
        facts.push({
            field: 'sealerTypeClass',
            value: signals.sealerTypeClass,
            evidence: `Sealer: ${signals.sealerTypeClass}`,
        });
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
            ? template.askCondition(signals)
            : true;

        if (!shouldAsk) {
            continue; // Signal already present, skip question
        }

        // Check settings override
        if (shouldSkipBasedOnSettings(template, settings)) {
            continue;
        }

        // Add to missing fields
        missing.push({
            field: template.field,
            severity: template.severity,
            phase: template.phase === 'common' ? 't2' : template.phase as EndoPhase,
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
    const endoSettings = settings.endo as Record<string, unknown> | undefined;
    if (!endoSettings) return false;

    const defaults = endoSettings.defaults as Record<string, unknown> | undefined;
    if (!defaults) return false;

    // If field has a default value in settings and it's not "fragen", skip
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
 * Create engine input from raw dictation (for testing)
 */
export function createEngineInputV2(
    dictationText: string,
    phase: EndoPhase = 't2',
    settings: Record<string, unknown> = {}
): EngineInput {
    const signals = parseEndoSignals(dictationText);
    const visitNumber = signals.visitNumber || (phase === 't1' ? 1 : phase === 't2' ? 2 : 3);

    return {
        treatmentId: 'endo',
        visit: { number: visitNumber as 1 | 2 | 3, phase },
        dictationText,
        extracted: signals,
        settings,
    };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    evaluateQuestionsV2,
    createEngineInputV2,
    ENGINE_VERSION,
};
