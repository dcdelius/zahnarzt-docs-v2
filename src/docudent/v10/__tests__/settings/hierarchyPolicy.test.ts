import { describe, expect, it } from 'vitest';

import { reconcileUserWithPracticeHierarchy } from '../../settings/hierarchyPolicy';
import type { PracticeSettings, UserSettings } from '../../settings/settingsTypes';

function basePractice(): PracticeSettings {
    return { version: '1.0.0' };
}

function baseUser(): UserSettings {
    return { version: '1.0.0' };
}

describe('reconcileUserWithPracticeHierarchy', () => {
    it('keeps only treatments that are enabled by the practice', () => {
        const practice: PracticeSettings = {
            ...basePractice(),
            enabledTreatments: ['fuellung', 'endo'],
        };
        const user: UserSettings = {
            ...baseUser(),
            enabledTreatments: ['fuellung', 'krone'],
        };

        const result = reconcileUserWithPracticeHierarchy(practice, user);
        expect(result.changed).toBe(true);
        expect(result.user.enabledTreatments).toEqual(['fuellung']);
    });

    it('removes user fuellung material defaults outside practice catalog pool', () => {
        const practice: PracticeSettings = {
            ...basePractice(),
            materialCatalog: {
                fuellung: ['comp_a', 'etch_a'],
            },
        };
        const user: UserSettings = {
            ...baseUser(),
            treatments: {
                fuellung: {
                    defaultCompositeMaterialId: 'comp_a',
                    defaultFlowableMaterialId: 'flow_x',
                    defaultEtchMaterialId: 'etch_a',
                    defaultAdhesiveMaterialId: 'adh_x',
                },
            },
        };

        const result = reconcileUserWithPracticeHierarchy(practice, user);
        expect(result.changed).toBe(true);
        expect(result.user.treatments?.fuellung?.defaultCompositeMaterialId).toBe('comp_a');
        expect(result.user.treatments?.fuellung?.defaultEtchMaterialId).toBe('etch_a');
        expect(result.user.treatments?.fuellung?.defaultFlowableMaterialId).toBeUndefined();
        expect(result.user.treatments?.fuellung?.defaultAdhesiveMaterialId).toBeUndefined();
    });

    it('does not change user settings when practice constraints are not configured', () => {
        const practice: PracticeSettings = basePractice();
        const user: UserSettings = {
            ...baseUser(),
            enabledTreatments: ['fuellung', 'krone'],
            treatments: {
                fuellung: {
                    defaultCompositeMaterialId: 'anything',
                },
            },
        };

        const result = reconcileUserWithPracticeHierarchy(practice, user);
        expect(result.changed).toBe(false);
        expect(result.user).toEqual(user);
    });

    it('enforces exact practice treatments when lock is enabled', () => {
        const practice: PracticeSettings = {
            ...basePractice(),
            enabledTreatments: ['fuellung', 'endo'],
            lockUserOverrides: { enabledTreatments: true },
        };
        const user: UserSettings = {
            ...baseUser(),
            enabledTreatments: ['fuellung'],
        };

        const result = reconcileUserWithPracticeHierarchy(practice, user);
        expect(result.changed).toBe(true);
        expect(result.user.enabledTreatments).toEqual(['fuellung', 'endo']);
    });

    it('clears fuellung material defaults when practice lock is enabled', () => {
        const practice: PracticeSettings = {
            ...basePractice(),
            materialCatalog: { fuellung: ['comp_a'] },
            lockUserOverrides: { fuellungMaterialDefaults: true },
        };
        const user: UserSettings = {
            ...baseUser(),
            treatments: {
                fuellung: {
                    defaultCompositeMaterialId: 'comp_a',
                    defaultFlowableMaterialId: 'flow_x',
                },
            },
        };

        const result = reconcileUserWithPracticeHierarchy(practice, user);
        expect(result.changed).toBe(true);
        expect(result.user.treatments?.fuellung?.defaultCompositeMaterialId).toBeUndefined();
        expect(result.user.treatments?.fuellung?.defaultFlowableMaterialId).toBeUndefined();
    });
});
