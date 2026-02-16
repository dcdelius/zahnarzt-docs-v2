import { describe, it, expect } from 'vitest';
import { applySettingsDefaults } from '../../settings/resolveDefaultsToFacts';

describe('resolveDefaultsToFacts', () => {
    it('applies practice default material only for fuellung and mirrors fuellung_material', () => {
        const facts = applySettingsDefaults(
            { treatmentId: 'fuellung', tooth: '26', surfaces: ['o', 'd'] },
            {
                practice: { defaultMaterial: 'ormocer' as any },
                user: {},
            }
        );

        expect(facts.material).toBe('ormocer');
        expect((facts as Record<string, unknown>).fuellung_material).toBe('ormocer');
        expect(facts._materialSource).toBe('settings:practice');
    });

    it('does not inject fuellung defaults into endo facts', () => {
        const facts = applySettingsDefaults(
            { treatmentId: 'endo', tooth: '36', endo: {} },
            {
                practice: { defaultMaterial: 'ormocer' as any },
                user: { defaultCappingMaterial: 'mta' as any },
            }
        );

        expect(facts.material).toBeUndefined();
        expect((facts as Record<string, unknown>).fuellung_material).toBeUndefined();
        expect((facts.capping as Record<string, unknown> | undefined)?.material).toBeUndefined();
    });

    it('tracks isolation source as user when only user default is set', () => {
        const facts = applySettingsDefaults(
            { treatmentId: 'fuellung', tooth: '26', surfaces: ['o'] },
            {
                practice: {},
                user: { medicalDefaults: { isolation: { defaultMode: 'kofferdam' } } as any },
            }
        );

        expect(facts.kofferdamUsed).toBe(true);
        expect(facts._kofferdamUsedSource).toBe('settings:user');
    });

    it('tracks isolation source as practice when both practice and user defaults are set', () => {
        const facts = applySettingsDefaults(
            { treatmentId: 'fuellung', tooth: '26', surfaces: ['o'] },
            {
                practice: { medicalDefaults: { isolation: { defaultMode: 'relative' } } as any },
                user: { medicalDefaults: { isolation: { defaultMode: 'kofferdam' } } as any },
            }
        );

        expect(facts.kofferdamUsed).toBe(false);
        expect(facts.isolationMentioned).toBe('relative');
        expect(facts._kofferdamUsedSource).toBe('settings:practice');
    });
});
