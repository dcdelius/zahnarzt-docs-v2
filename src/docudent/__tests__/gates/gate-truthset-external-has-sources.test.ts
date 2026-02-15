/**
 * Gate: Truth Set External Has Sources
 *
 * Validates that every entry in the external truth set has:
 * - url + retrievedAt in source
 * - mentionsCodes array
 * - claims array with valid structure
 */

import { describe, it, expect } from 'vitest';
import {
    loadExternalTruthSet,
    validateTruthSet,
} from '../truthset/loadExternalTruthSet';

describe('Gate: Truth Set External Has Sources', () => {
    const truthSet = loadExternalTruthSet();

    it('truth set loads successfully', () => {
        expect(truthSet).toBeDefined();
        expect(truthSet._meta).toBeDefined();
        expect(truthSet.entries).toBeDefined();
    });

    it('truth set has valid structure', () => {
        const result = validateTruthSet(truthSet);

        if (result.errors.length > 0) {
            console.error('Validation errors:', result.errors);
        }

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('has at least 18 entries', () => {
        expect(truthSet.entries.length).toBeGreaterThanOrEqual(18);
    });

    it('all entries have url and retrievedAt', () => {
        for (const entry of truthSet.entries) {
            expect(entry.source.url, `${entry.id} missing url`).toBeDefined();
            expect(entry.source.retrievedAt, `${entry.id} missing retrievedAt`).toBeDefined();
        }
    });

    it('all entries have mentionsCodes', () => {
        for (const entry of truthSet.entries) {
            expect(entry.mentionsCodes.length, `${entry.id} has no mentionsCodes`).toBeGreaterThan(0);
        }
    });

    it('all entries have claims', () => {
        for (const entry of truthSet.entries) {
            expect(entry.claims.length, `${entry.id} has no claims`).toBeGreaterThan(0);
        }
    });

    it('no duplicate entry IDs', () => {
        const ids = truthSet.entries.map(e => e.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('covers critical GOZ 2197 cluster', () => {
        const goz2197Entries = truthSet.entries.filter(e =>
            e.mentionsCodes.includes('GOZ_2197')
        );
        expect(goz2197Entries.length).toBeGreaterThanOrEqual(1);
    });

    it('covers BEMA Cp/P rules', () => {
        const cpEntries = truthSet.entries.filter(e =>
            e.mentionsCodes.includes('BEMA_25') || e.mentionsCodes.includes('BEMA_26')
        );
        expect(cpEntries.length).toBeGreaterThanOrEqual(1);
    });
});
