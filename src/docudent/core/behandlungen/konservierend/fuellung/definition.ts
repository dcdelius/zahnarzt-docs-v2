/**
 * FILLING TREATMENT DEFINITION
 * 
 * REFACTORED: Lädt jetzt aus fuellung_unified.json
 * Keine hardcodierten Chip-Definitionen mehr!
 * 
 * Single Source of Truth: fuellung_unified.json
 */

import { TreatmentDefinition, ChipDefinition, TextSnippets, BillingRef, DataPatch } from '../../_shared/types';
import fuellungData from '../../../billing/knowledgeBase/behandlungen/fuellung_unified.json';

// ═══════════════════════════════════════════════════════════════
// JSON → TreatmentDefinition Konvertierung
// ═══════════════════════════════════════════════════════════════

interface JsonChip {
    id: string;
    label: string;
    phase: string;
    category: string;
    textSnippets: {
        kurz: string;
        mittel: string;
        lang: string;
    };
    billingRef: {
        GKV?: string;
        PKV?: string;
        MKV?: string;
    } | null;
    dataPatches?: Array<{ field: string; value: any }>;
    mutuallyExclusiveWith?: string[];
    defaultActive?: boolean;
    variablen?: Record<string, any>;
    dokumentation_required?: string;
}

function convertJsonChipToDefinition(jsonChip: JsonChip): ChipDefinition {
    // Konvertiere billingRef zu billingRefs (plural)
    const billingRefs: BillingRef = {};
    if (jsonChip.billingRef) {
        if (jsonChip.billingRef.GKV) billingRefs.GKV = jsonChip.billingRef.GKV;
        if (jsonChip.billingRef.PKV) billingRefs.PKV = jsonChip.billingRef.PKV;
        if (jsonChip.billingRef.MKV) billingRefs.MKV = jsonChip.billingRef.MKV;
    }

    // Konvertiere category zu erlaubtem Typ
    const category: 'befund' | 'leistung' =
        jsonChip.category === 'befund' ? 'befund' : 'leistung';

    return {
        id: jsonChip.id,
        label: jsonChip.label,
        description: jsonChip.textSnippets?.mittel || '',
        textLine: jsonChip.textSnippets?.mittel || '',
        textSnippets: jsonChip.textSnippets as TextSnippets,
        billingRefs,
        dataPatches: (jsonChip.dataPatches || []) as DataPatch[],
        mutuallyExclusiveWith: jsonChip.mutuallyExclusiveWith || [],
        defaultActive: jsonChip.defaultActive || false,
        category
    };
}

// ═══════════════════════════════════════════════════════════════
// Chips aus JSON laden und konvertieren
// ═══════════════════════════════════════════════════════════════

const loadedChips: ChipDefinition[] = (fuellungData.chips as JsonChip[]).map(convertJsonChipToDefinition);

// ═══════════════════════════════════════════════════════════════
// EXPORT: TreatmentDefinition
// ═══════════════════════════════════════════════════════════════

export const FILLING_TREATMENT: TreatmentDefinition = {
    id: 'filling',
    label: fuellungData._meta.label || 'Füllungstherapie',
    category: 'conservative',
    icon: '◉',

    // Texte aus JSON
    consentText: fuellungData.consent_texts?.mittel || '',
    consentTexts: fuellungData.consent_texts as TextSnippets,
    dismissalText: fuellungData.dismissal_texts?.mittel || '',
    dismissalTexts: fuellungData.dismissal_texts as TextSnippets,

    requiredOutputs: [],

    // Chips aus JSON geladen!
    chips: loadedChips,

    // Billing & Upsell rules (leer - werden aus fuellung_unified.json gelesen)
    billingRules: [],
    upsells: [],

    // Blueprint ID für LLM
    blueprintId: 'fuellung'
};

export default FILLING_TREATMENT;
