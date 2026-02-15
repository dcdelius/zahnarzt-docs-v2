/**
 * Pipeline: Settings-driven material names appear in output
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

describe('Pipeline: material settings -> output', () => {
    it('renders configured material names when mentioned in dictation', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 MO Komposit, Adhäsiv und Ätzgel verwendet.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                },
                settings: {
                    user: {
                        treatments: {
                            fuellung: {
                                defaultCompositeMaterialId: 'comp_universal_tetric_evoceram',
                                defaultAdhesiveMaterialId: 'adh_universal_scotchbond_plus',
                                defaultEtchMaterialId: 'etch_ultraetch_35',
                            },
                        },
                    },
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const text = result.output.fullText;
        expect(text).toContain('Tetric EvoCeram');
        expect(text).toContain('Scotchbond Universal Plus');
        expect(text).toContain('Ultra-Etch 35%');
    });

    it('renders bulk/flowable material names from settings', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 MOD Füllung mit Bulk-Fill und Flowable-Basis.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    cariesDepth: 'normal',
                    flowableMentioned: true,
                },
                settings: {
                    user: {
                        treatments: {
                            fuellung: {
                                defaultBulkMaterialId: 'comp_bulk_tetric_powerfill',
                                defaultFlowableMaterialId: 'comp_flow_sdr_plus',
                            },
                        },
                    },
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const text = result.output.fullText;
        expect(text).toContain('Tetric PowerFill');
        expect(text).toContain('SDR flow+');
    });
});
