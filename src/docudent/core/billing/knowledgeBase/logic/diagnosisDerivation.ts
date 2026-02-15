/**
 * Diagnosis Derivation — Engine Logic
 *
 * SSOT: Extraction extracts FACTS (keywordFlags).
 * Engine DERIVES diagnosis from facts.
 *
 * Rule: keywordFlags → diagnosis
 */

import type { KeywordFlags } from '../../../../contracts/extraction';

// ═══════════════════════════════════════════════════════════════
// DIAGNOSIS TYPES
// ═══════════════════════════════════════════════════════════════

export type DiagnosisCode =
    | 'caries_profunda'
    | 'caries_media'
    | 'caries_superficialis'
    | 'fraktur'
    | 'unknown';

export interface DerivedDiagnosis {
    code: DiagnosisCode;
    label: string;
    /** CP-eligible (pulpanah) */
    cpEligible: boolean;
    /** Requires deep cavity documentation */
    requiresTiefeDocumentation: boolean;
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * deriveDiagnosis — Engine logic to interpret keyword flags into diagnosis
 *
 * This is where interpretation happens, NOT in extraction.
 *
 * Priority order:
 * 1. Fracture (explicit)
 * 2. Deep cavity → Caries profunda
 * 3. Superficial → Caries superficialis
 * 4. Generic caries → Caries media
 * 5. Unknown
 */
export function deriveDiagnosis(flags: KeywordFlags): DerivedDiagnosis {
    // Priority 1: Fracture
    if (flags.saidFracture) {
        return {
            code: 'fraktur',
            label: 'Fraktur',
            cpEligible: false,
            requiresTiefeDocumentation: false,
        };
    }

    // Priority 2: Deep cavity → Caries profunda (CP eligible)
    if (flags.saidDeepCavity) {
        return {
            code: 'caries_profunda',
            label: 'Caries profunda',
            cpEligible: true,
            requiresTiefeDocumentation: true,
        };
    }

    // Priority 3: Superficial → Caries superficialis
    if (flags.saidSuperficial) {
        return {
            code: 'caries_superficialis',
            label: 'Caries superficialis',
            cpEligible: false,
            requiresTiefeDocumentation: false,
        };
    }

    // Priority 4: Generic caries → Caries media
    if (flags.saidCaries) {
        return {
            code: 'caries_media',
            label: 'Caries media',
            cpEligible: false,
            requiresTiefeDocumentation: false,
        };
    }

    // Unknown
    return {
        code: 'unknown',
        label: 'Diagnose unbekannt',
        cpEligible: false,
        requiresTiefeDocumentation: false,
    };
}

/**
 * getDiagnosisLabel — Simple label lookup for UI
 */
export function getDiagnosisLabel(code: DiagnosisCode): string {
    const labels: Record<DiagnosisCode, string> = {
        caries_profunda: 'Caries profunda',
        caries_media: 'Caries media',
        caries_superficialis: 'Caries superficialis',
        fraktur: 'Fraktur',
        unknown: 'Diagnose unbekannt',
    };
    return labels[code];
}
