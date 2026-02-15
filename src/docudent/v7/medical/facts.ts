/**
 * V7 Medical Layer — Facts Creation & Application
 *
 * Creates TreatmentFacts from extraction and applies answers to update facts.
 * Uses KB SSOT for defaults and normalization.
 * 
 * IMPORTANT: Raw extraction interpretation is delegated to extractionToFacts/
 * This file only handles answer application and safe defaults.
 */

import type {
    TreatmentFacts,
    CariesDepth,
    YesNoUnknown,
    CappingFact,
    CounselingFact,
} from './types';
import { MEDICAL_QUESTION_IDS } from './types';
import { buildFactsFromExtraction, type ExtractedDataLike } from './extractionToFacts';

/**
 * Normalize boolean/string inputs to YesNoUnknown
 */
export function normalizeYesNo(value: unknown): YesNoUnknown {
    if (value === true || value === 'ja' || value === 'yes' || value === 'Ja') {
        return 'yes';
    }
    if (value === false || value === 'nein' || value === 'no' || value === 'Nein') {
        return 'no';
    }
    return 'unknown';
}

/**
 * Normalize caries depth from extraction or answers
 */
export function normalizeCariesDepth(value: unknown): CariesDepth {
    if (typeof value !== 'string') return 'unknown';
    const lower = value.toLowerCase();
    if (lower === 'profunda' || lower === 'caries profunda') return 'profunda';
    if (lower === 'pulpanah' || lower === 'tief' || lower === 'deep' || lower === 'pulp_near') return 'pulp_near';
    if (lower === 'normal' || lower === 'media' || lower === 'caries media') return 'normal';
    return 'unknown';
}

/**
 * Create facts from extraction result.
 * 
 * Delegates to extractionToFacts mapping layer for raw interpretation.
 * This keeps extraction logic in ONE place.
 */
export function createFactsFromExtracted(
    extracted: Record<string, unknown> | null | undefined,
    treatmentId: 'fuellung' | 'endo' = 'fuellung',
    instanceScope?: { tooth?: string }
): TreatmentFacts {
    // Delegate to mapping layer - it handles all raw extraction interpretation
    return buildFactsFromExtraction({
        extracted: (extracted ?? {}) as ExtractedDataLike,
        treatmentId,
        instanceScope,
    });
}

/**
 * Apply user answers to facts
 * Accepts both:
 * - Namespaced IDs: medical_ueberkappung, medical_counsel_pulpitis_risk
 * - Canonical keys: ueberkappung, counsel_pulpitis_risk
 */
export function applyAnswersToFacts(
    facts: TreatmentFacts,
    answers: Map<string, unknown> | Record<string, unknown>
): TreatmentFacts {
    const answerMap = answers instanceof Map ? answers : new Map(Object.entries(answers));

    // Create a new facts object to avoid mutation
    const newFacts: TreatmentFacts = {
        ...facts,
        capping: { ...facts.capping },
        counseling: { ...facts.counseling },
    };

    // Helper to get answer by multiple possible keys
    const getAnswer = (...keys: string[]): unknown => {
        for (const key of keys) {
            if (answerMap.has(key)) {
                return answerMap.get(key);
            }
        }
        return undefined;
    };

    // Apply ueberkappung answer
    const cappingAnswer = getAnswer(
        MEDICAL_QUESTION_IDS.UEBERKAPPUNG,
        'ueberkappung',
        'forensic_capping',
        'capping'
    );
    if (cappingAnswer !== undefined) {
        newFacts.capping.performed = normalizeYesNo(cappingAnswer);
    }

    // Apply ueberkappung material
    const materialAnswer = getAnswer(
        MEDICAL_QUESTION_IDS.UEBERKAPPUNG_MATERIAL,
        'ueberkappung_material',
        'material'
    );
    if (materialAnswer !== undefined && typeof materialAnswer === 'string') {
        const materialMap: Record<string, CappingFact['material']> = {
            'caoh': 'Ca(OH)₂',
            'ca(oh)2': 'Ca(OH)₂',
            'Ca(OH)₂': 'Ca(OH)₂',
            'mta': 'MTA',
            'MTA': 'MTA',
            'biodentine': 'Biodentine',
            'Biodentine': 'Biodentine',
        };
        newFacts.capping.material = materialMap[materialAnswer.toLowerCase()] ?? materialAnswer as CappingFact['material'];
    }

    // Apply counseling answer
    const counselAnswer = getAnswer(
        MEDICAL_QUESTION_IDS.COUNSEL_PULPITIS_RISK,
        'counsel_pulpitis_risk',
        'pulpitis_risk'
    );
    if (counselAnswer !== undefined) {
        newFacts.counseling.pulpitisRisk = normalizeYesNo(counselAnswer);
    }

    // Apply tiefe/depth if answered
    const tiefeAnswer = getAnswer('tiefe', 'cavity_depth', 'forensic_tiefe');
    if (tiefeAnswer !== undefined) {
        newFacts.cariesDepth = normalizeCariesDepth(tiefeAnswer);
    }

    // Apply hemostasis answer (bleeding.hemostasisPerformed)
    const hemostasisAnswer = getAnswer('medical_hemostasis', 'hemostasis');
    if (hemostasisAnswer !== undefined) {
        newFacts.bleeding = {
            ...newFacts.bleeding,
            detected: newFacts.bleeding?.detected ?? 'unknown',
            hemostasisPerformed: normalizeYesNo(hemostasisAnswer),
        };
    }

    // Apply sensitivity followup answer (sensitivity.desensitizerApplied)
    const sensitivityAnswer = getAnswer('medical_sensitivity_followup', 'sensitivity_followup');
    if (sensitivityAnswer !== undefined) {
        newFacts.sensitivity = {
            ...newFacts.sensitivity,
            reported: newFacts.sensitivity?.reported ?? 'unknown',
            desensitizerApplied: normalizeYesNo(sensitivityAnswer),
        };
    }

    return newFacts;
}
