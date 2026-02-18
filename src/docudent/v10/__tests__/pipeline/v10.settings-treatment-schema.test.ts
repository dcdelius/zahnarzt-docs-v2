import { describe, expect, it } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';
import { resolveSettings } from '../../settings/settingsResolver';
import { extractionUiContract } from '../../packs/extraction/ui.contract';
import { roentgenUiContract } from '../../packs/roentgen/ui.contract';
import { untersuchungUiContract } from '../../packs/untersuchung/ui.contract';
import { pzrUiContract } from '../../packs/pzr/ui.contract';
import { uptUiContract } from '../../packs/upt/ui.contract';
import { kroneUiContract } from '../../packs/krone/ui.contract';
import { implantUiContract } from '../../packs/implant/ui.contract';
import { schieneUiContract } from '../../packs/schiene/ui.contract';
import { traumaUiContract } from '../../packs/trauma/ui.contract';
import { teilprotheseUiContract } from '../../packs/teilprothese/ui.contract';
import { totalprotheseUiContract } from '../../packs/totalprothese/ui.contract';
import { wsrUiContract } from '../../packs/wsr/ui.contract';
import { fissurenversiegelungUiContract } from '../../packs/fissurenversiegelung/ui.contract';
import { ueberkappungUiContract } from '../../packs/ueberkappung/ui.contract';
import { crownPrepUiContract } from '../../packs/crown_prep/ui.contract';

describe('v10 settings schema treatment mappings', () => {
    it('applies extraction settings defaults to answers and facts', () => {
        const facts = buildFactsFromExtraction({
            extracted: { tooth: '28', treatmentId: 'extraction' },
            treatmentId: 'extraction',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    defaultLAType: 'infiltration',
                    treatments: {
                        extraction: {
                            defaultWoundCare: 'yes',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: extractionUiContract.askbackPolicy,
            settingsSchema: extractionUiContract.settingsSchema,
        });

        expect(resolved.answers.get('medical_la_type')).toBe('infiltr');
        expect(resolved.answers.get('wound_care')).toBe('yes');
        expect((resolved.facts as Record<string, unknown>).anesthesia).toBe('infiltr');
        expect((resolved.facts as Record<string, unknown>).woundCare).toBe(true);
    });

    it('does not auto-answer roentgen critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'roentgen' },
            treatmentId: 'roentgen',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        roentgen: {
                            defaultType: 'opg',
                            defaultIndication: 'diagnostik',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: roentgenUiContract.askbackPolicy,
            settingsSchema: roentgenUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('does not auto-answer untersuchung critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'untersuchung' },
            treatmentId: 'untersuchung',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        untersuchung: {
                            defaultReason: 'kontrolle',
                            defaultFindings: 'unauffaellig',
                            defaultAssessment: 'ohne_therapiebedarf',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: untersuchungUiContract.askbackPolicy,
            settingsSchema: untersuchungUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('applies pzr settings defaults to answers and facts', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'pzr' },
            treatmentId: 'pzr',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        pzr: {
                            defaultZahnsteinEntfernung: 'yes',
                            defaultFluoridation: 'no',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: pzrUiContract.askbackPolicy,
            settingsSchema: pzrUiContract.settingsSchema,
        });

        expect(resolved.answers.get('pzr_zahnstein')).toBe('yes');
        expect(resolved.answers.get('pzr_fluoridation')).toBe('no');
        const nextFacts = resolved.facts as Record<string, unknown>;
        expect((nextFacts.pzr as Record<string, unknown>).zahnsteinEntfernung).toBe(true);
        expect((nextFacts.pzr as Record<string, unknown>).fluoridation).toBe(false);
    });

    it('does not auto-answer upt critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'upt' },
            treatmentId: 'upt',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        upt: {
                            defaultGrade: 'b',
                            defaultInterval: '6m',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: uptUiContract.askbackPolicy,
            settingsSchema: uptUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('does not auto-answer krone critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'krone' },
            treatmentId: 'krone',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        krone: {
                            defaultType: 'vollkrone',
                            defaultPlacement: 'definitiv',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: kroneUiContract.askbackPolicy,
            settingsSchema: kroneUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('maps bridge defaults when askbacks are skippable', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'bruecke' },
            treatmentId: 'bruecke',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        bruecke: {
                            defaultType: 'definitiv',
                            defaultPhase: 'kontrolle',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: {
                criticalAskbacks: [],
                skippableAskbacks: ['medical_bruecke_typ', 'medical_bruecke_phase'],
            },
            settingsSchema: {
                practice: [],
                user: [
                    { key: 'treatments.bruecke.defaultType', label: 'Typ', type: 'enum', mapsToAskbackId: 'medical_bruecke_typ' },
                    { key: 'treatments.bruecke.defaultPhase', label: 'Phase', type: 'enum', mapsToAskbackId: 'medical_bruecke_phase' },
                ],
            },
        });

        expect(resolved.answers.get('medical_bruecke_typ')).toBe('definitiv');
        expect(resolved.answers.get('medical_bruecke_phase')).toBe('kontrolle');
        const nextFacts = resolved.facts as Record<string, unknown>;
        expect((nextFacts.bruecke as Record<string, unknown>).type).toBe('definitiv');
        expect((nextFacts.bruecke as Record<string, unknown>).phase).toBe('kontrolle');
    });

    it('does not auto-answer implant critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'implant' },
            treatmentId: 'implant',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        implant: {
                            defaultPhase: 'insertion',
                            defaultNachsorge: 'ja',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: implantUiContract.askbackPolicy,
            settingsSchema: implantUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('does not auto-answer schiene critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'schiene' },
            treatmentId: 'schiene',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        schiene: {
                            defaultType: 'okklusionsschiene',
                            defaultPhase: 'eingliederung',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: schieneUiContract.askbackPolicy,
            settingsSchema: schieneUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('maps trauma skippable defaults while keeping critical askbacks open', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'trauma' },
            treatmentId: 'trauma',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        trauma: {
                            defaultArt: 'luxation',
                            defaultSchienung: 'ja',
                            defaultKontrolle: 'nein',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: traumaUiContract.askbackPolicy,
            settingsSchema: traumaUiContract.settingsSchema,
        });

        expect(resolved.answers.has('medical_trauma_art')).toBe(false);
        expect(resolved.answers.has('medical_trauma_schienung')).toBe(false);
        expect(resolved.answers.get('medical_trauma_kontrolle')).toBe('nein');
        const nextFacts = resolved.facts as Record<string, unknown>;
        expect((nextFacts.trauma as Record<string, unknown>).kontrolle).toBe('nein');
    });

    it('does not auto-answer teilprothese critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'teilprothese' },
            treatmentId: 'teilprothese',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        teilprothese: {
                            defaultType: 'modellguss',
                            defaultPhase: 'eingliederung',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: teilprotheseUiContract.askbackPolicy,
            settingsSchema: teilprotheseUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('does not auto-answer totalprothese critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'totalprothese' },
            treatmentId: 'totalprothese',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        totalprothese: {
                            defaultType: 'konventionell',
                            defaultPhase: 'kontrolle',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: totalprotheseUiContract.askbackPolicy,
            settingsSchema: totalprotheseUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('does not auto-answer wsr critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'wsr' },
            treatmentId: 'wsr',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        wsr: {
                            defaultZugang: 'osteotomie',
                            defaultLokalisation: 'molar',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: wsrUiContract.askbackPolicy,
            settingsSchema: wsrUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('does not auto-answer fissurenversiegelung critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'fissurenversiegelung' },
            treatmentId: 'fissurenversiegelung',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        fissurenversiegelung: {
                            defaultIndication: 'kariesprophylaxe',
                            defaultMaterial: 'kunststoff',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: fissurenversiegelungUiContract.askbackPolicy,
            settingsSchema: fissurenversiegelungUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('does not auto-answer ueberkappung critical askbacks from settings', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'ueberkappung' },
            treatmentId: 'ueberkappung',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        ueberkappung: {
                            defaultType: 'direkt',
                            defaultMaterial: 'MTA',
                        },
                    },
                },
            },
            facts,
            askbackPolicy: ueberkappungUiContract.askbackPolicy,
            settingsSchema: ueberkappungUiContract.settingsSchema,
        });

        expect(resolved.answers.size).toBe(0);
        expect(Object.keys(resolved.facts).length).toBe(0);
    });

    it('maps crown_prep defaults to answers and facts', () => {
        const facts = buildFactsFromExtraction({
            extracted: { treatmentId: 'crown_prep' },
            treatmentId: 'crown_prep',
        });

        const resolved = resolveSettings({
            settings: {
                user: {
                    treatments: {
                        crown_prep: {
                            defaultPreparation: true,
                            defaultImpression: true,
                            defaultProvisional: false,
                        },
                    },
                },
            },
            facts,
            askbackPolicy: crownPrepUiContract.askbackPolicy,
            settingsSchema: crownPrepUiContract.settingsSchema,
        });

        expect(resolved.answers.get('crown_prep_preparation')).toBe(true);
        expect(resolved.answers.get('crown_prep_impression')).toBe(true);
        expect(resolved.answers.get('crown_prep_provisional')).toBe(false);
        const nextFacts = resolved.facts as Record<string, unknown>;
        expect((nextFacts.crownPrep as Record<string, unknown>).preparation).toBe(true);
        expect((nextFacts.crownPrep as Record<string, unknown>).impression).toBe(true);
        expect((nextFacts.crownPrep as Record<string, unknown>).provisional).toBe(false);
    });
});
