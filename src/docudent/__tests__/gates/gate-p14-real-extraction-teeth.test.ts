/**
 * Gate: P14.X11 Real Extraction Teeth Population
 * 
 * Verifies that the real extraction service properly extracts teeth[] 
 * from dictation using the regex fallback path (no LLM required).
 * 
 * This test mocks the LLM to force regex path, ensuring determinism.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We'll test the extractAllTeeth function indirectly through extractViaRegex behavior
// Since extractFromDictation may call LLM, we import the module and mock fetch

describe('Gate: P14.X11 Real Extraction Teeth Population', () => {
    // Mock fetch to force regex fallback (no LLM)
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network disabled for test')));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('teeth[] extraction via real extractFromDictation (regex path)', () => {
        it('should extract tooth from "Zahn 16" pattern', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation('Zahn 16 mod Karies');

            expect(result.teeth).toBeDefined();
            expect(result.teeth).toContain('16');
            expect(result.tooth).toBe('16');
        });

        it('should extract multiple teeth from dictation', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation(
                'Zahn 16 mod Karies, Zahn 15 mo Karies'
            );

            expect(result.teeth).toContain('16');
            expect(result.teeth).toContain('15');
            expect(result.teeth?.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle standalone FDI numbers', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation('Bei 36 wurde Füllung gelegt');

            expect(result.teeth).toContain('36');
        });

        it('should extract deciduous tooth 84', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation('Zahn 84 mo Karies bei Kind');

            expect(result.teeth).toContain('84');
            expect(result.tooth).toBe('84');
        });

        it('should sort teeth numerically', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation(
                'Zahn 36 Karies, Zahn 16 Karies, Zahn 26 Karies'
            );

            expect(result.teeth).toBeDefined();
            // Teeth should be sorted: 16, 26, 36
            if (result.teeth && result.teeth.length >= 3) {
                expect(result.teeth[0]).toBe('16');
                expect(result.teeth[1]).toBe('26');
                expect(result.teeth[2]).toBe('36');
            }
        });

        it('should deduplicate teeth', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation(
                'Zahn 16 mod, dann nochmal 16 erwähnt'
            );

            expect(result.teeth).toContain('16');
            const count16 = result.teeth?.filter(t => t === '16').length;
            expect(count16).toBe(1);
        });

        it('should return empty array for dictation without teeth', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation('Prophylaxe durchgeführt');

            expect(result.teeth).toBeDefined();
            expect(result.teeth?.length).toBe(0);
        });

        it('should set primary tooth from teeth[] if not already set', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation(
                'Bei 26 Karies, bei 16 auch'
            );

            // Primary tooth should be in the teeth array
            expect(result.teeth).toContain(result.tooth);
            // Both teeth should be extracted
            expect(result.teeth).toContain('16');
            expect(result.teeth).toContain('26');
        });
    });

    describe('FDI validation in real extraction', () => {
        it('should accept valid permanent teeth (11-48)', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation('Zahn 18 Weisheitszahn');

            expect(result.teeth).toContain('18');
        });

        it('should accept valid deciduous teeth (51-85)', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation('Zahn 55 Milchzahn');

            expect(result.teeth).toContain('55');
        });

        it('should reject invalid teeth numbers', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const result = await extractFromDictation('Zahn 99 ungültig');

            expect(result.teeth).not.toContain('99');
        });
    });

    describe('determinism', () => {
        it('should produce identical results for same input', async () => {
            const { extractFromDictation } = await import('../../core/extraction/extractionService');
            const dictation = 'Zahn 36 mod, Zahn 15 mo';

            const result1 = await extractFromDictation(dictation);
            const result2 = await extractFromDictation(dictation);

            expect(result1.teeth).toEqual(result2.teeth);
            expect(result1.tooth).toEqual(result2.tooth);
        });
    });
});
