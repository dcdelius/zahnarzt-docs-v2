/**
 * Stub Extractor for MVP Gate Tests
 * 
 * Fast, deterministic, offline extraction for the 5 MVP treatments.
 * Uses simple regex/keyword matching - NO LLM, NO network.
 * 
 * Usage: Set process.env.DOCUDENT_TEST_MODE = 'stub_extraction' before running tests.
 * 
 * IMPORTANT: This module is for testing only. It MUST NOT be imported in production code.
 */

import type { ExtractedData } from '../../../core/services/extractionService';

// ═══════════════════════════════════════════════════════════════
// STUB EXTRACTION — Fast, deterministic, offline
// ═══════════════════════════════════════════════════════════════

export function stubExtractFromDictation(
    dictation: string,
    treatmentId?: string
): ExtractedData {
    const lower = dictation.toLowerCase();

    // --- Extract ALL tooth numbers (multi-tooth support) ---
    // P14.X: Use global regex to find all FDI tooth numbers
    // FDI notation: 11-18, 21-28, 31-38, 41-48 (permanent), 51-55, 61-65, 71-75, 81-85 (deciduous)
    // Word boundary ensures we don't match partial numbers like "216" as "21" + "6"
    const toothPattern = /\bZahn\s*(\d{1,2})\b|\b([1-8][1-8])\b/gi;
    const matches = [...dictation.matchAll(toothPattern)];

    // Helper: Validate FDI tooth number
    const isValidFDITooth = (t: string): boolean => {
        if (!/^\d{2}$/.test(t)) return false;
        const quadrant = parseInt(t[0]);
        const position = parseInt(t[1]);

        // Permanent teeth: quadrants 1-4, positions 1-8
        if (quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8) return true;
        // Deciduous teeth: quadrants 5-8, positions 1-5
        if (quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5) return true;
        return false;
    };

    const allTeeth = matches
        .map(m => m[1] || m[2])  // Group 1 for "Zahn XX", Group 2 for standalone
        .filter((t): t is string => t !== undefined)
        .filter(isValidFDITooth);  // Validate FDI format properly

    // Unique and sorted (numeric order)
    const teeth = [...new Set(allTeeth)].sort((a, b) => parseInt(a) - parseInt(b));

    // Primary tooth is first extracted (or null if none)
    const tooth = teeth.length > 0 ? teeth[0] : null;

    // --- Extract surfaces (only for fuellung treatment) ---
    const surfaces: string[] = [];
    // Surfaces are only relevant for fuellung treatment, not endo/extraction/etc
    if (!treatmentId || treatmentId === 'fuellung') {
        // P12.8: Check for 4+ surface patterns FIRST (must come before 3-surface patterns!)
        if (lower.includes('modbl')) {
            surfaces.push('m', 'o', 'd', 'b', 'l');
        } else if (lower.includes('modb')) {
            surfaces.push('m', 'o', 'd', 'b');
        } else if (lower.includes('modl')) {
            surfaces.push('m', 'o', 'd', 'l');
            // 3-surface patterns
        } else if (lower.includes('mod') || (lower.includes(' mod ') || lower.match(/\bmod\b/))) {
            surfaces.push('m', 'o', 'd');
        } else if (lower.includes('od') || lower.match(/\bod\b/)) {
            surfaces.push('o', 'd');
        } else if (lower.includes('mo') || lower.match(/\bmo\b/)) {
            surfaces.push('m', 'o');
        } else {
            // P12.8: Check for full surface names (can be multiple)
            // This handles 'mesial-okklusal-distal' and similar hyphenated forms
            const hasMultiSurfaces = (
                (lower.includes('mesial') ? 1 : 0) +
                (lower.includes('okklusal') ? 1 : 0) +
                (lower.includes('distal') ? 1 : 0) +
                (lower.includes('bukkal') ? 1 : 0) +
                (lower.includes('lingual') || lower.includes('palatinal') ? 1 : 0)
            ) > 1;

            if (hasMultiSurfaces || lower.match(/mesial|distal|bukkal|lingual|palatinal/)) {
                // Extract all mentioned surfaces
                if (lower.includes('mesial')) surfaces.push('m');
                if (lower.includes('okklusal')) surfaces.push('o');
                if (lower.includes('distal')) surfaces.push('d');
                if (lower.includes('bukkal')) surfaces.push('b');
                if (lower.includes('lingual') || lower.includes('palatinal')) surfaces.push('l');
            } else if (lower.includes('okklusal') || lower.match(/\bo\b/)) {
                // Single okklusal surface only
                surfaces.push('o');
            }
        }
    }

    // --- Determine diagnosis based on keywords ---
    let diagnosis: string | null = null;
    if (lower.includes('profunda') || lower.includes('tief') || lower.includes('pulpanah')) {
        diagnosis = 'Caries profunda';
    } else if (lower.includes('media') || lower.includes('karies')) {
        diagnosis = 'Caries media';
    } else if (lower.includes('superficialis')) {
        diagnosis = 'Caries superficialis';
    }

    // --- Extract costs ---
    const costMatch = dictation.match(/(\d+)\s*€/);
    const costs = costMatch ? parseInt(costMatch[1], 10) : null;

    // --- Mentioned fields ---
    const mentioned: ExtractedData['mentioned'] = {};

    // Endo step (for endo treatment) - using type assertion as endo-specific field
    if (treatmentId === 'endo') {
        if (lower.includes('trepanation') || lower.includes('eröffnung') || lower.includes('t1')) {
            (mentioned as any).endo_step = 'endo_start';
        } else if (lower.includes('wurzelfüllung') || lower.includes('abfüllung') || lower.includes('obturation') || lower.includes('wf ')) {
            (mentioned as any).endo_step = 'endo_complete';
        } else if (lower.includes('zwischen') || lower.includes('wechsel') || lower.includes('t2')) {
            (mentioned as any).endo_step = 'endo_interim';
        }
    }

    // Anesthesia
    if (lower.includes('anästhesie') || lower.includes(' la ') || lower.includes('betäubung')) {
        if (lower.includes('leitung')) {
            mentioned.anesthesia = { type: 'leitung', confidence: 1 };
        } else if (lower.includes('infiltr')) {
            mentioned.anesthesia = { type: 'infiltr', confidence: 1 };
        } else {
            mentioned.anesthesia = { type: 'infiltr', confidence: 0.8 };
        }
    }

    // Kofferdam
    if (lower.includes('kofferdam') || lower.includes('absolut')) {
        mentioned.kofferdam = true;
    } else if (lower.includes('relativ')) {
        mentioned.kofferdam = false;
    }

    // Vitality
    if (lower.includes('vital') && !lower.includes('devital') && !lower.includes('avital')) {
        mentioned.vitality = '+';
    } else if (lower.includes('devital') || lower.includes('avital')) {
        mentioned.vitality = '-';
    }

    // Percussion
    if (lower.includes('perk+') || lower.includes('perkussion+')) {
        mentioned.percussion = '+';
    } else if (lower.includes('perk-') || lower.includes('perkussion-')) {
        mentioned.percussion = '-';
    }

    // --- M7: Bleeding/Hemostasis signals ---
    // Bleeding detection
    if (lower.includes('blutung') || lower.includes('blutet') || lower.includes('blutend') || lower.includes('bleeding')) {
        (mentioned as any).bleeding = true;
        // Check for heavy bleeding
        if (lower.includes('starke blutung') || lower.includes('starker blutung') ||
            lower.includes('stark blutend') ||
            lower.includes('heavy bleeding') || lower.includes('massive blutung') ||
            lower.includes('deutliche blutung') || lower.includes('persistierende blutung')) {
            (mentioned as any).bleedingHeavy = true;
        }
    }

    // Hemostasis detection
    if (lower.includes('blutstillung') || lower.includes('hämostase') || lower.includes('hemostasis') ||
        lower.includes('gestillt') || lower.includes('alcl3') || lower.includes('alaun') ||
        lower.includes('gelatamp') || lower.includes('koagulation') || lower.includes('tamponade')) {
        (mentioned as any).hemostasis = true;
    }

    // --- M7: Sensitivity signals ---
    if (lower.includes('empfindlich') || lower.includes('sensibel') || lower.includes('sensitivity') ||
        lower.includes('hypersensibel') || lower.includes('hypersensitiv') ||
        lower.includes('überempfindlich')) {
        (mentioned as any).sensitivity = true;
        // Check for high sensitivity
        if (lower.includes('stark empfindlich') || lower.includes('sehr empfindlich') ||
            lower.includes('ausgeprägt') || lower.includes('high sensitivity')) {
            (mentioned as any).sensitivityHigh = true;
        }
    }

    // Desensitizer detection
    if (lower.includes('duraphat') || lower.includes('fluorid') || lower.includes('desensibilisierung') ||
        lower.includes('desensitizer') || lower.includes('elmex')) {
        (mentioned as any).desensitizer = true;
    }

    // --- Generate gaps based on missing data ---
    const gaps: string[] = [];
    if (!mentioned.vitality) gaps.push('vitality');
    if (!mentioned.percussion) gaps.push('percussion');
    if (mentioned.kofferdam === undefined) gaps.push('kofferdam');

    return {
        tooth,
        teeth,  // P14.X: Multi-tooth SSOT
        surfaces,
        diagnosis,
        costs,
        mentioned,
        gaps,
        rawDictation: dictation,
    };
}

// ═══════════════════════════════════════════════════════════════
// TEST MODE CHECK
// ═══════════════════════════════════════════════════════════════

export function isStubExtractionMode(): boolean {
    return process.env.DOCUDENT_TEST_MODE === 'stub_extraction';
}

/**
 * Get the appropriate extractor based on test mode.
 * Returns stub extractor if in test mode, otherwise returns the real one.
 */
export async function getExtractor(): Promise<typeof stubExtractFromDictation> {
    if (isStubExtractionMode()) {
        return stubExtractFromDictation;
    }
    // Import real extractor (this path won't be taken in tests)
    const { extractFromDictation } = await import('../../../core/services/extractionService');
    return extractFromDictation;
}
