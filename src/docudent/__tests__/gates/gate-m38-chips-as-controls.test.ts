/**
 * Gate M38: Chips-as-Controls
 * 
 * Tests for chip overrides and effective chip resolution.
 */

import { describe, it, expect } from 'vitest';
import {
    resolveEffectiveChips,
    isParametrizedChip,
    PARAMETRIZED_CHIPS,
} from '../../v10/settings/useChipOverrides';

describe('gate-m38-chips-as-controls', () => {
    describe('effective chip resolution', () => {
        it('dictation takes priority over override', () => {
            const result = resolveEffectiveChips({
                dictationChips: [{ id: 'la_type', enabled: false }],
                settingsChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                overrides: { 'la_type': { mode: 'on', value: 'leitung' } },
            });

            const laChip = result.find(c => c.id === 'la_type');
            expect(laChip).toBeDefined();
            expect(laChip?.enabled).toBe(false);
            expect(laChip?.source).toBe('dictation');
        });

        it('override takes priority over settings', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                overrides: { 'la_type': { mode: 'on', value: 'leitung' } },
            });

            const laChip = result.find(c => c.id === 'la_type');
            expect(laChip).toBeDefined();
            expect(laChip?.enabled).toBe(true);
            expect(laChip?.value).toBe('leitung');
            expect(laChip?.source).toBe('override');
        });

        it('settings used when no override', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'kofferdam', enabled: true }],
                overrides: {},
            });

            const chip = result.find(c => c.id === 'kofferdam');
            expect(chip).toBeDefined();
            expect(chip?.enabled).toBe(true);
            expect(chip?.source).toBe('settings');
        });

        it('auto override does not change settings', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                overrides: { 'la_type': { mode: 'auto' } },
            });

            const laChip = result.find(c => c.id === 'la_type');
            expect(laChip?.source).toBe('settings');
            expect(laChip?.enabled).toBe(true);
        });
    });

    describe('parametrized chips', () => {
        it('la_type is parametrized', () => {
            expect(isParametrizedChip('la_type')).toBe(true);
        });

        it('isolation is parametrized', () => {
            expect(isParametrizedChip('isolation')).toBe(true);
        });

        it('wl_method is parametrized', () => {
            expect(isParametrizedChip('wl_method')).toBe(true);
        });

        it('wf_technique is parametrized', () => {
            expect(isParametrizedChip('wf_technique')).toBe(true);
        });

        it('kofferdam is NOT parametrized', () => {
            expect(isParametrizedChip('kofferdam')).toBe(false);
        });

        it('parametrized chips have options', () => {
            expect(PARAMETRIZED_CHIPS['la_type'].options.length).toBeGreaterThan(0);
            expect(PARAMETRIZED_CHIPS['isolation'].options.length).toBeGreaterThan(0);
        });
    });

    describe('override off', () => {
        it('override off disables chip', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'kofferdam', enabled: true }],
                overrides: { 'kofferdam': { mode: 'off' } },
            });

            const chip = result.find(c => c.id === 'kofferdam');
            expect(chip?.enabled).toBe(false);
            expect(chip?.source).toBe('override');
        });
    });

    describe('default fallback', () => {
        it('unknown chip defaults to off', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [],
                overrides: { 'unknown_chip': { mode: 'auto' } },
            });

            const chip = result.find(c => c.id === 'unknown_chip');
            expect(chip?.enabled).toBe(false);
            expect(chip?.source).toBe('default');
        });
    });
});
