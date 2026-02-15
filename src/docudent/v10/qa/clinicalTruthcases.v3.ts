/**
 * M32: Clinical Truthcases v3
 * 
 * 30 new truthcases with contract-based assertions.
 * Focus: negations, confusables, endo core, multi-tooth scope.
 */

import type { ClinicalTruthcaseV3 } from './clinicalAssertionContract.v1';

// ═══════════════════════════════════════════════════════════════
// NEGATION CASES (10)
// ═══════════════════════════════════════════════════════════════

export const NEGATION_TRUTHCASES: ClinicalTruthcaseV3[] = [
    {
        id: 'neg01_kein_kofferdam',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung Zahn 36 mo kein Kofferdam nur Watterollen',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['kofferdam'],
            },
            billing: {
                mustNotIncludeCodes: ['BEMA_12', 'GOZ_2040'],
            },
        },
        category: 'negation',
        description: '"kein Kofferdam" prevents Kofferdam billing',
    },
    {
        id: 'neg02_ohne_betaeubung',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 16 o ohne Betäubung Patient wünscht keine',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['la_infiltr', 'la_leitung'],
            },
            billing: {
                mustNotIncludeCodes: ['BEMA_40', 'BEMA_41a', 'GOZ_0090', 'GOZ_0100'],
            },
        },
        category: 'negation',
        description: '"ohne Betäubung" prevents anesthesia billing',
    },
    {
        id: 'neg03_keine_roentgen',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 mo keine Röntgenaufnahme nötig',
        contract: {
            expectedState: 'output',
            billing: {
                mustNotIncludeCodes: ['BEMA_Ä925a', 'GOZ_5000'],
            },
        },
        category: 'negation',
        description: '"keine Röntgen" prevents X-ray billing',
    },
    {
        id: 'neg04_keine_ueberkappung',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 46 mod Caries media keine Überkappung nötig',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['cp', 'p'],
            },
            billing: {
                mustNotIncludeCodes: ['BEMA_25', 'BEMA_26', 'GOZ_2330', 'GOZ_2340'],
            },
        },
        category: 'negation',
        description: '"keine Überkappung" prevents CP/P billing',
    },
    {
        id: 'neg05_keine_einlage',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 single-visit keine medikamentöse Einlage direkt WF',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['einlage_caoh2'],
            },
            billing: {
                mustNotIncludeCodes: ['BEMA_33'],
            },
        },
        category: 'negation',
        description: '"keine Einlage" prevents Einlage billing',
    },
    {
        id: 'neg06_nicht_vital',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 mo Zahn nicht vital avital',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['vipr_neg'],
                mustNotHave: ['vipr_pos'],
            },
        },
        category: 'negation',
        description: '"nicht vital" triggers negative vitality',
    },
    {
        id: 'neg07_kein_roentgen_wl',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 kein Röntgen WL rein elektrisch',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['laengenmessung_elek'],
                mustNotHave: ['laengenmessung_roentgen', 'roentgen_einzelzahn'],
            },
            billing: {
                mustNotIncludeCodes: ['BEMA_Ä925a'],
            },
        },
        category: 'negation',
        description: '"kein Röntgen" in endo context',
    },
    {
        id: 'neg08_ohne_spuelung',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 ohne Spülung trocken aufbereitet',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['spuelung_naocl', 'spuelung_edta'],
            },
        },
        category: 'negation',
        description: '"ohne Spülung" prevents irrigation chips',
    },
    {
        id: 'neg09_nicht_perkussionsempfindlich',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 mo nicht perkussionsempfindlich',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['perk_neg'],
                mustNotHave: ['perk_pos'],
            },
        },
        category: 'negation',
        description: '"nicht perkussionsempfindlich" = negative',
    },
    {
        id: 'neg10_keine_mehrschicht',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 o kleine Füllung Bulk-Fill einschichtig',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['mehrschicht'],
            },
        },
        category: 'negation',
        description: '"einschichtig" = no Mehrschicht',
    },
];

// ═══════════════════════════════════════════════════════════════
// CONFUSABLE CASES (10)
// ═══════════════════════════════════════════════════════════════

export const CONFUSABLE_TRUTHCASES: ClinicalTruthcaseV3[] = [
    {
        id: 'conf01_nacl_vs_naocl',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 Spülung NaCl physiologisch',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['spuelung_naocl'],
            },
        },
        category: 'confusable',
        description: 'NaCl ≠ NaOCl - different chemicals',
    },
    {
        id: 'conf02_naocl_correct',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 Spülung NaOCl 3%',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['spuelung_naocl'],
            },
        },
        category: 'confusable',
        description: 'NaOCl should trigger chip',
    },
    {
        id: 'conf03_spuelung_zuhause',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 Patient soll zuhause mit CHX spülen',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['spuelung_naocl', 'spuelung_edta'],
            },
        },
        category: 'confusable',
        description: 'Home rinse ≠ intraoperative irrigation',
    },
    {
        id: 'conf04_spuelung_intraop',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 intraoperative Spülung NaOCl EDTA',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['spuelung_naocl', 'spuelung_edta'],
            },
        },
        category: 'confusable',
        description: 'Intraop irrigation should trigger chips',
    },
    {
        id: 'conf05_wl_mention_only',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 kurze WL schwieriger Kanal',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['laengenmessung_elek', 'laengenmessung_roentgen'],
            },
        },
        category: 'confusable',
        description: '"WL" mention ≠ actual WL measurement',
    },
    {
        id: 'conf06_wl_actual',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 Arbeitslänge elektrisch bestimmt 21mm',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['laengenmessung_elek'],
            },
        },
        category: 'confusable',
        description: 'Actual WL measurement triggers chip',
    },
    {
        id: 'conf07_spritze_ambiguous',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 mo nach Spritze',
        contract: {
            expectedState: 'questions',
            askbacks: {
                mustHave: ['medical_la_type'],
            },
        },
        category: 'confusable',
        description: '"Spritze" is ambiguous - must ask',
    },
    {
        id: 'conf08_infiltration_clear',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 mo Infiltrationsanästhesie',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['la_infiltr'],
                mustNotHave: ['la_leitung'],
            },
        },
        category: 'confusable',
        description: 'Clear Infiltration = no question',
    },
    {
        id: 'conf09_profunda_vs_media',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 mo tiefe Karies aber nicht profunda',
        contract: {
            expectedState: 'output',
            chips: {
                mustNotHave: ['cp', 'p'],
            },
            billing: {
                mustNotIncludeCodes: ['BEMA_25', 'BEMA_26'],
            },
        },
        category: 'confusable',
        description: '"tiefe aber nicht profunda" = no CP',
    },
    {
        id: 'conf10_pulpanah_vs_offen',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 mo pulpanah aber keine Eröffnung',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['cp'],
                mustNotHave: ['p'],
            },
        },
        category: 'confusable',
        description: '"pulpanah ohne Eröffnung" = CP not P',
    },
];

// ═══════════════════════════════════════════════════════════════
// ENDO CORE CASES (5)
// ═══════════════════════════════════════════════════════════════

export const ENDO_CORE_TRUTHCASES: ClinicalTruthcaseV3[] = [
    {
        id: 'endo01_trepanation',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 Trepanation Zugang Pulpakammer eröffnet',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['trepanation'],
            },
        },
        category: 'endo_core',
    },
    {
        id: 'endo02_4canal',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 UK Molar 4 Kanäle mb1 mb2 ml d Aufbereitung',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['kanalaufbereitung_4'],
            },
        },
        category: 'endo_core',
    },
    {
        id: 'endo03_wf_warm',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 36 Wurzelfüllung warme vertikale Kondensation',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['wf_warm'],
                mustNotHave: ['wf_kalt', 'wf_einzel'],
            },
        },
        category: 'endo_core',
    },
    {
        id: 'endo04_postendo_aufbau',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 abgeschlossen direkter Aufbau Komposit postendo',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['aufbau_postendo'],
            },
        },
        category: 'endo_core',
    },
    {
        id: 'endo05_full_workflow',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 46 Kofferdam Trepanation 3 Kanäle WL elektrisch NaOCl EDTA Ca(OH)2 Einlage prov Verschluss',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['kofferdam', 'trepanation', 'laengenmessung_elek', 'spuelung_naocl', 'spuelung_edta', 'einlage_caoh2'],
            },
        },
        category: 'endo_core',
        description: 'Full endo workflow',
    },
];

// ═══════════════════════════════════════════════════════════════
// MULTI-TOOTH SCOPE CASES (5)
// ═══════════════════════════════════════════════════════════════

export const MULTI_SCOPE_TRUTHCASES: ClinicalTruthcaseV3[] = [
    {
        id: 'multi01_shared_la',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllungen 36 mo und 37 mo nach Leitungsanästhesie links',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['la_leitung'],
            },
            billing: {
                mustIncludeCodes: ['BEMA_41a'],
            },
        },
        category: 'multi_scope',
        description: 'Shared LA for multiple teeth',
    },
    {
        id: 'multi02_shared_kofferdam',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllungen 36 37 38 unter einem Kofferdam',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['kofferdam'],
            },
            billing: {
                mustIncludeCodes: ['BEMA_12'],
            },
        },
        category: 'multi_scope',
        description: 'Shared Kofferdam for quadrant',
    },
    {
        id: 'multi03_different_diagnoses',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllung 36 mo profunda CP und 46 od media ohne Überkappung',
        contract: {
            expectedState: 'output',
            // One tooth has CP, other doesn't - difficult to assert per-tooth
        },
        category: 'multi_scope',
        description: 'Different diagnoses per tooth',
    },
    {
        id: 'multi04_endo_bilateral',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        dictation: 'WKB 36 links und 46 rechts je 3 Kanäle',
        contract: {
            expectedState: 'output',
            chips: {
                mustHave: ['kanalaufbereitung_3'],
            },
        },
        category: 'multi_scope',
        description: 'Bilateral endo same session',
    },
    {
        id: 'multi05_roentgen_once',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        dictation: 'Füllungen 36 37 38 eine Röntgenaufnahme präoperativ',
        contract: {
            expectedState: 'output',
            billing: {
                mustIncludeCodes: ['BEMA_Ä925a'],
            },
        },
        category: 'multi_scope',
        description: 'Single X-ray for multiple teeth',
    },
];

// ═══════════════════════════════════════════════════════════════
// ALL V3 TRUTHCASES
// ═══════════════════════════════════════════════════════════════

export const ALL_CLINICAL_TRUTHCASES_V3: ClinicalTruthcaseV3[] = [
    ...NEGATION_TRUTHCASES,
    ...CONFUSABLE_TRUTHCASES,
    ...ENDO_CORE_TRUTHCASES,
    ...MULTI_SCOPE_TRUTHCASES,
];

export const V3_STATS = {
    total: ALL_CLINICAL_TRUTHCASES_V3.length,
    negation: NEGATION_TRUTHCASES.length,
    confusable: CONFUSABLE_TRUTHCASES.length,
    endo_core: ENDO_CORE_TRUTHCASES.length,
    multi_scope: MULTI_SCOPE_TRUTHCASES.length,
};
