/**
 * Gate M39: Negation Precedence Holds
 */

import { describe, it, expect } from 'vitest';
import { resolveFactValue } from '../../v10/settings/conflictResolution';
import { resolveEffectiveChips } from '../../v10/settings/useChipOverrides';

describe('gate-m39-clinical-v4-negation-precedence-holds', () => {
    describe('negation beats everything', () => {
        it('negation beats override', () => {
            const result = resolveEffectiveChips({
                dictationChips: [{ id: 'la_type', enabled: false }], // negation
                settingsChips: [],
                overrides: { la_type: { mode: 'on', value: 'leitung' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.enabled).toBe(false);
            expect(chip?.source).toBe('dictation');
        });

        it('negation beats settings', () => {
            const result = resolveEffectiveChips({
                dictationChips: [{ id: 'kofferdam', enabled: false }],
                settingsChips: [{ id: 'kofferdam', enabled: true }],
                overrides: {},
            });

            const chip = result.find(c => c.id === 'kofferdam');
            expect(chip?.enabled).toBe(false);
        });

        it('resolveFactValue: negation overrides defaults', () => {
            const resolved = resolveFactValue({
                dictationNegated: true,
                settingsValue: 'leitung',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('dictation');
            expect(resolved.reason).toBe('negation_overrides_default');
        });
    });

    describe('explicit dictation beats override', () => {
        it('dictation explicit value wins', () => {
            const result = resolveEffectiveChips({
                dictationChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                settingsChips: [],
                overrides: { la_type: { mode: 'on', value: 'leitung' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.value).toBe('infiltr');
            expect(chip?.source).toBe('dictation');
        });
    });
});
