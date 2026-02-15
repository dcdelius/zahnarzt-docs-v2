/**
 * V10 KZV Treatment Registry — minimal SSOT for KZV composer
 */

export const KNOWN_TREATMENTS = ['fuellung', 'endo'] as const;
export type TreatmentId = typeof KNOWN_TREATMENTS[number];

export function isKnownTreatment(id: string): id is TreatmentId {
    return KNOWN_TREATMENTS.includes(id as TreatmentId);
}

export function assertKnownTreatment(id: string): asserts id is TreatmentId {
    if (!isKnownTreatment(id)) {
        throw new Error(`Unknown treatment: "${id}". Available: ${KNOWN_TREATMENTS.join(', ')}`);
    }
}

export interface TreatmentCapabilities {
    hasTemplate: boolean;
    hasFindingMap: boolean;
}

const TREATMENT_CAPABILITIES: Record<TreatmentId, TreatmentCapabilities> = {
    fuellung: { hasTemplate: true, hasFindingMap: true },
    endo: { hasTemplate: true, hasFindingMap: true },
};

export function hasCapability(
    id: TreatmentId,
    capability: keyof TreatmentCapabilities
): boolean {
    return TREATMENT_CAPABILITIES[id][capability];
}
