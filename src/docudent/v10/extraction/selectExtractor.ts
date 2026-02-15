/**
 * V10 Extractor Selection
 *
 * Selects the appropriate extraction engine based on:
 * 1. testOnly.forceExtraction (if provided)
 * 2. Environment variables (VITE_STUB_EXTRACTION, DOCUDENT_TEST_MODE)
 * 3. Default behavior
 *
 * Matches V7 selection semantics.
 */

import type { ExtractedData } from '../../core/services/extractionService';

// ═══════════════════════════════════════════════════════════════
// EXTRACTOR TYPES
// ═══════════════════════════════════════════════════════════════

export type ExtractorEngine = 'stub' | 'llm' | 'forced';

export interface ExtractorSelection {
    /** Which engine was selected */
    engine: ExtractorEngine;
    /** The extract function to use */
    extract: (dictation: string, treatmentId?: string) => Promise<ExtractedData> | ExtractedData;
}

// ═══════════════════════════════════════════════════════════════
// SELECTION LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Check if stub extraction mode is enabled.
 */
function isStubMode(): boolean {
    // Node/test environment
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.VITE_STUB_EXTRACTION === 'true') return true;
        if (process.env.DOCUDENT_TEST_MODE === 'stub_extraction') return true;
        if (process.env.NODE_ENV === 'test') return true;
        if (process.env.VITEST === 'true') return true;
    }
    // Browser environment
    if (typeof window !== 'undefined') {
        try {
            if ((import.meta as any)?.env?.VITE_STUB_EXTRACTION === 'true') return true;
        } catch {
            // Ignore
        }
    }
    return false;
}

/**
 * Select the appropriate extractor.
 *
 * @param forceExtraction - If provided, create an extractor that returns this data
 * @returns ExtractorSelection with engine type and extract function
 */
export async function selectExtractor(
    forceExtraction?: Record<string, unknown>
): Promise<ExtractorSelection> {
    // Priority 1: Forced extraction (testOnly)
    if (forceExtraction) {
        return {
            engine: 'forced',
            extract: () => forceExtraction as ExtractedData,
        };
    }

    // Priority 2: Stub mode (test/dev)
    if (isStubMode()) {
        // Dynamically import stub extractor
        const { stubExtractFromDictation } = await import(
            '../../v7/pipeline/__test__/stubExtractor'
        );
        return {
            engine: 'stub',
            extract: stubExtractFromDictation,
        };
    }

    // Priority 3: Real LLM extractor
    const { extractFromDictation } = await import(
        '../../core/services/extractionService'
    );
    return {
        engine: 'llm',
        extract: extractFromDictation,
    };
}

/**
 * Synchronous check for which engine WOULD be selected.
 * Useful for trace logging before actual extraction.
 *
 * @param hasForceExtraction - Whether testOnly.forceExtraction is provided
 * @returns Engine type that would be selected
 */
export function getExpectedEngine(hasForceExtraction: boolean): ExtractorEngine {
    if (hasForceExtraction) return 'forced';
    if (isStubMode()) return 'stub';
    return 'llm';
}
