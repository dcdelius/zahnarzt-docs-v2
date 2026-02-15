/**
 * M34: Clinical Truthcases V5 — MultiTreatment Focus
 * 
 * 25+ truthcases testing per-instance scope correctness:
 * - Same-tooth endo+fuellung
 * - Different-tooth scope
 * - Confusable/negation traps
 */

import type { ClinicalTruthcaseV5 } from './clinicalAssertionContract.v2';

// ═══════════════════════════════════════════════════════════════
// SAME-TOOTH ENDO + FÜLLUNG (10)
// ═══════════════════════════════════════════════════════════════

export const SAME_TOOTH_TRUTHCASES: ClinicalTruthcaseV5[] = [
    {
        id: 'st01_endo_fuellung_14_la_scope',
        dictation: 'Endo 14 Leitungsanästhesie 2 Kanäle WF, danach Füllung okklusal ohne Betäubung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['la_leitung'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustNotHave: ['la_infiltr', 'la_leitung'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: 'Endo LA preserved, Füllung LA blocked',
    },
    {
        id: 'st02_endo_fuellung_14_kofferdam_scope',
        dictation: 'Endo 14 Kofferdam 2 Kanäle WF, danach Füllung 14 relative Trockenlegung kein Kofferdam',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['kofferdam'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustNotHave: ['kofferdam'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: 'Endo Kofferdam preserved, Füllung Kofferdam blocked',
    },
    {
        id: 'st03_endo_fuellung_14_roentgen_scope',
        dictation: 'Endo 14 Längenmessröntgen 2 Kanäle WF warm, danach Füllung okklusal keine Röntgenaufnahme',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['laengenmessung_roentgen'],
                    },
                },
            },
            global: {
                billing: {
                    mustIncludeCodes: ['BEMA_Ä925a'], // Endo Röntgen preserved
                },
            },
        },
        category: 'same_tooth',
        description: 'Endo Röntgen preserved despite Füllung "keine Röntgen"',
    },
    {
        id: 'st04_full_endo_postendo',
        dictation: 'Endo 14 Kofferdam NaOCl EDTA 2 Kanäle 18mm WF warm, anschließend Kompositfüllung okklusal Mehrschichttechnik',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['kofferdam', 'spuelung_naocl', 'spuelung_edta', 'wf_warm'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustHave: ['mehrschicht'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: 'Full endo workflow + postendo filling',
    },
    {
        id: 'st05_endo_aufbau_same_tooth',
        dictation: 'WKB 36 3 Kanäle Trepanation WF, dann Aufbaufüllung mod Komposit',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['trepanation'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: 'Endo + Aufbaufüllung same tooth',
    },
    {
        id: 'st06_explicit_la_both',
        dictation: 'Endo 14 Leitungsanästhesie WKB, danach Füllung Infiltrationsanästhesie Komposit',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['la_leitung'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustHave: ['la_infiltr'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: 'Both treatments have explicit LA - no conflict',
    },
    {
        id: 'st07_wl_electric_endo',
        dictation: 'Endo 14 Arbeitslänge elektrisch Apexlocator 2 Kanäle, danach Füllung okklusal',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['laengenmessung_elek'],
                        mustNotHave: ['laengenmessung_roentgen'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: 'Endo electric WL, no Röntgen',
    },
    {
        id: 'st08_einlage_then_wf_then_fuellung',
        dictation: 'Endo 14 Ca(OH)2 Einlage provisorischer Verschluss, dann WF warm, danach Füllung okklusal',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['einlage_caoh2', 'wf_warm'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: 'Endo multi-step then Füllung',
    },
    {
        id: 'st09_4_canal_complex',
        dictation: 'WKB 46 UK Molar 4 Kanäle mb1 mb2 ml d Kofferdam NaOCl, danach Aufbau mod Komposit',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['kanalaufbereitung_4', 'kofferdam', 'spuelung_naocl'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: '4-canal molar endo + Aufbau',
    },
    {
        id: 'st10_zum_schluss_fuellung',
        dictation: 'Endo 14 2 Kanäle WF kalt, zum Schluss Füllung okklusal ohne Anästhesie',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['wf_kalt'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustNotHave: ['la_infiltr', 'la_leitung'],
                    },
                },
            },
        },
        category: 'same_tooth',
        description: '"zum Schluss" marker for Füllung',
    },
];

// ═══════════════════════════════════════════════════════════════
// DIFFERENT-TOOTH SCOPE (10)
// ═══════════════════════════════════════════════════════════════

export const DIFFERENT_TOOTH_TRUTHCASES: ClinicalTruthcaseV5[] = [
    {
        id: 'dt01_endo_14_fuellung_24',
        dictation: 'Endo 14 Leitungsanästhesie 2 Kanäle, Füllung 24 mo ohne Betäubung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo:14': {
                    chips: {
                        mustHave: ['la_leitung'],
                    },
                },
                'fuellung:24': {
                    chips: {
                        mustNotHave: ['la_infiltr', 'la_leitung'],
                    },
                },
            },
        },
        category: 'different_tooth',
        description: 'Different teeth, LA scope correct',
    },
    {
        id: 'dt02_endo_36_fuellung_46',
        dictation: 'WKB 36 Kofferdam 3 Kanäle NaOCl, danach Füllung 46 mo relative Trockenlegung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo:36': {
                    chips: {
                        mustHave: ['kofferdam', 'spuelung_naocl'],
                    },
                },
            },
        },
        category: 'different_tooth',
        description: 'Endo 36, Füllung 46 - Kofferdam only for Endo',
    },
    {
        id: 'dt03_bilateral_endo',
        dictation: 'WKB 36 links 3 Kanäle und WKB 46 rechts 3 Kanäle',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo:36': {
                    chips: {
                        mustHave: ['kanalaufbereitung_3'],
                    },
                },
                'endo:46': {
                    chips: {
                        mustHave: ['kanalaufbereitung_3'],
                    },
                },
            },
        },
        category: 'different_tooth',
        description: 'Bilateral endo same canal count',
    },
    {
        id: 'dt04_quadrant_fuellungen',
        dictation: 'Füllung 34 o, Füllung 35 mo, Füllung 36 mod nach Leitungsanästhesie',
        contractV2: {
            expectedState: 'output',
            global: {
                billing: {
                    mustIncludeCodes: ['BEMA_41a'], // Shared LA
                },
            },
        },
        category: 'different_tooth',
        description: 'Quadrant fillings with shared LA',
    },
    {
        id: 'dt05_endo_14_fuellung_14_24',
        dictation: 'Endo 14 WF, danach Füllung 14 okklusal und Füllung 24 mo',
        contractV2: {
            expectedState: 'output',
        },
        category: 'different_tooth',
        description: 'Endo + 2 fillings',
    },
    {
        id: 'dt06_different_diagnosis',
        dictation: 'Endo 14 irreversible Pulpitis, Füllung 24 Caries media',
        contractV2: {
            expectedState: 'output',
        },
        category: 'different_tooth',
        description: 'Different diagnoses per tooth',
    },
    {
        id: 'dt07_roentgen_scope',
        dictation: 'Endo 14 Längenmessröntgen, Füllung 24 keine Röntgenaufnahme',
        contractV2: {
            expectedState: 'output',
            global: {
                billing: {
                    mustIncludeCodes: ['BEMA_Ä925a'],
                },
            },
        },
        category: 'different_tooth',
        description: 'Endo Röntgen preserved',
    },
    {
        id: 'dt08_mixed_la',
        dictation: 'Füllung 16 Infiltration, Füllung 36 Leitungsanästhesie',
        contractV2: {
            expectedState: 'output',
            global: {
                billing: {
                    mustIncludeCodes: ['BEMA_40', 'BEMA_41a'],
                },
            },
        },
        category: 'different_tooth',
        description: 'Different LA per tooth',
    },
    {
        id: 'dt09_endo_first_fuellung_second',
        dictation: 'Zunächst WKB 36 3 Kanäle, im Anschluss Füllung 37 mo Komposit',
        contractV2: {
            expectedState: 'output',
        },
        category: 'different_tooth',
        description: 'Clear sequence with "zunächst" and "im Anschluss"',
    },
    {
        id: 'dt10_three_teeth',
        dictation: 'Endo 14 WF, Füllung 15 od, Füllung 16 o Infiltration',
        contractV2: {
            expectedState: 'output',
        },
        category: 'different_tooth',
        description: 'Three teeth different treatments',
    },
];

// ═══════════════════════════════════════════════════════════════
// CONFUSABLE / NEGATION TRAPS (5)
// ═══════════════════════════════════════════════════════════════

export const CONFUSABLE_TRUTHCASES: ClinicalTruthcaseV5[] = [
    {
        id: 'cf01_ohne_betaeubung_no_danach',
        dictation: 'Endo 14 Leitungsanästhesie WF, Füllung okklusal ohne Betäubung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['la_leitung'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustNotHave: ['la_infiltr', 'la_leitung'],
                    },
                },
            },
        },
        category: 'confusable',
        description: 'No explicit "danach" but comma separates',
    },
    {
        id: 'cf02_anschliessend_aufbau',
        dictation: 'WKB 36 3 Kanäle NaOCl WF, anschließend postendodontischer Aufbau Komposit',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['spuelung_naocl'],
                    },
                },
            },
        },
        category: 'confusable',
        description: '"anschließend postendo Aufbau" phrasing',
    },
    {
        id: 'cf03_pronoun_die_fuellung',
        dictation: 'Endo 14 Leitung 2 Kanäle WF, danach die Füllung ohne Betäubung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['la_leitung'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustNotHave: ['la_infiltr', 'la_leitung'],
                    },
                },
            },
        },
        category: 'confusable',
        description: 'Pronoun "die Füllung" without tooth repetition',
    },
    {
        id: 'cf04_nacl_vs_naocl_multi',
        dictation: 'Endo 14 Spülung NaOCl 3%, danach Füllung Patient bitte NaCl zuhause spülen',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustHave: ['spuelung_naocl'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustNotHave: ['spuelung_naocl'],
                    },
                },
            },
        },
        category: 'confusable',
        description: 'NaOCl for Endo, NaCl for patient home rinse',
    },
    {
        id: 'cf05_kein_before_treatment',
        dictation: 'Kein Kofferdam heute Endo 14 2 Kanäle danach Füllung',
        contractV2: {
            expectedState: 'output',
            byInstance: {
                'endo': {
                    chips: {
                        mustNotHave: ['kofferdam'],
                    },
                },
                'fuellung': {
                    chips: {
                        mustNotHave: ['kofferdam'],
                    },
                },
            },
        },
        category: 'confusable',
        description: '"Kein Kofferdam" at start applies to session',
    },
];

// ═══════════════════════════════════════════════════════════════
// ALL V5 TRUTHCASES
// ═══════════════════════════════════════════════════════════════

export const ALL_CLINICAL_TRUTHCASES_V5: ClinicalTruthcaseV5[] = [
    ...SAME_TOOTH_TRUTHCASES,
    ...DIFFERENT_TOOTH_TRUTHCASES,
    ...CONFUSABLE_TRUTHCASES,
];

export const V5_STATS = {
    total: ALL_CLINICAL_TRUTHCASES_V5.length,
    sameTooth: SAME_TOOTH_TRUTHCASES.length,
    differentTooth: DIFFERENT_TOOTH_TRUTHCASES.length,
    confusable: CONFUSABLE_TRUTHCASES.length,
};
