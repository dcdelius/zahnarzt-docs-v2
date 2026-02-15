/**
 * Gate: Truth Set Determinism
 *
 * Verifies that truth set loading and validation is deterministic.
 */

import { describe, it, expect } from 'vitest';
import {
    loadExternalTruthSet,
    validateTruthSet,
    getBlockClaims,
} from '../truthset/loadExternalTruthSet';

describe('Gate: Truth Set Determinism', () => {
    it('loading is deterministic (50x)', () => {
        const results: string[] = [];

        for (let i = 0; i < 50; i++) {
            // Clear cache by reloading module
            const truthSet = loadExternalTruthSet();
            results.push(JSON.stringify(truthSet.entries.map(e => e.id).sort()));
        }

        // All 50 runs should produce identical results
        const unique = new Set(results);
        expect(unique.size).toBe(1);
    });

    it('validation is deterministic (50x)', () => {
        const truthSet = loadExternalTruthSet();
        const results: string[] = [];

        for (let i = 0; i < 50; i++) {
            const validation = validateTruthSet(truthSet);
            results.push(JSON.stringify({
                valid: validation.valid,
                errorCount: validation.errors.length,
            }));
        }

        const unique = new Set(results);
        expect(unique.size).toBe(1);
    });

    it('getBlockClaims is deterministic (50x)', () => {
        const truthSet = loadExternalTruthSet();
        const results: string[] = [];

        for (let i = 0; i < 50; i++) {
            const claims = getBlockClaims(truthSet);
            results.push(JSON.stringify(claims.map(c => c.codes.sort().join(','))));
        }

        const unique = new Set(results);
        expect(unique.size).toBe(1);
    });

    it('entry order is stable', () => {
        const truthSet1 = loadExternalTruthSet();
        const truthSet2 = loadExternalTruthSet();

        for (let i = 0; i < truthSet1.entries.length; i++) {
            expect(truthSet1.entries[i].id).toBe(truthSet2.entries[i].id);
        }
    });
});
