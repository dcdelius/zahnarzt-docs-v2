/**
 * Pipeline: General settings defaults -> facts -> chips -> output
 */
import { describe, it, expect } from 'vitest';
import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';

describe('Pipeline: general settings defaults', () => {
    it('applies user LA defaults (type + agent) when not in dictation', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MO Komposit.',
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
                        defaultLAType: 'infiltration',
                        defaultAnestheticAgentId: 'la_septanest',
                        treatments: {
                            fuellung: {
                                defaultCompositeMaterialId: 'comp_universal_tetric_evoceram',
                            },
                        },
                    },
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output.perInstance ?? {})[0];
        expect(instance?.chips).toContain('la_infiltr');
        expect(result.output.fullText).toContain('Septanest');
    });

    it('applies user isolation default when not in dictation', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MO Komposit.',
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

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output.perInstance ?? {})[0];
        expect(instance?.chips).toContain('kofferdam');
        expect(result.output.fullText).toContain('Kofferdam');
    });

    it('applies normalized medical defaults (anesthesia + isolation) without legacy keys', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MO Komposit.',
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
                        medicalDefaults: {
                            anesthesia: {
                                defaultType: 'infiltration',
                                defaultAgentId: 'la_septanest',
                            },
                            isolation: { defaultMode: 'kofferdam' },
                        },
                        treatments: {
                            fuellung: {
                                defaultCompositeMaterialId: 'comp_universal_tetric_evoceram',
                            },
                        },
                    },
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output.perInstance ?? {})[0];
        expect(instance?.chips).toContain('la_infiltr');
        expect(instance?.chips).toContain('kofferdam');
        expect(result.output.fullText).toContain('Septanest');
        expect(result.output.fullText).toContain('Kofferdam');
    });

    it('applies MKV defaults in MKV mode (no manual confirmation)', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MO Komposit.',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            testOnly: {
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o'],
                    cariesDepth: 'normal',
                },
                settings: {
                    user: {
                        defaultHasMKV: true,
                        treatments: {
                            fuellung: {
                                defaultCompositeMaterialId: 'comp_universal_tetric_evoceram',
                            },
                        },
                    },
                },
                forceAnswers: {
                    fuellung_mkv_justification: 'Mehrschichttechnik',
                    mkv_betrag: 120,
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output.perInstance ?? {})[0];
        expect(instance?.chips).toContain('insurance_gkv_mkv');
        expect(result.output.fullText).toContain('Mehrkostenvereinbarung');
        expect(result.output.fullText).toContain('Mehrkosten-Begründung');
        expect(result.output.fullText).toContain('Mehrschichttechnik');
        expect(result.output.billingCodes.some(code => code.startsWith('GOZ_'))).toBe(true);
    });

    it('applies matrix system default for approximal surfaces', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Zahn 36 MO Komposit.',
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
                                defaultMatrixSystem: 'sectional',
                                defaultCompositeMaterialId: 'comp_universal_tetric_evoceram',
                            },
                        },
                    },
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output.perInstance ?? {})[0];
        expect(instance?.chips).toContain('fuellung_material_matrix');
        expect(result.output.fullText).toContain('Matrizensystem');
        expect(result.output.fullText).toContain('Sektional');
    });
});
