/**
 * M45: usePackUiContract — Contract Resolver for Pack-Driven UI
 * 
 * Resolves PackUiContractV1 for single and multi-instance modes.
 * UI components use this to render controls, settings, askback policy.
 */

import { useMemo } from 'react';
import { getPack, listPackIds } from '../packs';
import type {
    PackUiContractV1,
    ChipControlSpec,
    SettingsSchemaV1,
    AskbackPolicyV1
} from '../packs/types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TreatmentInstance {
    instanceId: string;
    treatmentId: string;
    tooth?: string;
}

export interface InstanceContract {
    instanceId: string;
    treatmentId: string;
    contract: PackUiContractV1;
}

export interface ResolvedContracts {
    /** Per-instance contracts */
    instances: InstanceContract[];

    /** Merged chip controls (for multi: union of all) */
    mergedChipControls: ChipControlSpec[];

    /** Merged critical askbacks (union of all) */
    mergedCriticalAskbacks: string[];

    /** Is any pack missing contract? */
    hasUnsupported: boolean;

    /** Unsupported pack IDs */
    unsupportedPacks: string[];
}

// ═══════════════════════════════════════════════════════════════
// RESOLVER
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve contract for a single pack.
 */
export function resolvePackContract(treatmentId: string): PackUiContractV1 | null {
    const pack = getPack(treatmentId);
    if (!pack) return null;

    try {
        return pack.getUiContract();
    } catch {
        return null;
    }
}

/**
 * Resolve contracts for multiple instances.
 */
export function resolveMultiContracts(instances: TreatmentInstance[]): ResolvedContracts {
    const instanceContracts: InstanceContract[] = [];
    const unsupportedPacks: string[] = [];

    for (const inst of instances) {
        const contract = resolvePackContract(inst.treatmentId);
        if (contract) {
            instanceContracts.push({
                instanceId: inst.instanceId,
                treatmentId: inst.treatmentId,
                contract,
            });
        } else {
            unsupportedPacks.push(inst.treatmentId);
        }
    }

    // Merge chip controls (dedupe by chipId)
    const chipMap = new Map<string, ChipControlSpec>();
    for (const ic of instanceContracts) {
        for (const ctrl of ic.contract.chipControls) {
            if (!chipMap.has(ctrl.chipId)) {
                chipMap.set(ctrl.chipId, ctrl);
            }
        }
    }

    // Merge critical askbacks
    const criticalSet = new Set<string>();
    for (const ic of instanceContracts) {
        for (const askback of ic.contract.askbackPolicy.criticalAskbacks) {
            criticalSet.add(askback);
        }
    }

    return {
        instances: instanceContracts,
        mergedChipControls: Array.from(chipMap.values()),
        mergedCriticalAskbacks: Array.from(criticalSet),
        hasUnsupported: unsupportedPacks.length > 0,
        unsupportedPacks,
    };
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

interface UsePackUiContractOptions {
    /** Single mode: just one treatment */
    treatmentId?: string;
    /** Multi mode: array of instances */
    instances?: TreatmentInstance[];
}

/**
 * React hook for resolving pack UI contracts.
 * 
 * Usage (single):
 * ```
 * const { contract, isSupported } = usePackUiContract({ treatmentId: 'endo' });
 * ```
 * 
 * Usage (multi):
 * ```
 * const { resolved } = usePackUiContract({
 *   instances: [{ instanceId: 'i1', treatmentId: 'endo' }]
 * });
 * ```
 */
export function usePackUiContract(options: UsePackUiContractOptions) {
    const { treatmentId, instances } = options;

    // Single mode
    const singleContract = useMemo(() => {
        if (!treatmentId) return null;
        return resolvePackContract(treatmentId);
    }, [treatmentId]);

    // Multi mode
    const multiResolved = useMemo(() => {
        if (!instances || instances.length === 0) return null;
        return resolveMultiContracts(instances);
    }, [instances]);

    // Determine mode
    const isMulti = !!instances && instances.length > 0;

    return {
        // Single mode
        contract: singleContract,
        isSupported: singleContract !== null,

        // Multi mode
        resolved: multiResolved,

        // Helpers
        isMulti,
        hasUnsupported: multiResolved?.hasUnsupported ?? (treatmentId ? !singleContract : false),

        // Contract access by instance
        getContractForInstance: (instanceId: string): PackUiContractV1 | null => {
            if (!multiResolved) return singleContract;
            const ic = multiResolved.instances.find(i => i.instanceId === instanceId);
            return ic?.contract ?? null;
        },

        // Settings schema (merged for multi)
        getSettingsSchema: (): SettingsSchemaV1 | null => {
            if (singleContract) return singleContract.settingsSchema;
            if (!multiResolved || multiResolved.instances.length === 0) return null;

            // For multi: merge practice/user arrays
            const practice: SettingsSchemaV1['practice'] = [];
            const user: SettingsSchemaV1['user'] = [];
            const seenPractice = new Set<string>();
            const seenUser = new Set<string>();

            for (const ic of multiResolved.instances) {
                for (const p of ic.contract.settingsSchema.practice) {
                    if (!seenPractice.has(p.key)) {
                        practice.push(p);
                        seenPractice.add(p.key);
                    }
                }
                for (const u of ic.contract.settingsSchema.user) {
                    if (!seenUser.has(u.key)) {
                        user.push(u);
                        seenUser.add(u.key);
                    }
                }
            }

            return { practice, user };
        },

        // Askback policy (merged for multi)
        getAskbackPolicy: (): AskbackPolicyV1 | null => {
            if (singleContract) return singleContract.askbackPolicy;
            if (!multiResolved) return null;

            const critical = new Set<string>();
            const skippable = new Set<string>();

            for (const ic of multiResolved.instances) {
                ic.contract.askbackPolicy.criticalAskbacks.forEach(a => critical.add(a));
                ic.contract.askbackPolicy.skippableAskbacks?.forEach(a => skippable.add(a));
            }

            // Critical wins over skippable
            for (const c of critical) {
                skippable.delete(c);
            }

            return {
                criticalAskbacks: Array.from(critical),
                skippableAskbacks: Array.from(skippable),
            };
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Check if an askback is critical (cannot be skipped).
 */
export function isCriticalAskback(askbackId: string, contract: PackUiContractV1): boolean {
    return contract.askbackPolicy.criticalAskbacks.includes(askbackId);
}

/**
 * Check if an askback can be skipped via settings.
 */
export function canSkipAskback(askbackId: string, contract: PackUiContractV1): boolean {
    if (isCriticalAskback(askbackId, contract)) return false;
    return contract.askbackPolicy.skippableAskbacks?.includes(askbackId) ?? false;
}

/**
 * Get chip controls grouped by group property.
 */
export function getGroupedControls(contract: PackUiContractV1): {
    relevant: ChipControlSpec[];
    optional: ChipControlSpec[];
    advanced: ChipControlSpec[];
} {
    const relevant: ChipControlSpec[] = [];
    const optional: ChipControlSpec[] = [];
    const advanced: ChipControlSpec[] = [];

    for (const ctrl of contract.chipControls) {
        switch (ctrl.group) {
            case 'relevant':
                relevant.push(ctrl);
                break;
            case 'optional':
                optional.push(ctrl);
                break;
            case 'advanced':
                advanced.push(ctrl);
                break;
            default:
                optional.push(ctrl);
        }
    }

    return { relevant, optional, advanced };
}
