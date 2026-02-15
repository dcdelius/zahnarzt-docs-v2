/**
 * Gate M37: Provenance Has WhyAsked WhySkipped
 * 
 * Tests that askback provenance includes reason information.
 */

import { describe, it, expect } from 'vitest';
import {
    decideAskback,
    generateSettingsApplyTrace,
    formatSettingsApplyTrace,
} from '../../v10/settings/conflictResolution';

describe('gate-m37-provenance-has-whyAsked-whySkipped', () => {
    describe('whyAsked present when asked', () => {
        it('missing value → whyAsked explains', () => {
            const decision = decideAskback('medical_la_type', {
                dictationHasValue: false,
                dictationNegated: false,
                settingsValue: undefined,
            });

            expect(decision.shouldAsk).toBe(true);
            expect(decision.provenance.whyAsked).toBeDefined();
            expect(decision.provenance.whyAsked).toContain('No value');
        });

        it('critical → whyAsked mentions critical', () => {
            const decision = decideAskback('endo_canal_count', {
                dictationHasValue: false,
                dictationNegated: false,
                settingsValue: 2,
                isCritical: true,
            });

            expect(decision.shouldAsk).toBe(true);
            expect(decision.provenance.whyAsked).toContain('Critical');
        });
    });

    describe('whySkipped present when skipped', () => {
        it('dictation value → whySkipped explains', () => {
            const decision = decideAskback('medical_la_type', {
                dictationHasValue: true,
                dictationNegated: false,
                settingsValue: undefined,
            });

            expect(decision.shouldAsk).toBe(false);
            expect(decision.provenance.whySkipped).toBeDefined();
            expect(decision.provenance.whySkipped).toContain('dictation');
        });

        it('negation → whySkipped explains negation', () => {
            const decision = decideAskback('medical_la_type', {
                dictationHasValue: false,
                dictationNegated: true,
                settingsValue: 'infiltration',
            });

            expect(decision.shouldAsk).toBe(false);
            expect(decision.provenance.whySkipped).toContain('Negation');
        });

        it('settings fill → whySkipped includes value', () => {
            const decision = decideAskback('medical_la_type', {
                dictationHasValue: false,
                dictationNegated: false,
                settingsValue: 'infiltration',
            });

            expect(decision.shouldAsk).toBe(false);
            expect(decision.provenance.whySkipped).toContain('infiltration');
        });
    });

    describe('scope tracking', () => {
        it('scope is preserved in provenance', () => {
            const decision = decideAskback('medical_la_type', {
                dictationHasValue: false,
                dictationNegated: false,
                settingsValue: undefined,
                scope: 'endo',
            });

            expect(decision.provenance.scope).toBe('endo');
        });
    });

    describe('settings apply trace', () => {
        it('generates trace line', () => {
            const resolved = [
                { value: 'infiltration', source: 'settings' as const, reason: 'filled_from_settings' as const },
                { value: 'none', source: 'dictation' as const, reason: 'negation_overrides_default' as const, overridden: { value: 'kofferdam', source: 'settings' as const } },
            ];

            const trace = generateSettingsApplyTrace('endo', resolved);

            expect(trace.instanceId).toBe('endo');
            expect(trace.filled).toBe(1);
            expect(trace.overridden).toBe(1);
            expect(trace.conflicts).toBe(1);
        });

        it('formats trace line', () => {
            const trace = { instanceId: 'endo', filled: 2, overridden: 1, conflicts: 1 };
            const formatted = formatSettingsApplyTrace(trace);

            expect(formatted).toContain('settings_apply');
            expect(formatted).toContain('instance=endo');
            expect(formatted).toContain('filled=2');
            expect(formatted).toContain('overridden=1');
            expect(formatted).toContain('conflicts=1');
        });
    });
});
