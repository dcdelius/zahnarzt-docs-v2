/**
 * Gate M45: Pack Contract Completeness
 * 
 * Every pack must have complete UI contract.
 */

import { describe, it, expect } from 'vitest';
import { listPacks } from '../../v10/packs';
import { resolvePackContract, isCriticalAskback, canSkipAskback } from '../../v10/ui/usePackUiContract';

describe('gate-m45-pack-contract-completeness', () => {
    const packs = listPacks();

    describe('all packs have complete contracts', () => {
        packs.forEach(pack => {
            describe(`pack: ${pack.id}`, () => {
                it('resolves via usePackUiContract', () => {
                    const contract = resolvePackContract(pack.id);
                    expect(contract).not.toBeNull();
                });

                it('has at least 1 chip control', () => {
                    const contract = resolvePackContract(pack.id)!;
                    expect(contract.chipControls.length).toBeGreaterThanOrEqual(1);
                });

                it('param controls have non-empty options', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const paramControls = contract.chipControls.filter(c => c.mode === 'param');

                    for (const ctrl of paramControls) {
                        expect(ctrl.options).toBeDefined();
                        expect(ctrl.options!.length).toBeGreaterThanOrEqual(2);
                    }
                });

                it('has tooth identifier in critical askbacks', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const hasTooth = contract.askbackPolicy.criticalAskbacks.some(
                        a => a.includes('tooth') || a.includes('zahn')
                    );
                    expect(hasTooth).toBe(true);
                });

                it('isCriticalAskback works correctly', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const firstCritical = contract.askbackPolicy.criticalAskbacks[0];
                    expect(isCriticalAskback(firstCritical, contract)).toBe(true);
                });

                it('canSkipAskback respects policy', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const firstCritical = contract.askbackPolicy.criticalAskbacks[0];
                    // Critical cannot be skipped
                    expect(canSkipAskback(firstCritical, contract)).toBe(false);
                });
            });
        });
    });

    describe('contract schema validation', () => {
        it('all packs have settings schema', () => {
            for (const pack of packs) {
                const contract = resolvePackContract(pack.id)!;
                expect(contract.settingsSchema).toBeDefined();
                expect(Array.isArray(contract.settingsSchema.practice)).toBe(true);
                expect(Array.isArray(contract.settingsSchema.user)).toBe(true);
            }
        });

        it('all controls have labels', () => {
            for (const pack of packs) {
                const contract = resolvePackContract(pack.id)!;
                for (const ctrl of contract.chipControls) {
                    expect(ctrl.label).toBeDefined();
                    expect(ctrl.label.length).toBeGreaterThan(0);
                }
            }
        });
    });
});
