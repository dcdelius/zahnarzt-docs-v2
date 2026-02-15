/**
 * Extraction → Facts Mapping Layer
 *
 * THE SINGLE source of truth for interpreting raw extraction into TreatmentFacts.
 * No regex/parsing logic should exist elsewhere in the medical layer.
 */

import type { TreatmentFacts } from '../types';
import { buildFuellungFacts } from './maps/fuellung.v1';
import { buildEndoFacts } from './maps/endo.v1';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Loose interface for extraction output.
 * Compatible with stubExtractor and real extractionService output.
 */
export interface ExtractedDataLike {
    /** Primary tooth (first extracted) */
    tooth?: string | null;
    /** All extracted teeth */
    teeth?: Array<{
        tooth: string;
        surfaces?: string[];
        depth?: string;
        notes?: string[];
    }>;
    /** Extracted surfaces */
    surfaces?: string[];
    /** Diagnosis text */
    diagnosis?: string | null;
    /** Mentioned/detected fields */
    mentioned?: Record<string, unknown>;
    /** Missing data gaps */
    gaps?: string[];
    /** Raw dictation text */
    rawDictation?: string;
    /** Costs if mentioned */
    costs?: number | null;
}

export interface BuildFactsParams {
    /** Extracted data from dictation */
    extracted: ExtractedDataLike;
    /** Treatment type */
    treatmentId: 'fuellung' | 'endo';
    /** Instance scope for multi-tooth cases */
    instanceScope?: { tooth?: string };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

/**
 * Build TreatmentFacts from extraction result.
 *
 * This is the ONLY function that should interpret raw extraction.
 * Routes to treatment-specific mappers.
 */
export function buildFactsFromExtraction(params: BuildFactsParams): TreatmentFacts {
    const { extracted, treatmentId, instanceScope } = params;

    // Ensure we have an object to work with
    const safeExtracted: ExtractedDataLike = extracted ?? {};

    switch (treatmentId) {
        case 'fuellung':
            return buildFuellungFacts(safeExtracted, instanceScope);

        case 'endo':
            return buildEndoFacts(safeExtracted, instanceScope);

        default:
            // Fallback for unknown treatments - minimal facts
            return {
                treatmentId: treatmentId as 'fuellung',
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            };
    }
}

// Re-export helpers for testing
export { detectCariesDepth, detectBleeding, detectSensitivity } from './maps/shared.v1';
