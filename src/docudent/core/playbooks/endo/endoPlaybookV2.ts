/**
 * Endo Playbook V2 — SSOT for Endo Treatment Questions (T1/T2/T3)
 *
 * ═══════════════════════════════════════════════════════════════
 * V2 adds:
 * - T3 phase (obturation + restoration)
 * - Apical ISO size capture per canal
 * - Enhanced visit-aware logic
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    EndoPhase,
    QuestionSeverity,
    QuestionAnswerType,
    EndoExtractedSignals,
} from '../../../contracts/questionEngineTypes';

// ═══════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════

export const PLAYBOOK_VERSION = '2.0.0';
export const PLAYBOOK_ID = 'endo-playbook-v2';

// ═══════════════════════════════════════════════════════════════
// PHASE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface PhaseDefinition {
    label: string;
    description: string;
    requiredFields: string[];
    recommendedFields: string[];
}

export const ENDO_PHASES_V2: Record<EndoPhase, PhaseDefinition> = {
    t1: {
        label: 'Trepanation / Eröffnung',
        description: 'Access, scouting, WL establishment, shaping start, irrigation, medicament optional',
        requiredFields: ['workingLengthMethod', 'workingLengths', 'irrigation'],
        recommendedFields: ['instrumentationMode', 'kofferdam'],
    },
    t2: {
        label: 'Zwischensitzung / Aufbereitung',
        description: 'Re-entry, WL re-check, shaping completion, irrigation, medicament or obturation decision',
        requiredFields: ['workingLengthMethod', 'workingLengths', 'apicalSizeISO', 'irrigation'],
        recommendedFields: ['instrumentationMode', 'medicament'],
    },
    t3: {
        label: 'Wurzelfüllung / Abschluss',
        description: 'Obturation + restoration',
        requiredFields: ['obturationTechnique'],
        recommendedFields: ['masterConeConfirmation', 'sealerTypeClass', 'finalRestoration'],
    },
    // Legacy alias for backward compatibility
    obturation: {
        label: 'Wurzelfüllung / Abschluss',
        description: 'Obturation + restoration (legacy alias for t3)',
        requiredFields: ['obturationTechnique'],
        recommendedFields: ['masterConeConfirmation', 'sealerTypeClass', 'finalRestoration'],
    },
};

// ═══════════════════════════════════════════════════════════════
// QUESTION TEMPLATES
// ═══════════════════════════════════════════════════════════════

export interface QuestionTemplate {
    id: string;
    phase: EndoPhase | 'common';
    field: string;
    severity: QuestionSeverity;
    title: string;
    prompt: string;
    rationale: string;
    answerType: QuestionAnswerType;
    options?: string[];
    fieldsWritten: string[];
    order: number;
    askCondition?: (signals: EndoExtractedSignals) => boolean;
}

// ───────────────────────────────────────────────────────────────
// COMMON QUESTIONS (all phases)
// ───────────────────────────────────────────────────────────────

export const ENDO_COMMON_QUESTIONS: QuestionTemplate[] = [
    {
        id: 'ENDO_RUBBER_DAM',
        phase: 'common',
        field: 'kofferdam',
        severity: 'recommended',
        title: 'Kofferdam',
        prompt: 'Wurde Kofferdam verwendet?',
        rationale: 'Kofferdam ist Standard bei Endo.',
        answerType: 'select',
        options: ['Ja', 'Nein, nicht möglich (Grund dokumentieren)'],
        fieldsWritten: ['answers.kofferdam'],
        order: 5,
        askCondition: (signals) => !signals.kofferdam && !signals.kofferdamNotPossible,
    },
];

// ───────────────────────────────────────────────────────────────
// T1 QUESTIONS
// ───────────────────────────────────────────────────────────────

export const ENDO_T1_QUESTIONS: QuestionTemplate[] = [
    {
        id: 'ENDO_T1_WORKING_LENGTH_METHOD',
        phase: 't1',
        field: 'workingLengthMethod',
        severity: 'required',
        title: 'Arbeitslängen-Bestimmung',
        prompt: 'Wie wurden die Arbeitslängen bestimmt?',
        rationale: 'Forensisch relevant für Dokumentation der Messmethode.',
        answerType: 'select',
        options: ['Apexlokator (EAL)', 'Röntgen', 'Beides'],
        fieldsWritten: ['answers.workingLengthMethod'],
        order: 10,
        askCondition: (signals) => !signals.workingLengthMethod,
    },
    {
        id: 'ENDO_T1_WORKING_LENGTHS',
        phase: 't1',
        field: 'workingLengths',
        severity: 'required',
        title: 'Arbeitslängen',
        prompt: 'Bitte Arbeitslängen pro Kanal angeben',
        rationale: 'Dokumentation der exakten Arbeitslängen für jeden Kanal.',
        answerType: 'perCanalTable',
        fieldsWritten: ['answers.workingLengthsByCanal'],
        order: 20,
        askCondition: (signals) => !signals.workingLengthsByCanal,
    },
    {
        id: 'ENDO_T1_IRRIGATION',
        phase: 't1',
        field: 'irrigation',
        severity: 'required',
        title: 'Spüllösungen',
        prompt: 'Welche Spüllösungen wurden verwendet?',
        rationale: 'Dokumentation des Spülprotokolls für Qualitätssicherung.',
        answerType: 'multiSelect',
        options: ['NaOCl', 'EDTA', 'CHX', 'NaCl', 'Andere'],
        fieldsWritten: ['answers.irrigationSolutions'],
        order: 30,
        askCondition: (signals) => signals.irrigationSolutions.length === 0,
    },
    {
        id: 'ENDO_T1_MEDICATION',
        phase: 't1',
        field: 'medication',
        severity: 'recommended',
        title: 'Medikamentöse Einlage',
        prompt: 'Welche Einlage wurde verwendet?',
        rationale: 'Dokumentation der medikamentösen Einlage.',
        answerType: 'select',
        options: ['Ca(OH)2', 'Ledermix', 'CHX', 'Keine'],
        fieldsWritten: ['answers.medication'],
        order: 35,
        askCondition: (signals) => Boolean(signals.medicamentMentioned) && !signals.medicament,
    },
    {
        id: 'ENDO_T1_INSTRUMENTATION_MODE',
        phase: 't1',
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

// ───────────────────────────────────────────────────────────────
// T2 QUESTIONS
// ───────────────────────────────────────────────────────────────

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
        options: ['Apexlokator (EAL)', 'Röntgen', 'Beides'],
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
            signals.workingLengthsChecked && !signals.workingLengthsByCanal,
    },
    {
        id: 'ENDO_T2_APICAL_SIZE_ISO',
        phase: 't2',
        field: 'apicalSizeISO',
        severity: 'required',
        title: 'Apikale Größe (ISO)',
        prompt: 'Bitte apikale Aufbereitungsgröße pro Kanal angeben',
        rationale: 'ISO-Größe dokumentiert die finale Aufbereitung.',
        answerType: 'perCanalTable',
        fieldsWritten: ['answers.apicalSizes'],
        order: 25,
        askCondition: (signals) => {
            // Ask if no apical sizes detected
            if (!signals.apicalSizes || signals.apicalSizes.length === 0) return true;
            // Ask if we have canal labels but not all have ISO sizes
            if (signals.canalLabels && signals.canalLabels.length > signals.apicalSizes.length) return true;
            return false;
        },
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
        askCondition: (signals) => signals.irrigationSolutions.length === 0,
    },
    {
        id: 'ENDO_T2_MEDICATION',
        phase: 't2',
        field: 'medication',
        severity: 'recommended',
        title: 'Medikamentöse Einlage',
        prompt: 'Welche Einlage wurde verwendet?',
        rationale: 'Dokumentation der medikamentösen Einlage.',
        answerType: 'select',
        options: ['Ca(OH)2', 'Ledermix', 'CHX', 'Keine'],
        fieldsWritten: ['answers.medication'],
        order: 35,
        askCondition: (signals) => Boolean(signals.medicamentMentioned) && !signals.medicament,
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

// ───────────────────────────────────────────────────────────────
// T3 QUESTIONS
// ───────────────────────────────────────────────────────────────

export const ENDO_T3_QUESTIONS: QuestionTemplate[] = [
    {
        id: 'ENDO_T3_OBTURATION_TECHNIQUE',
        phase: 't3',
        field: 'obturationTechnique',
        severity: 'required',
        title: 'Obturationstechnik',
        prompt: 'Welche Obturationstechnik wurde verwendet?',
        rationale: 'Dokumentation der Wurzelfüllungsmethode.',
        answerType: 'select',
        options: ['Warm vertikal', 'Laterale Kondensation', 'Trägerbasiert', 'Single Cone'],
        fieldsWritten: ['answers.obturationTechnique'],
        order: 10,
        askCondition: (signals) => !signals.obturationTechnique,
    },
    {
        id: 'ENDO_T3_MASTER_CONE',
        phase: 't3',
        field: 'masterConeConfirmation',
        severity: 'recommended',
        title: 'Masterpoint-Kontrolle',
        prompt: 'Wie wurde der Masterpoint verifiziert?',
        rationale: 'Bestätigung der korrekten Länge vor Obturation.',
        answerType: 'select',
        options: ['Tug-Back', 'Arbeitslänge verifiziert', 'Röntgenkontrolle'],
        fieldsWritten: ['answers.masterConeConfirmation'],
        order: 20,
        askCondition: () => true, // Always ask if not detected
    },
    {
        id: 'ENDO_T3_SEALER_TYPE',
        phase: 't3',
        field: 'sealerTypeClass',
        severity: 'recommended',
        title: 'Sealer-Typ',
        prompt: 'Welcher Sealer-Typ wurde verwendet?',
        rationale: 'Dokumentation des Sealertyps (Klasse, nicht Marke).',
        answerType: 'select',
        options: ['Kunstharz-basiert', 'Bioceramic', 'Andere'],
        fieldsWritten: ['answers.sealerTypeClass'],
        order: 30,
        askCondition: (signals) => !signals.sealerTypeClass,
    },
    {
        id: 'ENDO_T3_FINAL_RESTORATION',
        phase: 't3',
        field: 'finalRestoration',
        severity: 'recommended',
        title: 'Abschlussversorgung',
        prompt: 'Wie wurde der Zahn abschließend versorgt?',
        rationale: 'Dokumentation der koronalen Versorgung.',
        answerType: 'select',
        options: ['Definitive Füllung', 'Provisorischer Verschluss', 'Krone geplant'],
        fieldsWritten: ['answers.finalRestoration'],
        order: 40,
        askCondition: () => true, // Always offer
    },
];

// ═══════════════════════════════════════════════════════════════
// QUESTION AGGREGATION
// ═══════════════════════════════════════════════════════════════

export const ENDO_QUESTIONS_BY_PHASE_V2: Record<EndoPhase | 'common', QuestionTemplate[]> = {
    common: ENDO_COMMON_QUESTIONS,
    t1: ENDO_T1_QUESTIONS,
    t2: ENDO_T2_QUESTIONS,
    t3: ENDO_T3_QUESTIONS,
    obturation: ENDO_T3_QUESTIONS, // Legacy alias
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const endoPlaybookV2 = {
    version: PLAYBOOK_VERSION,
    id: PLAYBOOK_ID,
    phases: ENDO_PHASES_V2,
    questionsByPhase: ENDO_QUESTIONS_BY_PHASE_V2,
};

export default endoPlaybookV2;
