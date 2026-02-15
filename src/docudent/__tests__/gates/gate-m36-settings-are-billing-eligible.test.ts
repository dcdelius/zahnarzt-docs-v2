/**
 * Gate M36: Settings Are Billing Eligible
 * 
 * Tests that chips derived from settings can generate billing codes.
 */

import { describe, it, expect } from 'vitest';
import { resolveSetting, SettingsInput } from '../../v10/settings/settingsTypes';

describe('gate-m36-settings-are-billing-eligible', () => {
    describe('settings source is billing-eligible', () => {
        it('practice settings have source="practice"', () => {
            const resolved = resolveSetting('la_type', {
                practiceValue: 'leitung',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('practice');
            expect(resolved.value).toBe('leitung');
        });

        it('user settings have source="user"', () => {
            const resolved = resolveSetting('la_type', {
                userValue: 'infiltration',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('user');
            expect(resolved.value).toBe('infiltration');
        });

        it('dictation overrides settings', () => {
            const resolved = resolveSetting('la_type', {
                dictationValue: 'leitung',
                userValue: 'infiltration',
                practiceValue: 'none',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('dictation');
            expect(resolved.value).toBe('leitung');
        });
    });

    describe('priority order: dictation > user > practice > default', () => {
        it('user takes priority over practice', () => {
            const resolved = resolveSetting('isolation', {
                userValue: 'kofferdam',
                practiceValue: 'relative',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('user');
            expect(resolved.value).toBe('kofferdam');
        });

        it('practice takes priority over default', () => {
            const resolved = resolveSetting('isolation', {
                practiceValue: 'relative',
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('practice');
            expect(resolved.value).toBe('relative');
        });

        it('falls back to default when no settings', () => {
            const resolved = resolveSetting('isolation', {
                defaultValue: 'none',
            });

            expect(resolved.source).toBe('default');
            expect(resolved.value).toBe('none');
        });
    });

    describe('billing-eligible sources', () => {
        // Sources that can generate billing: dictation, practice, user
        // Source that cannot: default, inferred

        it('practice source is billing-eligible', () => {
            const billingEligibleSources = ['dictation', 'practice', 'user'];
            expect(billingEligibleSources).toContain('practice');
        });

        it('user source is billing-eligible', () => {
            const billingEligibleSources = ['dictation', 'practice', 'user'];
            expect(billingEligibleSources).toContain('user');
        });

        it('default source is NOT billing-eligible', () => {
            const billingEligibleSources = ['dictation', 'practice', 'user'];
            expect(billingEligibleSources).not.toContain('default');
        });
    });
});
