import { describe, it, expect } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('Gate: Milchzahn yields Askback, not Error', () => {
    it('unsupported milchzahn returns questions with milchzahn handling askback', async () => {
        const result = await runV10({
            dictation: 'Zahn 54 okklusal Füllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '54',
                    surfaces: ['o'],
                },
            },
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;
        expect(result.questions?.some(q => q.id === 'medical_milchzahn_handling')).toBe(true);
    });

    it('milchzahn doc_only proceeds to output with billing disabled', async () => {
        const result = await runV10({
            dictation: 'Zahn 54 okklusal Füllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_milchzahn_handling', 'doc_only'],
                ['medical_mkv_confirmed', 'nur_kasse'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'no'],
                ['fuellung_adhesive', 'yes'],
                ['medical_vipr', 'positiv'],
                ['medical_perk', 'negativ'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '54',
                    surfaces: ['o'],
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        expect(result.output.billingCodes).toEqual([]);
        for (const instance of Object.values(result.output.perInstance)) {
            expect(instance.billingRefs).toEqual([]);
        }
    });
});

