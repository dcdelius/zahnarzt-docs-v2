import { describe, expect, it } from 'vitest';
import { planFromDictation } from '../../multitreatment/planFromDictation';

describe('planFromDictation', () => {
    it('keeps long endo detail chains in one segment until next explicit treatment', () => {
        const dictation = [
            'Endo Zahn 36. ViPr negativ, Perkussion negativ. Leitungsanästhesie. Kofferdam. Trepanation.',
            '3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült NaOCl und EDTA. Wurzelfüllung warm vertikal.',
            'Füllung Zahn 26 MOD Komposit. ViPr positiv, Perkussion negativ. Kofferdam. Leitungsanästhesie. Mehrkostenvereinbarung liegt vor.',
            'Extraktion Zahn 28. Infiltrationsanästhesie.',
        ].join(' ');

        const plan = planFromDictation({
            dictation,
            insuranceType: 'MKV',
            textLength: 'mittel',
        });

        expect(plan.map(segment => segment.treatmentId)).toEqual(['endo', 'fuellung', 'extraction']);
        expect(plan).toHaveLength(3);
        expect(plan[0]?.dictation).toContain('Trepanation');
        expect(plan[0]?.dictation).toContain('Wurzelfüllung warm vertikal');
    });

    it('starts a new chunk when a continuation sentence has an explicit treatment signal', () => {
        const plan = planFromDictation({
            dictation: 'Krone 16 praepariert. Aufbau mit Komposit am selben Zahn. Extraktion 28 mit Naht.',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(plan.map(segment => segment.treatmentId)).toEqual(['crown_prep', 'fuellung', 'extraction']);
        expect(plan[1]?.dictation).toContain('Aufbau mit Komposit am selben Zahn');
    });

    it('keeps implicit second tooth details in same treatment chunk', () => {
        const plan = planFromDictation({
            dictation: 'Füllung Zahn 36 okklusal. Zahn 14 distal.',
            insuranceType: 'GKV',
            textLength: 'kurz',
        });

        expect(plan).toHaveLength(1);
        expect(plan[0]?.treatmentId).toBe('fuellung');
        const teeth = (plan[0]?.instances ?? []).map(instance => instance.tooth).filter(Boolean);
        expect(teeth).toEqual(expect.arrayContaining(['36', '14']));
    });
});
