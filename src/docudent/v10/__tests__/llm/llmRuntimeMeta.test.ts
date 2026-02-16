import { describe, expect, it } from 'vitest';
import {
    applyExtractionTraceMeta,
    applyPreanalysisMeta,
    createInitialLlmRuntimeMeta,
    shouldShowLlmFallbackBanner,
} from '../../debug/llmRuntimeMeta';

describe('llmRuntimeMeta', () => {
    it('captures preanalysis fallback and diagnostics', () => {
        const initial = createInitialLlmRuntimeMeta();
        const next = applyPreanalysisMeta(initial, {
            source: 'fallback',
            diagnostics: ['llm-error:timeout', 'tooth-missing-reference'],
            fallback: true,
        });
        expect(next.preanalysisSource).toBe('fallback');
        expect(next.preanalysisFallback).toBe(true);
        expect(next.preanalysisDiagnostics).toEqual(['llm-error:timeout', 'tooth-missing-reference']);
    });

    it('parses extraction trace details deterministically', () => {
        const initial = createInitialLlmRuntimeMeta();
        const next = applyExtractionTraceMeta(initial, [
            { key: 'extract_detail', value: 'method=regex;llmError=OpenAI_401' },
        ]);
        expect(next.extractionMethod).toBe('regex');
        expect(next.extractionLlmError).toBe('OpenAI_401');
    });

    it('ignores unrelated trace lines without mutating values', () => {
        const initial = applyPreanalysisMeta(createInitialLlmRuntimeMeta(), {
            source: 'llm',
            diagnostics: [],
            fallback: false,
        });
        const next = applyExtractionTraceMeta(initial, [{ key: 'render', value: 'ok' }]);
        expect(next).toEqual(initial);
    });

    it('shows fallback banner only when fallback/error signals exist', () => {
        const clean = applyPreanalysisMeta(createInitialLlmRuntimeMeta(), {
            source: 'llm',
            diagnostics: [],
            fallback: false,
        });
        const cleanWithExtraction = applyExtractionTraceMeta(clean, [
            { key: 'extract_detail', value: 'method=llm;llmError=none' },
        ]);
        expect(shouldShowLlmFallbackBanner(cleanWithExtraction)).toBe(false);

        const fallback = applyPreanalysisMeta(cleanWithExtraction, {
            source: 'fallback',
            diagnostics: ['llm-unavailable'],
            fallback: true,
        });
        expect(shouldShowLlmFallbackBanner(fallback)).toBe(true);
    });
});
