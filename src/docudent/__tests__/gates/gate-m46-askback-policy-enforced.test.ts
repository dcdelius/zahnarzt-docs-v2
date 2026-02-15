/**
 * Gate M46: Askback Policy Enforced
 * 
 * Critical askbacks cannot be skipped; non-critical can when settings provides value.
 */

import { describe, it, expect } from 'vitest';
import { listPacks } from '../../v10/packs';
import { resolvePackContract, isCriticalAskback, canSkipAskback } from '../../v10/ui/usePackUiContract';

describe('gate-m46-askback-policy-enforced', () => {
    const packs = listPacks();

    describe('critical askbacks', () => {
        packs.forEach(pack => {
            describe(`pack: ${pack.id}`, () => {
                it('has at least one critical askback', () => {
                    const contract = resolvePackContract(pack.id)!;
                    expect(contract.askbackPolicy.criticalAskbacks.length).toBeGreaterThan(0);
                });

                it('critical askbacks cannot be skipped', () => {
                    const contract = resolvePackContract(pack.id)!;
                    for (const askbackId of contract.askbackPolicy.criticalAskbacks) {
                        expect(isCriticalAskback(askbackId, contract)).toBe(true);
                        expect(canSkipAskback(askbackId, contract)).toBe(false);
                    }
                });

                it('critical askbacks include tooth identifier', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const hasTooth = contract.askbackPolicy.criticalAskbacks.some(
                        a => a.includes('tooth') || a.includes('zahn')
                    );
                    expect(hasTooth).toBe(true);
                });
            });
        });
    });

    describe('skippable askbacks', () => {
        packs.forEach(pack => {
            describe(`pack: ${pack.id}`, () => {
                it('skippable askbacks are not critical', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const skippable = contract.askbackPolicy.skippableAskbacks || [];
                    const critical = new Set(contract.askbackPolicy.criticalAskbacks);

                    for (const askbackId of skippable) {
                        expect(critical.has(askbackId)).toBe(false);
                    }
                });

                it('skippable askbacks can be skipped', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const skippable = contract.askbackPolicy.skippableAskbacks || [];

                    for (const askbackId of skippable) {
                        expect(canSkipAskback(askbackId, contract)).toBe(true);
                    }
                });
            });
        });
    });
});
