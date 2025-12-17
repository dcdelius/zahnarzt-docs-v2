/**
 * Gate Test: Extraction Parity Smoke (A3)
 *
 * Verifies that extraction output shape remains stable after port.
 * Tests key presence and value types, not exact values.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock LLM to ensure deterministic regex-only extraction
vi.stubGlobal('import.meta', { env: {} });

describe('Extraction Parity Smoke (V6 Port)', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('extraction returns expected V6 shape with version tag', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');

        const result = await extractFromDictation('36 mod profunda Leitung 80€');

        // Key presence
        expect(result).toHaveProperty('tooth');
        expect(result).toHaveProperty('surfaces');
        expect(result).toHaveProperty('diagnosis');
        expect(result).toHaveProperty('costs');
        expect(result).toHaveProperty('mentioned');
        expect(result).toHaveProperty('gaps');
        expect(result).toHaveProperty('rawDictation');
        expect(result).toHaveProperty('extractionVersion');

        // Version tag (A2)
        expect(result.extractionVersion).toBe('v6');

        // Type checks
        expect(typeof result.tooth === 'string' || result.tooth === null).toBe(true);
        expect(Array.isArray(result.surfaces)).toBe(true);
        expect(typeof result.diagnosis === 'string' || result.diagnosis === null).toBe(true);
        expect(typeof result.costs === 'number' || result.costs === null).toBe(true);
        expect(typeof result.mentioned).toBe('object');
        expect(Array.isArray(result.gaps)).toBe(true);
    });

    it('extraction parses tooth and surfaces correctly', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');

        const result = await extractFromDictation('46 mod');

        expect(result.tooth).toBe('46');
        expect(result.surfaces).toEqual(['m', 'o', 'd']);
        expect(result.extractionVersion).toBe('v6');
    });

    it('extraction parses vitality and percussion mentions', async () => {
        const { extractFromDictation } = await import('../../core/extraction/extractionService');

        const result = await extractFromDictation('vipr+ perk-');

        expect(result.mentioned.vitality).toBe('+');
        expect(result.mentioned.percussion).toBe('-');
        expect(result.extractionVersion).toBe('v6');
    });
});
