/**
 * Gate Test: M18 Pack Registry Has Fuellung and Endo
 *
 * Verifies the treatment pack registry contains expected packs.
 */

import { describe, test, expect } from 'vitest';
import { getPack, listPacks, listPackIds, hasPack, PACKS } from '../../v10/packs';

describe('gate-m18-pack-registry-has-fuellung-endo', () => {
    // ═══════════════════════════════════════════════════════════════
    // REGISTRY PRESENCE
    // ═══════════════════════════════════════════════════════════════

    test('registry has fuellung pack', () => {
        const pack = getPack('fuellung');
        expect(pack).toBeDefined();
        expect(pack.id).toBe('fuellung');
    });

    test('registry has endo pack', () => {
        const pack = getPack('endo');
        expect(pack).toBeDefined();
        expect(pack.id).toBe('endo');
    });

    test('hasPack returns true for valid IDs', () => {
        expect(hasPack('fuellung')).toBe(true);
        expect(hasPack('endo')).toBe(true);
    });

    test('hasPack returns false for invalid IDs', () => {
        expect(hasPack('unknown')).toBe(false);
        expect(hasPack('extraction')).toBe(false); // not yet registered
    });

    // ═══════════════════════════════════════════════════════════════
    // LIST FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    test('listPacks returns all registered packs', () => {
        const packs = listPacks();
        expect(packs.length).toBeGreaterThanOrEqual(2); // At least fuellung + endo

        const ids = packs.map(p => p.id);
        expect(ids).toContain('fuellung');
        expect(ids).toContain('endo');
    });

    test('listPackIds returns expected IDs', () => {
        const ids = listPackIds();
        expect(ids.length).toBeGreaterThanOrEqual(2); // At least fuellung + endo
        expect(ids).toContain('fuellung');
        expect(ids).toContain('endo');
    });

    test('PACKS constant has expected structure', () => {
        expect(PACKS).toHaveProperty('fuellung');
        expect(PACKS).toHaveProperty('endo');
        expect(Object.keys(PACKS).length).toBeGreaterThanOrEqual(2); // At least fuellung + endo
    });

    // ═══════════════════════════════════════════════════════════════
    // PACK METADATA
    // ═══════════════════════════════════════════════════════════════

    test('each pack has version', () => {
        for (const pack of listPacks()) {
            expect(pack.version).toBeDefined();
            expect(pack.version).toMatch(/^\d+\.\d+\.\d+$/);
        }
    });

    test('each pack has required methods', () => {
        for (const pack of listPacks()) {
            expect(typeof pack.getTreatmentKb).toBe('function');
            expect(typeof pack.getGoldenClinicalScenarios).toBe('function');
            expect(typeof pack.getCombinabilityGoldens).toBe('function');
        }
    });
});
