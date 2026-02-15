import type { V10ScopedBillingCode, V10TreatmentSegmentInput, InsuranceType } from '../types';
import { checkCombinabilityFromKb, type CombinabilityCheckResult } from './combinability';
import { CANONICAL_CHIP_IDS } from '../../contracts/canonicalIds';

export interface SessionBillingSummary {
    billingCodes: string[];
    billingCodesByTooth: Map<string, string[]>;
    scopedCodes: V10ScopedBillingCode[];
    insuranceType: 'GKV' | 'PKV';
}

export interface UpsellHint {
    type: 'mkv';
    segmentId: string;
    tooth?: string;
    message: string;
    requiredAskbacks: string[];
}

function resolveSessionInsuranceType(segments: V10TreatmentSegmentInput[]): 'GKV' | 'PKV' {
    const hasPKV = segments.some(s => s.insuranceType === 'PKV');
    return hasPKV ? 'PKV' : 'GKV';
}

export function buildSessionBillingSummary(
    scopedCodes: V10ScopedBillingCode[],
    segments: V10TreatmentSegmentInput[]
): SessionBillingSummary {
    const insuranceType = resolveSessionInsuranceType(segments);
    const sessionCodes: string[] = [];
    const codesByTooth = new Map<string, string[]>();

    for (const code of scopedCodes) {
        if (code.scope === 'SESSION') {
            sessionCodes.push(code.code);
        } else {
            sessionCodes.push(code.code);
            if (code.tooth) {
                const list = codesByTooth.get(code.tooth) ?? [];
                list.push(code.code);
                codesByTooth.set(code.tooth, list);
            }
        }
    }

    return {
        billingCodes: sessionCodes,
        billingCodesByTooth: codesByTooth,
        scopedCodes,
        insuranceType,
    };
}

export function runSessionCombinability(
    summary: SessionBillingSummary
): CombinabilityCheckResult {
    return checkCombinabilityFromKb(summary.billingCodes, {
        treatmentId: 'session',
        insuranceType: summary.insuranceType,
        codesByTooth: summary.billingCodesByTooth,
    });
}

export function deriveUpsellHints(
    segments: V10TreatmentSegmentInput[],
    instances: Array<{
        segmentId: string;
        tooth?: string;
        chips: string[];
        insuranceType: InsuranceType;
    }>
): UpsellHint[] {
    const hints: UpsellHint[] = [];

    for (const inst of instances) {
        const segment = segments.find(s => s.segmentId === inst.segmentId);
        if (!segment) continue;
        if (segment.insuranceType !== 'GKV') continue;

        const hasPremiumTechnique =
            inst.chips.includes(CANONICAL_CHIP_IDS.MEHRSCHICHT) ||
            inst.chips.includes(CANONICAL_CHIP_IDS.ADHAESIV);

        if (!hasPremiumTechnique) continue;

        hints.push({
            type: 'mkv',
            segmentId: inst.segmentId,
            tooth: inst.tooth,
            message: 'Mehrkostenvereinbarung prüfen: Premiumtechnik dokumentiert, MKV möglich.',
            requiredAskbacks: ['mkv_vereinbarung', 'mkv_betrag'],
        });
    }

    return hints;
}
