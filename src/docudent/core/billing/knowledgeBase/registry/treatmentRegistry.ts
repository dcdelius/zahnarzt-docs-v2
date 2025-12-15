/**
 * Treatment Registry — Central SSOT for known treatments
 * 
 * This module defines which treatments are supported by the system.
 * All treatment-based loading must validate through this registry.
 * 
 * ❌ NO silent fallback
 * ✅ Explicit errors for unknown treatments
 * ✅ Type-safe treatment IDs
 */

// ═══════════════════════════════════════════════════════════════
// KNOWN TREATMENTS — Add new treatments here
// ═══════════════════════════════════════════════════════════════

export const KNOWN_TREATMENTS = ['fuellung', 'endo'] as const;
export type TreatmentId = typeof KNOWN_TREATMENTS[number];

// ═══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a treatment ID is known.
 */
export function isKnownTreatment(id: string): id is TreatmentId {
    return KNOWN_TREATMENTS.includes(id as TreatmentId);
}

/**
 * Assert that a treatment ID is known.
 * Throws an explicit error if unknown.
 * 
 * @throws Error with message containing "Unknown treatment" and the treatmentId
 */
export function assertKnownTreatment(id: string): asserts id is TreatmentId {
    if (!isKnownTreatment(id)) {
        throw new Error(
            `Unknown treatment: "${id}". ` +
            `Available treatments: ${KNOWN_TREATMENTS.join(', ')}`
        );
    }
}

/**
 * Get a known treatment ID or throw.
 * Useful when you need the typed value returned.
 */
export function getKnownTreatment(id: string): TreatmentId {
    assertKnownTreatment(id);
    return id;
}

// ═══════════════════════════════════════════════════════════════
// TREATMENT CAPABILITIES — What files each treatment has
// ═══════════════════════════════════════════════════════════════

export interface TreatmentCapabilities {
    hasUnified: boolean;
    hasAnswerMap: boolean;
    hasQuestionBank: boolean;
    hasTemplate: boolean;
    hasFindingMap: boolean;
}

const TREATMENT_CAPABILITIES: Record<TreatmentId, TreatmentCapabilities> = {
    fuellung: {
        hasUnified: true,
        hasAnswerMap: true,
        hasQuestionBank: true,
        hasTemplate: true,
        hasFindingMap: true,
    },
    endo: {
        hasUnified: true,
        hasAnswerMap: true,
        hasQuestionBank: true,
        hasTemplate: true,  // Stub template.json created
        hasFindingMap: true,  // Stub finding_map.json created
    },
};

/**
 * Get capabilities for a treatment.
 * Returns which SSOT files are available.
 */
export function getTreatmentCapabilities(id: TreatmentId): TreatmentCapabilities {
    return TREATMENT_CAPABILITIES[id];
}

/**
 * Check if a treatment has a specific file type.
 */
export function hasCapability(
    id: TreatmentId,
    capability: keyof TreatmentCapabilities
): boolean {
    return TREATMENT_CAPABILITIES[id][capability];
}
