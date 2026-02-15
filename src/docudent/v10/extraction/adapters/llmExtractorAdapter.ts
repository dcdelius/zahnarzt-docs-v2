/**
 * LLM Extractor Adapter
 *
 * Isolates core/services imports for V10 extraction.
 * This is the ONLY file in v10/** that may import from core/services.
 *
 * ALLOWED EXCEPTION: This adapter bridges V10 to core LLM extraction service.
 */

// Note: This import is the isolated core/services dependency
import { extractFromDictation, type ExtractedData } from '../../../core/services/extractionService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LlmExtractorInput {
    dictation: string;
    treatmentId: string;
    hints?: Record<string, unknown>;
}

export interface LlmExtractorOutput {
    extracted: Record<string, unknown>;
    engine: 'llm';
    latencyMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adapter for LLM extraction service.
 * Wraps core/services/extractionService with V10-compatible interface.
 */
export async function callLlmExtractor(input: LlmExtractorInput): Promise<LlmExtractorOutput> {
    const start = Date.now();

    const result: ExtractedData = await extractFromDictation(input.dictation);

    return {
        extracted: result || {},
        engine: 'llm',
        latencyMs: Date.now() - start,
    };
}

/**
 * Check if LLM extractor is available.
 */
export function isLlmExtractorAvailable(): boolean {
    return typeof extractFromDictation === 'function';
}
