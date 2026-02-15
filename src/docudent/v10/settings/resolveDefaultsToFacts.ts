/**
 * Resolve Settings Defaults to Facts
 * 
 * Settings fill Facts, not Billing.
 * Precedence: dictation > answers > settings > system default
 */

import type { PracticeSettings, UserSettings } from './settingsTypes';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SettingsContext {
    practice?: Partial<PracticeSettings>;
    user?: Partial<UserSettings>;
}

// ═══════════════════════════════════════════════════════════════
// EMPTY DEFAULTS (No Influence)
// ═══════════════════════════════════════════════════════════════

export const EMPTY_PRACTICE_DEFAULTS: Partial<PracticeSettings> = {};
export const EMPTY_USER_DEFAULTS: Partial<UserSettings> = {};
export const EMPTY_SETTINGS: SettingsContext = {
    practice: EMPTY_PRACTICE_DEFAULTS,
    user: EMPTY_USER_DEFAULTS,
};

// ═══════════════════════════════════════════════════════════════
// APPLY SETTINGS TO FACTS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply settings defaults to facts.
 * Only fills 'unknown' values, never overrides explicit values.
 */
export function applySettingsDefaults(
    facts: Record<string, unknown>,
    settings: SettingsContext = EMPTY_SETTINGS
): Record<string, unknown> {
    const result = { ...facts };
    const { practice, user } = settings;

    const isUnknown = (value: unknown): boolean =>
        value === undefined || value === null || value === 'unknown';

    const ensureEndo = (): Record<string, unknown> => {
        const endo = (result.endo ?? {}) as Record<string, unknown>;
        result.endo = { ...endo };
        return result.endo as Record<string, unknown>;
    };

    const ensureFuellung = (): Record<string, unknown> => {
        const fuellung = (result.fuellung ?? {}) as Record<string, unknown>;
        result.fuellung = { ...fuellung };
        return result.fuellung as Record<string, unknown>;
    };

    // Isolation preference (only if unknown)
    const hasIsolation =
        typeof result.kofferdamUsed === 'boolean'
        || result.isolationMentioned === 'rubberDam'
        || result.isolationMentioned === 'relative';
    const isolationPref = typeof practice?.defaultIsolation === 'string'
        ? practice.defaultIsolation.toLowerCase()
        : undefined;
    if (!hasIsolation && isolationPref) {
        if (isolationPref.includes('kofferdam')) {
            result.kofferdamUsed = true;
            result.kofferdamMentioned = true;
            result.isolationMentioned = 'rubberDam';
        } else if (
            isolationPref.includes('relativ')
            || isolationPref.includes('relative')
            || isolationPref.includes('watterollen')
        ) {
            result.kofferdamUsed = false;
            result.kofferdamMentioned = true;
            result.isolationMentioned = 'relative';
        } else if (isolationPref === 'none' || isolationPref.includes('keine')) {
            result.kofferdamUsed = false;
            result.kofferdamMentioned = false;
        }
        result._kofferdamUsedSource = 'settings:practice';
    }

    // Anesthesia default (only if unknown)
    const laPref = typeof user?.defaultLAType === 'string'
        ? user.defaultLAType.toLowerCase()
        : undefined;
    if (isUnknown(result.anesthesia) && laPref) {
        if (laPref.includes('infiltr')) {
            result.anesthesia = 'infiltr';
        } else if (laPref.includes('leitung')) {
            result.anesthesia = 'leitung';
        } else if (laPref.includes('none') || laPref.includes('keine')) {
            result.anesthesia = 'none';
        }
        const fuellung = ensureFuellung();
        if (result.anesthesia === 'infiltr') fuellung.anesthesiaType = 'infiltration';
        if (result.anesthesia === 'leitung') fuellung.anesthesiaType = 'leitung';
        result._anesthesiaSource = 'settings:user';
    }

    // Capping material (only if unknown)
    const cappingMaterial = (result.capping as Record<string, unknown> | undefined)?.material;
    const cappingPref = typeof user?.defaultCappingMaterial === 'string'
        ? user.defaultCappingMaterial.toLowerCase()
        : undefined;
    if (cappingMaterial === undefined && cappingPref) {
        const material =
            cappingPref.includes('caoh')
                ? 'Ca(OH)₂'
                : cappingPref.includes('mta')
                    ? 'MTA'
                    : cappingPref.includes('biodentin')
                        ? 'Biodentine'
                        : user.defaultCappingMaterial;
        result.capping = {
            ...(result.capping as Record<string, unknown> | undefined),
            material,
        };
        result._cappingMaterialSource = 'settings:user';
    }

    // Material default (only if unknown)
    if (isUnknown(result.material) && practice?.defaultMaterial) {
        result.material = practice.defaultMaterial.toLowerCase();
        result._materialSource = 'settings:practice';
    }

    // Füllung defaults (only if unknown)
    const fuellungUser = user?.treatments?.fuellung;
    const fuellungPractice = practice?.treatments?.fuellung;
    const defaultAdhesiv = fuellungUser?.defaultAdhesiv ?? fuellungPractice?.defaultAdhesiv;
    const defaultSchichtung = fuellungUser?.defaultSchichtung ?? fuellungPractice?.defaultSchichtung;
    const defaultKeil = fuellungUser?.defaultKeilUsed ?? fuellungPractice?.defaultKeilUsed;
    const defaultKontaktpunkt = fuellungUser?.defaultKontaktpunktCheck ?? fuellungPractice?.defaultKontaktpunktCheck;
    if (isUnknown(result.adhesiveTechnique) && defaultAdhesiv) {
        const normalized = String(defaultAdhesiv).toLowerCase();
        if (normalized.includes('yes') || normalized.includes('ja')) {
            result.adhesiveTechnique = true;
        } else if (normalized.includes('no') || normalized.includes('nein')) {
            result.adhesiveTechnique = false;
        }
        result._adhesiveTechniqueSource = fuellungUser?.defaultAdhesiv !== undefined ? 'settings:user' : 'settings:practice';
    }

    if (isUnknown(result.layeringMentioned) && defaultSchichtung) {
        const normalized = String(defaultSchichtung).toLowerCase();
        if (normalized.includes('mehr')) {
            result.layeringMentioned = 'yes';
        } else if (normalized.includes('bulk')) {
            result.layeringMentioned = 'no';
        }
        result._layeringMentionedSource = fuellungUser?.defaultSchichtung !== undefined ? 'settings:user' : 'settings:practice';
    }

    const hasApproximalSurface = Array.isArray(result.surfaces)
        && result.surfaces.some((s: unknown) => s === 'm' || s === 'd');
    if (result.treatmentId === 'fuellung' && defaultKeil === true && result.keilMentioned !== true && hasApproximalSurface) {
        result.keilMentioned = true;
        result._keilMentionedSource = fuellungUser?.defaultKeilUsed !== undefined ? 'settings:user' : 'settings:practice';
    }
    if (result.treatmentId === 'fuellung' && defaultKontaktpunkt === true && result.kontaktpunktMentioned !== true && hasApproximalSurface) {
        result.kontaktpunktMentioned = true;
        result._kontaktpunktMentionedSource = fuellungUser?.defaultKontaktpunktCheck !== undefined ? 'settings:user' : 'settings:practice';
    }

    // Endo defaults (only if unknown)
    const endoUser = user?.treatments?.endo;
    const endoPractice = practice?.treatments?.endo;
    const defaultEinlage = endoUser?.defaultEinlage ?? endoPractice?.defaultEinlage;
    const defaultCanalCount = endoUser?.defaultCanalCount ?? endoPractice?.defaultCanalCount;
    const endoInv = practice?.inventory?.endo;
    const allowApex = endoInv?.apexLocator !== false;
    const allowXray = endoInv?.xray !== false;
    const allowWarmObturation = endoInv?.obturationWarm !== false;
    const allowNaOCl = endoInv?.irrigantNaOCl !== false;
    const allowEDTA = endoInv?.irrigantEDTA !== false;

    const candidateWlMethod = endoUser?.defaultWLMethod ?? practice?.defaultWLMethod;
    const defaultWlMethod =
        !candidateWlMethod ? undefined
            : candidateWlMethod === 'elektrisch' && !allowApex ? undefined
                : candidateWlMethod === 'roentgen' && !allowXray ? undefined
                    : candidateWlMethod === 'both' && !(allowApex && allowXray) ? undefined
                        : candidateWlMethod;

    const candidateWfTechnique = endoUser?.defaultWFTechnique ?? practice?.defaultWFTechnique;
    const defaultWfTechnique =
        !candidateWfTechnique ? undefined
            : candidateWfTechnique === 'warm' && !allowWarmObturation ? undefined
                : candidateWfTechnique;

    const candidateIrrigation = endoUser?.defaultIrrigationProtocol ?? practice?.defaultIrrigationProtocol;
    const defaultIrrigationProtocol =
        !candidateIrrigation ? undefined
            : candidateIrrigation === 'naocl_edta' && !(allowNaOCl && allowEDTA) ? undefined
                : candidateIrrigation === 'naocl_only' && !allowNaOCl ? undefined
                    : candidateIrrigation;

    if (!((result.endo as Record<string, unknown> | undefined)?.workingLengthMethod) && defaultWlMethod) {
        const endo = ensureEndo();
        if (defaultWlMethod === 'elektrisch' || defaultWlMethod === 'both') {
            endo.workingLengthMethod = 'electronic';
        } else if (defaultWlMethod === 'roentgen') {
            endo.workingLengthMethod = 'xray';
        }
        result._endoWorkingLengthMethodSource = endoUser?.defaultWLMethod !== undefined ? 'settings:user' : 'settings:practice';
    }

    if (!((result.endo as Record<string, unknown> | undefined)?.wfTechnique) && defaultWfTechnique) {
        const endo = ensureEndo();
        if (defaultWfTechnique === 'warm') endo.wfTechnique = 'warm';
        if (defaultWfTechnique === 'einzel') endo.wfTechnique = 'einzel';
        if (defaultWfTechnique === 'kalt') endo.wfTechnique = 'kalt';
        result._endoWfTechniqueSource = endoUser?.defaultWFTechnique !== undefined ? 'settings:user' : 'settings:practice';
    }

    const irrigationSolutions = (result.endo as Record<string, unknown> | undefined)?.irrigationSolutions;
    if ((!Array.isArray(irrigationSolutions) || irrigationSolutions.length === 0) && defaultIrrigationProtocol) {
        const endo = ensureEndo();
        if (defaultIrrigationProtocol === 'naocl_edta') {
            endo.irrigationSolutions = ['NaOCl', 'EDTA'];
        } else if (defaultIrrigationProtocol === 'naocl_only') {
            endo.irrigationSolutions = ['NaOCl'];
        } else if (defaultIrrigationProtocol === 'none') {
            endo.irrigationSolutions = [];
        }
        result._endoIrrigationSource = endoUser?.defaultIrrigationProtocol !== undefined ? 'settings:user' : 'settings:practice';
    }

    const medication = (result.endo as Record<string, unknown> | undefined)?.medication;
    if (medication === undefined && defaultEinlage) {
        const endo = ensureEndo();
        if (defaultEinlage === 'caoh2') {
            endo.medication = 'Ca(OH)2';
        } else if (defaultEinlage === 'none') {
            endo.medication = 'none';
        }
        result._endoMedicationSource = endoUser?.defaultEinlage !== undefined ? 'settings:user' : 'settings:practice';
    }

    const canalCount = (result.endo as Record<string, unknown> | undefined)?.canalCount;
    if ((canalCount === undefined || canalCount === null) && Number.isFinite(defaultCanalCount)) {
        const endo = ensureEndo();
        endo.canalCount = defaultCanalCount as number;
        result._endoCanalCountSource = endoUser?.defaultCanalCount !== undefined ? 'settings:user' : 'settings:practice';
    }

    const instrumentationMode = (result.endo as Record<string, unknown> | undefined)?.instrumentationMode;
    const defaultInstrumentationMode =
        endoUser?.defaultInstrumentationMode ?? endoPractice?.defaultInstrumentationMode;
    if (result.treatmentId === 'endo' && instrumentationMode === undefined && defaultInstrumentationMode) {
        const hasPreparationSignals = Boolean(
            (result.endo as Record<string, unknown> | undefined)?.canalCount
            || (result.endo as Record<string, unknown> | undefined)?.workingLengthMethod
            || (Array.isArray((result.endo as Record<string, unknown> | undefined)?.irrigationSolutions)
                && ((result.endo as Record<string, unknown> | undefined)?.irrigationSolutions as unknown[]).length > 0)
            || (result.endo as Record<string, unknown> | undefined)?.step === 'preparation'
            || (result.endo as Record<string, unknown> | undefined)?.step === 'irrigation'
            || (result.endo as Record<string, unknown> | undefined)?.step === 'obturation'
        );
        if (hasPreparationSignals) {
            const endo = ensureEndo();
            endo.instrumentationMode = defaultInstrumentationMode;
            result._endoInstrumentationModeSource =
                endoUser?.defaultInstrumentationMode !== undefined ? 'settings:user' : 'settings:practice';
        }
    }

    const sealerMentioned = (result.endo as Record<string, unknown> | undefined)?.sealerMentioned;
    const defaultSealer = endoUser?.defaultSealer ?? endoPractice?.defaultSealer;
    const hasObturationSignals = Boolean(
        (result.endo as Record<string, unknown> | undefined)?.wfTechnique
        || (result.endo as Record<string, unknown> | undefined)?.obturationMentioned === true
        || (result.endo as Record<string, unknown> | undefined)?.obturated === true
    );
    if (result.treatmentId === 'endo' && defaultSealer === true && sealerMentioned !== true && hasObturationSignals) {
        const endo = ensureEndo();
        endo.sealerMentioned = true;
        result._endoSealerSource = endoUser?.defaultSealer !== undefined ? 'settings:user' : 'settings:practice';
    }

    return result;
}

/**
 * Check if a fact was filled by settings (not explicit).
 */
export function wasFilledBySettings(facts: Record<string, unknown>, key: string): boolean {
    return facts[`_${key}Source`]?.toString().startsWith('settings:') ?? false;
}

/**
 * Get precedence source for a fact.
 */
export function getFactSource(facts: Record<string, unknown>, key: string): string {
    const sourceKey = `_${key}Source`;
    if (facts[sourceKey]) {
        return facts[sourceKey] as string;
    }
    if (facts[key] !== undefined && facts[key] !== 'unknown') {
        return 'extraction';
    }
    return 'unknown';
}
