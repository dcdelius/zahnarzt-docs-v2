/**
 * Filling Text Renderer — German Documentation from Canonical Fields
 *
 * ═══════════════════════════════════════════════════════════════
 * Converts signals + normalized fields into clean German text.
 * 
 * HARD RULES:
 * - NEVER reads raw dictation
 * - NEVER outputs raw codes (only German labels)
 * - Uses vocabRegistry toLabel() for all conversions
 * ═══════════════════════════════════════════════════════════════
 */

import type { NormalizedFields, AnswersByQuestionId } from '../../contracts/questionEngineTypes';
import type { FillingExtractedSignals } from './fillingSignalParser';
import { parseFillingSignals } from './fillingSignalParser';
import { evaluateFillingQuestions, FILLING_QUESTION_IDS } from './fillingPlaybookV1';
import { normalizeAnswersToFields, getStringField, getStringArrayField } from '../questionEngine/answerNormalization';

import {
    toSurfaceLabel,
    toMaterialLabel,
    toAdhesiveModeLabel,
    toAnesthesiaLabel,
    toIsolationLabel,
    toCariesDepthLabel,
    toBillingModeLabel,
    type SurfaceCode,
    type MaterialCode,
    type AdhesiveModeCode,
    type AnesthesiaCode,
    type IsolationCode,
    type CariesDepthCode,
    type BillingModeCode,
} from './vocab/fillingCanonicalVocab';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RenderFillingNoteInput {
    tooth: string;
    signals: FillingExtractedSignals;
    fields: NormalizedFields;
}

export interface EvaluateFillingResult {
    signals: FillingExtractedSignals;
    questions: ReturnType<typeof evaluateFillingQuestions>;
    fields: NormalizedFields;
    notePreview: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════

export function renderFillingNote(input: RenderFillingNoteInput): string {
    const { tooth, signals, fields } = input;
    const lines: string[] = [];

    // ═══════════════════════════════════════════════════════════
    // HEADER LINE
    // ═══════════════════════════════════════════════════════════

    const surfaceCodes = getStringArrayField(fields, 'surfaces') as SurfaceCode[];
    const materialCode = getStringField(fields, 'material') as MaterialCode | null;

    // Build surface string (e.g., "MOD")
    const surfaceStr = surfaceCodes.length > 0
        ? surfaceCodes.join('')
        : signals.surfaces?.join('') ?? '';

    // Build material label
    const materialLabel = materialCode ? toMaterialLabel(materialCode) : '';

    if (surfaceStr && materialLabel) {
        lines.push(`Zahn ${tooth}, ${surfaceStr}-${materialLabel}füllung.`);
    } else if (surfaceStr) {
        lines.push(`Zahn ${tooth}, ${surfaceStr}-Füllung.`);
    } else if (materialLabel) {
        lines.push(`Zahn ${tooth}, ${materialLabel}füllung.`);
    } else {
        lines.push(`Zahn ${tooth}, Füllung.`);
    }

    // ═══════════════════════════════════════════════════════════
    // ANESTHESIA LINE
    // ═══════════════════════════════════════════════════════════

    const anesthesiaCode = getStringField(fields, 'anesthesia') as AnesthesiaCode | null;
    if (anesthesiaCode && anesthesiaCode !== 'NONE') {
        const label = toAnesthesiaLabel(anesthesiaCode);
        lines.push(`Lokalanästhesie (${label}).`);
    }

    // ═══════════════════════════════════════════════════════════
    // ISOLATION LINE
    // ═══════════════════════════════════════════════════════════

    const isolationCode = getStringField(fields, 'isolation') as IsolationCode | null;
    if (isolationCode === 'RUBBER_DAM') {
        lines.push('Kofferdam angelegt.');
    } else if (isolationCode === 'RELATIVE') {
        lines.push('Relative Trockenlegung.');
    }

    // ═══════════════════════════════════════════════════════════
    // CARIES DEPTH LINE
    // ═══════════════════════════════════════════════════════════

    const cariesDepthCode = getStringField(fields, 'cariesDepth') as CariesDepthCode | null;
    if (cariesDepthCode && cariesDepthCode !== 'SUPERFICIAL') {
        const label = toCariesDepthLabel(cariesDepthCode);
        if (cariesDepthCode === 'PULP_PROXIMAL') {
            lines.push(`${label}, Caries profunda.`);
        } else if (cariesDepthCode === 'DEEP') {
            lines.push(`${label}.`);
        } else {
            lines.push(`${label}.`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ADHESIVE TECHNIQUE LINE
    // ═══════════════════════════════════════════════════════════

    const adhesiveCode = getStringField(fields, 'adhesiveMode') as AdhesiveModeCode | null;
    if (adhesiveCode && adhesiveCode !== 'NONE') {
        const label = toAdhesiveModeLabel(adhesiveCode);
        lines.push(`Adhäsivtechnik: ${label}.`);
    }

    // ═══════════════════════════════════════════════════════════
    // BILLING LINE
    // ═══════════════════════════════════════════════════════════

    const billingCode = getStringField(fields, 'billingMode') as BillingModeCode | null;
    if (billingCode === 'GKV_PLUS_PRIVATE') {
        lines.push('Mehrkostenvereinbarung nach Aufklärung.');
    } else if (billingCode === 'PRIVATE_ONLY') {
        lines.push('Privatleistung nach Aufklärung.');
    }

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Full pipeline: dictation → signals → questions → fields → note
 */
export function evaluateFilling(
    dictation: string,
    answersById: AnswersByQuestionId = {}
): EvaluateFillingResult {
    // 1. Parse signals from dictation
    const signals = parseFillingSignals(dictation);

    // 2. Generate questions based on signals
    const questions = evaluateFillingQuestions(signals);

    // 3. Normalize answers to fields
    const fields = normalizeAnswersToFields(questions, answersById);

    // 4. Render preview note
    const tooth = signals.tooth ?? '?';
    const notePreview = renderFillingNote({ tooth, signals, fields });

    return {
        signals,
        questions,
        fields,
        notePreview,
    };
}

export default {
    renderFillingNote,
    evaluateFilling,
};
