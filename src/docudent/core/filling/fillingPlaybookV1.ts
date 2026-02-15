/**
 * Filling Playbook V1 — Question Engine for Fillings
 *
 * ═══════════════════════════════════════════════════════════════
 * Defines questions for filling documentation.
 * All options are CANONICAL CODES, not German strings.
 * 
 * Questions ask only when signals are missing or ambiguous.
 * ═══════════════════════════════════════════════════════════════
 */

import type { EngineQuestion } from '../../contracts/questionEngineTypes';
import type { FillingExtractedSignals } from './fillingSignalParser';

import {
    SURFACE_CODES,
    MATERIAL_CODES,
    ADHESIVE_MODE_CODES,
    ANESTHESIA_CODES,
    ISOLATION_CODES,
    CARIES_DEPTH_CODES,
    BILLING_MODE_CODES,
    FILLING_DEVIATION_CODES,
} from './vocab/fillingCanonicalVocab';

// ═══════════════════════════════════════════════════════════════
// QUESTION IDS
// ═══════════════════════════════════════════════════════════════

export const FILLING_QUESTION_IDS = {
    SURFACES: 'FILLING_SURFACES',
    MATERIAL: 'FILLING_MATERIAL',
    ADHESIVE_MODE: 'FILLING_ADHESIVE_MODE',
    ANESTHESIA: 'FILLING_ANESTHESIA',
    ISOLATION: 'FILLING_ISOLATION',
    CARIES_DEPTH: 'FILLING_CARIES_DEPTH',
    BILLING_MODE: 'FILLING_BILLING_MODE',
    DEVIATION_REASON: 'FILLING_DEVIATION_REASON',
} as const;

const QID = FILLING_QUESTION_IDS;

// ═══════════════════════════════════════════════════════════════
// QUESTION TEMPLATES
// ═══════════════════════════════════════════════════════════════

const Q_SURFACES: EngineQuestion = {
    id: QID.SURFACES,
    title: 'Flächen',
    prompt: 'Welche Flächen wurden gefüllt?',
    severity: 'required',
    answerType: 'multiSelect',
    options: [...SURFACE_CODES],
    fieldsWritten: ['surfaces'],
    order: 10,
};

const Q_MATERIAL: EngineQuestion = {
    id: QID.MATERIAL,
    title: 'Material',
    prompt: 'Welches Füllungsmaterial wurde verwendet?',
    severity: 'required',
    answerType: 'select',
    options: [...MATERIAL_CODES],
    fieldsWritten: ['material'],
    order: 20,
};

const Q_ADHESIVE_MODE: EngineQuestion = {
    id: QID.ADHESIVE_MODE,
    title: 'Adhäsivtechnik',
    prompt: 'Welche Adhäsivtechnik wurde angewendet?',
    severity: 'recommended',
    answerType: 'select',
    options: [...ADHESIVE_MODE_CODES],
    fieldsWritten: ['adhesiveMode'],
    order: 30,
};

const Q_ANESTHESIA: EngineQuestion = {
    id: QID.ANESTHESIA,
    title: 'Anästhesie',
    prompt: 'Wurde eine Anästhesie durchgeführt?',
    severity: 'recommended',
    answerType: 'select',
    options: [...ANESTHESIA_CODES],
    fieldsWritten: ['anesthesia'],
    order: 40,
};

const Q_ISOLATION: EngineQuestion = {
    id: QID.ISOLATION,
    title: 'Trockenlegung',
    prompt: 'Welche Trockenlegung wurde verwendet?',
    severity: 'recommended',
    answerType: 'select',
    options: [...ISOLATION_CODES],
    fieldsWritten: ['isolation'],
    order: 50,
};

const Q_CARIES_DEPTH: EngineQuestion = {
    id: QID.CARIES_DEPTH,
    title: 'Kariestiefe',
    prompt: 'Wie tief war die Karies?',
    severity: 'optional',
    answerType: 'select',
    options: [...CARIES_DEPTH_CODES],
    fieldsWritten: ['cariesDepth'],
    order: 60,
};

const Q_BILLING_MODE: EngineQuestion = {
    id: QID.BILLING_MODE,
    title: 'Abrechnungsart',
    prompt: 'Wie wird die Leistung abgerechnet?',
    severity: 'recommended',
    answerType: 'select',
    options: [...BILLING_MODE_CODES],
    fieldsWritten: ['billingMode'],
    order: 70,
};

const Q_DEVIATION_REASON: EngineQuestion = {
    id: QID.DEVIATION_REASON,
    title: 'Abweichungsgrund',
    prompt: 'Warum wurde von der Planung abgewichen?',
    severity: 'optional',
    answerType: 'select',
    options: [...FILLING_DEVIATION_CODES],
    fieldsWritten: ['fillingDeviationReason'],
    order: 80,
};

// ═══════════════════════════════════════════════════════════════
// QUESTION EVALUATION
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate which questions to ask based on extracted signals.
 * Only asks when signal is missing or ambiguous.
 */
export function evaluateFillingQuestions(
    signals: FillingExtractedSignals
): EngineQuestion[] {
    const questions: EngineQuestion[] = [];

    // 1) SURFACES — always ask if not extracted
    if (!signals.surfaces || signals.surfaces.length === 0) {
        questions.push(Q_SURFACES);
    } else {
        // Pre-fill surfaces as recommended for confirmation
        questions.push({
            ...Q_SURFACES,
            severity: 'recommended',
            defaultValue: signals.surfaces,
        });
    }

    // 2) MATERIAL — always ask (important for billing)
    const materialHint = signals.compositeHint
        ? 'COMPOSITE'
        : signals.glasionomerHint
            ? 'GIC'
            : signals.amalgamHint
                ? 'AMALGAM'
                : signals.temporaryHint
                    ? 'TEMPORARY'
                    : null;

    if (materialHint) {
        questions.push({
            ...Q_MATERIAL,
            severity: 'recommended',
            defaultValue: materialHint,
        });
    } else {
        questions.push(Q_MATERIAL);
    }

    // 3) ADHESIVE MODE — only if composite
    if (signals.compositeHint) {
        questions.push(Q_ADHESIVE_MODE);
    }

    // 4) ANESTHESIA
    if (signals.anesthesiaHint) {
        questions.push({
            ...Q_ANESTHESIA,
            severity: 'optional',
            defaultValue: signals.anesthesiaHint,
        });
    } else {
        questions.push(Q_ANESTHESIA);
    }

    // 5) ISOLATION — ask if not mentioned in dictation
    if (signals.rubberDamHint === true) {
        questions.push({
            ...Q_ISOLATION,
            severity: 'optional',
            defaultValue: 'RUBBER_DAM',
        });
    } else if (signals.rubberDamHint === false) {
        questions.push({
            ...Q_ISOLATION,
            severity: 'optional',
            defaultValue: 'RELATIVE',
        });
    } else {
        questions.push(Q_ISOLATION);
    }

    // 6) CARIES DEPTH — only if hints present
    if (signals.pulpProximalHint) {
        questions.push({
            ...Q_CARIES_DEPTH,
            defaultValue: 'PULP_PROXIMAL',
        });
    } else if (signals.cariesDeepHint) {
        questions.push({
            ...Q_CARIES_DEPTH,
            defaultValue: 'DEEP',
        });
    }

    // 7) BILLING MODE
    if (signals.mehrkostenHint || signals.privateHint) {
        questions.push({
            ...Q_BILLING_MODE,
            defaultValue: signals.privateHint ? 'PRIVATE_ONLY' : 'GKV_PLUS_PRIVATE',
        });
    } else {
        questions.push({
            ...Q_BILLING_MODE,
            defaultValue: 'GKV_ONLY',
        });
    }

    // 8) DEVIATION — only if hint present
    if (signals.deviationHint) {
        questions.push(Q_DEVIATION_REASON);
    }

    // Sort by order
    return questions.sort((a, b) => a.order - b.order);
}

export default evaluateFillingQuestions;
