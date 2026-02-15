import { describe, it, expect } from 'vitest';
import { mergeRequiredAskbacks } from '../../askbacks/mergeRequiredAskbacks';

describe('mergeRequiredAskbacks', () => {
    it('deduplicates by normalized askback id and preserves first order', () => {
        const engine = ['askback-ueberkappung', 'medical_endo_wl_method'];
        const procedure = ['medical_ueberkappung', 'medical_endo_wl_method', 'fuellung_layering'];

        const merged = mergeRequiredAskbacks(engine, procedure);

        expect(merged).toEqual([
            'askback-ueberkappung',
            'medical_endo_wl_method',
            'fuellung_layering',
        ]);
    });
});
