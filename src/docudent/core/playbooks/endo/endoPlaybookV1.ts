/**
 * Endo Playbook V1 — SSOT for Endo Treatment Questions
 *
 * ═══════════════════════════════════════════════════════════════
 * Defines phases, required fields, and question templates for
 * endodontic treatment documentation.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    EndoPhase,
    QuestionSeverity,
    QuestionAnswerType,
} from '../../../contracts/questionEngineTypes';

// ═══════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════

export const PLAYBOOK_VERSION = '1.0.0';
export const PLAYBOOK_ID = 'endo-playbook-v1';

// ═══════════════════════════════════════════════════════════════
// PHASE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface PhaseDefinition {
    label: string;
    requiredFields: string[];
    recommendedFields: string[];
}

export const ENDO_PHASES: Record<EndoPhase, PhaseDefinition> = {
    t1: {
        label: 'Trepanation / Eröffnung',
        requiredFields: ['kofferdam', 'anesthesia', 'canalCount', 'diagnosis'],
        recommendedFields: ['vitality', 'percussion'],
    },
    t2: {
        label: 'Zwischensitzung / Aufbereitung',
        requiredFields: ['workingLengths', 'irrigation', 'medicament'],
        recommendedFields: ['instrumentationMode'],
    },
    obturation: {
        label: 'Wurzelfüllung / Abschluss',
        requiredFields: ['obturationMethod', 'sealer', 'xrayConfirm'],
        recommendedFields: ['apicalSeal'],
    },
};

// ═══════════════════════════════════════════════════════════════
// QUESTION TEMPLATES
// ═══════════════════════════════════════════════════════════════

export interface QuestionTemplate {
    id: string;
    phase: EndoPhase;
    field: string;
    severity: QuestionSeverity;
    title: string;
    prompt: string;
    rationale: string;
    answerType: QuestionAnswerType;
    options?: string[];
    fieldsWritten: string[];
    order: number;
    askCondition?: (signals: Record<string, unknown>) => boolean;
}

/**
 * T2 Question Templates — Termin 2 specific questions
 */
export const ENDO_T2_QUESTIONS: QuestionTemplate[] = [
    {
        id: 'ENDO_T2_WORKING_LENGTH_METHOD',
        phase: 't2',
        field: 'workingLengthMethod',
        severity: 'required',
        title: 'Arbeitslängen-Bestimmung',
        prompt: 'Wie wurden die Arbeitslängen bestimmt?',
        rationale: 'Forensisch relevant für Dokumentation der Messmethode.',
        answerType: 'select',
        options: ['Apexlokator', 'Röntgen', 'Beides'],
        fieldsWritten: ['answers.workingLengthMethod'],
        order: 10,
        askCondition: (signals) => !signals.workingLengthMethod,
    },
    {
        id: 'ENDO_T2_WORKING_LENGTHS',
        phase: 't2',
        field: 'workingLengths',
        severity: 'required',
        title: 'Arbeitslängen',
        prompt: 'Bitte Arbeitslängen pro Kanal angeben',
        rationale: 'Dokumentation der exakten Arbeitslängen für jeden Kanal.',
        answerType: 'perCanalTable',
        fieldsWritten: ['answers.workingLengthsByCanal'],
        order: 20,
        askCondition: (signals) =>
            signals.workingLengthsChecked === true && !signals.workingLengthsByCanal,
    },
    {
        id: 'ENDO_T2_IRRIGATION',
        phase: 't2',
        field: 'irrigation',
        severity: 'required',
        title: 'Spüllösungen',
        prompt: 'Welche Spüllösungen wurden verwendet?',
        rationale: 'Dokumentation des Spülprotokolls für Qualitätssicherung.',
        answerType: 'multiSelect',
        options: ['NaOCl', 'EDTA', 'CHX', 'NaCl', 'Andere'],
        fieldsWritten: ['answers.irrigationSolutions'],
        order: 30,
        askCondition: (signals) => {
            const solutions = signals.irrigationSolutions as string[] | undefined;
            return !solutions || solutions.length === 0;
        },
    },
    {
        id: 'ENDO_T2_INSTRUMENTATION_MODE',
        phase: 't2',
        field: 'instrumentationMode',
        severity: 'recommended',
        title: 'Aufbereitungsart',
        prompt: 'Maschinell oder manuell aufbereitet?',
        rationale: 'Optionale Dokumentation der Aufbereitungsmethode.',
        answerType: 'select',
        options: ['Maschinell (rotierend)', 'Manuell'],
        fieldsWritten: ['answers.instrumentationMode'],
        order: 40,
        askCondition: (signals) => !signals.instrumentationMode,
    },
];

/**
 * All question templates by phase
 */
export const ENDO_QUESTIONS_BY_PHASE: Record<EndoPhase, QuestionTemplate[]> = {
    t1: [], // T1 questions to be added later
    t2: ENDO_T2_QUESTIONS,
    obturation: [], // Obturation questions to be added later
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const endoPlaybookV1 = {
    version: PLAYBOOK_VERSION,
    id: PLAYBOOK_ID,
    phases: ENDO_PHASES,
    questionsByPhase: ENDO_QUESTIONS_BY_PHASE,
};

export default endoPlaybookV1;
