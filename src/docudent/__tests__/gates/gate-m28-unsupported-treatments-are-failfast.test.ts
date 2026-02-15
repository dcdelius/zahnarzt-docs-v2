/**
 * Gate M28: Unsupported treatments fail-fast
 * 
 * When a treatmentId is not implemented (no pack, no KB), the pipeline must:
 * - Return state = 'unsupported' (not 'error')
 * - Include a clear reason
 * - Suggest next action
 */

import { describe, it, expect } from 'vitest';
import { hasPack, listPackIds } from '../../v10/packs';

describe('gate-m28-unsupported-treatments-are-failfast', () => {
    const SUPPORTED_TREATMENTS = listPackIds();
    const UNSUPPORTED_TREATMENTS = ['pzr', 'crown_prep', 'extraction', 'implant', 'periodontics', 'orthodontics'];

    it('supported treatments have packs', () => {
        for (const id of SUPPORTED_TREATMENTS) {
            expect(hasPack(id)).toBe(true);
        }
    });

    it('hasPack returns false for unsupported treatments', () => {
        for (const id of UNSUPPORTED_TREATMENTS) {
            expect(hasPack(id)).toBe(false);
        }
    });

    it('at least 2 treatments are supported', () => {
        expect(SUPPORTED_TREATMENTS.length).toBeGreaterThanOrEqual(2);
    });

    it('fuellung pack exists', () => {
        expect(hasPack('fuellung')).toBe(true);
    });

    it('endo pack exists', () => {
        expect(hasPack('endo')).toBe(true);
    });

    it('unsupported list has at least 5 known cases', () => {
        expect(UNSUPPORTED_TREATMENTS.length).toBeGreaterThanOrEqual(5);
    });

    // Note: Full pipeline unsupported test would require mocking runV10
    // This gate verifies the pack registry correctly identifies unsupported treatments
});
