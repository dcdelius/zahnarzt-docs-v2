/**
 * Settings Types — SSOT Type Definitions for Settings
 *
 * ═══════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH for settings type definitions.
 * v7/settingsStore and contracts/settingsContracts import from here.
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ✅ Pure TypeScript types (no runtime code)
 * ✅ Matches validation arrays in settingsStore
 * ❌ No imports from v7/** or core/**
 */

// ═══════════════════════════════════════════════════════════════
// FUELLUNG TYPES
// ═══════════════════════════════════════════════════════════════

export interface FuellungMkvDefaults {
    mehrschicht: boolean;
    adhasiv: boolean;
}

export type TrockenlegungDefault = 'kofferdam' | 'relativ' | 'fragen';
export type UeberkappungMaterialDefault = 'caoh' | 'mta' | 'biodentine' | 'fragen';

// Anesthesia defaults by region
export type UkPosteriorAnesthesiaMode = 'leitung' | 'intraligamentaer' | 'infiltration' | 'fragen';
export type OkPosteriorAnesthesiaMode = 'infiltration' | 'fragen';
export type FrontAnesthesiaMode = 'infiltration' | 'fragen';

export interface AnesthesiaDefaults {
    enabled: boolean;
    ukPosteriorMode: UkPosteriorAnesthesiaMode;
    okPosteriorMode: OkPosteriorAnesthesiaMode;
    frontMode: FrontAnesthesiaMode;
}

// Matrix defaults for approximal restorations
export type MatrixApproximalMode = 'sektional' | 'tofflemire' | 'fragen';
export type MatrixWedge = 'holz' | 'kunststoff' | 'fragen';
export type MatrixRing = 'ja' | 'nein' | 'fragen';

export interface MatrixDefaults {
    approximalMode: MatrixApproximalMode;
    wedge: MatrixWedge;
    ring: MatrixRing;
}

export interface FuellungDefaults {
    trockenlegung: TrockenlegungDefault;
    ueberkappungMaterial: UeberkappungMaterialDefault;
    anesthesia: AnesthesiaDefaults;
    matrix: MatrixDefaults;
    /** Practice setting: include Aufklärung section in output (default true) */
    aufklaerungEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ENDO TYPES
// ═══════════════════════════════════════════════════════════════

export type EndoEalMode = 'immer' | 'bei_aufbereitung' | 'fragen';
export type EndoSpuelprotokoll = 'naocl_edta' | 'naocl' | 'fragen';
export type EndoAktivierung = 'ultraschall' | 'sonic' | 'keine' | 'fragen';
export type EndoObturation = 'thermoplastisch' | 'lateral' | 'fragen';

export interface EndoDefaults {
    /** Use dental microscope for endo (default: false) */
    mikroskop: boolean;
    /** Electronic apex locator usage (default: 'immer') */
    eal: EndoEalMode;
    /** Irrigation protocol (default: 'naocl_edta') */
    spuelprotokoll: EndoSpuelprotokoll;
    /** Irrigation activation method (default: 'ultraschall') */
    aktivierung: EndoAktivierung;
    /** Obturation technique (default: 'thermoplastisch') */
    obturation: EndoObturation;
    /** Use rubber dam for endo (default: true) */
    kofferdam: boolean;
    /** Include Aufklärung section in output (default: true) */
    aufklaerungEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMBINED TYPES
// ═══════════════════════════════════════════════════════════════

export interface EndoTreatmentSettings {
    defaults?: EndoDefaults;
}

export interface TreatmentSettings {
    mkvDefaults?: FuellungMkvDefaults;
    defaults?: FuellungDefaults;
}

export interface Settings {
    fuellung?: TreatmentSettings;
    endo?: EndoTreatmentSettings;
}
