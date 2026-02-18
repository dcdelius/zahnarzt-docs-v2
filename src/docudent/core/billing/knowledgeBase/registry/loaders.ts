/**
 * Treatment Loaders — Unified SSOT file loading
 * 
 * This module provides centralized loading for all treatment-specific files.
 * All loaders validate treatmentId through the registry before loading.
 * 
 * ❌ NO silent fallback to fuellung
 * ✅ Explicit errors for missing files
 * ✅ Static imports for Vite compatibility
 */

import {
    assertKnownTreatment,
    hasCapability,
    type TreatmentId
} from './treatmentRegistry';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface UnifiedConfig {
    _meta: { id: string; version: string; label?: string };
    chips: Array<{
        id: string;
        label: string;
        phase?: string;
        category?: string;
        billingRef?: { GKV?: string; PKV?: string; MKV?: string } | null;
        textSnippets?: { kurz?: string; mittel?: string; lang?: string };
        dataPatches?: Array<{ field: string; value: unknown }>;
        mutuallyExclusiveWith?: string[];
        defaultActive?: boolean;
        showInQuickView?: boolean;
        requiredFields?: string[];
    }>;
    phasen_reihenfolge?: string[];
    surface_mapping?: Record<string, { GKV?: string; PKV?: string }>;
    requiredFieldsGlobal?: string[];
}

export interface AnswerMapConfig {
    _meta: { treatmentId: string; version: string };
    map: Array<{
        questionKey: string;
        questionIdPatterns: string[];
        answers: Record<string, string | null>;
        exclusiveGroup: string;
        mutuallyExclusive: string[];
        requiresMKV?: boolean;
    }>;
    extractionMapping?: Record<string, Record<string, string>>;
    defaults?: {
        alwaysOnChipIds: string[];
        mkvChipId?: string | null;
    };
    exclusiveGroups?: Record<string, string[]>;
}

// ═══════════════════════════════════════════════════════════════
// CONDITIONAL QUESTION SCHEMA (WhenClause)
// ═══════════════════════════════════════════════════════════════

/**
 * Single condition block for question visibility
 */
export interface WhenCondition {
    /** All key/value pairs must match in answers OR extracted.mentioned */
    requiresAnswers?: Record<string, unknown>;
    /** True if any listed key exists in extracted.mentioned */
    anyMentioned?: string[];
    /** True if rawDictation contains any keyword (case-insensitive) */
    anyKeywords?: string[];
    /** True if any listed chipId is active */
    anyChipsActive?: string[];
    /** NEGATIVE: True if rawDictation does NOT contain any of these keywords */
    noneKeywords?: string[];
}

/**
 * Full WhenClause - supports anyOf for OR logic between condition groups
 */
export interface WhenClause extends WhenCondition {
    /** OR logic: question shown if ANY condition group matches */
    anyOf?: WhenCondition[];
    /** NEGATIVE MATCHING: If conditions match, question is HIDDEN */
    noneOf?: WhenCondition;
}

export interface QuestionBankConfig {
    _meta: { treatmentId: string; version: string };
    questions: Array<{
        key: string;
        category: 'forensic' | 'upsell' | 'mkv';
        prompt: string;
        type: 'single' | 'number' | 'multi';
        dataField?: string;
        /** Conditional visibility - question only shown when conditions met */
        when?: WhenClause;
        options?: Array<{
            id: string;
            label: string;
            dataValue: string | number | boolean;
            chipActivation?: string;
        }>;
        // Number-specific fields
        min?: number;
        max?: number;
        step?: number;
        unit?: string;
        presets?: number[];
    }>;
}

export interface TemplateConfig {
    _meta: { treatmentId: string; version: string };
    sections: Array<{
        id: string;
        label: string;
        template: string;
    }>;
}

export interface FindingMapConfig {
    _meta: { treatmentId: string; version: string };
    fields: Record<string, {
        label: string;
        template?: string;
    }>;
}

// ═══════════════════════════════════════════════════════════════
// STATIC IMPORTS — Vite requires static imports for JSON
// Each treatment's files are imported statically here
// ═══════════════════════════════════════════════════════════════

// Fuellung
import fuellungUnified from '../treatments/fuellung/unified.json';
import fuellungAnswerMap from '../treatments/fuellung/answer_map.json';
import fuellungQuestionBank from '../treatments/fuellung/question_bank.json';
import fuellungTemplate from '../treatments/fuellung/template.json';
import fuellungFindingMap from '../treatments/fuellung/finding_map.json';

// Endo
import endoUnified from '../treatments/endo/unified.json';
import endoAnswerMap from '../treatments/endo/answer_map.json';
import endoQuestionBank from '../treatments/endo/question_bank.json';
import endoTemplate from '../treatments/endo/template.json';
import endoFindingMap from '../treatments/endo/finding_map.json';

// Extraction
import extractionUnified from '../treatments/extraction/unified.json';
import extractionAnswerMap from '../treatments/extraction/answer_map.json';
import extractionQuestionBank from '../treatments/extraction/question_bank.json';
import extractionTemplate from '../treatments/extraction/template.json';
import extractionFindingMap from '../treatments/extraction/finding_map.json';

// PZR
import pzrUnified from '../treatments/pzr/unified.json';
import pzrAnswerMap from '../treatments/pzr/answer_map.json';
import pzrQuestionBank from '../treatments/pzr/question_bank.json';
import pzrTemplate from '../treatments/pzr/template.json';
import pzrFindingMap from '../treatments/pzr/finding_map.json';

// Crown Prep
import crownPrepUnified from '../treatments/crown_prep/unified.json';
import crownPrepAnswerMap from '../treatments/crown_prep/answer_map.json';
import crownPrepQuestionBank from '../treatments/crown_prep/question_bank.json';
import crownPrepTemplate from '../treatments/crown_prep/template.json';
import crownPrepFindingMap from '../treatments/crown_prep/finding_map.json';

// Ueberkappung
import ueberkappungUnified from '../treatments/ueberkappung/unified.json';
import ueberkappungAnswerMap from '../treatments/ueberkappung/answer_map.json';
import ueberkappungQuestionBank from '../treatments/ueberkappung/question_bank.json';
import ueberkappungTemplate from '../treatments/ueberkappung/template.json';
import ueberkappungFindingMap from '../treatments/ueberkappung/finding_map.json';

// Untersuchung
import untersuchungUnified from '../treatments/untersuchung/unified.json';
import untersuchungAnswerMap from '../treatments/untersuchung/answer_map.json';
import untersuchungQuestionBank from '../treatments/untersuchung/question_bank.json';
import untersuchungTemplate from '../treatments/untersuchung/template.json';
import untersuchungFindingMap from '../treatments/untersuchung/finding_map.json';

// Roentgen
import roentgenUnified from '../treatments/roentgen/unified.json';
import roentgenAnswerMap from '../treatments/roentgen/answer_map.json';
import roentgenQuestionBank from '../treatments/roentgen/question_bank.json';
import roentgenTemplate from '../treatments/roentgen/template.json';
import roentgenFindingMap from '../treatments/roentgen/finding_map.json';

// Fissurenversiegelung
import fissurenversiegelungUnified from '../treatments/fissurenversiegelung/unified.json';
import fissurenversiegelungAnswerMap from '../treatments/fissurenversiegelung/answer_map.json';
import fissurenversiegelungQuestionBank from '../treatments/fissurenversiegelung/question_bank.json';
import fissurenversiegelungTemplate from '../treatments/fissurenversiegelung/template.json';
import fissurenversiegelungFindingMap from '../treatments/fissurenversiegelung/finding_map.json';

// Parodontologie
import parodontologieUnified from '../treatments/parodontologie/unified.json';
import parodontologieAnswerMap from '../treatments/parodontologie/answer_map.json';
import parodontologieQuestionBank from '../treatments/parodontologie/question_bank.json';
import parodontologieTemplate from '../treatments/parodontologie/template.json';
import parodontologieFindingMap from '../treatments/parodontologie/finding_map.json';

// UPT
import uptUnified from '../treatments/upt/unified.json';
import uptAnswerMap from '../treatments/upt/answer_map.json';
import uptQuestionBank from '../treatments/upt/question_bank.json';
import uptTemplate from '../treatments/upt/template.json';
import uptFindingMap from '../treatments/upt/finding_map.json';

// Krone
import kroneUnified from '../treatments/krone/unified.json';
import kroneAnswerMap from '../treatments/krone/answer_map.json';
import kroneQuestionBank from '../treatments/krone/question_bank.json';
import kroneTemplate from '../treatments/krone/template.json';
import kroneFindingMap from '../treatments/krone/finding_map.json';
import brueckeUnified from '../treatments/bruecke/unified.json';
import brueckeAnswerMap from '../treatments/bruecke/answer_map.json';
import brueckeQuestionBank from '../treatments/bruecke/question_bank.json';
import brueckeTemplate from '../treatments/bruecke/template.json';
import brueckeFindingMap from '../treatments/bruecke/finding_map.json';

// Teilkrone
import teilkroneUnified from '../treatments/teilkrone/unified.json';
import teilkroneAnswerMap from '../treatments/teilkrone/answer_map.json';
import teilkroneQuestionBank from '../treatments/teilkrone/question_bank.json';
import teilkroneTemplate from '../treatments/teilkrone/template.json';
import teilkroneFindingMap from '../treatments/teilkrone/finding_map.json';
import wsrUnified from '../treatments/wsr/unified.json';
import wsrAnswerMap from '../treatments/wsr/answer_map.json';
import wsrQuestionBank from '../treatments/wsr/question_bank.json';
import wsrTemplate from '../treatments/wsr/template.json';
import wsrFindingMap from '../treatments/wsr/finding_map.json';
import traumaUnified from '../treatments/trauma/unified.json';
import traumaAnswerMap from '../treatments/trauma/answer_map.json';
import traumaQuestionBank from '../treatments/trauma/question_bank.json';
import traumaTemplate from '../treatments/trauma/template.json';
import traumaFindingMap from '../treatments/trauma/finding_map.json';
import implantUnified from '../treatments/implant/unified.json';
import implantAnswerMap from '../treatments/implant/answer_map.json';
import implantQuestionBank from '../treatments/implant/question_bank.json';
import implantTemplate from '../treatments/implant/template.json';
import implantFindingMap from '../treatments/implant/finding_map.json';
import schieneUnified from '../treatments/schiene/unified.json';
import schieneAnswerMap from '../treatments/schiene/answer_map.json';
import schieneQuestionBank from '../treatments/schiene/question_bank.json';
import schieneTemplate from '../treatments/schiene/template.json';
import schieneFindingMap from '../treatments/schiene/finding_map.json';
import teilprotheseUnified from '../treatments/teilprothese/unified.json';
import teilprotheseAnswerMap from '../treatments/teilprothese/answer_map.json';
import teilprotheseQuestionBank from '../treatments/teilprothese/question_bank.json';
import teilprotheseTemplate from '../treatments/teilprothese/template.json';
import teilprotheseFindingMap from '../treatments/teilprothese/finding_map.json';
import totalprotheseUnified from '../treatments/totalprothese/unified.json';
import totalprotheseAnswerMap from '../treatments/totalprothese/answer_map.json';
import totalprotheseQuestionBank from '../treatments/totalprothese/question_bank.json';
import totalprotheseTemplate from '../treatments/totalprothese/template.json';
import totalprotheseFindingMap from '../treatments/totalprothese/finding_map.json';

// ═══════════════════════════════════════════════════════════════
// CONFIG REGISTRIES — Map treatmentId to imported configs
// ═══════════════════════════════════════════════════════════════

const unifiedConfigs: Record<TreatmentId, UnifiedConfig> = {
    fuellung: fuellungUnified as unknown as UnifiedConfig,
    endo: endoUnified as unknown as UnifiedConfig,
    extraction: extractionUnified as unknown as UnifiedConfig,
    pzr: pzrUnified as unknown as UnifiedConfig,
    crown_prep: crownPrepUnified as unknown as UnifiedConfig,
    ueberkappung: ueberkappungUnified as unknown as UnifiedConfig,
    untersuchung: untersuchungUnified as unknown as UnifiedConfig,
    roentgen: roentgenUnified as unknown as UnifiedConfig,
    fissurenversiegelung: fissurenversiegelungUnified as unknown as UnifiedConfig,
    parodontologie: parodontologieUnified as unknown as UnifiedConfig,
    upt: uptUnified as unknown as UnifiedConfig,
    krone: kroneUnified as unknown as UnifiedConfig,
    teilkrone: teilkroneUnified as unknown as UnifiedConfig,
    wsr: wsrUnified as unknown as UnifiedConfig,
    trauma: traumaUnified as unknown as UnifiedConfig,
    implant: implantUnified as unknown as UnifiedConfig,
    bruecke: brueckeUnified as unknown as UnifiedConfig,
    schiene: schieneUnified as unknown as UnifiedConfig,
    teilprothese: teilprotheseUnified as unknown as UnifiedConfig,
    totalprothese: totalprotheseUnified as unknown as UnifiedConfig,
};

const answerMapConfigs: Record<TreatmentId, AnswerMapConfig> = {
    fuellung: fuellungAnswerMap as unknown as AnswerMapConfig,
    endo: endoAnswerMap as unknown as AnswerMapConfig,
    extraction: extractionAnswerMap as unknown as AnswerMapConfig,
    pzr: pzrAnswerMap as unknown as AnswerMapConfig,
    crown_prep: crownPrepAnswerMap as unknown as AnswerMapConfig,
    ueberkappung: ueberkappungAnswerMap as unknown as AnswerMapConfig,
    untersuchung: untersuchungAnswerMap as unknown as AnswerMapConfig,
    roentgen: roentgenAnswerMap as unknown as AnswerMapConfig,
    fissurenversiegelung: fissurenversiegelungAnswerMap as unknown as AnswerMapConfig,
    parodontologie: parodontologieAnswerMap as unknown as AnswerMapConfig,
    upt: uptAnswerMap as unknown as AnswerMapConfig,
    krone: kroneAnswerMap as unknown as AnswerMapConfig,
    teilkrone: teilkroneAnswerMap as unknown as AnswerMapConfig,
    wsr: wsrAnswerMap as unknown as AnswerMapConfig,
    trauma: traumaAnswerMap as unknown as AnswerMapConfig,
    implant: implantAnswerMap as unknown as AnswerMapConfig,
    bruecke: brueckeAnswerMap as unknown as AnswerMapConfig,
    schiene: schieneAnswerMap as unknown as AnswerMapConfig,
    teilprothese: teilprotheseAnswerMap as unknown as AnswerMapConfig,
    totalprothese: totalprotheseAnswerMap as unknown as AnswerMapConfig,
};

const questionBankConfigs: Record<TreatmentId, QuestionBankConfig> = {
    fuellung: fuellungQuestionBank as unknown as QuestionBankConfig,
    endo: endoQuestionBank as unknown as QuestionBankConfig,
    extraction: extractionQuestionBank as unknown as QuestionBankConfig,
    pzr: pzrQuestionBank as unknown as QuestionBankConfig,
    crown_prep: crownPrepQuestionBank as unknown as QuestionBankConfig,
    ueberkappung: ueberkappungQuestionBank as unknown as QuestionBankConfig,
    untersuchung: untersuchungQuestionBank as unknown as QuestionBankConfig,
    roentgen: roentgenQuestionBank as unknown as QuestionBankConfig,
    fissurenversiegelung: fissurenversiegelungQuestionBank as unknown as QuestionBankConfig,
    parodontologie: parodontologieQuestionBank as unknown as QuestionBankConfig,
    upt: uptQuestionBank as unknown as QuestionBankConfig,
    krone: kroneQuestionBank as unknown as QuestionBankConfig,
    teilkrone: teilkroneQuestionBank as unknown as QuestionBankConfig,
    wsr: wsrQuestionBank as unknown as QuestionBankConfig,
    trauma: traumaQuestionBank as unknown as QuestionBankConfig,
    implant: implantQuestionBank as unknown as QuestionBankConfig,
    bruecke: brueckeQuestionBank as unknown as QuestionBankConfig,
    schiene: schieneQuestionBank as unknown as QuestionBankConfig,
    teilprothese: teilprotheseQuestionBank as unknown as QuestionBankConfig,
    totalprothese: totalprotheseQuestionBank as unknown as QuestionBankConfig,
};

const templateConfigs: Record<TreatmentId, TemplateConfig> = {
    fuellung: fuellungTemplate as unknown as TemplateConfig,
    endo: endoTemplate as unknown as TemplateConfig,
    extraction: extractionTemplate as unknown as TemplateConfig,
    pzr: pzrTemplate as unknown as TemplateConfig,
    crown_prep: crownPrepTemplate as unknown as TemplateConfig,
    ueberkappung: ueberkappungTemplate as unknown as TemplateConfig,
    untersuchung: untersuchungTemplate as unknown as TemplateConfig,
    roentgen: roentgenTemplate as unknown as TemplateConfig,
    fissurenversiegelung: fissurenversiegelungTemplate as unknown as TemplateConfig,
    parodontologie: parodontologieTemplate as unknown as TemplateConfig,
    upt: uptTemplate as unknown as TemplateConfig,
    krone: kroneTemplate as unknown as TemplateConfig,
    teilkrone: teilkroneTemplate as unknown as TemplateConfig,
    wsr: wsrTemplate as unknown as TemplateConfig,
    trauma: traumaTemplate as unknown as TemplateConfig,
    implant: implantTemplate as unknown as TemplateConfig,
    bruecke: brueckeTemplate as unknown as TemplateConfig,
    schiene: schieneTemplate as unknown as TemplateConfig,
    teilprothese: teilprotheseTemplate as unknown as TemplateConfig,
    totalprothese: totalprotheseTemplate as unknown as TemplateConfig,
};

const findingMapConfigs: Record<TreatmentId, FindingMapConfig> = {
    fuellung: fuellungFindingMap as unknown as FindingMapConfig,
    endo: endoFindingMap as unknown as FindingMapConfig,
    extraction: extractionFindingMap as unknown as FindingMapConfig,
    pzr: pzrFindingMap as unknown as FindingMapConfig,
    crown_prep: crownPrepFindingMap as unknown as FindingMapConfig,
    ueberkappung: ueberkappungFindingMap as unknown as FindingMapConfig,
    untersuchung: untersuchungFindingMap as unknown as FindingMapConfig,
    roentgen: roentgenFindingMap as unknown as FindingMapConfig,
    fissurenversiegelung: fissurenversiegelungFindingMap as unknown as FindingMapConfig,
    parodontologie: parodontologieFindingMap as unknown as FindingMapConfig,
    upt: uptFindingMap as unknown as FindingMapConfig,
    krone: kroneFindingMap as unknown as FindingMapConfig,
    teilkrone: teilkroneFindingMap as unknown as FindingMapConfig,
    wsr: wsrFindingMap as unknown as FindingMapConfig,
    trauma: traumaFindingMap as unknown as FindingMapConfig,
    implant: implantFindingMap as unknown as FindingMapConfig,
    bruecke: brueckeFindingMap as unknown as FindingMapConfig,
    schiene: schieneFindingMap as unknown as FindingMapConfig,
    teilprothese: teilprotheseFindingMap as unknown as FindingMapConfig,
    totalprothese: totalprotheseFindingMap as unknown as FindingMapConfig,
};

// ═══════════════════════════════════════════════════════════════
// LOADERS — Validated loading functions
// ═══════════════════════════════════════════════════════════════

/**
 * Load unified.json for a treatment.
 * Contains chips, phases, billing refs.
 */
export function loadUnifiedConfig(treatmentId: string): UnifiedConfig {
    assertKnownTreatment(treatmentId);

    const config = unifiedConfigs[treatmentId];
    if (!config) {
        throw new Error(
            `Missing unified.json for treatment: ${treatmentId}. ` +
            `Check treatments/${treatmentId}/unified.json exists.`
        );
    }
    return config;
}

/**
 * Load answer_map.json for a treatment.
 * Contains answer→chip mappings.
 */
export function loadAnswerMapConfig(treatmentId: string): AnswerMapConfig {
    assertKnownTreatment(treatmentId);

    const config = answerMapConfigs[treatmentId];
    if (!config) {
        throw new Error(
            `Missing answer_map.json for treatment: ${treatmentId}. ` +
            `Check treatments/${treatmentId}/answer_map.json exists.`
        );
    }
    return config;
}

/**
 * Load question_bank.json for a treatment.
 * Contains question definitions for UI.
 */
export function loadQuestionBankConfig(treatmentId: string): QuestionBankConfig {
    assertKnownTreatment(treatmentId);

    const config = questionBankConfigs[treatmentId];
    if (!config) {
        throw new Error(
            `Missing question_bank.json for treatment: ${treatmentId}. ` +
            `Check treatments/${treatmentId}/question_bank.json exists.`
        );
    }
    return config;
}

/**
 * Load template.json for a treatment.
 * Contains output section templates.
 * Returns null if not available (check capabilities first).
 */
export function loadTemplateConfig(treatmentId: string): TemplateConfig | null {
    assertKnownTreatment(treatmentId);

    if (!hasCapability(treatmentId, 'hasTemplate')) {
        console.warn(`[Loaders] Template not available for treatment: ${treatmentId}`);
        return null;
    }

    const config = templateConfigs[treatmentId];
    if (!config) {
        console.warn(`[Loaders] Template config missing for: ${treatmentId}`);
        return null;
    }
    return config;
}

/**
 * Load finding_map.json for a treatment.
 * Contains field→text mappings for findings.
 * Returns null if not available (check capabilities first).
 */
export function loadFindingMapConfig(treatmentId: string): FindingMapConfig | null {
    assertKnownTreatment(treatmentId);

    if (!hasCapability(treatmentId, 'hasFindingMap')) {
        console.warn(`[Loaders] Finding map not available for treatment: ${treatmentId}`);
        return null;
    }

    const config = findingMapConfigs[treatmentId];
    if (!config) {
        console.warn(`[Loaders] Finding map config missing for: ${treatmentId}`);
        return null;
    }
    return config;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const loaders = {
    loadUnifiedConfig,
    loadAnswerMapConfig,
    loadQuestionBankConfig,
    loadTemplateConfig,
    loadFindingMapConfig,
};
