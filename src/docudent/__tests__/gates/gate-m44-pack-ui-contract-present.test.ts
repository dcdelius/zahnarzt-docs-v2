/**
 * Gate M44: Pack UI Contract Present
 * 
 * All packs must have getUiContract() with required fields.
 */

import { describe, it, expect } from 'vitest';
import { listPacks } from '../../v10/packs';

describe('gate-m44-pack-ui-contract-present', () => {
    const packs = listPacks();

    describe('all packs have getUiContract', () => {
        it('at least 2 packs exist', () => {
            expect(packs.length).toBeGreaterThanOrEqual(2);
        });

        packs.forEach(pack => {
            describe(`pack: ${pack.id}`, () => {
                it('has getUiContract method', () => {
                    expect(pack.getUiContract).toBeDefined();
                    expect(typeof pack.getUiContract).toBe('function');
                });

                it('getUiContract returns valid contract', () => {
                    const contract = pack.getUiContract();
                    expect(contract).toBeDefined();
                    expect(contract.chipControls).toBeDefined();
                    expect(contract.settingsSchema).toBeDefined();
                    expect(contract.askbackPolicy).toBeDefined();
                });

                it('chipControls.length > 0', () => {
                    const contract = pack.getUiContract();
                    expect(contract.chipControls.length).toBeGreaterThan(0);
                });

                it('criticalAskbacks.length > 0', () => {
                    const contract = pack.getUiContract();
                    expect(contract.askbackPolicy.criticalAskbacks.length).toBeGreaterThan(0);
                });

                it('settingsSchema has practice and user arrays', () => {
                    const contract = pack.getUiContract();
                    expect(Array.isArray(contract.settingsSchema.practice)).toBe(true);
                    expect(Array.isArray(contract.settingsSchema.user)).toBe(true);
                });
            });
        });
    });
});
