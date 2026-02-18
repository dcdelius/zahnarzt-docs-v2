import {
    V10_KZV_TREATMENT_IDS,
    type KzvTreatmentId,
} from '@/docudent/contracts/treatments.manifest';

/**
 * V10 KZV Treatment Registry — minimal SSOT for KZV composer
 */

export const KNOWN_TREATMENTS = [...V10_KZV_TREATMENT_IDS] as const;
export type TreatmentId = KzvTreatmentId;

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

const TREATMENT_CAPABILITIES = Object.fromEntries(
    KNOWN_TREATMENTS.map(id => [id, { hasTemplate: true, hasFindingMap: true }])
) as Record<TreatmentId, TreatmentCapabilities>;

export function hasCapability(
    id: TreatmentId,
    capability: keyof TreatmentCapabilities
): boolean {
    return TREATMENT_CAPABILITIES[id][capability];
}
