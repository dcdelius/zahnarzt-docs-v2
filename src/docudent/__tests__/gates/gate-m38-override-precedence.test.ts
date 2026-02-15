/**
 * Gate M38: Override Precedence
 * 
 * Tests for correct precedence: dictation negation > dictation > override > settings > default.
 */

import { describe, it, expect } from 'vitest';
import { resolveEffectiveChips } from '../../v10/settings/useChipOverrides';

describe('gate-m38-override-precedence', () => {
    describe('full precedence chain', () => {
        it('dictation negation beats everything', () => {
            const result = resolveEffectiveChips({
                dictationChips: [{ id: 'la_type', enabled: false }], // negation
                settingsChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                overrides: { 'la_type': { mode: 'on', value: 'leitung' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.enabled).toBe(false);
            expect(chip?.source).toBe('dictation');
        });

        it('dictation explicit beats override', () => {
            const result = resolveEffectiveChips({
                dictationChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                settingsChips: [],
                overrides: { 'la_type': { mode: 'on', value: 'leitung' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.enabled).toBe(true);
            expect(chip?.value).toBe('infiltr');
            expect(chip?.source).toBe('dictation');
        });

        it('override beats settings', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'isolation', enabled: true, value: 'kofferdam' }],
                overrides: { 'isolation': { mode: 'on', value: 'relative' } },
            });

            const chip = result.find(c => c.id === 'isolation');
            expect(chip?.value).toBe('relative');
            expect(chip?.source).toBe('override');
        });

        it('settings beat default', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'kofferdam', enabled: true }],
                overrides: {},
            });

            const chip = result.find(c => c.id === 'kofferdam');
            expect(chip?.enabled).toBe(true);
            expect(chip?.source).toBe('settings');
        });
    });

    describe('multi-instance isolation', () => {
        it('overrides per instance do not leak', () => {
            const endoResult = resolveEffectiveChips({
                dictationChips: [{ id: 'la_type', enabled: true, value: 'leitung' }],
                settingsChips: [],
                overrides: {},
            });

            const fuellungResult = resolveEffectiveChips({
                dictationChips: [{ id: 'la_type', enabled: false }], // ohne Betäubung
                settingsChips: [],
                overrides: {},
            });

            const endoLA = endoResult.find(c => c.id === 'la_type');
            const fuellungLA = fuellungResult.find(c => c.id === 'la_type');

            expect(endoLA?.enabled).toBe(true);
            expect(fuellungLA?.enabled).toBe(false);
        });
    });

    describe('reset to auto', () => {
        it('auto mode falls back to settings', () => {
            const withOverride = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'kofferdam', enabled: true }],
                overrides: { 'kofferdam': { mode: 'off' } },
            });

            const afterReset = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'kofferdam', enabled: true }],
                overrides: { 'kofferdam': { mode: 'auto' } },
            });

            expect(withOverride.find(c => c.id === 'kofferdam')?.enabled).toBe(false);
            expect(afterReset.find(c => c.id === 'kofferdam')?.enabled).toBe(true);
        });
    });
});
