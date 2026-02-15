/**
 * Gate M37: Negation Overrides Settings
 * 
 * Tests that dictation negations always override settings defaults.
 */

import { describe, it, expect } from 'vitest';
import {
    resolveFactValue,
    decideAskback,
} from '../../v10/settings/conflictResolution';

describe('gate-m37-negation-overrides-settings', () => {
    describe('negation wins over settings', () => {
        it('"ohne Betäubung" overrides defaultLAType', () => {
            const resolved = resolveFactValue({
                dictationNegated: true,
                settingsValue: 'infiltration',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('dictation');
            expect(resolved.reason).toBe('negation_overrides_default');
            expect(resolved.value).toBe('none');
            expect(resolved.overridden).toBeDefined();
            expect(resolved.overridden?.value).toBe('infiltration');
            expect(resolved.overridden?.source).toBe('settings');
        });

        it('"kein Kofferdam" overrides defaultIsolation', () => {
            const resolved = resolveFactValue({
                dictationNegated: true,
                settingsValue: 'kofferdam',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('dictation');
            expect(resolved.reason).toBe('negation_overrides_default');
            expect(resolved.overridden?.value).toBe('kofferdam');
        });

        it('"keine Röntgenaufnahme" overrides defaultWLMethod', () => {
            const resolved = resolveFactValue({
                dictationNegated: true,
                settingsValue: 'roentgen',
                defaultValue: 'elektrisch',
            });

            expect(resolved.source).toBe('dictation');
            expect(resolved.reason).toBe('negation_overrides_default');
        });
    });

    describe('explicit dictation wins over settings', () => {
        it('dictation "Leitungsanästhesie" overrides defaultLAType', () => {
            const resolved = resolveFactValue({
                dictationValue: 'leitung',
                settingsValue: 'infiltration',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('dictation');
            expect(resolved.reason).toBe('from_dictation');
            expect(resolved.value).toBe('leitung');
            expect(resolved.overridden?.value).toBe('infiltration');
        });
    });

    describe('settings fill when dictation ambiguous', () => {
        it('no dictation value → settings used', () => {
            const resolved = resolveFactValue({
                settingsValue: 'infiltration',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('settings');
            expect(resolved.reason).toBe('filled_from_settings');
            expect(resolved.value).toBe('infiltration');
        });
    });

    describe('default fallback', () => {
        it('no dictation, no settings → default', () => {
            const resolved = resolveFactValue({
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('default');
            expect(resolved.reason).toBe('default_fallback');
            expect(resolved.value).toBe('none');
        });
    });
});
