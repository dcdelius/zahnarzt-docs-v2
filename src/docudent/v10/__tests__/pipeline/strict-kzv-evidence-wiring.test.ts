import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('V10 pipeline: strict KZV evidence wiring', () => {
    it('fuellung: strict mode surfaces Cp/P evidence askbacks', async () => {
        const result = await runV10({
            dictation: 'Zahn 26 okklusal tiefe Karies, Ueberkappung.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map<string, unknown>([
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'MTA'],
            ]),
            userDefaults: {
                practice: {
                    version: '1.0.0',
                    strictKzvMode: true,
                },
            },
        });

        expect(result.state).toBe('questions');
        const ids = (result.questions ?? []).map(q => q.id);
        expect(ids.some(id => id.startsWith('medical_vipr'))).toBe(true);
        expect(ids.some(id => id.startsWith('medical_percussion'))).toBe(true);
        expect(ids.some(id => id.startsWith('medical_roentgen_indikation'))).toBe(true);
        expect(ids.some(id => id.startsWith('medical_roentgen_typ'))).toBe(true);
        expect(ids.some(id => id.startsWith('medical_roentgen_zeitpunkt'))).toBe(true);
        expect(ids.some(id => id.startsWith('medical_roentgen_befund'))).toBe(true);
    });

    it('fuellung: strict evidence askbacks stay hidden when strict mode is off', async () => {
        const result = await runV10({
            dictation: 'Zahn 26 okklusal tiefe Karies, Ueberkappung.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map<string, unknown>([
                ['medical_ueberkappung', 'indirekt'],
                ['medical_ueberkappung_material', 'MTA'],
            ]),
            userDefaults: {
                practice: {
                    version: '1.0.0',
                    strictKzvMode: false,
                },
            },
        });

        expect(result.state).toBe('questions');
        const ids = new Set((result.questions ?? []).map(q => q.id));
        expect(Array.from(ids).some(id => id.startsWith('medical_roentgen_indikation'))).toBe(false);
        expect(Array.from(ids).some(id => id.startsWith('medical_roentgen_typ'))).toBe(false);
        expect(Array.from(ids).some(id => id.startsWith('medical_roentgen_zeitpunkt'))).toBe(false);
        expect(Array.from(ids).some(id => id.startsWith('medical_roentgen_befund'))).toBe(false);
    });

    it('endo: strict mode can inject procedure evidence askbacks into endo question flow', async () => {
        const result = await runV10({
            dictation: 'Endo 46 mit roentgenologischer Arbeitslaenge.',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map<string, unknown>([
                ['medical_wl_method', 'roentgen'],
            ]),
            userDefaults: {
                practice: {
                    version: '1.0.0',
                    strictKzvMode: true,
                },
            },
        });

        expect(result.state).toBe('questions');
        const ids = (result.questions ?? []).map(q => q.id);
        expect(ids.some(id => id.startsWith('medical_roentgen_indikation'))).toBe(true);
        expect(ids.some(id => id.startsWith('medical_roentgen_typ'))).toBe(true);
        expect(ids.some(id => id.startsWith('medical_roentgen_zeitpunkt'))).toBe(true);
        expect(ids.some(id => id.startsWith('medical_roentgen_befund'))).toBe(true);
    });
});
