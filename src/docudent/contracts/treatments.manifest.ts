/**
 * Treatment Manifest — Single source of truth for treatment wiring.
 *
 * This file is the canonical source for all treatment allowlists across:
 * - core billing registry
 * - V10 KZV registry
 * - preanalysis/classifier routing
 * - UI selector filtering
 * - case typing
 */

export type TreatmentStatus = 'active' | 'beta' | 'planned';

export const TREATMENT_TARGET_20_IDS = [
    'fuellung',
    'endo',
    'extraction',
    'crown_prep',
    'pzr',
    'ueberkappung',
    'fissurenversiegelung',
    'parodontologie',
    'upt',
    'wsr',
    'trauma',
    'implant',
    'krone',
    'teilkrone',
    'bruecke',
    'teilprothese',
    'totalprothese',
    'schiene',
    'untersuchung',
    'roentgen',
] as const;

export type ManifestTreatmentId = typeof TREATMENT_TARGET_20_IDS[number];

export const TREATMENT_MANIFEST_META: Record<ManifestTreatmentId, {
    status: TreatmentStatus;
    label: string;
}> = {
    fuellung: { status: 'active', label: 'Fuellung' },
    endo: { status: 'active', label: 'Endo' },
    extraction: { status: 'active', label: 'Extraktion' },
    crown_prep: { status: 'active', label: 'Kronenpraeparation' },
    pzr: { status: 'active', label: 'PZR' },
    ueberkappung: { status: 'beta', label: 'Ueberkappung' },
    fissurenversiegelung: { status: 'beta', label: 'Fissurenversiegelung' },
    parodontologie: { status: 'beta', label: 'Parodontologie' },
    upt: { status: 'beta', label: 'UPT' },
    wsr: { status: 'beta', label: 'WSR' },
    trauma: { status: 'beta', label: 'Trauma' },
    implant: { status: 'beta', label: 'Implant' },
    krone: { status: 'beta', label: 'Krone' },
    teilkrone: { status: 'beta', label: 'Teilkrone' },
    bruecke: { status: 'beta', label: 'Bruecke' },
    teilprothese: { status: 'beta', label: 'Teilprothese' },
    totalprothese: { status: 'beta', label: 'Totalprothese' },
    schiene: { status: 'beta', label: 'Schiene' },
    untersuchung: { status: 'beta', label: 'Untersuchung' },
    roentgen: { status: 'beta', label: 'Roentgen' },
};

/**
 * Core billing knowledge base registry allowlist.
 */
export const CORE_BILLING_TREATMENT_IDS = [
    'fuellung',
    'endo',
    'extraction',
    'pzr',
    'crown_prep',
    'ueberkappung',
    'fissurenversiegelung',
    'parodontologie',
    'upt',
    'wsr',
    'trauma',
    'implant',
    'krone',
    'teilkrone',
    'bruecke',
    'teilprothese',
    'totalprothese',
    'schiene',
    'untersuchung',
    'roentgen',
] as const satisfies readonly ManifestTreatmentId[];

/**
 * V10 pack registry allowlist.
 * Includes extraction_stub for dry-run UI/testing only.
 */
export const V10_PACK_TREATMENT_IDS = [
    'fuellung',
    'endo',
    'extraction',
    'pzr',
    'crown_prep',
    'ueberkappung',
    'fissurenversiegelung',
    'parodontologie',
    'upt',
    'wsr',
    'trauma',
    'implant',
    'krone',
    'teilkrone',
    'bruecke',
    'teilprothese',
    'totalprothese',
    'schiene',
    'untersuchung',
    'roentgen',
    'extraction_stub',
] as const;

export type V10PackTreatmentId = typeof V10_PACK_TREATMENT_IDS[number];

/**
 * Treatments allowed for V10 KZV template/finding-map runtime.
 */
export const V10_KZV_TREATMENT_IDS = [
    ...TREATMENT_TARGET_20_IDS,
] as const satisfies readonly ManifestTreatmentId[];

/**
 * Treatments allowed in preanalysis intent contract and fallback options.
 */
export const PREANALYSIS_TREATMENT_IDS_V1 = [
    'fuellung',
    'endo',
    'extraction',
    'pzr',
    'crown_prep',
    'ueberkappung',
    'fissurenversiegelung',
    'parodontologie',
    'upt',
    'wsr',
    'trauma',
    'implant',
    'krone',
    'teilkrone',
    'bruecke',
    'teilprothese',
    'totalprothese',
    'schiene',
    'untersuchung',
    'roentgen',
] as const satisfies readonly ManifestTreatmentId[];

/**
 * Treatments supported by deterministic keyword classifier.
 */
export const CLASSIFIER_TREATMENT_IDS = [
    'fuellung',
    'endo',
    'extraction',
    'pzr',
    'crown_prep',
    'ueberkappung',
    'fissurenversiegelung',
    'parodontologie',
    'upt',
    'wsr',
    'trauma',
    'implant',
    'krone',
    'teilkrone',
    'bruecke',
    'teilprothese',
    'totalprothese',
    'schiene',
    'untersuchung',
    'roentgen',
] as const satisfies readonly ManifestTreatmentId[];

/**
 * Treatments shown in the V10 selector UI.
 */
export const UI_SELECTOR_TREATMENT_IDS = [
    'fuellung',
    'endo',
    'extraction',
    'pzr',
    'crown_prep',
    'ueberkappung',
    'fissurenversiegelung',
    'parodontologie',
    'upt',
    'trauma',
    'wsr',
    'implant',
    'krone',
    'teilkrone',
    'bruecke',
    'teilprothese',
    'totalprothese',
    'schiene',
    'untersuchung',
    'roentgen',
] as const satisfies readonly ManifestTreatmentId[];

export type CoreBillingTreatmentId = typeof CORE_BILLING_TREATMENT_IDS[number];
export type KzvTreatmentId = typeof V10_KZV_TREATMENT_IDS[number];
export type PreanalysisTreatmentId = typeof PREANALYSIS_TREATMENT_IDS_V1[number];
export type ClassifierTreatmentId = typeof CLASSIFIER_TREATMENT_IDS[number];
export type UiSelectorTreatmentId = typeof UI_SELECTOR_TREATMENT_IDS[number];

export function isManifestTreatmentId(value: string): value is ManifestTreatmentId {
    return (TREATMENT_TARGET_20_IDS as readonly string[]).includes(value);
}

export function getTreatmentLabel(treatmentId: string): string {
    if (!isManifestTreatmentId(treatmentId)) return treatmentId;
    return TREATMENT_MANIFEST_META[treatmentId].label;
}
