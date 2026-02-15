/**
 * Gate M46: Review Controls From Contract
 * 
 * V10ReviewStep must render controls from pack contract.
 */

import { describe, it, expect } from 'vitest';
import { listPacks } from '../../v10/packs';
import { resolvePackContract, getGroupedControls } from '../../v10/ui/usePackUiContract';

describe('gate-m46-review-controls-from-contract', () => {
    const packs = listPacks();

    describe('each pack provides controls for review', () => {
        packs.forEach(pack => {
            describe(`pack: ${pack.id}`, () => {
                it('has chip controls in contract', () => {
                    const contract = resolvePackContract(pack.id);
                    expect(contract).not.toBeNull();
                    expect(contract!.chipControls.length).toBeGreaterThan(0);
                });

                it('controls can be grouped', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const groups = getGroupedControls(contract);

                    expect(groups.relevant).toBeDefined();
                    expect(groups.optional).toBeDefined();
                    expect(groups.advanced).toBeDefined();
                });

                it('controls have required fields', () => {
                    const contract = resolvePackContract(pack.id)!;
                    for (const ctrl of contract.chipControls) {
                        expect(ctrl.chipId).toBeDefined();
                        expect(ctrl.mode).toBeDefined();
                        expect(ctrl.label).toBeDefined();
                        expect(ctrl.label.length).toBeGreaterThan(0);
                    }
                });

                it('param controls have options', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const paramControls = contract.chipControls.filter(c => c.mode === 'param');
                    for (const ctrl of paramControls) {
                        expect(ctrl.options).toBeDefined();
                        expect(ctrl.options!.length).toBeGreaterThanOrEqual(2);
                    }
                });
            });
        });
    });

    describe('contract provides pack meta', () => {
        packs.forEach(pack => {
            it(`${pack.id} has meta.label`, () => {
                expect(pack.meta?.label).toBeDefined();
            });
        });
    });
});
