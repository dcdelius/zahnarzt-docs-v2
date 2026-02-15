/**
 * Endo Playbook V2 Deviation Mode — Question Templates for Deviations
 *
 * ═══════════════════════════════════════════════════════════════
 * Question templates for handling deviations from standard endo plan:
 * - Partial negotiability
 * - Pain persists
 * - Cannot reach apex
 * - Re-medication despite planned obturation
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    QuestionSeverity,
    QuestionAnswerType,
} from '../../../contracts/questionEngineTypes';

import type {
    CanalId,
    EndoDeviationSignals,
    ExplainableQuestion,
} from './endoTypes';

// ═══════════════════════════════════════════════════════════════
// DEVIATION QUESTION IDs
// ═══════════════════════════════════════════════════════════════

export const DEVIATION_QUESTION_IDS = {
    CANAL_STATUS: 'Q_ENDO_CANAL_STATUS',
    WL_PER_CANAL: 'Q_ENDO_WL_PER_CANAL',
    ISO_PER_CANAL: 'Q_ENDO_ISO_PER_CANAL',
    LIMITATION_REASON: 'Q_ENDO_LIMITATION_REASON',
    WHY_NO_OBTURATION: 'Q_ENDO_WHY_NO_OBTURATION',
    MEDICATION_USED: 'Q_ENDO_MEDICATION_USED',
    NEXT_VISIT_PLAN: 'Q_ENDO_NEXT_VISIT_PLAN',
} as const;

// ═══════════════════════════════════════════════════════════════
// DEVIATION QUESTION TEMPLATES
// ═══════════════════════════════════════════════════════════════

export interface DeviationQuestionTemplate {
    id: string;
    title: string;
    prompt: string;
    severity: QuestionSeverity;
    answerType: QuestionAnswerType;
    options?: string[];
    order: number;
    tableSchema?: { columns: string[] };
    condition: (signals: EndoDeviationSignals) => boolean;
    buildReason: (signals: EndoDeviationSignals) => string;
    buildEvidence: (signals: EndoDeviationSignals) => string[];
}

/**
 * Canal Status Question - Confirm negotiability per canal
 */
export const Q_CANAL_STATUS: DeviationQuestionTemplate = {
    id: DEVIATION_QUESTION_IDS.CANAL_STATUS,
    title: 'Kanalstatus bestätigen',
    prompt: 'Bitte Kanalstatus bestätigen: Welche Kanäle sind bis Apex passierbar?',
    severity: 'required',
    answerType: 'perCanalTable',
    order: 15,
    tableSchema: {
        columns: ['canal', 'negotiableToApex', 'limitationReason', 'reachedLengthMm'],
    },
    condition: (signals) => {
        // Ask if partial negotiability flag or any canal with unknown status
        if (signals.deviationFlags.some(f => f.type === 'PARTIAL_NEGOTIABILITY')) return true;
        return Array.from(signals.canalStates.values()).some(c => c.negotiableToApex === null);
    },
    buildReason: () => 'Teilweise nicht passierbare Kanäle erkannt - Status bestätigen.',
    buildEvidence: (signals) => {
        const evidence: string[] = [];
        const partialFlag = signals.deviationFlags.find(f => f.type === 'PARTIAL_NEGOTIABILITY');
        if (partialFlag) evidence.push(...partialFlag.evidence);
        return evidence;
    },
};

/**
 * Working Length per Canal - Ask when WL missing for negotiable canals
 */
export const Q_WL_PER_CANAL: DeviationQuestionTemplate = {
    id: DEVIATION_QUESTION_IDS.WL_PER_CANAL,
    title: 'Arbeitslängen pro Kanal',
    prompt: 'Bitte Arbeitslängen für passierbare Kanäle angeben.',
    severity: 'required',
    answerType: 'perCanalTable',
    order: 20,
    tableSchema: { columns: ['canal', 'workingLengthMm'] },
    condition: (signals) => {
        // Ask if any negotiable canal is missing WL
        return Array.from(signals.canalStates.values()).some(
            c => c.negotiableToApex === true && !c.workingLengthMm
        );
    },
    buildReason: () => 'Arbeitslängen für passierbare Kanäle fehlen.',
    buildEvidence: (signals) => {
        const missing = Array.from(signals.canalStates.entries())
            .filter(([, c]) => c.negotiableToApex === true && !c.workingLengthMm)
            .map(([canalId]) => `${canalId}: WL fehlt`);
        return missing;
    },
};

/**
 * ISO per Canal - Ask when instrumentation performed but ISO missing
 */
export const Q_ISO_PER_CANAL: DeviationQuestionTemplate = {
    id: DEVIATION_QUESTION_IDS.ISO_PER_CANAL,
    title: 'Apikale ISO-Größe pro Kanal',
    prompt: 'Bitte apikale Aufbereitungsgröße für aufbereitete Kanäle angeben.',
    severity: 'required',
    answerType: 'perCanalTable',
    order: 25,
    tableSchema: { columns: ['canal', 'fileIso', 'fileTaper'] },
    condition: (signals) => {
        const hasInstrumentation = signals.outcome?.performedSteps.has('instrumentation');
        if (!hasInstrumentation) return false;
        // Ask if any canal with WL is missing ISO
        return Array.from(signals.canalStates.values()).some(
            c => c.workingLengthMm && !c.fileIso
        );
    },
    buildReason: () => 'Aufbereitung durchgeführt, aber ISO-Größen fehlen.',
    buildEvidence: (signals) => {
        const missing = Array.from(signals.canalStates.entries())
            .filter(([, c]) => c.workingLengthMm && !c.fileIso)
            .map(([canalId]) => `${canalId}: ISO fehlt`);
        return missing;
    },
};

/**
 * Limitation Reason - Ask for canals not negotiable to apex
 */
export const Q_LIMITATION_REASON: DeviationQuestionTemplate = {
    id: DEVIATION_QUESTION_IDS.LIMITATION_REASON,
    title: 'Grund für Limitation',
    prompt: 'Warum konnte der Kanal nicht bis zum Apex erreicht werden?',
    severity: 'required',
    answerType: 'select',
    options: ['Kalzifiziert/Obliteriert', 'Stufe/Ledge', 'Blockiert', 'Starke Krümmung', 'Instrumentenseparation', 'Andere'],
    order: 18,
    condition: (signals) => {
        // Ask if any canal not negotiable but missing reason
        return Array.from(signals.canalStates.values()).some(
            c => c.negotiableToApex === false && !c.limitationReason
        );
    },
    buildReason: () => 'Kanal nicht bis Apex - Grund dokumentieren.',
    buildEvidence: (signals) => {
        const affected = Array.from(signals.canalStates.entries())
            .filter(([, c]) => c.negotiableToApex === false && !c.limitationReason)
            .map(([canalId, c]) => c.evidence || `${canalId}: nicht passierbar`);
        return affected;
    },
};

/**
 * Why No Obturation - Ask when obturation was planned but not performed
 */
export const Q_WHY_NO_OBTURATION: DeviationQuestionTemplate = {
    id: DEVIATION_QUESTION_IDS.WHY_NO_OBTURATION,
    title: 'Grund: Keine Obturation',
    prompt: 'Warum wurde die geplante Wurzelfüllung nicht durchgeführt?',
    severity: 'required',
    answerType: 'select',
    options: ['Schmerzen/Symptome', 'Exsudat', 'Trockenlegung nicht möglich', 'Zeitmangel', 'Andere'],
    order: 50,
    condition: (signals) => {
        return signals.deviationFlags.some(
            f => f.type === 'NO_OBTURATION_DESPITE_PLAN' || f.type === 'PAIN_PERSISTENT'
        );
    },
    buildReason: () => 'Geplante Obturation nicht durchgeführt.',
    buildEvidence: (signals) => {
        const flag = signals.deviationFlags.find(
            f => f.type === 'NO_OBTURATION_DESPITE_PLAN' || f.type === 'PAIN_PERSISTENT'
        );
        return flag?.evidence || [];
    },
};

/**
 * Medication Used - Confirm medicament when re-medication detected
 */
export const Q_MEDICATION_USED: DeviationQuestionTemplate = {
    id: DEVIATION_QUESTION_IDS.MEDICATION_USED,
    title: 'Medikament verwendet',
    prompt: 'Welches Medikament wurde eingebracht?',
    severity: 'required',
    answerType: 'select',
    options: ['CaOH2', 'Ledermix', 'ChKM', 'Andere'],
    order: 55,
    condition: (signals) => {
        const hasReMedication = signals.deviationFlags.some(f => f.type === 'RE_MEDICATION');
        const hasPerformedMed = signals.outcome?.performedSteps.has('medication');
        // Ask if re-medication detected but medicament type unclear
        return hasReMedication && hasPerformedMed;
    },
    buildReason: () => 'Erneute Einlage - Medikament bestätigen.',
    buildEvidence: (signals) => {
        const flag = signals.deviationFlags.find(f => f.type === 'RE_MEDICATION');
        return flag?.evidence || [];
    },
};

/**
 * Next Visit Plan - Recommended question for deviation cases
 */
export const Q_NEXT_VISIT_PLAN: DeviationQuestionTemplate = {
    id: DEVIATION_QUESTION_IDS.NEXT_VISIT_PLAN,
    title: 'Plan für nächsten Termin',
    prompt: 'Was ist für den nächsten Termin geplant?',
    severity: 'recommended',
    answerType: 'select',
    options: ['Erneuter Versuch Passage', 'Partielle Obturation', 'Vollständige Obturation', 'Überweisung', 'Kontrolle', 'Andere'],
    order: 60,
    condition: (signals) => {
        // Recommend if any deviation was detected
        return signals.deviationMode;
    },
    buildReason: () => 'Abweichung vom Standardplan - nächste Schritte dokumentieren.',
    buildEvidence: (signals) => {
        const types = signals.deviationFlags.map(f => f.type);
        return types.length > 0 ? [`Erkannte Abweichungen: ${types.join(', ')}`] : [];
    },
};

// ═══════════════════════════════════════════════════════════════
// ALL DEVIATION QUESTIONS (ordered)
// ═══════════════════════════════════════════════════════════════

export const DEVIATION_QUESTIONS: DeviationQuestionTemplate[] = [
    Q_CANAL_STATUS,
    Q_LIMITATION_REASON,
    Q_WL_PER_CANAL,
    Q_ISO_PER_CANAL,
    Q_WHY_NO_OBTURATION,
    Q_MEDICATION_USED,
    Q_NEXT_VISIT_PLAN,
].sort((a, b) => a.order - b.order);

// ═══════════════════════════════════════════════════════════════
// EVALUATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate which deviation questions to ask based on signals.
 * Returns ExplainableQuestion[] with reason and evidence.
 */
export function evaluateDeviationQuestions(
    signals: EndoDeviationSignals
): ExplainableQuestion[] {
    const questions: ExplainableQuestion[] = [];

    for (const template of DEVIATION_QUESTIONS) {
        if (template.condition(signals)) {
            const canals = signals.detectedCanals;
            questions.push({
                id: template.id,
                title: template.title,
                prompt: template.prompt,
                severity: template.severity,
                answerType: template.answerType,
                options: template.options,
                order: template.order,
                reason: template.buildReason(signals),
                evidence: template.buildEvidence(signals),
                canals: canals.length > 0 ? canals : undefined,
                tableSchema: template.tableSchema,
            });
        }
    }

    return questions;
}

export default {
    DEVIATION_QUESTION_IDS,
    DEVIATION_QUESTIONS,
    evaluateDeviationQuestions,
};
