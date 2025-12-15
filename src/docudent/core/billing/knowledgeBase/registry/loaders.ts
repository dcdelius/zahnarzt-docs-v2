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

export interface QuestionBankConfig {
    _meta: { treatmentId: string; version: string };
    questions: Array<{
        key: string;
        category: 'forensic' | 'upsell' | 'mkv';
        prompt: string;
        type: 'single' | 'number' | 'multi';
        dataField?: string;
        options?: Array<{
            id: string;
            label: string;
            dataValue: string | number | boolean;
        }>;
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

// ═══════════════════════════════════════════════════════════════
// CONFIG REGISTRIES — Map treatmentId to imported configs
// ═══════════════════════════════════════════════════════════════

const unifiedConfigs: Record<TreatmentId, UnifiedConfig> = {
    fuellung: fuellungUnified as unknown as UnifiedConfig,
    endo: endoUnified as unknown as UnifiedConfig,
};

const answerMapConfigs: Record<TreatmentId, AnswerMapConfig> = {
    fuellung: fuellungAnswerMap as unknown as AnswerMapConfig,
    endo: endoAnswerMap as unknown as AnswerMapConfig,
};

const questionBankConfigs: Record<TreatmentId, QuestionBankConfig> = {
    fuellung: fuellungQuestionBank as unknown as QuestionBankConfig,
    endo: endoQuestionBank as unknown as QuestionBankConfig,
};

const templateConfigs: Record<TreatmentId, TemplateConfig> = {
    fuellung: fuellungTemplate as unknown as TemplateConfig,
    endo: endoTemplate as unknown as TemplateConfig,
};

const findingMapConfigs: Record<TreatmentId, FindingMapConfig> = {
    fuellung: fuellungFindingMap as unknown as FindingMapConfig,
    endo: endoFindingMap as unknown as FindingMapConfig,
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
