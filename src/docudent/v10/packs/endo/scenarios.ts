/**
 * Endo clinical scenarios.
 */

import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const endoScenarios: ClinicalScenario[] = [
    // ═══════════════════════════════════════════════════════════════
    // BASIC SCENARIOS (existing)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'E_01-simple-endo',
        description: 'Simple root canal',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Wurzelbehandlung durchgeführt',
    },
    {
        id: 'E_02-endo-with-canals',
        description: 'Endo with canal count',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Wurzelkanalbehandlung, 3 Kanäle aufbereitet',
    },
    {
        id: 'E_03-endo-with-la',
        description: 'Endo with anesthesia',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 46 Leitungsanästhesie, Trepanation, Aufbereitung',
    },
    {
        id: 'E_04-endo-vipr-negativ',
        description: 'Endo with negative vitality',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 devital, negativer Vitalitätstest, Wurzelbehandlung',
        answers: {
            'medical_vipr': 'negativ',
        },
        expectedChips: ['vipr_neg'],
    },
    {
        id: 'E_05-endo-wf-kalt',
        description: 'Endo with cold lateral condensation',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Wurzelfüllung kaltlateral, Guttapercha',
    },
    {
        id: 'E_06-endo-pkv-full',
        description: 'Full PKV endo workflow',
        treatmentId: 'endo',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Zahn 46 Trepanation, elektronische Längenmessung, 4 Kanäle aufbereitet, Wurzelfüllung warm vertikal',
    },
    {
        id: 'E_07-endo-with-roentgen',
        description: 'Endo with X-ray control',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Wurzelbehandlung, Röntgenkontrolle',
    },
    {
        id: 'E_08-endo-med-einlage',
        description: 'Endo with medication',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 26 Aufbereitung, Ca(OH)2 Einlage, provisorischer Verschluss',
    },

    // ═══════════════════════════════════════════════════════════════
    // M21: EXTENDED SCENARIOS (comprehensive core flow)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'E_M21_01-full-core-endo-warm',
        description: 'Full core endo: trepanation + elek length + 4K + irrigation + CaOH2 + WF warm + Rö',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'lang',
        dictation: 'Zahn 46 Pulpitis irreversibilis. Leitungsanästhesie durchgeführt. Kofferdam angelegt. Trepanation der Pulpakammer. Elektrometrische Arbeitslängenmessung mit Apexlokator. 4 Kanäle maschinell aufbereitet (MB, ML, DB, P). Spülung mit NaOCl 3% und EDTA. Ca(OH)2 Einlage. Provisorischer Verschluss. In zweiter Sitzung: Wurzelfüllung in warmer vertikaler Kondensation. Röntgenkontrolle post WF.',
        teeth: ['46'],
    },
    {
        id: 'E_M21_02-full-core-endo-kalt',
        description: 'Full core endo: same but WF kaltlateral',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'lang',
        dictation: 'Zahn 36 Pulpanekrose. Kofferdam angelegt. Trepanation. Röntgen-Messaufnahme zur Arbeitslängenbestimmung. 3 Kanäle aufbereitet. Spülung NaOCl, EDTA. Wurzelfüllung in kaltlateraler Kondensation mit Guttapercha und Sealer. Röntgenkontrolle zeigt homogene Füllung bis Apex.',
        teeth: ['36'],
    },
    {
        id: 'E_M21_03-full-core-endo-einzel',
        description: 'Full core endo: WF Einzelstifttechnik',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'lang',
        dictation: 'Zahn 21 devital nach Trauma. Infiltrationsanästhesie. Kofferdam. Zugang zur Pulpakammer eröffnet. Elektronische Längenmessung. 1 Kanal aufbereitet. NaOCl Spülung. Wurzelfüllung Einzelstifttechnik mit passgenauem Mastercone. Röntgenkontrolle ok.',
        teeth: ['21'],
    },
    {
        id: 'E_M21_04-minimal-endo-no-wf',
        description: 'Minimal endo: trepanation + length + temp seal (no WF)',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 26 akute Pulpitis. Leitungsanästhesie. Trepanation. Röntgen Messaufnahme. 2 Kanäle aufbereitet. Spülung. Provisorischer Verschluss mit Cavit.',
        teeth: ['26'],
    },
    {
        id: 'E_M21_05-la-kofferdam-core',
        description: 'LA + Kofferdam + endo core',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 46 devital. Leitungsanästhesie N. alv. inf. Kofferdam angelegt. Trepanation. 3 Kanäle mit maschinellen Feilen aufbereitet. NaOCl Spülung. Ca(OH)2 Einlage. Provisorischer Verschluss.',
        teeth: ['46'],
    },
    {
        id: 'E_M21_06-pkv-premium-endo',
        description: 'PKV full premium endo with all extras',
        treatmentId: 'endo',
        insuranceType: 'PKV',
        textLength: 'lang',
        dictation: 'Zahn 36 apikale Parodontitis. Kofferdam angelegt. Trepanation und Darstellung von 3 Kanaleingängen. Elektronische Arbeitslängenmessung mittels Root ZX Apex-Lokator. Maschinelle Aufbereitung mit ProTaper Gold. Schallaktivierte Spülung mit NaOCl und EDTA. Ca(OH)2 Einlage für 14 Tage. Zweite Sitzung: Wurzelfüllung in warmer vertikaler Kondensation mit GuttaPercha und AH Plus Sealer. Röntgenkontrolle.',
        teeth: ['36'],
    },
    {
        id: 'E_M21_07-false-pos-prevention',
        description: 'Non-endo context with NaOCl should not emit endo (test for false positives)',
        treatmentId: 'endo', // Still endo treatment but minimal dictation
        insuranceType: 'GKV',
        textLength: 'kurz',
        dictation: 'Zahn 36 Kontrolluntersuchung nach Wurzelbehandlung',
        // No specific endo chips expected - just follow-up
    },
    {
        id: 'E_M21_08-askback-kanalanzahl',
        description: 'Canal count unknown triggers askback',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Wurzelbehandlung. Alle Kanäle aufbereitet. Wurzelfüllung.',
        // "Alle Kanäle" is ambiguous - should trigger askback
    },

    // ═══════════════════════════════════════════════════════════════
    // M23: SCENARIOS FOR ALLOWLIST ELIMINATION (6 remaining chips)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'E_M23_01-la-leitung',
        description: 'Leitungsanästhesie chip emission',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 46 Pulpitis. Leitungsanästhesie N. alv. inf. durchgeführt. Trepanation. 3 Kanäle aufbereitet.',
        teeth: ['46'],
    },
    {
        id: 'E_M23_02-la-infiltr',
        description: 'Infiltrationsanästhesie chip emission',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 21 Nekrose. Infiltrationsanästhesie. Trepanation. 1 Kanal aufbereitet.',
        teeth: ['21'],
    },
    {
        id: 'E_M23_03-wf-warm',
        description: 'Warm vertical condensation WF chip emission',
        treatmentId: 'endo',
        insuranceType: 'PKV',
        textLength: 'lang',
        dictation: 'Zahn 36. Wurzelfüllung in warmer vertikaler Kondensation. Thermoplastische Obturation mit Downpack/Backfill-Technik. Continuous Wave. 3 Kanäle gefüllt.',
        teeth: ['36'],
    },
    {
        id: 'E_M23_04-wf-einzel',
        description: 'Single-cone WF chip emission',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 11 Wurzelfüllung Einzelstifttechnik mit passgenauem Mastercone. Single-Cone in 1 Kanal.',
        teeth: ['11'],
    },
    {
        id: 'E_M23_05-roentgen-einzelzahn',
        description: 'Diagnostic single-tooth X-ray chip emission',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 46 Schmerzen. Röntgendiagnostik mittels Einzelzahnfilm. Befundbild zeigt apikale Aufhellung. Diagnose: apikale Parodontitis.',
        teeth: ['46'],
    },
    {
        id: 'E_M23_06-aufbau-postendo',
        description: 'Post-endo buildup chip emission',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 nach abgeschlossener Wurzelbehandlung. Definitiver adhäsiver Aufbau mit Komposit. Postendodontischer Aufbau zur Vorbereitung der Kronenversorgung.',
        teeth: ['36'],
    },
];
