import { describe, expect, it } from 'vitest';
import { getSettingsValueForAskback } from '../../settings/settingsTypes';
import { applySettingsDefaults } from '../../settings/resolveDefaultsToFacts';
import {
    canonicalizeSettingsInput,
    patchPracticeDefaultAnestheticAgentId,
    patchPracticeDefaultIsolation,
    patchUserDefaultAnestheticAgentId,
    patchUserDefaultCappingMaterial,
    patchUserDefaultIsolation,
    patchUserDefaultLAType,
    patchUserDefaultLATypeUkPosterior,
    normalizePracticeMedicalDefaults,
    normalizeUserMedicalDefaults,
    resolveIsolationDefaultWithSource,
    stripPracticeMedicalDefaultMirrors,
    stripUserMedicalDefaultMirrors,
} from '../../settings/medicalDefaults';

describe('medicalDefaults normalization', () => {
    it('mirrors legacy practice isolation into medicalDefaults', () => {
        const { next, changed } = normalizePracticeMedicalDefaults({
            version: '1.0.0',
            defaultIsolation: 'kofferdam',
        });

        expect(changed).toBe(true);
        expect(next.medicalDefaults?.isolation?.defaultMode).toBe('kofferdam');
        expect(next.defaultIsolation).toBe('kofferdam');
    });

    it('mirrors normalized user defaults back to legacy fields', () => {
        const { next, changed } = normalizeUserMedicalDefaults({
            version: '1.0.0',
            medicalDefaults: {
                anesthesia: { defaultType: 'leitung', ukPosteriorType: 'ila' },
                restorative: { defaultCappingMaterial: 'mta' },
            },
        });

        expect(changed).toBe(true);
        expect(next.defaultLAType).toBe('leitung');
        expect(next.defaultLATypeUkPosterior).toBe('ila');
        expect(next.defaultCappingMaterial).toBe('mta');
    });
});

describe('medicalDefaults patch helpers', () => {
    it('writes user anesthesia defaults into normalized fields only', () => {
        const patch = patchUserDefaultLAType(
            {
                version: '1.0.0',
                medicalDefaults: {
                    anesthesia: { defaultAgentId: 'la_ultracain_ds' },
                },
            },
            'leitung'
        );

        expect('defaultLAType' in patch).toBe(false);
        expect(patch.medicalDefaults?.anesthesia?.defaultType).toBe('leitung');
        expect(patch.medicalDefaults?.anesthesia?.defaultAgentId).toBe('la_ultracain_ds');
    });

    it('clears user UK posterior override from normalized fields only', () => {
        const patch = patchUserDefaultLATypeUkPosterior(
            {
                version: '1.0.0',
                defaultLATypeUkPosterior: 'ila',
                medicalDefaults: {
                    anesthesia: {
                        defaultType: 'leitung',
                        ukPosteriorType: 'ila',
                    },
                },
            },
            undefined
        );

        expect('defaultLATypeUkPosterior' in patch).toBe(false);
        expect(patch.medicalDefaults?.anesthesia?.ukPosteriorType).toBeUndefined();
        expect(patch.medicalDefaults?.anesthesia?.defaultType).toBe('leitung');
    });

    it('writes user isolation/capping/anesthetic-id into normalized domain', () => {
        const isolationPatch = patchUserDefaultIsolation({ version: '1.0.0' }, 'kofferdam');
        const cappingPatch = patchUserDefaultCappingMaterial({ version: '1.0.0' }, 'mta');
        const anestheticPatch = patchUserDefaultAnestheticAgentId({ version: '1.0.0' }, 'la_septanest');

        expect('defaultIsolation' in isolationPatch).toBe(false);
        expect(isolationPatch.medicalDefaults?.isolation?.defaultMode).toBe('kofferdam');
        expect('defaultCappingMaterial' in cappingPatch).toBe(false);
        expect(cappingPatch.medicalDefaults?.restorative?.defaultCappingMaterial).toBe('mta');
        expect('defaultAnestheticAgentId' in anestheticPatch).toBe(false);
        expect(anestheticPatch.medicalDefaults?.anesthesia?.defaultAgentId).toBe('la_septanest');
    });

    it('writes practice anesthesia/isolation defaults into normalized domain', () => {
        const anesthesiaPatch = patchPracticeDefaultAnestheticAgentId(
            {
                version: '1.0.0',
                medicalDefaults: { isolation: { defaultMode: 'relative' } },
            },
            'la_ultracain_ds'
        );
        const isolationPatch = patchPracticeDefaultIsolation(
            {
                version: '1.0.0',
                medicalDefaults: { anesthesia: { defaultAgentId: 'la_ultracain_ds' } },
            },
            'kofferdam'
        );

        expect('defaultAnestheticAgentId' in anesthesiaPatch).toBe(false);
        expect(anesthesiaPatch.medicalDefaults?.anesthesia?.defaultAgentId).toBe('la_ultracain_ds');
        expect(anesthesiaPatch.medicalDefaults?.isolation?.defaultMode).toBe('relative');

        expect('defaultIsolation' in isolationPatch).toBe(false);
        expect(isolationPatch.medicalDefaults?.isolation?.defaultMode).toBe('kofferdam');
        expect(isolationPatch.medicalDefaults?.anesthesia?.defaultAgentId).toBe('la_ultracain_ds');
    });
});

describe('medicalDefaults runtime fallback', () => {
    it('supplies askback values from medicalDefaults fields', () => {
        const la = getSettingsValueForAskback('medical_la_type', {
            user: {
                version: '1.0.0',
                medicalDefaults: { anesthesia: { defaultType: 'infiltration' } },
            },
        });
        const isolation = getSettingsValueForAskback('medical_isolation', {
            practice: {
                version: '1.0.0',
                medicalDefaults: { isolation: { defaultMode: 'kofferdam' } },
            },
        });

        expect(la).toBe('infiltration');
        expect(isolation).toBe('kofferdam');
    });

    it('applies anesthesia + capping facts from normalized medical defaults', () => {
        const facts = applySettingsDefaults(
            {
                treatmentId: 'fuellung',
                tooth: '16',
                capping: { performed: 'yes' },
            },
            {
                user: {
                    medicalDefaults: {
                        anesthesia: { defaultType: 'leitung' },
                        restorative: { defaultCappingMaterial: 'mta' },
                    },
                },
            }
        );

        expect(facts.anesthesia).toBe('leitung');
        expect((facts.capping as Record<string, unknown> | undefined)?.material).toBe('MTA');
    });

    it('resolves isolation source precedence practice before user', () => {
        const resolved = resolveIsolationDefaultWithSource(
            {
                version: '1.0.0',
                medicalDefaults: { isolation: { defaultMode: 'relative' } },
            },
            {
                version: '1.0.0',
                medicalDefaults: { isolation: { defaultMode: 'kofferdam' } },
            }
        );

        expect(resolved.value).toBe('relative');
        expect(resolved.source).toBe('practice');
    });
});

describe('medicalDefaults canonical runtime shape', () => {
    it('strips practice legacy mirror fields while keeping normalized defaults', () => {
        const stripped = stripPracticeMedicalDefaultMirrors({
            version: '1.0.0',
            defaultIsolation: 'kofferdam',
            defaultAnestheticAgentId: 'la_ultracain_ds',
            medicalDefaults: {
                isolation: { defaultMode: 'kofferdam' },
                anesthesia: { defaultAgentId: 'la_ultracain_ds' },
            },
        });

        expect('defaultIsolation' in stripped).toBe(false);
        expect('defaultAnestheticAgentId' in stripped).toBe(false);
        expect(stripped.medicalDefaults?.isolation?.defaultMode).toBe('kofferdam');
        expect(stripped.medicalDefaults?.anesthesia?.defaultAgentId).toBe('la_ultracain_ds');
    });

    it('strips user legacy mirror fields while keeping normalized defaults', () => {
        const stripped = stripUserMedicalDefaultMirrors({
            version: '1.0.0',
            defaultLAType: 'leitung',
            defaultLATypeUkPosterior: 'ila',
            defaultAnestheticAgentId: 'la_septanest',
            defaultIsolation: 'relative',
            defaultCappingMaterial: 'mta',
            medicalDefaults: {
                anesthesia: {
                    defaultType: 'leitung',
                    ukPosteriorType: 'ila',
                    defaultAgentId: 'la_septanest',
                },
                isolation: { defaultMode: 'relative' },
                restorative: { defaultCappingMaterial: 'mta' },
            },
        });

        expect('defaultLAType' in stripped).toBe(false);
        expect('defaultLATypeUkPosterior' in stripped).toBe(false);
        expect('defaultAnestheticAgentId' in stripped).toBe(false);
        expect('defaultIsolation' in stripped).toBe(false);
        expect('defaultCappingMaterial' in stripped).toBe(false);
        expect(stripped.medicalDefaults?.anesthesia?.defaultType).toBe('leitung');
        expect(stripped.medicalDefaults?.restorative?.defaultCappingMaterial).toBe('mta');
    });
});

describe('medicalDefaults canonical settings input', () => {
    it('canonicalizes legacy user-only settings object into normalized input', () => {
        const canonical = canonicalizeSettingsInput({
            defaultLAType: 'infiltration',
            defaultIsolation: 'kofferdam',
            defaultCappingMaterial: 'mta',
        });

        expect(canonical?.practice).toBeUndefined();
        expect(canonical?.user?.medicalDefaults?.anesthesia?.defaultType).toBe('infiltration');
        expect(canonical?.user?.medicalDefaults?.isolation?.defaultMode).toBe('kofferdam');
        expect(canonical?.user?.medicalDefaults?.restorative?.defaultCappingMaterial).toBe('mta');
        expect(canonical?.user && 'defaultLAType' in canonical.user).toBe(false);
        expect(canonical?.user && 'defaultIsolation' in canonical.user).toBe(false);
    });

    it('canonicalizes practice+user container while preserving treatment defaults', () => {
        const canonical = canonicalizeSettingsInput({
            practice: {
                defaultIsolation: 'relative',
                defaultWLMethod: 'elektrisch',
            },
            user: {
                defaultLAType: 'leitung',
                treatments: {
                    fuellung: { defaultMatrixSystem: 'sectional' },
                },
            },
        });

        expect(canonical?.practice?.medicalDefaults?.isolation?.defaultMode).toBe('relative');
        expect(canonical?.practice?.defaultWLMethod).toBe('elektrisch');
        expect(canonical?.practice && 'defaultIsolation' in canonical.practice).toBe(false);

        expect(canonical?.user?.medicalDefaults?.anesthesia?.defaultType).toBe('leitung');
        expect(canonical?.user?.treatments?.fuellung?.defaultMatrixSystem).toBe('sectional');
        expect(canonical?.user && 'defaultLAType' in canonical.user).toBe(false);
    });
});
