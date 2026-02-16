/**
 * Pipeline: Endo settings defaults → facts → chips (without UI)
 */
import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';
import { applyAnswersToFacts } from '../../facts/applyAnswersToFacts';
import { resolveSettings } from '../../settings/settingsResolver';
import { endoUiContract } from '../../packs/endo/ui.contract';
import { runV10 } from '../../pipeline/runV10';
import type { TreatmentFacts } from '../../facts';

function mergeFacts(base: TreatmentFacts, overrides: Record<string, unknown>): TreatmentFacts {
    const merged: TreatmentFacts = {
        ...base,
        ...(overrides as TreatmentFacts),
    };
    if ((overrides as any).endo) {
        merged.endo = {
            ...(base.endo ?? {}),
            ...((overrides as any).endo as Record<string, unknown>),
        };
    }
    return merged;
}

describe('Pipeline: endo settings defaults', () => {
    it('maps settings defaults into facts and emits endo chips', () => {
        const baseFacts = buildFactsFromExtraction({
            extracted: { tooth: '46', treatmentId: 'endo' },
            treatmentId: 'endo',
        });

        const settingsInput = {
            user: {
                treatments: {
                    endo: {
                        defaultWLMethod: 'elektrisch',
                        defaultWFTechnique: 'warm',
                        defaultIrrigationProtocol: 'naocl_edta',
                        defaultEinlage: 'caoh2',
                        defaultCanalCount: 2,
                    },
                },
            },
        };

        const resolved = resolveSettings({
            settings: settingsInput,
            facts: baseFacts,
            askbackPolicy: endoUiContract.askbackPolicy,
            settingsSchema: endoUiContract.settingsSchema,
        });

        const mergedFacts = mergeFacts(baseFacts, resolved.facts);
        const finalFacts = applyAnswersToFacts(mergedFacts, resolved.answers);

        expect(finalFacts.endo?.workingLengthMethod).toBe('electronic');
        expect(finalFacts.endo?.wfTechnique).toBe('warm');
        expect(finalFacts.endo?.irrigationSolutions).toEqual(expect.arrayContaining(['NaOCl', 'EDTA']));
        expect(finalFacts.endo?.medication).toBe('Ca(OH)2');
        expect(finalFacts.endo?.canalCount).toBe(2);
    });

    it('emits endo chips from settings defaults (full pipeline)', async () => {
        const result = await runV10({
            dictation: 'Endo an Zahn 46.',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '46',
                    treatmentId: 'endo',
                },
                forceAnswers: {
                    ENDO_T1_WORKING_LENGTHS: {
                        MB: '19',
                        DB: '18',
                    },
                    medical_isolation: 'kofferdam',
                },
                settings: {
                    user: {
                        treatments: {
                            endo: {
                                defaultWLMethod: 'elektrisch',
                                defaultWFTechnique: 'warm',
                                defaultIrrigationProtocol: 'naocl_edta',
                                defaultEinlage: 'caoh2',
                                defaultCanalCount: 2,
                            },
                        },
                    },
                },
            },
        });

        expect(result.state).toBe('output');
        if (result.state !== 'output') return;

        const instance = Object.values(result.output.perInstance ?? {})[0];
        expect(instance?.chips).toEqual(expect.arrayContaining([
            'laengenmessung_elek',
            'wf_warm',
            'spuelung_naocl',
            'spuelung_edta',
            'einlage_caoh2',
            'kanalaufbereitung_2',
        ]));
    });
});
