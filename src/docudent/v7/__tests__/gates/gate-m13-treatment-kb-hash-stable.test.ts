/**
 * Gate M13: Treatment KB Hash Stability
 *
 * GATE DEFINITION:
 * Treatment KB hash must be stable across multiple runs.
 * Same unified.json → same hash (canonicalization).
 */

import { describe, it, expect } from 'vitest';
import { jsonTreatmentKbProvider, clearTreatmentKbCache } from '../../../v10/kb/treatment';

describe('Gate M13: Treatment KB Hash Stability', () => {
    it('hash is stable for fuellung across multiple getMeta() calls', () => {
        clearTreatmentKbCache();

        // First call loads and caches
        jsonTreatmentKbProvider.getTreatmentKb('fuellung');
        const meta1 = jsonTreatmentKbProvider.getMeta('fuellung');
        const meta2 = jsonTreatmentKbProvider.getMeta('fuellung');

        expect(meta1).toBeDefined();
        expect(meta2).toBeDefined();
        expect(meta1!.hash).toBe(meta2!.hash);
        expect(meta1!.version).toBe(meta2!.version);
        expect(meta1!.source).toBe('json');
    });

    it('hash is stable for endo across multiple getMeta() calls', () => {
        clearTreatmentKbCache();

        jsonTreatmentKbProvider.getTreatmentKb('endo');
        const meta1 = jsonTreatmentKbProvider.getMeta('endo');
        const meta2 = jsonTreatmentKbProvider.getMeta('endo');

        expect(meta1).toBeDefined();
        expect(meta2).toBeDefined();
        expect(meta1!.hash).toBe(meta2!.hash);
    });

    it('hash is deterministic after cache clear', () => {
        clearTreatmentKbCache();
        jsonTreatmentKbProvider.getTreatmentKb('fuellung');
        const hash1 = jsonTreatmentKbProvider.getMeta('fuellung')!.hash;

        clearTreatmentKbCache();
        jsonTreatmentKbProvider.getTreatmentKb('fuellung');
        const hash2 = jsonTreatmentKbProvider.getMeta('fuellung')!.hash;

        expect(hash1).toBe(hash2);
    });

    it('different treatments have different hashes', () => {
        clearTreatmentKbCache();

        jsonTreatmentKbProvider.getTreatmentKb('fuellung');
        jsonTreatmentKbProvider.getTreatmentKb('endo');

        const fuellungHash = jsonTreatmentKbProvider.getMeta('fuellung')!.hash;
        const endoHash = jsonTreatmentKbProvider.getMeta('endo')!.hash;

        expect(fuellungHash).not.toBe(endoHash);
    });

    it('getAllMetas returns all loaded treatments', () => {
        clearTreatmentKbCache();

        jsonTreatmentKbProvider.getTreatmentKb('fuellung');
        jsonTreatmentKbProvider.getTreatmentKb('endo');

        const allMetas = jsonTreatmentKbProvider.getAllMetas();

        expect(allMetas.length).toBe(2);
        expect(allMetas.some(m => m.treatmentId === 'fuellung')).toBe(true);
        expect(allMetas.some(m => m.treatmentId === 'endo')).toBe(true);
    });

    it('returns null for unknown treatment', () => {
        clearTreatmentKbCache();

        const kb = jsonTreatmentKbProvider.getTreatmentKb('unknown_treatment');
        expect(kb).toBeNull();

        const meta = jsonTreatmentKbProvider.getMeta('unknown_treatment');
        expect(meta).toBeNull();
    });
});
