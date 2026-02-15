/**
 * Gate M36: Settings Reduce Askbacks
 * 
 * Tests that with settings, fewer or equal askbacks are generated.
 */

import { describe, it, expect } from 'vitest';
import {
    getSettingsValueForAskback,
    SettingsInput,
} from '../../v10/settings/settingsTypes';

describe('gate-m36-settings-reduce-askbacks', () => {
    describe('settings provide values for askbacks', () => {
        it('defaultLAType provides value for medical_la_type', () => {
            const settings: SettingsInput = {
                user: {
                    version: '1.0.0',
                    defaultLAType: 'infiltration',
                },
            };

            const value = getSettingsValueForAskback('medical_la_type', settings);
            expect(value).toBe('infiltration');
        });

        it('defaultIsolation provides value for medical_isolation', () => {
            const settings: SettingsInput = {
                practice: {
                    version: '1.0.0',
                    defaultIsolation: 'kofferdam',
                },
            };

            const value = getSettingsValueForAskback('medical_isolation', settings);
            expect(value).toBe('kofferdam');
        });

        it('defaultCappingMaterial provides value for medical_ueberkappung', () => {
            const settings: SettingsInput = {
                user: {
                    version: '1.0.0',
                    defaultCappingMaterial: 'mta',
                },
            };

            const value = getSettingsValueForAskback('medical_ueberkappung', settings);
            expect(value).toBe('mta');
        });

        it('defaultWLMethod provides value for medical_wl_method', () => {
            const settings: SettingsInput = {
                practice: {
                    version: '1.0.0',
                    defaultWLMethod: 'elektrisch',
                },
            };

            const value = getSettingsValueForAskback('medical_wl_method', settings);
            expect(value).toBe('elektrisch');
        });

        it('defaultWFTechnique provides value for medical_wf_technique', () => {
            const settings: SettingsInput = {
                practice: {
                    version: '1.0.0',
                    defaultWFTechnique: 'warm',
                },
            };

            const value = getSettingsValueForAskback('medical_wf_technique', settings);
            expect(value).toBe('warm');
        });
    });

    describe('empty settings return undefined', () => {
        it('no settings → undefined', () => {
            const settings: SettingsInput = {};

            const value = getSettingsValueForAskback('medical_la_type', settings);
            expect(value).toBeUndefined();
        });

        it('settings without matching value → undefined', () => {
            const settings: SettingsInput = {
                user: {
                    version: '1.0.0',
                    preferredTextLength: 'kurz',
                },
            };

            const value = getSettingsValueForAskback('medical_la_type', settings);
            expect(value).toBeUndefined();
        });
    });

    describe('skipAskbacks list', () => {
        it('skipped askback returns __skip__', () => {
            const settings: SettingsInput = {
                user: {
                    version: '1.0.0',
                    skipAskbacks: ['medical_vipr', 'medical_perk'],
                },
            };

            const value = getSettingsValueForAskback('medical_vipr', settings);
            expect(value).toBe('__skip__');
        });

        it('non-skipped askback returns undefined', () => {
            const settings: SettingsInput = {
                user: {
                    version: '1.0.0',
                    skipAskbacks: ['medical_vipr'],
                },
            };

            const value = getSettingsValueForAskback('medical_la_type', settings);
            expect(value).toBeUndefined();
        });
    });
});
