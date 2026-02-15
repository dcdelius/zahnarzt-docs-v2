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
});
