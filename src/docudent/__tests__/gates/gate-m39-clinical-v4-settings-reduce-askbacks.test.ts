/**
 * Gate M39: Settings Reduce Askbacks
 */

import { describe, it, expect } from 'vitest';
import { clinicalTruthcasesV4 } from '../../v10/qa/clinicalTruthcases.v4';
import { getSettingsValueForAskback } from '../../v10/settings/settingsTypes';

describe('gate-m39-clinical-v4-settings-reduce-askbacks', () => {
    const settingsCases = clinicalTruthcasesV4.filter(c => c.id.startsWith('v4_settings'));

    it('has 10 settings truthcases', () => {
        expect(settingsCases.length).toBe(10);
    });

    describe('settings provide values for askbacks', () => {
        it('defaultLAType provides la_type', () => {
            const val = getSettingsValueForAskback('medical_la_type', { user: { version: '1', defaultLAType: 'infiltration' } });
            expect(val).toBe('infiltration');
        });

        it('defaultIsolation provides isolation', () => {
            const val = getSettingsValueForAskback('medical_isolation', { practice: { version: '1', defaultIsolation: 'kofferdam' } });
            expect(val).toBe('kofferdam');
        });

        it('defaultWLMethod provides wl_method', () => {
            const val = getSettingsValueForAskback('medical_wl_method', { practice: { version: '1', defaultWLMethod: 'elektrisch' } });
            expect(val).toBe('elektrisch');
        });

        it('defaultWFTechnique provides wf_technique', () => {
            const val = getSettingsValueForAskback('medical_wf_technique', { practice: { version: '1', defaultWFTechnique: 'warm' } });
            expect(val).toBe('warm');
        });

        it('defaultCappingMaterial provides capping', () => {
            const val = getSettingsValueForAskback('medical_ueberkappung', { user: { version: '1', defaultCappingMaterial: 'mta' } });
            expect(val).toBe('mta');
        });

        it('skipAskbacks returns __skip__', () => {
            const val = getSettingsValueForAskback('medical_vipr', { user: { version: '1', skipAskbacks: ['medical_vipr'] } });
            expect(val).toBe('__skip__');
        });
    });

    describe('truthcase contracts are valid', () => {
        settingsCases.forEach(tc => {
            it(`${tc.id}: has valid contract`, () => {
                expect(tc.contractV2).toBeDefined();
                expect(tc.contractV2.expectedState).toBe('output');
            });
        });
    });
});
