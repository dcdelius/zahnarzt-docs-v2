import type { PracticeSettings, UserSettings } from './settingsTypes';

export interface HierarchyReconcileResult {
    user: UserSettings;
    changed: boolean;
}

const FUELLUNG_MATERIAL_KEYS = [
    'defaultCompositeMaterialId',
    'defaultBulkMaterialId',
    'defaultFlowableMaterialId',
    'defaultAdhesiveMaterialId',
    'defaultEtchMaterialId',
] as const;

function toUniqueStringList(values?: string[]): string[] | undefined {
    if (!Array.isArray(values)) return undefined;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of values) {
        const id = String(raw ?? '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

/**
 * Enforces hierarchy:
 * - User treatment enablement must stay inside practice-enabled treatments.
 * - User fuellung material defaults must be selected from the practice catalog pool (if defined).
 */
export function reconcileUserWithPracticeHierarchy(
    practice: PracticeSettings | undefined,
    user: UserSettings
): HierarchyReconcileResult {
    let nextUser = user;
    let changed = false;

    const practiceEnabled = toUniqueStringList(practice?.enabledTreatments);
    if (practiceEnabled && practiceEnabled.length > 0) {
        const userEnabled = toUniqueStringList(user.enabledTreatments);
        const lockEnabledTreatments = practice?.lockUserOverrides?.enabledTreatments === true;

        if (lockEnabledTreatments) {
            if (!userEnabled || userEnabled.join('|') !== practiceEnabled.join('|')) {
                nextUser = { ...nextUser, enabledTreatments: practiceEnabled };
                changed = true;
            }
        } else if (userEnabled && userEnabled.length > 0) {
            const allowed = new Set(practiceEnabled);
            const filtered = userEnabled.filter(id => allowed.has(id));
            if (filtered.length !== userEnabled.length) {
                nextUser = { ...nextUser, enabledTreatments: filtered };
                changed = true;
            }
        }
    }

    const practiceFuellungCatalog = toUniqueStringList(practice?.materialCatalog?.fuellung);
    if (practiceFuellungCatalog && practiceFuellungCatalog.length > 0) {
        const allowedCatalog = new Set(practiceFuellungCatalog);
        const fuellung = nextUser.treatments?.fuellung;
        if (fuellung) {
            let fuellungNext = fuellung;
            let fuellungChanged = false;

            for (const key of FUELLUNG_MATERIAL_KEYS) {
                const value = fuellungNext[key];
                if (practice?.lockUserOverrides?.fuellungMaterialDefaults === true && value !== undefined) {
                    fuellungNext = { ...fuellungNext, [key]: undefined };
                    fuellungChanged = true;
                    continue;
                }
                if (value && !allowedCatalog.has(value)) {
                    fuellungNext = { ...fuellungNext, [key]: undefined };
                    fuellungChanged = true;
                }
            }

            if (fuellungChanged) {
                nextUser = {
                    ...nextUser,
                    treatments: {
                        ...(nextUser.treatments ?? {}),
                        fuellung: fuellungNext,
                    },
                };
                changed = true;
            }
        }
    }

    return { user: nextUser, changed };
}
