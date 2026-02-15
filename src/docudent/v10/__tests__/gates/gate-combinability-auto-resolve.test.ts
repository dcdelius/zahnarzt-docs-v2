/**
 * Gate Test: Combinability Auto-Resolve
 *
 * Contract: GOZ_2197 + GOZ_2060-2120 conflict should be AUTO-RESOLVED
 * by dropping GOZ_2197, NOT by returning error state.
 *
 * Policy: "drop_anchor" = drop the anchor code (2197) when F-codes present
 */

import { describe, it, expect } from 'vitest';
import { checkCombinabilityFromKb } from '../../billing/combinability/checkCombinabilityFromKb';

describe('Gate: Combinability Auto-Resolve', () => {
    const context = { treatmentId: 'fuellung', insuranceType: 'PKV' as const };

    it('GOZ_2197 + GOZ_2100 → WARN (not BLOCK), 2197 dropped', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2100', 'GOZ_0090'],
            context
        );

        // Should NOT block
        expect(result.verdict).not.toBe('BLOCK');

        // Should be WARN (auto-resolved)
        expect(result.verdict).toBe('WARN');

        // GOZ_2197 should be dropped
        expect(result.droppedCodes).toContain('GOZ_2197');

        // F-code should NOT be dropped
        expect(result.droppedCodes).not.toContain('GOZ_2100');

        // Warnings should explain what was dropped
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('2197');

        console.log('[GATE] Auto-resolve result:', {
            verdict: result.verdict,
            droppedCodes: result.droppedCodes,
            warnings: result.warnings,
        });
    });

    it('GOZ_2197 + GOZ_2060 → 2197 dropped (1-surface)', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2060'],
            context
        );

        expect(result.verdict).toBe('WARN');
        expect(result.droppedCodes).toContain('GOZ_2197');
        expect(result.droppedCodes).not.toContain('GOZ_2060');
    });

    it('GOZ_2197 + GOZ_2080 → 2197 dropped (2-surface)', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2080'],
            context
        );

        expect(result.verdict).toBe('WARN');
        expect(result.droppedCodes).toContain('GOZ_2197');
    });

    it('GOZ_2197 + GOZ_2120 → 2197 dropped (4+-surface)', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2120'],
            context
        );

        expect(result.verdict).toBe('WARN');
        expect(result.droppedCodes).toContain('GOZ_2197');
    });

    it('only GOZ_2197 without F-codes → PASS (no conflict)', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_0090'],
            context
        );

        // No conflict → PASS
        expect(result.verdict).toBe('PASS');
        expect(result.droppedCodes.length).toBe(0);
    });

    it('only F-codes without 2197 → PASS', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2100', 'GOZ_0090', 'GOZ_2040'],
            context
        );

        expect(result.verdict).toBe('PASS');
        expect(result.droppedCodes.length).toBe(0);
    });

    it('blockedCodes should be empty for auto-resolved conflicts', () => {
        const result = checkCombinabilityFromKb(
            ['GOZ_2197', 'GOZ_2100'],
            context
        );

        // blockedCodes = empty (no error)
        expect(result.blockedCodes.length).toBe(0);

        // droppedCodes = has 2197
        expect(result.droppedCodes).toContain('GOZ_2197');
    });
});
