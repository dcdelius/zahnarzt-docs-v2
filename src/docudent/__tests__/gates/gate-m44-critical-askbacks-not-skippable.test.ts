/**
 * Gate M44: Critical Askbacks Not Skippable
 * 
 * Critical askbacks must never appear in skippableAskbacks.
 */

import { describe, it, expect } from 'vitest';
import { listPacks } from '../../v10/packs';

describe('gate-m44-critical-askbacks-not-skippable', () => {
    const packs = listPacks();

    packs.forEach(pack => {
        describe(`pack: ${pack.id}`, () => {
            it('critical askbacks are separate from skippable', () => {
                const contract = pack.getUiContract();
                const critical = new Set(contract.askbackPolicy.criticalAskbacks);
                const skippable = new Set(contract.askbackPolicy.skippableAskbacks || []);

                // No overlap allowed
                const overlap = [...critical].filter(a => skippable.has(a));
                expect(overlap).toEqual([]);
            });

            it('critical askbacks are not empty', () => {
                const contract = pack.getUiContract();
                expect(contract.askbackPolicy.criticalAskbacks.length).toBeGreaterThan(0);
            });

            it('critical askbacks include tooth identifier', () => {
                const contract = pack.getUiContract();
                const critical = contract.askbackPolicy.criticalAskbacks;

                // Should include something like *_tooth
                const hasToothAskback = critical.some(a =>
                    a.includes('tooth') || a.includes('zahn')
                );
                expect(hasToothAskback).toBe(true);
            });
        });
    });
});
