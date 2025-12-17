/**
 * Surface Detection Unit Tests
 *
 * Tests that surface patterns are correctly detected from dictation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock LLM to ensure regex-only extraction
vi.stubGlobal('import.meta', { env: {} });

describe('Surface Detection (P6 Fix)', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('should detect okklusal-distal -> ["o", "d"]', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');
        const result = await extractFromDictation('36 okklusal-distal');
        expect(result.surfaces).toEqual(['o', 'd']);
    });

    it('should detect od -> ["o", "d"]', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');
        const result = await extractFromDictation('36 od');
        expect(result.surfaces).toEqual(['o', 'd']);
    });

    it('should detect mesial-okklusal -> ["m", "o"]', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');
        const result = await extractFromDictation('36 mesial-okklusal');
        expect(result.surfaces).toEqual(['m', 'o']);
    });

    it('should detect distal -> ["d"]', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');
        const result = await extractFromDictation('36 distal');
        expect(result.surfaces).toEqual(['d']);
    });

    it('should detect mod -> ["m", "o", "d"]', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');
        const result = await extractFromDictation('36 mod');
        expect(result.surfaces).toEqual(['m', 'o', 'd']);
    });

    it('should detect bukkal -> ["b"]', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');
        const result = await extractFromDictation('36 bukkal');
        expect(result.surfaces).toEqual(['b']);
    });
});
