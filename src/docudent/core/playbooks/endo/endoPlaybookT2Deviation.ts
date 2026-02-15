/**
 * Endo Playbook T2 Deviation — Questions for T2 Deviation Scenarios
 *
 * ═══════════════════════════════════════════════════════════════
 * Questions for T2 when obturation not performed due to:
 * - Persistent infection (fistula/suppuration)
 * - Persistent pain
 * - Planned obturation not executed
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    EngineQuestion,
    EndoExtractedSignals,
} from '../../../contracts/questionEngineTypes';

import {
    DEVIATION_REASON_CODES,
    FISTULA_STATUS_CODES,
    SUPPURATION_STATUS_CODES,
    MEDICATION_CODES,
    TEMP_SEAL_CODES,
    IRRIGATION_SOLUTION_CODES,
    WORKING_LENGTH_METHOD_CODES,
    INSTRUMENTATION_MODE_CODES,
    NEGOTIATION_STATUS_CODES,
    CANAL_CODES,
    PLAN_NEXT_CODES,
} from '../../endo/vocab/endoCanonicalVocab';

// ═══════════════════════════════════════════════════════════════
// T2 DEVIATION QUESTION IDs
// ═══════════════════════════════════════════════════════════════

export const T2_DEVIATION_QUESTION_IDS = {
    DEVIATION_REASON: 'ENDO_T2_DEVIATION_REASON',
    FISTULA_STATUS: 'ENDO_T2_FISTULA_STATUS',
    SUPPURATION: 'ENDO_T2_SUPPURATION',
    MEDICATION: 'ENDO_T2_MEDICATION',
    TEMP_SEAL: 'ENDO_T2_TEMP_SEAL',
    IRRIGATION: 'ENDO_T2_IRRIGATION',
    WORKING_LENGTH_METHOD: 'ENDO_T2_WORKING_LENGTH_METHOD',
    WORKING_LENGTHS: 'ENDO_T2_WORKING_LENGTHS',
    INSTRUMENTATION_MODE: 'ENDO_T2_INSTRUMENTATION_MODE',
    // T4: Apex/Negotiation deviation
    NEGOTIATION_STATUS: 'ENDO_T2_NEGOTIATION_STATUS',
    CANALS_AFFECTED: 'ENDO_T2_CANALS_AFFECTED',
    PLAN_NEXT: 'ENDO_T2_PLAN_NEXT',
    MASTER_FILE: 'ENDO_MASTER_FILE',
} as const;

// ═══════════════════════════════════════════════════════════════
// T2 DEVIATION QUESTION TEMPLATES
// ═══════════════════════════════════════════════════════════════

const Q_DEVIATION_REASON: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.DEVIATION_REASON,
    title: 'Warum heute keine Obturation?',
    prompt: 'Warum wurde heute nicht abgefüllt?',
    rationale: 'Dokumentiert den klinischen Grund für die Abweichung vom Plan.',
    severity: 'required',
    answerType: 'select',
    options: [...DEVIATION_REASON_CODES],
    fieldsWritten: ['deviationReason'],
    order: 10,
};

const Q_FISTULA_STATUS: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.FISTULA_STATUS,
    title: 'Fistelstatus',
    prompt: 'Besteht ein Fistelgang?',
    rationale: 'Wichtig für Behandlungsplanung und Prognose.',
    severity: 'required',
    answerType: 'select',
    options: [...FISTULA_STATUS_CODES],
    fieldsWritten: ['fistulaStatus'],
    order: 15,
};

const Q_SUPPURATION: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.SUPPURATION,
    title: 'Eiter/Exsudat',
    prompt: 'Liegt Eiter oder Exsudat vor?',
    rationale: 'Indikator für aktive Infektion.',
    severity: 'required',
    answerType: 'select',
    options: [...SUPPURATION_STATUS_CODES],
    fieldsWritten: ['suppurationStatus'],
    order: 16,
};

const Q_MEDICATION: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.MEDICATION,
    title: 'Medikament',
    prompt: 'Welches Medikament wurde eingebracht?',
    rationale: 'Dokumentiert die eingebrachte Einlage.',
    severity: 'required',
    answerType: 'select',
    options: [...MEDICATION_CODES],
    fieldsWritten: ['medication'],
    order: 40,
};

const Q_TEMP_SEAL: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.TEMP_SEAL,
    title: 'Verschluss',
    prompt: 'Wie wurde der Zahn verschlossen?',
    rationale: 'Dokumentiert den Verschluss.',
    severity: 'required',
    answerType: 'select',
    options: [...TEMP_SEAL_CODES],
    fieldsWritten: ['tempSeal'],
    order: 50,
};

const Q_IRRIGATION: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.IRRIGATION,
    title: 'Spüllösungen',
    prompt: 'Welche Spüllösungen wurden verwendet?',
    rationale: 'Dokumentiert die Desinfektion.',
    severity: 'required',
    answerType: 'multiSelect',
    options: [...IRRIGATION_SOLUTION_CODES],
    fieldsWritten: ['irrigationSolutions'],
    order: 30,
};

const Q_WORKING_LENGTH_METHOD: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.WORKING_LENGTH_METHOD,
    title: 'Längenmessung',
    prompt: 'Wie wurde die Arbeitslänge bestimmt?',
    rationale: 'Dokumentiert die Methode der Längenbestimmung.',
    severity: 'required',
    answerType: 'select',
    options: [...WORKING_LENGTH_METHOD_CODES],
    fieldsWritten: ['workingLengthMethod'],
    order: 20,
};

const Q_WORKING_LENGTHS: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.WORKING_LENGTHS,
    title: 'Arbeitslängen',
    prompt: 'Arbeitslängen pro Kanal?',
    rationale: 'Dokumentiert die ermittelten Arbeitslängen.',
    severity: 'required',
    answerType: 'perCanalTable',
    fieldsWritten: ['workingLengths'],
    order: 25,
};

const Q_INSTRUMENTATION_MODE: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.INSTRUMENTATION_MODE,
    title: 'Aufbereitungsart',
    prompt: 'Maschinell oder manuell aufbereitet?',
    rationale: 'Dokumentiert die Aufbereitungsmethode.',
    severity: 'recommended',
    answerType: 'select',
    options: [...INSTRUMENTATION_MODE_CODES],
    fieldsWritten: ['instrumentationMode'],
    order: 26,
};

// ═══════════════════════════════════════════════════════════════
// T4: APEX/NEGOTIATION DEVIATION QUESTIONS
// ═══════════════════════════════════════════════════════════════

const Q_NEGOTIATION_STATUS: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.NEGOTIATION_STATUS,
    title: 'Kanalstatus',
    prompt: 'Konnte bis zum Apex aufbereitet werden?',
    rationale: 'Dokumentiert Vollständigkeit der Aufbereitung.',
    severity: 'required',
    answerType: 'select',
    options: [...NEGOTIATION_STATUS_CODES],
    fieldsWritten: ['negotiationStatus'],
    order: 12,
};

const Q_CANALS_AFFECTED: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.CANALS_AFFECTED,
    title: 'Betroffene Kanäle',
    prompt: 'Welche Kanäle sind betroffen/unvollständig?',
    rationale: 'Dokumentiert welche Kanäle nicht vollständig aufbereitet wurden.',
    severity: 'recommended',
    answerType: 'multiSelect',
    options: [...CANAL_CODES],
    fieldsWritten: ['canalsAffected'],
    order: 13,
};

const Q_PLAN_NEXT: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.PLAN_NEXT,
    title: 'Weiteres Vorgehen',
    prompt: 'Wie soll weiter vorgegangen werden?',
    rationale: 'Dokumentiert den Plan für den nächsten Schritt.',
    severity: 'required',
    answerType: 'select',
    options: [...PLAN_NEXT_CODES],
    fieldsWritten: ['planNext'],
    order: 55,
};

const Q_MASTER_FILE: EngineQuestion = {
    id: T2_DEVIATION_QUESTION_IDS.MASTER_FILE,
    title: 'Masterfile (ISO/Taper)',
    prompt: 'Masterfile (ISO/Taper) pro Kanal?',
    rationale: 'Dokumentiert apikale Aufbereitung / Masterfile.',
    severity: 'recommended',
    answerType: 'perCanalTable',
    fieldsWritten: ['masterFileByCanal'],
    order: 27,
};

// ═══════════════════════════════════════════════════════════════
// QUESTION EVALUATION LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate which T2 questions to ask based on signals.
 * Follows rule: minimal questions, medically sensible.
 */
export function evaluateT2DeviationQuestions(
    signals: EndoExtractedSignals
): EngineQuestion[] {
    const questions: EngineQuestion[] = [];

    // Check for deviation indicators
    const hasInfectionSigns = signals.fistulaPresent === true || signals.suppurationPresent === true;
    const hasPainPersistent = signals.painPersistent === true;
    const obturationNotPerformed = signals.obturationPerformed === false;
    const plannedObturation = signals.plannedAction === 'obturation';

    // Deviation scenario: infection signs OR pain persistent OR obturation not performed despite plan
    const isDeviationScenario = hasInfectionSigns || hasPainPersistent ||
        (plannedObturation && obturationNotPerformed);

    // 1. DEVIATION_REASON: required when obturation not performed OR infection signs
    if (isDeviationScenario || hasInfectionSigns || obturationNotPerformed) {
        questions.push(Q_DEVIATION_REASON);
    }

    // 2. FISTULA_STATUS: required when dictation mentions fistula OR suppuration OR planned obturation
    if (signals.fistulaPresent !== null || signals.suppurationPresent !== null || plannedObturation) {
        // If already detected as true/false from dictation, ask for confirmation if not clear
        if (signals.fistulaPresent === null || signals.fistulaPresent === true) {
            questions.push(Q_FISTULA_STATUS);
        }
    }

    // 3. SUPPURATION: required when dictation mentions exudate/pus or deviation reason suggests it
    if (signals.suppurationPresent !== null || isDeviationScenario) {
        if (signals.suppurationPresent === null || signals.suppurationPresent === true) {
            questions.push(Q_SUPPURATION);
        }
    }

    // 4. IRRIGATION: required for T2 baseline, but recommended if solutions already extracted
    if (signals.irrigationMentioned || signals.visitNumber === 2) {
        const irrigationQ = { ...Q_IRRIGATION };
        // If solutions already extracted, make it recommended
        if (signals.irrigationSolutions.length > 0) {
            irrigationQ.severity = 'recommended';
        }
        questions.push(irrigationQ);
    }

    // 5. MEDICATION: required when plannedAction=medChange OR obturationPerformed=false OR deviation
    if (signals.plannedAction === 'medChange' || obturationNotPerformed || isDeviationScenario) {
        // Skip if CaOH2 already detected in medicament
        if (signals.medicament !== 'CaOH2') {
            questions.push(Q_MEDICATION);
        }
    }

    // 6. TEMP_SEAL: always required in T2
    if (signals.visitNumber === 2 || isDeviationScenario) {
        questions.push(Q_TEMP_SEAL);
    }

    // 7. WORKING LENGTH questions: only if WL keywords OR instrumentation with obturation planned
    const shouldAskWL = signals.workingLengthMentioned ||
        (signals.instrumentationMentioned && plannedObturation);

    if (shouldAskWL) {
        // Only ask method if not already detected
        if (!signals.workingLengthMethod) {
            questions.push(Q_WORKING_LENGTH_METHOD);
        }
        // Only ask lengths if not already extracted
        if (!signals.workingLengthsByCanal || Object.keys(signals.workingLengthsByCanal).length === 0) {
            questions.push(Q_WORKING_LENGTHS);
        }
    }

    // 8. INSTRUMENTATION_MODE: only if "aufbereitet" mentioned
    if (signals.instrumentationMentioned && !signals.instrumentationMode) {
        questions.push(Q_INSTRUMENTATION_MODE);
    }

    // ═══════════════════════════════════════════════════════════
    // T4: APEX/NEGOTIATION DEVIATION QUESTIONS
    // ═══════════════════════════════════════════════════════════

    const hasApexIssue = signals.apexNotReachable === true ||
        signals.canalNegotiationIssue === true ||
        (signals.canalsIncomplete && signals.canalsIncomplete.length > 0);

    // 9. NEGOTIATION_STATUS: required when apex/negotiation issue detected
    if (hasApexIssue) {
        questions.push(Q_NEGOTIATION_STATUS);
    }

    // 10. CANALS_AFFECTED: recommended when negotiation issue and specific canals mentioned
    if (hasApexIssue) {
        questions.push(Q_CANALS_AFFECTED);
    }

    // 11. PLAN_NEXT: required when apex issue detected
    if (hasApexIssue) {
        questions.push(Q_PLAN_NEXT);
    }

    // 12. MASTER_FILE: recommended when instrumentation mentioned or obturation planned
    if (signals.instrumentationMentioned || plannedObturation) {
        questions.push(Q_MASTER_FILE);
    }

    // Sort by order and return
    return questions.sort((a, b) => a.order - b.order);
}

export default {
    T2_DEVIATION_QUESTION_IDS,
    evaluateT2DeviationQuestions,
};
