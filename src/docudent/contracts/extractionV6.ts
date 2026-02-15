/**
 * Extraction V6 Contracts — Legacy Type Definitions
 *
 * ═══════════════════════════════════════════════════════════════
 * V6 extraction types, kept separate from V2/V7 richer types.
 * Used by core/extraction/extractionService.ts (ported from V6).
 * ═══════════════════════════════════════════════════════════════
 *
 * ⚠️ LEGACY: Prefer ExtractedDataV2 from contracts/extraction.ts for new code.
 */

// ═══════════════════════════════════════════════════════════════
// EXTRACTION VERSION
// ═══════════════════════════════════════════════════════════════

export const EXTRACTION_VERSION_V6 = 'v6' as const;

// ═══════════════════════════════════════════════════════════════
// V6 EXTRACTED DATA TYPE
// ═══════════════════════════════════════════════════════════════

export interface ExtractedDataV6 {
    /** Primary tooth (single tooth mode) */
    tooth: string | null;

    /** All teeth detected (multi-tooth mode SSOT) */
    teeth?: string[];

    surfaces: string[];
    diagnosis: string | null;
    costs: number | null;

    /** What was explicitly mentioned in dictation */
    mentioned: {
        anesthesia?: { type: 'infiltr' | 'leitung' | 'keine'; confidence: number };
        kofferdam?: boolean;
        capping?: { type: 'cp' | 'p' | 'none' };
        material?: string;
        vitality?: '+' | '-';
        percussion?: '+' | '-';
    };

    /** What was NOT mentioned → becomes a question */
    gaps: string[];

    /** Original dictation text for downstream detection (e.g., endo step) */
    rawDictation?: string;

    /** Zusatzinfos aus dem Diktat (Kontext/Anamnese/sonstige Hinweise) */
    zusatzinfos?: string[];

    /** Medizinische Zusatzinfos (klinischer Kontext) */
    klinischeZusatzinfos?: string[];

    /** Patientenangaben (psychosozialer Kontext) */
    patientenangaben?: string[];

    /** Extraction version tag for debugging */
    extractionVersion: typeof EXTRACTION_VERSION_V6;
}

// ═══════════════════════════════════════════════════════════════
// LEGACY TYPE ALIAS (for backwards compatibility)
// ═══════════════════════════════════════════════════════════════

/**
 * @deprecated Use ExtractedDataV6 and handle extractionVersion explicitly.
 */
export type ExtractedData = Omit<ExtractedDataV6, 'extractionVersion'>;

// ═══════════════════════════════════════════════════════════════
// HELPER: Create empty V6 extraction
// ═══════════════════════════════════════════════════════════════

export function createEmptyExtractionV6(rawDictation: string = ''): ExtractedDataV6 {
    return {
        tooth: null,
        teeth: [],
        surfaces: [],
        diagnosis: null,
        costs: null,
        mentioned: {},
        gaps: [],
        rawDictation,
        extractionVersion: EXTRACTION_VERSION_V6,
    };
}
