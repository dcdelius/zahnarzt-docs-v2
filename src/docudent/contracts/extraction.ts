/**
 * Extraction Contract — SSOT for ExtractedData
 *
 * This is the single source of truth for extraction output.
 *
 * Rules:
 * - NO silent defaults: if uncertain, value is null + needsConfirmation=true
 * - Every field has confidence + evidence tracking
 * - `unknown` is allowed; false certainty is not
 */

// ═══════════════════════════════════════════════════════════════
// CORE FIELD TYPE
// ═══════════════════════════════════════════════════════════════

/**
 * Field<T> wraps every extracted value with metadata
 *
 * - value: the extracted value, or null if not found/uncertain
 * - confidence: 0.0 to 1.0, how sure we are
 * - evidence: array of text spans that support this value
 * - needsConfirmation: if true, pipeline should ask user
 */
export interface Field<T> {
    value: T | null;
    confidence: number;
    evidence: string[];
    needsConfirmation: boolean;
}

// Factory for creating fields
export function createField<T>(
    value: T | null,
    confidence: number,
    evidence: string[] = [],
    needsConfirmation?: boolean
): Field<T> {
    return {
        value,
        confidence,
        evidence,
        needsConfirmation: needsConfirmation ?? (confidence < 0.7 || value === null)
    };
}

// Factory for unknown/not-found fields
export function unknownField<T>(): Field<T> {
    return {
        value: null,
        confidence: 0,
        evidence: [],
        needsConfirmation: true
    };
}

// Factory for certain fields
export function certainField<T>(value: T, evidence: string[] = []): Field<T> {
    return {
        value,
        confidence: 1.0,
        evidence,
        needsConfirmation: false
    };
}

// ═══════════════════════════════════════════════════════════════
// ANESTHESIA TYPES
// ═══════════════════════════════════════════════════════════════

export type AnesthesiaType = 'leitung' | 'infiltr' | 'keine' | 'unknown';

export interface AnesthesiaInfo {
    present: boolean;
    type: AnesthesiaType;
}

// ═══════════════════════════════════════════════════════════════
// CAPPING TYPES
// ═══════════════════════════════════════════════════════════════

export type CappingType = 'cp' | 'p' | 'none' | 'unknown';
export type CappingMaterial = 'CaOH' | 'MTA' | 'Biodentine' | 'unknown';

export interface CappingInfo {
    present: boolean;
    type: CappingType;
    material: CappingMaterial;
}

// ═══════════════════════════════════════════════════════════════
// DEPTH/TIEFE TYPES
// ═══════════════════════════════════════════════════════════════

export type TiefeType = 'tief' | 'normal' | 'unknown';

// ═══════════════════════════════════════════════════════════════
// VITALITY/PERCUSSION TYPES
// ═══════════════════════════════════════════════════════════════

export type VitalityType = '+' | '-' | 'unknown';
export type PercussionType = '+' | '-' | 'unknown';

// ═══════════════════════════════════════════════════════════════
// SURFACE TYPE
// ═══════════════════════════════════════════════════════════════

export type Surface = 'm' | 'o' | 'd' | 'b' | 'l' | 'i';

// ═══════════════════════════════════════════════════════════════
// MENTIONED FIELDS (structured clinical findings)
// ═══════════════════════════════════════════════════════════════

export interface MentionedFields {
    anesthesia: Field<AnesthesiaInfo>;
    kofferdam: Field<boolean>;
    tiefe: Field<TiefeType>;
    vitality: Field<VitalityType>;
    percussion: Field<PercussionType>;
    capping: Field<CappingInfo>;
    material: Field<string>;
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD FLAGS (factual: what words were SAID, not what they MEAN)
// ═══════════════════════════════════════════════════════════════

export interface KeywordFlags {
    /** Said "profunda", "pulpanah", or "tief" */
    saidDeepCavity: boolean;
    /** Said "superficialis" or "oberflächlich" */
    saidSuperficial: boolean;
    /** Said "fraktur", "abgebrochen", "ecke fehlt" */
    saidFracture: boolean;
    /** Said "karies", "caries", "media" */
    saidCaries: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTED DATA TYPE
// ═══════════════════════════════════════════════════════════════

/**
 * ExtractedDataV2 - FACTS ONLY
 *
 * NO INTERPRETATIONS:
 * - NO diagnosis (that's Engine logic)
 * - NO therapy decisions
 * - ONLY what was literally said
 */
export interface ExtractedDataV2 {
    tooth: Field<string>;
    surfaces: Field<Surface[]>;
    costs: Field<number>;
    mentioned: MentionedFields;
    /** Factual keyword flags - what words were said */
    keywordFlags: KeywordFlags;
    raw: {
        dictation: string;
        normalized: string;
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get all fields needing confirmation
// ═══════════════════════════════════════════════════════════════

export function getFieldsNeedingConfirmation(extracted: ExtractedDataV2): string[] {
    const result: string[] = [];

    if (extracted.tooth.needsConfirmation) result.push('tooth');
    if (extracted.surfaces.needsConfirmation) result.push('surfaces');
    // NO diagnosis - that's derived by Engine, not extracted
    if (extracted.costs.needsConfirmation) result.push('costs');
    if (extracted.mentioned.anesthesia.needsConfirmation) result.push('mentioned.anesthesia');
    if (extracted.mentioned.kofferdam.needsConfirmation) result.push('mentioned.kofferdam');
    if (extracted.mentioned.tiefe.needsConfirmation) result.push('mentioned.tiefe');
    if (extracted.mentioned.vitality.needsConfirmation) result.push('mentioned.vitality');
    if (extracted.mentioned.percussion.needsConfirmation) result.push('mentioned.percussion');
    if (extracted.mentioned.capping.needsConfirmation) result.push('mentioned.capping');
    if (extracted.mentioned.material.needsConfirmation) result.push('mentioned.material');

    return result;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Create empty extraction result
// ═══════════════════════════════════════════════════════════════

export function createEmptyExtraction(dictation: string, normalized: string): ExtractedDataV2 {
    return {
        tooth: unknownField(),
        surfaces: unknownField(),
        // NO diagnosis - derived by Engine
        costs: unknownField(),
        mentioned: {
            anesthesia: unknownField(),
            kofferdam: unknownField(),
            tiefe: unknownField(),
            vitality: unknownField(),
            percussion: unknownField(),
            capping: unknownField(),
            material: unknownField(),
        },
        keywordFlags: {
            saidDeepCavity: false,
            saidSuperficial: false,
            saidFracture: false,
            saidCaries: false,
        },
        raw: { dictation, normalized }
    };
}
