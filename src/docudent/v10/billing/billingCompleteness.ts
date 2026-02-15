/**
 * Billing Completeness Checker
 *
 * GIGAPROMPT 4: Computes billing completeness for Fuellung cases.
 * Every billing code must have a traceable origin from KB.
 *
 * Origins:
 * - chip.billingRef: Direct billing from chip definition
 * - surface_mapping: F-code derived from surface count
 * - dropped_by_combinability: Code was generated but dropped by autoResolve
 */

import type { BillingDbTreatment } from './billingDb';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BillingOrigin = 'chip.billingRef' | 'surface_mapping' | 'dropped_by_combinability';

export interface BillingOriginEntry {
    code: string;
    origin: BillingOrigin;
    ref: string;  // chipId, surface count, or ruleId
}

export interface BillingCompleteMissing {
    instanceId: string;
    reason: string;
    hint?: string;
}

export interface BillingCompletenessResult {
    isComplete: boolean;
    missing: BillingCompleteMissing[];
    origins: BillingOriginEntry[];
}

interface PerInstanceData {
    instanceId: string;
    chips: string[];
    billingRefs: string[];
}

interface CombinabilityData {
    droppedCodes: string[];
    conflicts: Array<{ ruleId: string; codesInvolved?: string[] }>;
}

interface TreatmentKbChip {
    id: string;
    billingRef?: {
        GKV?: string;
        PKV?: string;
        MKV?: string;
    } | null;
    hinweis?: string;
}

interface TreatmentKb {
    _meta: { id: string; version: string };
    chips: TreatmentKbChip[];
    surface_mapping?: Record<string, {
        GKV?: string;
        PKV?: string;
        MKV?: string;
        MKV_addon?: string;
    }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute billing completeness for a V10 pipeline output.
 *
 * @param perInstance - Per-instance data with chips and billing refs
 * @param insuranceType - Insurance type (GKV, PKV, MKV)
 * @param finalBillingCodes - Final aggregated billing codes after combinability
 * @param combinabilityResult - Optional combinability result with dropped codes
 * @param treatmentKb - Treatment KB for lookups (required for SSOT)
 * @returns BillingCompletenessResult with isComplete flag, missing items, and origins
 */
export function computeBillingCompleteness(
    perInstance: Record<string, PerInstanceData>,
    insuranceType: 'GKV' | 'PKV' | 'MKV',
    finalBillingCodes: string[],
    combinabilityResult?: CombinabilityData,
    treatmentKb?: TreatmentKb,
    billingDb?: BillingDbTreatment
): BillingCompletenessResult {
    const origins: BillingOriginEntry[] = [];
    const missing: BillingCompleteMissing[] = [];
    const coveredCodes = new Set<string>();

    if (!treatmentKb) {
        for (const [instanceId, data] of Object.entries(perInstance)) {
            for (const billingCode of data.billingRefs) {
                if (coveredCodes.has(billingCode)) continue;
                missing.push({
                    instanceId,
                    reason: `Missing treatment KB for billing code: ${billingCode}`,
                    hint: 'Provide treatment KB to trace origin via chip billingRef or surface_mapping',
                });
                coveredCodes.add(billingCode);
            }
        }
        for (const code of finalBillingCodes) {
            if (!coveredCodes.has(code)) {
                missing.push({
                    instanceId: 'global',
                    reason: `Final billing code has no origin (KB missing): ${code}`,
                    hint: 'Provide treatment KB to trace origin via chip billingRef or surface_mapping',
                });
                coveredCodes.add(code);
            }
        }
        return {
            isComplete: false,
            missing,
            origins,
        };
    }

    // Step 1: Map dropped codes from combinability
    if (combinabilityResult?.droppedCodes) {
        for (const droppedCode of combinabilityResult.droppedCodes) {
            const conflict = combinabilityResult.conflicts.find(c =>
                c.codesInvolved?.includes(droppedCode)
            );
            origins.push({
                code: droppedCode,
                origin: 'dropped_by_combinability',
                ref: conflict?.ruleId ?? 'unknown_rule',
            });
        }
    }

    // Step 2: For each perInstance, trace billing codes to their chip origin
    for (const [instanceId, data] of Object.entries(perInstance)) {
        for (const billingCode of data.billingRefs) {
            if (coveredCodes.has(billingCode)) continue;

            // Try to find origin from chips
            const originEntry = findBillingOrigin(
                billingCode,
                data.chips,
                insuranceType,
                treatmentKb,
                billingDb
            );

            if (originEntry) {
                origins.push(originEntry);
                coveredCodes.add(billingCode);
            } else {
                missing.push({
                    instanceId,
                    reason: `No KB origin for billing code: ${billingCode}`,
                    hint: `Check chip billingRef or surface_mapping for ${insuranceType} branch`,
                });
            }
        }
    }

    // Step 3: Verify all finalBillingCodes are covered
    for (const code of finalBillingCodes) {
        if (!coveredCodes.has(code)) {
            // Check if it's a dropped code (already tracked)
            const isDropped = combinabilityResult?.droppedCodes?.includes(code);
            if (!isDropped) {
                missing.push({
                    instanceId: 'global',
                    reason: `Final billing code has no origin: ${code}`,
                    hint: 'Code appears in output but not traced to any chip or surface_mapping',
                });
            }
        }
    }

    return {
        isComplete: missing.length === 0,
        missing,
        origins,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find the origin of a billing code from chips or surface_mapping.
 */
function findBillingOrigin(
    billingCode: string,
    chips: string[],
    insuranceType: 'GKV' | 'PKV' | 'MKV',
    treatmentKb?: TreatmentKb,
    billingDb?: BillingDbTreatment
): BillingOriginEntry | null {
    if (billingDb) {
        const origin = findBillingOriginFromDb(billingCode, chips, insuranceType, billingDb);
        if (origin) return origin;
    }
    if (!treatmentKb) return null;

    // Check each chip for billingRef match
    for (const chipId of chips) {
        const chip = treatmentKb.chips.find(c => c.id === chipId);
        if (!chip) continue;

        if (chip.billingRef) {
            const branch = insuranceType === 'MKV' ? 'GKV' : insuranceType;
            const refCode = chip.billingRef[branch] ?? chip.billingRef[insuranceType as 'GKV' | 'PKV'];
            if (refCode === billingCode) {
                return {
                    code: billingCode,
                    origin: 'chip.billingRef',
                    ref: chipId,
                };
            }
            // MKV special: check MKV branch
            if (insuranceType === 'MKV' && (chip.billingRef as { MKV?: string }).MKV === billingCode) {
                return {
                    code: billingCode,
                    origin: 'chip.billingRef',
                    ref: chipId,
                };
            }
        }

        // Check if chip uses surface_mapping (billingRef === null with hinweis)
        if (chip.billingRef === null && chip.hinweis?.toLowerCase().includes('surface_mapping')) {
            // Check surface_mapping for this code
            const surfaceOrigin = findSurfaceMappingOrigin(billingCode, insuranceType, treatmentKb.surface_mapping);
            if (surfaceOrigin) {
                return {
                    code: billingCode,
                    origin: 'surface_mapping',
                    ref: `${chipId}:${surfaceOrigin}`,
                };
            }
        }
    }

    // Direct surface_mapping check for F-codes
    if (isFCode(billingCode)) {
        const surfaceOrigin = findSurfaceMappingOrigin(billingCode, insuranceType, treatmentKb.surface_mapping);
        if (surfaceOrigin) {
            return {
                code: billingCode,
                origin: 'surface_mapping',
                ref: surfaceOrigin,
            };
        }
    }

    return null;
}

/**
 * Find surface mapping origin for a billing code.
 */
function findSurfaceMappingOrigin(
    billingCode: string,
    insuranceType: 'GKV' | 'PKV' | 'MKV',
    surfaceMapping?: TreatmentKb['surface_mapping']
): string | null {
    if (!surfaceMapping) return null;

    for (const [surfaceCount, branches] of Object.entries(surfaceMapping)) {
        const branch = insuranceType === 'MKV' ? 'MKV' : insuranceType;
        if (branches[branch as keyof typeof branches] === billingCode) {
            return `surface_count:${surfaceCount}`;
        }
        // MKV addon
        if (insuranceType === 'MKV' && branches.MKV_addon === billingCode) {
            return `surface_count:${surfaceCount}:addon`;
        }
        // Fallback to GKV for MKV base
        if (insuranceType === 'MKV' && branches.GKV === billingCode) {
            return `surface_count:${surfaceCount}`;
        }
    }

    return null;
}

function findBillingOriginFromDb(
    billingCode: string,
    chips: string[],
    insuranceType: 'GKV' | 'PKV' | 'MKV',
    billingDb: BillingDbTreatment
): BillingOriginEntry | null {
    const surfaceMapped = new Set(billingDb.surfaceMappedChips ?? []);

    for (const chipId of chips) {
        const ref = billingDb.billingRefs?.[chipId];
        if (ref) {
            const branch = insuranceType === 'MKV' ? 'GKV' : insuranceType;
            const refCode = ref[branch] ?? ref[insuranceType as 'GKV' | 'PKV'];
            if (refCode === billingCode) {
                return {
                    code: billingCode,
                    origin: 'chip.billingRef',
                    ref: chipId,
                };
            }
            if (insuranceType === 'MKV' && ref.MKV === billingCode) {
                return {
                    code: billingCode,
                    origin: 'chip.billingRef',
                    ref: chipId,
                };
            }
        }

        if (surfaceMapped.has(chipId)) {
            const surfaceOrigin = findSurfaceMappingOrigin(
                billingCode,
                insuranceType,
                billingDb.surfaceMapping
            );
            if (surfaceOrigin) {
                return {
                    code: billingCode,
                    origin: 'surface_mapping',
                    ref: `${chipId}:${surfaceOrigin}`,
                };
            }
        }
    }

    if (isFCode(billingCode)) {
        const surfaceOrigin = findSurfaceMappingOrigin(
            billingCode,
            insuranceType,
            billingDb.surfaceMapping
        );
        if (surfaceOrigin) {
            return {
                code: billingCode,
                origin: 'surface_mapping',
                ref: surfaceOrigin,
            };
        }
    }

    return null;
}

/**
 * Check if a billing code is an F-code (filling surface code).
 */
function isFCode(code: string): boolean {
    // BEMA F-codes: BEMA_13, BEMA_13b, BEMA_13c, BEMA_13d
    if (code.startsWith('BEMA_13')) return true;
    // GOZ F-codes: GOZ_2060, GOZ_2080, GOZ_2100, GOZ_2120
    if (['GOZ_2060', 'GOZ_2080', 'GOZ_2100', 'GOZ_2120'].includes(code)) return true;
    return false;
}
