/**
 * Gate M44: Param Controls Have Options
 * 
 * All param mode controls must have >= 2 options.
 */

import { describe, it, expect } from 'vitest';
import { listPacks } from '../../v10/packs';

describe('gate-m44-param-controls-have-options', () => {
    const packs = listPacks();

    packs.forEach(pack => {
        describe(`pack: ${pack.id}`, () => {
            const contract = pack.getUiContract();
            const paramControls = contract.chipControls.filter(c => c.mode === 'param');

            it(`has ${paramControls.length} param controls`, () => {
                // Just document the count
                expect(paramControls.length).toBeGreaterThanOrEqual(0);
            });

            paramControls.forEach(ctrl => {
                describe(`param control: ${ctrl.chipId}`, () => {
                    it('has options array', () => {
                        expect(ctrl.options).toBeDefined();
                        expect(Array.isArray(ctrl.options)).toBe(true);
                    });

                    it('has >= 2 options', () => {
                        expect(ctrl.options!.length).toBeGreaterThanOrEqual(2);
                    });

                    it('all options have unique values', () => {
                        const values = ctrl.options!.map(o => o.value);
                        const uniqueValues = new Set(values);
                        expect(uniqueValues.size).toBe(values.length);
                    });

                    it('all options have non-empty labels', () => {
                        for (const opt of ctrl.options!) {
                            expect(opt.label.length).toBeGreaterThan(0);
                        }
                    });
                });
            });
        });
    });
});
