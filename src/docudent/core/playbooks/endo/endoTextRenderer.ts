/**
 * Endo Text Renderer — Deterministic German Documentation Output
 *
 * ═══════════════════════════════════════════════════════════════
 * Renders a final German note from:
 * - Raw dictation
 * - Parsed signals
 * - Normalized fields (from answer normalization)
 * 
 * Template-based, deterministic, no LLM.
 * IMPORTANT: This renderer ONLY reads from normalized fields, never
 * directly from questionId-keyed answers.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    EndoExtractedSignals,
    EngineQuestion,
    AnswersByQuestionId,
    NormalizedFields,
} from '../../../contracts/questionEngineTypes';

import { normalizeAnswersToFields } from '../../questionEngine/answerNormalization';
import { parseEndoSignals } from './endoSignalParser';
import { evaluateT2DeviationQuestions } from './endoPlaybookT2Deviation';

// Import canonical vocabulary for code->label mapping
import {
    IRRIGATION_SOLUTION_LABELS,
    MEDICATION_LABELS,
    CANAL_LABELS,
    PLAN_NEXT_LABELS,
    type DeviationReasonCode,
    type FistulaStatusCode,
    type SuppurationStatusCode,
    type NegotiationStatusCode,
    type PlanNextCode,
    type IrrigationSolutionCode,
    type MedicationCode,
    type TempSealCode,
    type CanalCode,
} from '../../endo/vocab/endoCanonicalVocab';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface EndoRenderInput {
    rawDictation: string;
    tooth?: string;
    visitNumber?: number;
    signals: EndoExtractedSignals;
    /** Normalized fields (keyed by fieldName, contains CANONICAL CODES) */
    fields: NormalizedFields;
}

// ═══════════════════════════════════════════════════════════
// SAFE FIELD ACCESSORS
// ═══════════════════════════════════════════════════════════

function getStringField(fields: NormalizedFields, key: string): string | null {
    const val = fields[key];
    return typeof val === 'string' ? val : null;
}

function getStringArrayField(fields: NormalizedFields, key: string): string[] {
    const val = fields[key];
    return Array.isArray(val) ? (val as string[]) : [];
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Render T2 deviation note from signals and normalized fields.
 * Deterministic: same input => same output.
 * 
 * IMPORTANT: fields must be normalized (keyed by fieldName).
 * Use normalizeAnswersToFields() before calling this.
 */
export function renderEndoT2Note(input: EndoRenderInput): string {
    const { tooth, visitNumber, signals, fields } = input;
    const lines: string[] = [];

    // ═══════════════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════════════

    const visitNum = visitNumber ?? signals.visitNumber ?? 2;
    const toothStr = tooth ?? signals.tooth;

    if (toothStr) {
        lines.push(`Endodontie – ${visitNum}. Termin (Zahn ${toothStr})`);
    } else {
        lines.push(`Endodontie – ${visitNum}. Termin`);
    }

    // ═══════════════════════════════════════════════════════════
    // SENTENCE 1: Patient presents + planned action
    // ═══════════════════════════════════════════════════════════

    let presentSentence = `Pat. stellt sich zum ${visitNum}. Termin der Wurzelkanalbehandlung vor`;

    if (signals.plannedAction === 'medChange') {
        presentSentence += ' (geplant: Medikamentenwechsel)';
    } else if (signals.plannedAction === 'obturation') {
        presentSentence += ' (geplant: Obturation)';
    }
    presentSentence += '.';
    lines.push(presentSentence);

    // ═══════════════════════════════════════════════════════════
    // SYMPTOMS LINE
    // ═══════════════════════════════════════════════════════════

    const deviationReason = getStringField(fields, 'deviationReason') as DeviationReasonCode | null;

    // Fistula check (needed for symptom line) - USE CANONICAL CODES
    const fistulaStatus = getStringField(fields, 'fistulaStatus') as FistulaStatusCode | null;
    const fistulaTrue = signals.fistulaPresent === true ||
        fistulaStatus === 'PRESENT';

    // Suppuration check (needed for symptom line) - USE CANONICAL CODES
    const suppurationStatus = getStringField(fields, 'suppurationStatus') as SuppurationStatusCode | null;
    const suppurationTrue = signals.suppurationPresent === true ||
        suppurationStatus === 'PRESENT';

    // Symptom line logic - distinguish pain vs infection-only - USE CANONICAL CODES
    const hasPain = signals.painPersistent === true ||
        deviationReason === 'PAIN';
    const hasInfection = fistulaTrue || suppurationTrue;

    if (hasPain) {
        lines.push('Pat. berichtet über persistierende Beschwerden.');
    } else if (hasInfection) {
        lines.push('Pat. berichtet über anhaltende Symptomatik.');
    }

    // ═══════════════════════════════════════════════════════════
    // CLINICAL FINDINGS LINE (fistula + suppuration)
    // ═══════════════════════════════════════════════════════════

    const clinicalParts: string[] = [];

    if (fistulaTrue) {
        clinicalParts.push('Klinisch weiterhin Fistelgang');
    }

    if (suppurationTrue) {
        clinicalParts.push('es zeigte sich Eiter-/Exsudataustritt');
    }

    if (clinicalParts.length > 0) {
        lines.push(clinicalParts.join('; ') + '.');
    }

    // ═══════════════════════════════════════════════════════════
    // MANAGEMENT LINE
    // ═══════════════════════════════════════════════════════════

    const managementParts: string[] = [];

    // No obturation statement
    const obturationNotDone = signals.obturationPerformed === false || deviationReason !== null;

    if (obturationNotDone) {
        managementParts.push('Daher heute keine Obturation');
        managementParts.push('stattdessen erneute gründliche Spülung und Medikamentenwechsel');
    }

    // Irrigation solutions - prefer fields, fallback to signals
    const irrigationFromFields = getStringArrayField(fields, 'irrigationSolutions');
    const irrigationFromSignals = signals.irrigationSolutions ?? [];
    const irrigationSolutions = irrigationFromFields.length > 0 ? irrigationFromFields : irrigationFromSignals;

    if (irrigationSolutions.length > 0) {
        // Map codes to labels for output
        const solutionLabels = irrigationSolutions.map(s =>
            IRRIGATION_SOLUTION_LABELS[s as IrrigationSolutionCode] ?? s
        );
        const solutionsStr = solutionLabels.join(' und ');
        let irrigationLine = `Spülung mit ${solutionsStr}`;
        // Add NaCl note if NAOCL and EDTA present, but NOT if NACL already in solutions (use CODES)
        if (irrigationSolutions.includes('NAOCL') && irrigationSolutions.includes('EDTA') && !irrigationSolutions.includes('NACL')) {
            irrigationLine += ' (ggf. abschließend NaCl)';
        }
        managementParts.push(irrigationLine);
    }

    // Medication - prefer fields, fallback to signals - USE CANONICAL CODES
    const medicationCode = getStringField(fields, 'medication') as MedicationCode | null;
    const medicationFromSignals = signals.medicament === 'CaOH2' ? 'CAOH2' as MedicationCode : null;
    const medication = medicationCode ?? medicationFromSignals;

    if (medication && medication !== 'NONE') {
        const medicationLabel = MEDICATION_LABELS[medication] ?? medication;
        managementParts.push(`Anschließend Einlage ${medicationLabel} eingebracht`);
    }

    // Temp seal - USE CANONICAL CODES
    const tempSeal = getStringField(fields, 'tempSeal') as TempSealCode | null;
    if (tempSeal === 'PROVISIONAL') {
        managementParts.push('provisorisch verschlossen');
    } else if (tempSeal === 'DEFINITIVE') {
        managementParts.push('definitiv verschlossen');
    } else if (!tempSeal && obturationNotDone) {
        // Default assumption for deviation case
        managementParts.push('provisorisch verschlossen');
    }

    // Combine management parts
    if (managementParts.length > 0) {
        // First part ends with period, rest connected with "und"
        const firstPart = managementParts.slice(0, 2).join(', ') + '.';
        const restParts = managementParts.slice(2);

        if (restParts.length > 0) {
            const restText = restParts.map((p, i) => {
                if (i === restParts.length - 1 && !p.endsWith('.')) {
                    return p + '.';
                }
                return p;
            }).join('. ');
            lines.push(firstPart + ' ' + restText);
        } else {
            lines.push(firstPart);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // T4: APEX/NEGOTIATION DEVIATION LINE
    // ═══════════════════════════════════════════════════════════

    const negotiationStatus = getStringField(fields, 'negotiationStatus') as NegotiationStatusCode | null;
    const canalsAffected = getStringArrayField(fields, 'canalsAffected') as CanalCode[];
    const hasApexIssue = signals.apexNotReachable === true ||
        signals.canalNegotiationIssue === true ||
        negotiationStatus === 'NOT_TO_APEX_BLOCKAGE' ||
        negotiationStatus === 'PARTIAL';

    if (hasApexIssue) {
        lines.push('Aufbereitung/Längenführung nicht bis Apex möglich (Blockade/Stufe).');
    }

    if (canalsAffected.length > 0) {
        // Map codes to labels for output
        const canalLabels = canalsAffected.map(c => CANAL_LABELS[c] ?? c);
        lines.push(`Betroffene Kanäle: ${canalLabels.join(', ')}.`);
    }

    // ═══════════════════════════════════════════════════════════
    // PLAN LINE
    // ═══════════════════════════════════════════════════════════

    // hasInfection already computed above for symptom line
    const planNext = getStringField(fields, 'planNext') as PlanNextCode | null;

    if (hasApexIssue) {
        // Apex-specific plan - USE CANONICAL CODES
        if (planNext === 'RETRY_NEXT_APPT') {
            lines.push('Plan: nächster Termin erneuter Versuch der Kanalerweiterung/Längenführung.');
        } else if (planNext === 'OBTURATE_TO_REACHED_LENGTH') {
            lines.push('Plan: Obturation bis zur erreichbaren Länge je nach Befund.');
        } else if (planNext === 'REFER_REVISION') {
            lines.push('Plan: Überweisung zur Revision/MKG.');
        } else {
            lines.push('Plan: nächster Termin erneuter Versuch der Kanalerweiterung/Längenführung; je nach Befund Obturation bis zur erreichbaren Länge.');
        }
    } else if (hasInfection) {
        lines.push('Plan: nächster Termin bei klinischer Beruhigung / fistelfrei: Obturation; andernfalls erneute Medikation/Revision je nach Befund.');
    } else if (obturationNotDone) {
        lines.push('Plan: Fortsetzung/Abschluss der endodontischen Behandlung.');
    }

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION HELPER
// ═══════════════════════════════════════════════════════════════

export interface EvaluateEndoT2Result {
    signals: EndoExtractedSignals;
    questions: EngineQuestion[];
    fields: NormalizedFields;
    notePreview: string;
}

/**
 * Full T2 evaluation: parse + questions + normalize answers + render note.
 * 
 * @param rawDictation - The raw dictation text
 * @param answersById - Optional answers keyed by questionId (from UI)
 * @returns signals, questions, normalized fields, and rendered note/preview
 */
export function evaluateEndoT2(
    rawDictation: string,
    answersById?: AnswersByQuestionId
): EvaluateEndoT2Result {
    const signals = parseEndoSignals(rawDictation);
    const questions = evaluateT2DeviationQuestions(signals);

    // Normalize answers to fields (empty if no answers provided)
    const fields = answersById
        ? normalizeAnswersToFields(questions, answersById)
        : {};

    // Generate note with normalized fields
    const notePreview = renderEndoT2Note({
        rawDictation,
        signals,
        fields,
    });

    return {
        signals,
        questions,
        fields,
        notePreview,
    };
}

export default {
    renderEndoT2Note,
    evaluateEndoT2,
};
