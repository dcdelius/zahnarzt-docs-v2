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

import type { ExtractedData } from '../../../v6/hooks/useDocudentV6';

// ═══════════════════════════════════════════════════════════════
// STUB EXTRACTION — Fast, deterministic, offline
// ═══════════════════════════════════════════════════════════════

export function stubExtractFromDictation(
    dictation: string,
    treatmentId?: string
): ExtractedData {
    const lower = dictation.toLowerCase();

    // --- Extract tooth number ---
    const toothMatch = dictation.match(/\b([1-4][1-8])\b/);
    const tooth = toothMatch ? toothMatch[1] : null;

    // --- Extract surfaces ---
    const surfaces: string[] = [];
    if (lower.includes('mod') || lower.match(/m.*o.*d/)) {
        surfaces.push('m', 'o', 'd');
    } else if (lower.includes('od') || lower.match(/o.*d/)) {
        surfaces.push('o', 'd');
    } else if (lower.includes('mo') || lower.match(/m.*o/)) {
        surfaces.push('m', 'o');
    } else if (lower.includes('okklusal') || lower.match(/\bo\b/)) {
        surfaces.push('o');
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

    // --- Generate gaps based on missing data ---
    const gaps: string[] = [];
    if (!mentioned.vitality) gaps.push('vitality');
    if (!mentioned.percussion) gaps.push('percussion');
    if (mentioned.kofferdam === undefined) gaps.push('kofferdam');

    return {
        tooth,
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
    const { extractFromDictation } = await import('../../../v6/services/extractionService');
    return extractFromDictation;
}
