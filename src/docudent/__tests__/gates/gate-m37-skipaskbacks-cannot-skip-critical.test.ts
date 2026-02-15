/**
 * Gate M37: SkipAskbacks Cannot Skip Critical
 * 
 * Tests that critical askbacks cannot be skipped by settings.
 */

import { describe, it, expect } from 'vitest';
import {
    decideAskback,
    isCriticalAskback,
} from '../../v10/settings/conflictResolution';

describe('gate-m37-skipaskbacks-cannot-skip-critical', () => {
    describe('critical askbacks identification', () => {
        it('endo_canal_count is critical', () => {
            expect(isCriticalAskback('endo_canal_count')).toBe(true);
        });

        it('endo_tooth is critical', () => {
            expect(isCriticalAskback('endo_tooth')).toBe(true);
        });

        it('fuellung_tooth is critical', () => {
            expect(isCriticalAskback('fuellung_tooth')).toBe(true);
        });

        it('fuellung_surface is critical', () => {
            expect(isCriticalAskback('fuellung_surface')).toBe(true);
        });

        it('medical_la_type is NOT critical', () => {
            expect(isCriticalAskback('medical_la_type')).toBe(false);
        });

        it('medical_isolation is NOT critical', () => {
            expect(isCriticalAskback('medical_isolation')).toBe(false);
        });
    });

    describe('critical askbacks always asked', () => {
        it('critical cannot be skipped by settings', () => {
            const decision = decideAskback('endo_canal_count', {
                dictationHasValue: false,
                dictationNegated: false,
                settingsValue: 2,
                isCritical: true,
            });

            expect(decision.shouldAsk).toBe(true);
            expect(decision.provenance.whyAsked).toContain('Critical');
        });

        it('non-critical can be skipped by settings', () => {
            const decision = decideAskback('medical_la_type', {
                dictationHasValue: false,
                dictationNegated: false,
                settingsValue: 'infiltration',
                isCritical: false,
            });

            expect(decision.shouldAsk).toBe(false);
            expect(decision.provenance.whySkipped).toContain('settings');
        });
    });

    describe('dictation overrides everything', () => {
        it('explicit dictation for critical → no askback', () => {
            const decision = decideAskback('endo_canal_count', {
                dictationHasValue: true,
                dictationNegated: false,
                settingsValue: 2,
                isCritical: true,
            });

            expect(decision.shouldAsk).toBe(false);
            expect(decision.provenance.whySkipped).toContain('dictation');
        });
    });
});
