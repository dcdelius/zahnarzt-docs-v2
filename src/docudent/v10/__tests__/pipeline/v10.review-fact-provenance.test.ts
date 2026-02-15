import { describe, it, expect } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('Pipeline: review fact provenance', () => {
    it('maps fact sources to dictation/settings/askback labels for review pills', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 mesio-occlusale Karies.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_anesthesia', 'leitung'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                },
                settings: {
                    user: {
                        defaultIsolation: 'kofferdam',
                        treatments: {
                            fuellung: {
                                defaultCompositeMaterialId: 'comp_universal_tetric_evoceram',
                            },
                        },
                    },
                },
            },
        });

        const reviewInstance = result.review?.instances?.[0];
        expect(reviewInstance).toBeDefined();
        expect(reviewInstance?.factSources?.anesthesia).toBe('askback');
        expect(reviewInstance?.factSources?.kofferdam).toBe('settings');
        expect(reviewInstance?.factSources?.cariesDepth).toBe('dictation');
    });
});
