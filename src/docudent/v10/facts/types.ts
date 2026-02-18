/**
 * V10 Facts Module — Central Facts Type Definitions
 * 
 * Defines TreatmentFacts and related types for V10.
 * This is the V10 canonical location for facts types.
 */

// ═══════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════

export type YesNoUnknown = 'yes' | 'no' | 'unknown';
export type CariesDepth = 'profunda' | 'pulp_near' | 'normal' | 'unknown';
export type Polarity = 'pos' | 'neg' | 'unknown';

/**
 * Material types for Füllung
 * KB rules check facts.materialMentioned for chip emission
 */
export type FillMaterial = 'komposit' | 'giz' | 'amalgam' | 'unknown';

export interface DocumentationContextFact {
    version: 'v1';
    clinical: string[];
    patient: string[];
    administrative: string[];
    forensicNotes: string[];
    unresolved: string[];
}

export interface CappingFact {
    performed: YesNoUnknown;
    material?: 'Ca(OH)₂' | 'MTA' | 'Biodentine' | string;
}

export interface CounselingFact {
    pulpitisRisk: YesNoUnknown;
}

export interface BleedingFact {
    detected: YesNoUnknown;
    heavy?: boolean;
    hemostasisMentioned?: boolean;
    hemostasisPerformed?: YesNoUnknown;
}

export interface SensitivityFact {
    reported: YesNoUnknown;
    level?: 'low' | 'medium' | 'high';
    desensitizerMentioned?: boolean;
    desensitizerApplied?: YesNoUnknown;
}

export interface TreatmentFacts {
    /** Treatment identifier (pack-driven) */
    treatmentId: string;
    /** Primary tooth (FDI) for this instance */
    tooth?: string;
    /** Region derived from tooth number */
    toothRegion?: 'front' | 'side' | 'unknown';
    cariesDepth: CariesDepth;
    capping: CappingFact;
    counseling: CounselingFact;
    bleeding?: BleedingFact;
    sensitivity?: SensitivityFact;
    documentationContext?: DocumentationContextFact;

    // ═══════════════════════════════════════════════════════════════
    // MVP FACTS - Required for KB chip emission
    // These fields must match what medical_kb.v1.json rules check
    // ═══════════════════════════════════════════════════════════════

    /** Material mentioned in dictation (KB: facts.materialMentioned) */
    materialMentioned?: FillMaterial;
    /** Normalized material (KB: facts.material) */
    material?: FillMaterial;

    /** Adhesive technique used (KB: facts.adhesiveTechnique) */
    adhesiveTechnique?: boolean;
    /** Adhesive mentioned in dictation (for material text chips) */
    adhesiveMentioned?: boolean;
    /** Etch mentioned in dictation (for material text chips) */
    etchMentioned?: boolean;
    /** Matrix mentioned in dictation (for material text chips) */
    matrixMentioned?: boolean;
    /** Wedge mentioned in dictation (for material text chips) */
    keilMentioned?: boolean;
    /** Contact point mentioned in dictation (for material text chips) */
    kontaktpunktMentioned?: boolean;
    /** Flowable mentioned in dictation (for material text chips) */
    flowableMentioned?: boolean;
    /** Bulk-Fill mentioned in dictation (for material text chips) */
    bulkMentioned?: boolean;

    /** Kofferdam used (KB: facts.kofferdamUsed) */
    kofferdamUsed?: boolean;

    /** Kofferdam mentioned in dictation (KB: facts.kofferdamMentioned) */
    kofferdamMentioned?: boolean;

    /** Isolation mentioned/type (KB: facts.isolationMentioned) */
    isolationMentioned?: 'rubberDam' | 'relative' | 'unknown';

    /** MKV (Mehrkosten) present (KB: facts.mkvPresent) */
    mkvPresent?: boolean;

    /** Insurance type context (KB: facts.insuranceType) */
    insuranceType?: 'GKV' | 'PKV' | 'MKV';

    /** Mehrkosten explicitly mentioned in dictation (triggers addon billing if true) */
    mehrkostenMentioned?: boolean;

    /** Mehrkosten confirmed via askback (required for addon billing if not mentioned) */
    mehrkostenConfirmed?: boolean;

    /** Explicit rejection of Mehrkosten ("nur Kasse", "keine Mehrkosten") */
    nurKasse?: boolean;

    /**
     * GIGAPROMPT 10: SSOT for MKV askback trigger.
     * True when signals are clear (Komposit, Adhäsiv, Mehrkosten, nurKasse).
     * If false AND insuranceType='MKV' → KB triggers require_askback.
     */
    mehrkostenSignalsClear?: boolean;

    /**
     * GIGAPROMPT 10: MKV justification from askback answer.
     * Populated via factsUpdate when user answers MKV askback.
     */
    mkvJustification?: string;

    /**
     * MKV amount / patient co-pay (Mehrkostenbetrag).
     * Used for KZV-safe output and to suppress the MKV amount askback when dictated/extracted.
     */
    mkvBetrag?: number;

    /**
     * Combinability override from user askback (never auto-set).
     * Used to resolve BLOCK conflicts without hard error.
     */
    combinabilityOverride?: {
        action: 'allow' | 'drop_blocked';
        ruleIds?: string[];
    };

    /**
     * Render-only labels derived from settings/facts (no direct settings access in composer).
     */
    render?: {
        laAgent?: string;
        fillMaterial?: string;
        adhesiveMaterial?: string;
        etchMaterial?: string;
        flowableMaterial?: string;
        bulkMaterial?: string;
        matrixSystem?: string;
        aufklaerungEnabled?: boolean;
    };

    /** Anesthesia type detected from dictation for LA chip emission */
    anesthesia?: 'infiltr' | 'leitung' | 'ila' | 'none' | 'unknown';
    /** True when anesthesia is mentioned without explicit technique */
    anesthesiaAmbiguous?: boolean;

    /** ViPr (Vitalitätsprüfung) result */
    vitality?: Polarity;

    /** Perkussion result */
    percussion?: Polarity;

    /** Surface anesthesia before injection */
    surfaceAnesthesia?: boolean;

    /** Wound care / suture / tamponade (Extraction) */
    woundCare?: boolean;

    /** Caries excavation documented */
    exkavationPerformed?: boolean;

    /** Finishing/polishing/occlusion check documented */
    finishingPerformed?: boolean;

    /** Layering technique mentioned (Mehrschichttechnik) */
    layeringMentioned?: YesNoUnknown;

    /** Cavity extent hint derived from surfaces (small/medium/large) */
    cavityExtentHint?: 'small' | 'medium' | 'large' | 'unknown';

    /**
     * GP7: Pulpaeröffnung detected from dictation.
     * True = direkte Überkappung (P chip, BEMA_26/GOZ_2340)
     * False/undefined = indirekte Überkappung (Cp chip, BEMA_25/GOZ_2330)
     */
    pulpaOpened?: boolean;

    // ═══════════════════════════════════════════════════════════════
    // SURFACE DATA - For F-code billing resolution (SSOT)
    // See: src/docudent/v10/extraction/surfaces/normalizeSurfaces.ts
    // ═══════════════════════════════════════════════════════════════

    /**
     * Normalized canonical surfaces: ['m', 'o', 'd', 'b', 'l']
     * Used by surfaceBillingResolver to determine F-code (13, 13b, 13c, 13d)
     * SSOT: Only populated via normalizeSurfaces(), never parsed elsewhere.
     */
    surfaces?: ('m' | 'o' | 'd' | 'b' | 'l')[];

    /**
     * Where surfaces came from: 'extraction' | 'dictation' | 'none'
     * If 'none', surfaces is empty and may require L1 askback.
     */
    surfaceSource?: 'extraction' | 'dictation' | 'none';

    /**
     * Warnings from surface normalization (e.g., unknown terms, ambiguity)
     */
    surfaceWarnings?: string[];

    /**
     * True if input contained ambiguous terms that cannot be resolved.
     * Triggers L1 "Welche Flächen?" askback when surface_mapping is needed.
     */
    surfaceAmbiguous?: boolean;

    /**
     * Treatment-specific facts (nested)
     */
    fuellung?: {
        /** Fluoridation performed after filling */
        fluoridation?: boolean;
        /** Anesthesia type for filling (used by KB rules) */
        anesthesiaType?: 'infiltration' | 'leitung' | 'ila';
    };

    // PZR-specific
    pzr?: {
        zahnsteinEntfernung?: boolean;
        fluoridation?: boolean;
    };

    // Crown prep-specific
    crownPrep?: {
        preparation?: boolean;
        impression?: boolean;
        provisional?: boolean;
    };

    // Untersuchung-specific
    untersuchung?: {
        reason?: string;
        findings?: string;
        assessment?: string;
    };

    // Fissurenversiegelung-specific
    fissurenversiegelung?: {
        indication?: string;
        material?: string;
    };

    // Parodontologie-specific
    parodontologie?: {
        phase?: 'status' | 'ait' | 'upt' | string;
        uptGrade?: 'a' | 'b' | 'c' | string;
    };

    // UPT-specific
    upt?: {
        grade?: 'a' | 'b' | 'c' | string;
        interval?: string;
    };

    // Krone-specific
    krone?: {
        type?: 'vollkrone' | 'provisorium' | string;
        placement?: 'definitiv' | 'provisorisch' | string;
    };

    // Bruecke-specific
    bruecke?: {
        type?: 'definitiv' | 'provisorisch' | string;
        phase?: 'eingliederung' | 'kontrolle' | string;
    };

    // Teilkrone-specific
    teilkrone?: {
        type?: 'teilkrone' | 'provisorium' | string;
        placement?: 'definitiv' | 'provisorisch' | string;
    };

    // WSR-specific
    wsr?: {
        zugang?: 'trepaniert' | 'osteotomie' | string;
        lokalisation?: 'front_praemolar' | 'molar' | string;
    };

    // Trauma-specific
    trauma?: {
        art?: 'luxation' | 'fraktur' | 'avulsion' | string;
        schienung?: 'ja' | 'nein' | string;
        kontrolle?: 'ja' | 'nein' | string;
    };

    // Implant-specific
    implant?: {
        phase?: 'insertion' | 'freilegung' | string;
        nachsorge?: 'ja' | 'nein' | string;
    };

    // Schiene-specific
    schiene?: {
        type?: 'okklusionsschiene' | 'protrusionsschiene' | string;
        phase?: 'eingliederung' | 'kontrolle' | string;
    };

    // Teilprothese-specific
    teilprothese?: {
        type?: 'interim' | 'modellguss' | string;
        phase?: 'eingliederung' | 'kontrolle' | string;
    };

    // Totalprothese-specific
    totalprothese?: {
        type?: 'konventionell' | 'immediat' | string;
        phase?: 'eingliederung' | 'kontrolle' | string;
    };

    // Endo-specific
    rootCanals?: number;
    workingLength?: string;
    radiology?: {
        indication?: string;
        type?: string;
        timing?: string;
        findings?: string;
    };
    endo?: {
        diagnosis?: 'pulpitis' | 'necrosis' | 'apical_periodontitis' | 'trauma' | 'revision' | 'unknown';
        step?: 'trepanation' | 'working_length' | 'preparation' | 'irrigation' | 'medication' | 'obturation' | 'unknown';
        trepanation?: boolean;
        obturationMentioned?: boolean;
        instrumentationMode?: 'rotary' | 'manual';
        canalCount?: number;
        kofferdam?: boolean;
        workingLengthMethod?: 'electronic' | 'xray';
        irrigationSolutions?: string[];
        medication?: string;
        sealerMentioned?: boolean;
        obturated?: boolean;
        anesthesiaType?: 'leitung' | 'infiltration' | 'ila';
        wfTechnique?: 'warm' | 'einzel' | 'kalt';
        diagnosticXray?: boolean;
        postEndoAufbau?: boolean;
        tempClosure?: boolean;
    };

    /** Allow pack-specific fact extensions without global typing churn */
    [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════
// QUESTION IDS (constants)
// ═══════════════════════════════════════════════════════════════

export const MEDICAL_QUESTION_IDS = {
    UEBERKAPPUNG: 'medical_ueberkappung',
    UEBERKAPPUNG_MATERIAL: 'medical_ueberkappung_material',
    FISSUREN_INDIKATION: 'medical_fissuren_indikation',
    FISSUREN_MATERIAL: 'medical_fissuren_material',
    PARODONTOLOGIE_PHASE: 'medical_parodontologie_phase',
    PARODONTOLOGIE_UPT_GRAD: 'medical_parodontologie_upt_grad',
    UPT_GRAD: 'medical_upt_grad',
    UPT_INTERVALL: 'medical_upt_intervall',
    KRONE_ART: 'medical_krone_art',
    KRONE_EINGLIEDERUNG: 'medical_krone_eingliederung',
    BRUECKE_TYP: 'medical_bruecke_typ',
    BRUECKE_PHASE: 'medical_bruecke_phase',
    TEILKRONE_ART: 'medical_teilkrone_art',
    TEILKRONE_EINGLIEDERUNG: 'medical_teilkrone_eingliederung',
    WSR_ZUGANG: 'medical_wsr_zugang',
    WSR_LOKALISATION: 'medical_wsr_lokalisation',
    TRAUMA_ART: 'medical_trauma_art',
    TRAUMA_SCHIENUNG: 'medical_trauma_schienung',
    TRAUMA_KONTROLLE: 'medical_trauma_kontrolle',
    IMPLANT_PHASE: 'medical_implant_phase',
    IMPLANT_NACHSORGE: 'medical_implant_nachsorge',
    SCHIENE_TYP: 'medical_schiene_typ',
    SCHIENE_PHASE: 'medical_schiene_phase',
    TEILPROTHESE_TYP: 'medical_teilprothese_typ',
    TEILPROTHESE_PHASE: 'medical_teilprothese_phase',
    TOTALPROTHESE_TYP: 'medical_totalprothese_typ',
    TOTALPROTHESE_PHASE: 'medical_totalprothese_phase',
    COUNSEL_PULPITIS_RISK: 'medical_counsel_pulpitis_risk',
    HEMOSTASIS: 'medical_hemostasis',
    SENSITIVITY_FOLLOWUP: 'medical_sensitivity_followup',
} as const;

// ═══════════════════════════════════════════════════════════════
// EXTRACTED DATA INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface ExtractedDataLike {
    tooth?: string | null;
    teeth?: Array<{
        tooth: string;
        surfaces?: string[];
        depth?: string;
        notes?: string[];
    }>;
    surfaces?: string[];
    diagnosis?: string | null;
    mentioned?: Record<string, unknown>;
    gaps?: string[];
    rawDictation?: string;
    costs?: number | null;
    zusatzinfos?: string[];
    klinischeZusatzinfos?: string[];
    patientenangaben?: string[];
    reasoning?: {
        forensicNotes?: string[];
        unresolved?: string[];
    };
    documentationContext?: DocumentationContextFact;
}

export interface BuildFactsParams {
    extracted: ExtractedDataLike;
    treatmentId: string;
    instanceScope?: { tooth?: string };
}
