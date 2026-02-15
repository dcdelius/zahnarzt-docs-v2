/**
 * M31: Clinical Truthcases v2
 * 
 * 50+ realistic German dictations for Füllung + Endo
 * Each case tests: askbacks, chips, billing, text, false positives
 */

import type { ClinicalTruthcaseV2 } from './clinicalAssertions';

// ═══════════════════════════════════════════════════════════════
// FÜLLUNG CASES (25)
// ═══════════════════════════════════════════════════════════════

export const FUELLUNG_TRUTHCASES: ClinicalTruthcaseV2[] = [
    // --- Profunda / Überkappung ---
    {
        id: 'f01_profunda_cp',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung Zahn 36 mo Komposit Caries profunda mit CP Ca(OH)2',
        expected: {
            state: 'output',
            chipsInclude: ['cp'],
            billingInclude: ['BEMA_25'],
            textContains: ['profunda', 'Kalziumhydroxid'],
            noPlaceholders: true,
        },
        category: 'profunda',
        description: 'Profunda with CP - must include BEMA_25',
    },
    {
        id: 'f02_profunda_p_direct',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Fuellung 46 dod Komposit Pulpaeröffnung punktförmig direkte Überkappung MTA',
        expected: {
            state: 'output',
            chipsInclude: ['p'],
            billingInclude: ['BEMA_26'],
            textContains: ['Pulp', 'MTA'],
        },
        category: 'profunda',
        description: 'Direct pulp capping',
    },
    {
        id: 'f03_media_no_cp',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung Zahn 16 od Komposit Caries media keine Überkappung nötig',
        expected: {
            state: 'output',
            chipsExclude: ['cp', 'p'],
            billingExclude: ['BEMA_25', 'BEMA_26'],
            noFalsePositives: { chips: ['cp', 'p'] },
        },
        category: 'profunda',
        description: 'Media - no CP/P allowed',
    },

    // --- ViPr / Perk ---
    {
        id: 'f04_vipr_positiv',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 mo Komposit Vitalitätsprobe positiv',
        expected: {
            state: 'output',
            chipsInclude: ['vipr_pos'],
            chipsExclude: ['vipr_neg'],
            textContains: ['vital'],
        },
        category: 'vipr',
    },
    {
        id: 'f05_vipr_negativ',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 46 mo Komposit ViPr negativ',
        expected: {
            state: 'output',
            chipsInclude: ['vipr_neg'],
            chipsExclude: ['vipr_pos'],
        },
        category: 'vipr',
    },
    {
        id: 'f06_perk_pos',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 mo Perkussion positiv, Zahn klopfempfindlich',
        expected: {
            state: 'output',
            chipsInclude: ['perk_pos'],
            chipsExclude: ['perk_neg'],
        },
        category: 'vipr',
    },
    {
        id: 'f07_perk_neg',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 16 o Perkussion negativ',
        expected: {
            state: 'output',
            chipsInclude: ['perk_neg'],
            chipsExclude: ['perk_pos'],
        },
        category: 'vipr',
    },

    // --- Anästhesie ---
    {
        id: 'f08_la_infiltration',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 16 mo Komposit nach Infiltrationsanästhesie Ultracain',
        expected: {
            state: 'output',
            chipsInclude: ['la_infiltr'],
            chipsExclude: ['la_leitung'],
            billingInclude: ['BEMA_40'],
        },
        category: 'la',
    },
    {
        id: 'f09_la_leitung',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 mo Leitungsanästhesie N. alveolaris inf.',
        expected: {
            state: 'output',
            chipsInclude: ['la_leitung'],
            chipsExclude: ['la_infiltr'],
            billingInclude: ['BEMA_41a'],
        },
        category: 'la',
    },
    {
        id: 'f10_la_unklar_spritze',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 46 mo Spritze gegeben dann Komposit',
        expected: {
            state: 'questions',
            askbacks: ['medical_la_type'],
        },
        category: 'la',
        description: '"Spritze" is ambiguous - must ask',
    },

    // --- Isolation ---
    {
        id: 'f11_kofferdam',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 mo unter Kofferdam-Isolation Komposit',
        expected: {
            state: 'output',
            chipsInclude: ['kofferdam'],
            billingInclude: ['BEMA_12'],
        },
        category: 'isolation',
    },
    {
        id: 'f12_relative_trocken',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 16 o relative Trockenlegung mit Watterollen',
        expected: {
            state: 'output',
            chipsInclude: ['rel_trocken'],
            chipsExclude: ['kofferdam'],
            billingExclude: ['BEMA_12'],
        },
        category: 'isolation',
    },
    {
        id: 'f13_kofferdam_nicht',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 46 mo kein Kofferdam nur Watterollen',
        expected: {
            state: 'output',
            chipsExclude: ['kofferdam'],
            billingExclude: ['BEMA_12'],
            noFalsePositives: { chips: ['kofferdam'] },
        },
        category: 'negation',
        description: '"kein Kofferdam" must not trigger Kofferdam chip',
    },

    // --- Mehrflächig ---
    {
        id: 'f14_einflächig',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 o einflächig Komposit',
        expected: {
            state: 'output',
            billingInclude: ['BEMA_13'],
        },
    },
    {
        id: 'f15_zweiflächig',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 mo zweiflächig Komposit',
        expected: {
            state: 'output',
            billingInclude: ['BEMA_13b'],
        },
    },
    {
        id: 'f16_dreiflächig',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 46 mod dreiflächig Komposit',
        expected: {
            state: 'output',
            billingInclude: ['BEMA_13c'],
        },
    },
    {
        id: 'f17_vierflächig',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 46 modv vierflächig Komposit',
        expected: {
            state: 'output',
            billingInclude: ['BEMA_13d'],
        },
    },

    // --- PKV ---
    {
        id: 'f18_pkv_composite',
        treatmentId: 'fuellung',
        mode: 'single',
        insuranceType: 'PKV',
        dictation: 'Füllung 36 mo Komposit',
        expected: {
            state: 'output',
            billingInclude: ['GOZ_2080'],
            billingExclude: ['BEMA_13b'],
        },
    },

    // --- False Positives ---
    {
        id: 'f19_ohne_betaeubung',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 16 o Komposit ohne Betäubung Patient wünscht keine',
        expected: {
            state: 'output',
            chipsExclude: ['la_infiltr', 'la_leitung'],
            billingExclude: ['BEMA_40', 'BEMA_41a'],
            noFalsePositives: { chips: ['la_infiltr', 'la_leitung'] },
        },
        category: 'false_positive',
    },
    {
        id: 'f20_keine_röntgen',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 mo keine Röntgenaufnahme nötig',
        expected: {
            state: 'output',
            billingExclude: ['BEMA_Ä925a'],
            noFalsePositives: { billing: ['BEMA_Ä925a'] },
        },
        category: 'false_positive',
    },

    // --- Typos / Variations ---
    {
        id: 'f21_typo_fuellung',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Fuellung Zahn 36 mo Komposit',
        expected: {
            state: 'output',
        },
        description: 'Typo "Fuellung" should still work',
    },
    {
        id: 'f22_typo_betaeubung',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 46 mo nach Betaeubung Ultracain',
        expected: {
            state: 'questions',
            askbacks: ['medical_la_type'],
        },
        description: 'Betaeubung (no ä) should still trigger LA question',
    },

    // --- Finishing ---
    {
        id: 'f23_finishing_polieren',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 mo Komposit Ausarbeitung und Politur',
        expected: {
            state: 'output',
            chipsInclude: ['finishing'],
        },
    },
    {
        id: 'f24_fluor',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 16 o Komposit abschließend Fluoridierung',
        expected: {
            state: 'output',
            chipsInclude: ['fluor'],
        },
    },
    {
        id: 'f25_mehrschicht',
        treatmentId: 'fuellung',
        mode: 'single',
        dictation: 'Füllung 36 mod Komposit Mehrschichttechnik',
        expected: {
            state: 'output',
            chipsInclude: ['mehrschicht'],
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// ENDO CASES (25)
// ═══════════════════════════════════════════════════════════════

export const ENDO_TRUTHCASES: ClinicalTruthcaseV2[] = [
    // --- Diagnosis paths ---
    {
        id: 'e01_irreversible_pulpitis',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'Wurzelkanalbehandlung Zahn 46 irreversible Pulpitis',
        expected: {
            state: 'output',
            textContains: ['Pulpitis'],
        },
    },
    {
        id: 'e02_apikale_parodontitis',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 36 apikale Parodontitis Aufbissempfindlichkeit',
        expected: {
            state: 'output',
            textContains: ['apikal'],
        },
    },

    // --- Trepanation ---
    {
        id: 'e03_trepanation',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'Endo 46 Trepanation Zugang zur Pulpakammer',
        expected: {
            state: 'output',
            chipsInclude: ['trepanation'],
        },
    },

    // --- Längenmessung ---
    {
        id: 'e04_wl_elektrisch',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 Arbeitslängenbestimmung elektrisch Apexlocator',
        expected: {
            state: 'output',
            chipsInclude: ['laengenmessung_elek'],
            chipsExclude: ['laengenmessung_roentgen'],
        },
        category: 'wl',
    },
    {
        id: 'e05_wl_roentgen',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 36 Längenmessröntgen zur Arbeitslängenbestimmung',
        expected: {
            state: 'output',
            chipsInclude: ['laengenmessung_roentgen'],
            billingInclude: ['BEMA_Ä925a'],
        },
        category: 'wl',
    },
    {
        id: 'e06_wl_both',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 WL elektrisch und Röntgenkontrolle',
        expected: {
            state: 'output',
            chipsInclude: ['laengenmessung_elek', 'laengenmessung_roentgen'],
        },
        category: 'wl',
    },

    // --- Kanalaufbereitung ---
    {
        id: 'e07_1kanal',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 11 Frontzahn 1 Kanal Aufbereitung maschinell',
        expected: {
            state: 'output',
            chipsInclude: ['kanalaufbereitung_1'],
        },
    },
    {
        id: 'e08_2kanal',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 35 Prämolar 2 Kanäle',
        expected: {
            state: 'output',
            chipsInclude: ['kanalaufbereitung_2'],
        },
    },
    {
        id: 'e09_3kanal',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 36 Molar 3 Kanäle mb ml d',
        expected: {
            state: 'output',
            chipsInclude: ['kanalaufbereitung_3'],
        },
    },
    {
        id: 'e10_4kanal',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 Molar 4 Kanäle mb1 mb2 ml d',
        expected: {
            state: 'output',
            chipsInclude: ['kanalaufbereitung_4'],
        },
    },

    // --- Spülung ---
    {
        id: 'e11_spuelung_naocl',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 Spülung NaOCl 3% zwischendurch und final',
        expected: {
            state: 'output',
            chipsInclude: ['spuelung_naocl'],
        },
        category: 'spuelung',
    },
    {
        id: 'e12_spuelung_edta',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 36 Spülung EDTA 17% zur Schmierschichtentfernung',
        expected: {
            state: 'output',
            chipsInclude: ['spuelung_edta'],
        },
        category: 'spuelung',
    },
    {
        id: 'e13_spuelung_no_nacl',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 Spülung NaCl physiologisch',
        expected: {
            state: 'output',
            chipsExclude: ['spuelung_naocl'],
            noFalsePositives: { chips: ['spuelung_naocl'] },
        },
        category: 'false_positive',
        description: 'NaCl ≠ NaOCl - must not trigger NaOCl chip',
    },

    // --- Einlage ---
    {
        id: 'e14_einlage_caoh2',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 medikamentöse Einlage Ca(OH)2 provisorischer Verschluss',
        expected: {
            state: 'output',
            chipsInclude: ['einlage_caoh2', 'provisorischer_verschluss'],
        },
    },

    // --- Wurzelfüllung ---
    {
        id: 'e15_wf_kalt',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 36 Wurzelfüllung lateral Kondensation kalt',
        expected: {
            state: 'output',
            chipsInclude: ['wf_kalt'],
            chipsExclude: ['wf_warm'],
        },
        category: 'wf',
    },
    {
        id: 'e16_wf_warm',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 Wurzelfüllung warme vertikale Kondensation Thermafil',
        expected: {
            state: 'output',
            chipsInclude: ['wf_warm'],
            chipsExclude: ['wf_kalt'],
        },
        category: 'wf',
    },
    {
        id: 'e17_wf_einzel',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 11 Einzelstifttechnik WF',
        expected: {
            state: 'output',
            chipsInclude: ['wf_einzel'],
        },
        category: 'wf',
    },

    // --- Röntgen ---
    {
        id: 'e18_roentgen_einzelzahn',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 Röntgen Einzelzahnaufnahme präoperativ',
        expected: {
            state: 'output',
            chipsInclude: ['roentgen_einzelzahn'],
            billingInclude: ['BEMA_Ä925a'],
        },
        category: 'roentgen',
    },
    {
        id: 'e19_roentgen_kontrolle',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 36 Kontrollröntgen nach WF',
        expected: {
            state: 'output',
            chipsInclude: ['roentgen_kontrolle'],
            billingInclude: ['BEMA_Ä925a'],
        },
        category: 'roentgen',
    },

    // --- Aufbau ---
    {
        id: 'e20_aufbau_postendo',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 abgeschlossen Aufbau postendodontisch Komposit',
        expected: {
            state: 'output',
            chipsInclude: ['aufbau_postendo'],
        },
    },

    // --- Kofferdam ---
    {
        id: 'e21_kofferdam_endo',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 unter Kofferdam für steriles Feld',
        expected: {
            state: 'output',
            chipsInclude: ['kofferdam'],
            billingInclude: ['BEMA_12'],
        },
    },

    // --- PKV ---
    {
        id: 'e22_endo_pkv',
        treatmentId: 'endo',
        mode: 'single',
        insuranceType: 'PKV',
        dictation: 'WKB 46 3 Kanäle Aufbereitung maschinell',
        expected: {
            state: 'output',
            billingInclude: ['GOZ_2410'],
            billingExclude: ['BEMA_32'],
        },
    },

    // --- False Positives ---
    {
        id: 'e23_patient_spuelt_zuhause',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 Patient soll zuhause spülen mit CHX',
        expected: {
            state: 'output',
            chipsExclude: ['spuelung_naocl', 'spuelung_edta'],
            noFalsePositives: { chips: ['spuelung_naocl', 'spuelung_edta'] },
        },
        category: 'false_positive',
        description: 'Patient spülen zuhause ≠ intraoperative Spülung',
    },
    {
        id: 'e24_kein_roentgen',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 ohne Röntgen WL elektrisch',
        expected: {
            state: 'output',
            chipsExclude: ['roentgen_einzelzahn', 'roentgen_kontrolle', 'laengenmessung_roentgen'],
            billingExclude: ['BEMA_Ä925a'],
        },
        category: 'false_positive',
    },
    {
        id: 'e25_keine_einlage',
        treatmentId: 'endo',
        mode: 'single',
        dictation: 'WKB 46 single-visit keine medikamentöse Einlage direkt WF',
        expected: {
            state: 'output',
            chipsExclude: ['einlage_caoh2'],
            noFalsePositives: { chips: ['einlage_caoh2'] },
        },
        category: 'false_positive',
    },
];

// ═══════════════════════════════════════════════════════════════
// MULTI-TOOTH CASES (10)
// ═══════════════════════════════════════════════════════════════

export const MULTI_TRUTHCASES: ClinicalTruthcaseV2[] = [
    {
        id: 'm01_zwei_fuellungen',
        treatmentId: 'fuellung',
        mode: 'multi',
        instances: [{ tooth: '36' }, { tooth: '46' }],
        dictation: 'Füllung Zahn 36 mo und Zahn 46 od Komposit',
        expected: {
            state: 'output',
        },
        category: 'multi',
    },
    {
        id: 'm02_drei_fuellungen',
        treatmentId: 'fuellung',
        mode: 'multi',
        instances: [{ tooth: '16' }, { tooth: '26' }, { tooth: '36' }],
        dictation: 'Füllungen 16 o, 26 o, 36 mo alle Komposit',
        expected: {
            state: 'output',
        },
        category: 'multi',
    },
    {
        id: 'm03_endo_multi_scoped',
        treatmentId: 'endo',
        mode: 'multi',
        instances: [{ tooth: '36' }, { tooth: '46' }],
        dictation: 'WKB 36 3 Kanäle und WKB 46 4 Kanäle',
        expected: {
            state: 'output',
            scopedAskbacks: {
                '36': [],
                '46': [],
            },
        },
        category: 'multi',
    },
    {
        id: 'm04_mixed_profunda',
        treatmentId: 'fuellung',
        mode: 'multi',
        instances: [{ tooth: '36' }, { tooth: '46' }],
        dictation: 'Füllung 36 mo Caries profunda CP und Füllung 46 od nur media',
        expected: {
            state: 'output',
        },
        category: 'multi',
        description: 'One tooth has profunda, other does not',
    },
    {
        id: 'm05_multi_kofferdam_shared',
        treatmentId: 'fuellung',
        mode: 'multi',
        instances: [{ tooth: '36' }, { tooth: '37' }],
        dictation: 'Füllungen 36 mo und 37 mo unter einem Kofferdam',
        expected: {
            state: 'output',
            chipsInclude: ['kofferdam'],
        },
        category: 'multi',
        description: 'Shared Kofferdam for multiple teeth',
    },
    {
        id: 'm06_multi_la',
        treatmentId: 'fuellung',
        mode: 'multi',
        instances: [{ tooth: '36' }, { tooth: '37' }],
        dictation: 'Füllungen 36 und 37 nach Leitungsanästhesie links',
        expected: {
            state: 'output',
            chipsInclude: ['la_leitung'],
            billingInclude: ['BEMA_41a'],
        },
        category: 'multi',
    },
    {
        id: 'm07_different_surfaces',
        treatmentId: 'fuellung',
        mode: 'multi',
        instances: [{ tooth: '36' }, { tooth: '46' }],
        dictation: 'Füllung 36 mod und 46 o Komposit',
        expected: {
            state: 'output',
        },
        category: 'multi',
    },
    {
        id: 'm08_endo_wl_per_tooth',
        treatmentId: 'endo',
        mode: 'multi',
        instances: [{ tooth: '36' }, { tooth: '46' }],
        dictation: 'WKB 36 WL elektrisch und WKB 46 WL Röntgen',
        expected: {
            state: 'output',
        },
        category: 'multi',
        description: 'Different WL methods per tooth',
    },
    {
        id: 'm09_quadrant_fuellungen',
        treatmentId: 'fuellung',
        mode: 'multi',
        instances: [{ tooth: '34' }, { tooth: '35' }, { tooth: '36' }, { tooth: '37' }],
        dictation: 'Quadrant 3 komplett saniert 34 35 36 37 alle Komposit',
        expected: {
            state: 'output',
        },
        category: 'multi',
    },
    {
        id: 'm10_endo_bilateral',
        treatmentId: 'endo',
        mode: 'multi',
        instances: [{ tooth: '36' }, { tooth: '46' }],
        dictation: 'WKB beidseits 36 links und 46 rechts je 3 Kanäle',
        expected: {
            state: 'output',
        },
        category: 'multi',
    },
];

// ═══════════════════════════════════════════════════════════════
// ALL TRUTHCASES
// ═══════════════════════════════════════════════════════════════

export const ALL_CLINICAL_TRUTHCASES_V2: ClinicalTruthcaseV2[] = [
    ...FUELLUNG_TRUTHCASES,
    ...ENDO_TRUTHCASES,
    ...MULTI_TRUTHCASES,
];

// ═══════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════

export const TRUTHCASE_STATS = {
    total: ALL_CLINICAL_TRUTHCASES_V2.length,
    fuellung: FUELLUNG_TRUTHCASES.length,
    endo: ENDO_TRUTHCASES.length,
    multi: MULTI_TRUTHCASES.length,
    byCategory: (() => {
        const counts: Record<string, number> = {};
        for (const tc of ALL_CLINICAL_TRUTHCASES_V2) {
            const cat = tc.category || 'uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        }
        return counts;
    })(),
};
