/**
 * M36: Settings Types
 * 
 * Practice and User defaults as billing-eligible settings source.
 * Versioned + hashed for determinism.
 */
import {
    getPracticeDefaultIsolation,
    getUserDefaultCappingMaterial,
    getUserDefaultIsolation,
    getUserDefaultLAType,
} from './medicalDefaults';

// ═══════════════════════════════════════════════════════════════
// PRACTICE SETTINGS (Praxis-wide)
// ═══════════════════════════════════════════════════════════════

export interface PracticeSettings {
    /** Schema version */
    version: string;
    /** Content hash for determinism */
    hash?: string;

    /** Strict KZV compliance mode (evidence askbacks enforced) */
    strictKzvMode?: boolean;

    /**
     * @deprecated Legacy mirror. Canonical runtime source is
     * `medicalDefaults.isolation.defaultMode`.
     */
    defaultIsolation?: 'kofferdam' | 'relative' | 'none';

    /** Default composite material */
    defaultMaterial?: string;

    /** Default X-ray policy */
    defaultRoentgenPolicy?: 'always' | 'on_indication' | 'never';

    /**
     * DEPRECATED (legacy fallback):
     * Endo defaults belong to the treating dentist (UserSettings.treatments.endo).
     * Keep for backwards compatibility with existing stored settings until migration is done.
     */
    defaultIrrigationProtocol?: 'naocl_edta' | 'naocl_only' | 'none';
    defaultWLMethod?: 'elektrisch' | 'roentgen' | 'both';
    defaultWFTechnique?: 'kalt' | 'warm' | 'einzel';

    /** Custom settings for specific treatments */
    treatments?: {
        endo?: Partial<EndoSettings>;
        fuellung?: Partial<FuellungSettings>;
    };

    /** Practice-specific material availability */
    materials?: {
        fuellung?: string[];
        endo?: string[];
        anesthesia?: string[];
    };

    /**
     * Structured material selection from the curated catalog (ids).
     * Keeps raw `materials.*` free-text available as fallback/notes.
     */
    materialCatalog?: {
        fuellung?: string[];
    };

    /**
     * @deprecated Legacy mirror. Canonical runtime source is
     * `medicalDefaults.anesthesia.defaultAgentId`.
     */
    defaultAnestheticAgentId?: string;

    /**
     * Normalized cross-treatment medical defaults.
     * Mirrors legacy top-level defaults during migration phase.
     */
    medicalDefaults?: {
        anesthesia?: {
            defaultAgentId?: string;
        };
        isolation?: {
            defaultMode?: 'kofferdam' | 'relative' | 'none';
        };
    };

    /** Practice-wide device list */
    devices?: string[];

    /**
     * Structured practice inventory/capabilities.
     * Used to constrain what users can pick as personal defaults.
     */
    inventory?: {
        endo?: {
            microscope?: boolean;
            apexLocator?: boolean;
            xray?: boolean;
            motorRotary?: boolean;
            motorReciproc?: boolean;
            obturationWarm?: boolean;
            irrigantNaOCl?: boolean;
            irrigantEDTA?: boolean;
        };
        fuellung?: {
            kofferdamKit?: boolean;
            bulkFill?: boolean;
            flowableComposite?: boolean;
            adhesiveUniversal?: boolean;
            adhesiveEtchRinse?: boolean;
            etchGel?: boolean;
            sectionalMatrix?: boolean;
            tofflemireMatrix?: boolean;
            stripMatrix?: boolean;
        };
    };

    /** Treatments this practice offers (from treatmentMaster.ts) */
    enabledTreatments?: string[];

    /** Optional KB release identifier that gates which KB artifacts are used */
    activeKbReleaseId?: string;

    /**
     * Practice-wide standard chips (auto-on) for documentation defaults.
     * Use sparingly (compliance/house style); user-specific defaults still apply.
     */
    chipStandards?: {
        /** Chips that apply to every treatment instance. */
        global?: string[];
        /** Chips that apply to a specific treatmentId (e.g. "fuellung"). */
        perTreatment?: Record<string, string[]>;
    };

    /**
     * Optional policy locks where practice rules override user preferences.
     * If enabled, user-level settings are reconciled to this policy on load/save.
     */
    lockUserOverrides?: {
        /** Enforce exact treatment set from practice for every user. */
        enabledTreatments?: boolean;
        /** Disable user-specific fuellung material defaults (practice policy wins). */
        fuellungMaterialDefaults?: boolean;
    };
}

export interface EndoSettings {
    defaultCanalCount?: number;
    defaultEinlage?: 'caoh2' | 'none';
    singleVisit?: boolean;

    /** Dentist preference: preferred WL measurement method */
    defaultWLMethod?: 'elektrisch' | 'roentgen' | 'both';

    /** Dentist preference: preferred WF technique */
    defaultWFTechnique?: 'kalt' | 'warm' | 'einzel';

    /** Dentist preference: preferred irrigation protocol */
    defaultIrrigationProtocol?: 'naocl_edta' | 'naocl_only' | 'none';

    /** Default instrumentation mode for endo documentation */
    defaultInstrumentationMode?: 'rotary' | 'manual';

    /** Default sealer documentation (true = document sealer when WF present) */
    defaultSealer?: boolean;
}

export interface FuellungSettings {
    defaultSchichtung?: 'mehrschicht' | 'bulk';
    defaultAdhesiv?: string;
    materials?: string[];
    /** Toggle for Aufklärung section in documentation */
    aufklaerungEnabled?: boolean;
    /** Per-treatment MKV default (overrides global defaultHasMKV) */
    defaultHasMKV?: boolean;
    /** Default MKV justification (if practice policy allows prefill) */
    defaultMkvJustification?: 'mehrschicht' | 'adhesiv' | 'aesthetik' | 'keine';
    /** Default pulpaschutz (Cp/P/none) */
    defaultPulpaschutz?: 'indirekt' | 'direkt' | 'keine';
    /** Default ueberkappung (Cp/P/none) */
    defaultUeberkappung?: 'indirekt' | 'direkt' | 'keine';
    /** Default hemostasis documentation */
    defaultHemostasis?: 'yes' | 'no';
    /** Default sensitivity followup */
    defaultSensitivityFollowup?: 'yes' | 'no';

    /** User default: preferred matrix system for posterior restorations */
    defaultMatrixSystem?: 'sectional' | 'tofflemire' | 'strip' | 'none';

    /** Default wedge (Keil) documentation for approximal fillings */
    defaultKeilUsed?: boolean;

    /** Default contact point check documentation for approximal fillings */
    defaultKontaktpunktCheck?: boolean;

    /** User default: prefers a flowable base layer when available */
    defaultFlowableBase?: boolean;

    /** User default: preferred composite system/material (catalog id). */
    defaultCompositeMaterialId?: string;

    /** User default: preferred bulk-fill material (catalog id). */
    defaultBulkMaterialId?: string;

    /** User default: preferred flowable material (catalog id). */
    defaultFlowableMaterialId?: string;

    /** User default: preferred adhesive (catalog id). */
    defaultAdhesiveMaterialId?: string;

    /** User default: preferred etch gel (catalog id). */
    defaultEtchMaterialId?: string;
}

// ═══════════════════════════════════════════════════════════════
// USER SETTINGS (Per-User)
// ═══════════════════════════════════════════════════════════════

export interface UserSettings {
    /** Schema version */
    version: string;
    /** Content hash for determinism */
    hash?: string;

    /**
     * @deprecated Legacy mirror. Canonical runtime source is
     * `medicalDefaults.anesthesia.defaultType`.
     */
    defaultLAType?: 'infiltration' | 'leitung' | 'ila' | 'none';

    /**
     * @deprecated Legacy mirror. Canonical runtime source is
     * `medicalDefaults.anesthesia.defaultAgentId`.
     */
    defaultAnestheticAgentId?: string;

    /**
     * @deprecated Legacy mirror. Canonical runtime source is
     * `medicalDefaults.isolation.defaultMode`.
     */
    defaultIsolation?: 'kofferdam' | 'relative' | 'none';

    /**
     * @deprecated Legacy mirror. Canonical runtime source is
     * `medicalDefaults.anesthesia.ukPosteriorType`.
     */
    defaultLATypeUkPosterior?: 'infiltration' | 'leitung' | 'ila' | 'none';

    /**
     * @deprecated Legacy mirror. Canonical runtime source is
     * `medicalDefaults.restorative.defaultCappingMaterial`.
     */
    defaultCappingMaterial?: 'caoh2' | 'mta' | 'biodentin';

    /**
     * Normalized cross-treatment medical defaults.
     * Mirrors legacy top-level defaults during migration phase.
     */
    medicalDefaults?: {
        anesthesia?: {
            defaultType?: 'infiltration' | 'leitung' | 'ila' | 'none';
            ukPosteriorType?: 'infiltration' | 'leitung' | 'ila' | 'none';
            defaultAgentId?: string;
        };
        isolation?: {
            defaultMode?: 'kofferdam' | 'relative' | 'none';
        };
        restorative?: {
            defaultCappingMaterial?: 'caoh2' | 'mta' | 'biodentin';
        };
    };

    /** Preferred text output length */
    preferredTextLength?: 'kurz' | 'mittel' | 'lang';

    /** Skip specific askbacks (user already answered globally) */
    skipAskbacks?: string[];

    /** Default MKV status */
    defaultHasMKV?: boolean;

    /** Treatments this user performs */
    enabledTreatments?: string[];

    /**
     * Standard chips (auto-on) that should be applied per case and shown in the Control Center.
     * These are always overridable via per-instance chip overrides.
     */
    chipStandards?: {
        /** Chips that apply to every treatment instance (sparingly; prefer perTreatment). */
        global?: string[];
        /** Chips that apply to a specific treatmentId (e.g. "fuellung"). */
        perTreatment?: Record<string, string[]>;
    };

    /** Custom overrides per treatment */
    treatments?: {
        endo?: Partial<EndoSettings>;
        fuellung?: Partial<FuellungSettings>;
    };

    /** One-time migrations to keep settings backwards compatible. */
    migrations?: {
        endoDefaultsFromPracticeLegacyV1?: boolean;
    };
}

// ═══════════════════════════════════════════════════════════════
// COMBINED SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface SettingsInput {
    practice?: PracticeSettings;
    user?: UserSettings;
}

export interface ResolvedSetting<T> {
    value: T;
    source: 'practice' | 'user' | 'dictation' | 'default';
}

export interface ControlPolicy {
    mode: 'AUTO' | 'CONFIRM' | 'FORBIDDEN';
    billingEligibility: 'auto' | 'confirmRequired' | 'never';
    scope: 'session' | 'tooth' | 'instance';
    defaultSource: 'practice' | 'user';
}

export interface ResolvedSettings {
    practiceVersion?: string;
    userVersion?: string;
    answers: Map<string, unknown>;
    skippedAskbacks: Set<string>;
    appliedAskbacks: Set<string>;
    facts: Record<string, unknown>;
    factsSource: Record<string, 'practice' | 'user'>;
    controlPolicies?: Record<string, ControlPolicy>;
}

/**
 * Preferential setting resolution helper (dictation > user > practice > default).
 */
export function resolveSetting<T>(
    key: string,
    opts: {
        dictationValue?: T;
        userValue?: T;
        practiceValue?: T;
        defaultValue: T;
    }
): ResolvedSetting<T> {
    if (opts.dictationValue !== undefined) {
        return { value: opts.dictationValue, source: 'dictation' };
    }
    if (opts.userValue !== undefined) {
        return { value: opts.userValue, source: 'user' };
    }
    if (opts.practiceValue !== undefined) {
        return { value: opts.practiceValue, source: 'practice' };
    }
    return { value: opts.defaultValue, source: 'default' };
}

/**
 * Check if settings provide a value for a given askback.
 * Returns the value or undefined if settings don't cover it.
 */
export function getSettingsValueForAskback(
    askbackId: string,
    settings: SettingsInput
): unknown | undefined {
    const { practice, user } = settings;

    const endoInv = practice?.inventory?.endo;
    const allowApex = endoInv?.apexLocator !== false;
    const allowXray = endoInv?.xray !== false;
    const allowWarmObturation = endoInv?.obturationWarm !== false;
    const allowNaOCl = endoInv?.irrigantNaOCl !== false;
    const allowEDTA = endoInv?.irrigantEDTA !== false;

    const mapping: Record<string, () => unknown | undefined> = {
        'medical_la_type': () => getUserDefaultLAType(user),
        'medical_isolation': () => getPracticeDefaultIsolation(practice) ?? getUserDefaultIsolation(user),
        'medical_ueberkappung': () => getUserDefaultCappingMaterial(user),
        'medical_wl_method': () => {
            const candidate = (user?.treatments?.endo?.defaultWLMethod ?? practice?.defaultWLMethod) as string | undefined;
            if (!candidate) return undefined;
            if (candidate === 'elektrisch' && !allowApex) return undefined;
            if (candidate === 'roentgen' && !allowXray) return undefined;
            if (candidate === 'both' && !(allowApex && allowXray)) return undefined;
            return candidate;
        },
        'medical_wf_technique': () => {
            const candidate = (user?.treatments?.endo?.defaultWFTechnique ?? practice?.defaultWFTechnique) as string | undefined;
            if (!candidate) return undefined;
            if (candidate === 'warm' && !allowWarmObturation) return undefined;
            return candidate;
        },
        'medical_irrigation': () => {
            const candidate = (user?.treatments?.endo?.defaultIrrigationProtocol ?? practice?.defaultIrrigationProtocol) as string | undefined;
            if (!candidate) return undefined;
            if (candidate === 'naocl_edta' && !(allowNaOCl && allowEDTA)) return undefined;
            if (candidate === 'naocl_only' && !allowNaOCl) return undefined;
            return candidate;
        },
    };

    const getter = mapping[askbackId];
    if (getter) {
        return getter();
    }

    if (user?.skipAskbacks?.includes(askbackId)) {
        return '__skip__';
    }

    return undefined;
}

// ═══════════════════════════════════════════════════════════════
// HASH HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate settings hash for determinism tracking.
 */
export function hashSettings(settings: SettingsInput): string {
    const str = JSON.stringify(settings);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
    version: '1.0.0',
    strictKzvMode: false,
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
    version: '1.0.0',
    preferredTextLength: 'mittel',
};
