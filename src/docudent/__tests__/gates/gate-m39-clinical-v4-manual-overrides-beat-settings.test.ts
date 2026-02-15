/**
 * Gate M39: Manual Overrides Beat Settings
 */

import { describe, it, expect } from 'vitest';
import { clinicalTruthcasesV4 } from '../../v10/qa/clinicalTruthcases.v4';
import { resolveEffectiveChips } from '../../v10/settings/useChipOverrides';

describe('gate-m39-clinical-v4-manual-overrides-beat-settings', () => {
    const overrideCases = clinicalTruthcasesV4.filter(c => c.id.startsWith('v4_override'));

    it('has 10 override truthcases', () => {
        expect(overrideCases.length).toBe(10);
    });

    describe('override precedence', () => {
        it('override off beats settings on', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                overrides: { la_type: { mode: 'off' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.enabled).toBe(false);
            expect(chip?.source).toBe('override');
        });

        it('override on with value beats settings', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                overrides: { la_type: { mode: 'on', value: 'leitung' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.value).toBe('leitung');
            expect(chip?.source).toBe('override');
        });

        it('auto mode falls back to settings', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                overrides: { la_type: { mode: 'auto' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.source).toBe('settings');
        });
    });

    describe('truthcase contracts are valid', () => {
        overrideCases.forEach(tc => {
            it(`${tc.id}: has overrides defined`, () => {
                expect(tc.overrides).toBeDefined();
            });
        });
    });
});
