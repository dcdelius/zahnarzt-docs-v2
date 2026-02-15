/**
 * Fuellung clinical scenarios.
 */

import type { ClinicalScenario } from '../../qa/runClinicalSuite';

/**
 * Golden clinical scenarios for fuellung.
 * Extracted from goldenClinicalScenarios.v1.ts (fuellung-specific).
 */
export const fuellungScenarios: ClinicalScenario[] = [
    // Profunda / Deep caries
    {
        id: 'F_P01-profunda-triggers-ueberkappung',
        description: 'Deep caries (profunda) triggers ueberkappung askback',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies profunda, Kompositfüllung',
        expectedAskbacks: ['ueberkappung'],
    },
    {
        id: 'F_P02-profunda-ueberkappung-yes-gkv',
        description: 'Deep caries + capping yes = cp chip + billing',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies profunda, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
            'medical_ueberkappung': 'indirekt',
        },
        expectedChips: ['cp'],
        expectedBillingPresent: ['Cp'],
    },
    {
        id: 'F_P03-profunda-ueberkappung-no',
        description: 'Deep caries + no capping = cp_not_required',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies profunda, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
            'medical_ueberkappung': 'nein',
        },
        expectedChips: ['cp_not_required'],
        expectedBillingAbsent: ['Cp'],
    },

    // Normal scenarios
    {
        id: 'F_N01-simple-filling',
        description: 'Simple filling, no deep caries',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
        },
    },
    {
        id: 'F_N02-media-caries',
        description: 'Caries media = no deep caries triggers',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 26 Karies media, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
        },
    },

    // Multi-tooth
    {
        id: 'F_M01-two-teeth-same-depth',
        description: 'Two teeth with same treatment',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 und 26 MOD Karies, Kompositfüllungen',
        teeth: ['16', '26'],
    },

    // Isolation
    {
        id: 'F_I01-kofferdam-absolute',
        description: 'Kofferdam (absolute isolation) mentioned',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 unter Kofferdam, MOD Kompositfüllung',
        expectedTextPresent: ['Kofferdam'],
    },

    // Anesthesia
    {
        id: 'F_A01-infiltration-explicit',
        description: 'Explicit infiltration anesthesia mentioned',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Infiltrationsanästhesie, MOD Karies, Kompositfüllung',
        expectedTextPresent: ['Anästhesie'],
    },

    // ═══════════════════════════════════════════════════════════════
    // M24: SCENARIOS FOR ALLOWLIST ELIMINATION (6 remaining chips)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'F_M24_01-la-leitung',
        description: 'Leitungsanästhesie chip emission',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 46 Karies. Leitungsanästhesie N. alv. inf. durchgeführt. MO Kompositfüllung.',
        teeth: ['46'],
    },
    {
        id: 'F_M24_02-la-infiltr',
        description: 'Infiltrationsanästhesie chip emission',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Karies. Infiltrationsanästhesie. MOD Kompositfüllung.',
        teeth: ['16'],
    },
    {
        id: 'F_M24_03-oberflaeche-la',
        description: 'Oberflächenanästhesie chip emission (PKV)',
        treatmentId: 'fuellung',
        insuranceType: 'PKV',
        textLength: 'lang',
        dictation: 'Zahn 24 Karies. Oberflächenanästhesie mit Lidocain-Spray vor Injektion. Infiltration. DO Kompositfüllung.',
        teeth: ['24'],
    },
    {
        id: 'F_M24_04-kofferdam',
        description: 'Kofferdam (absolute isolation) chip emission',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Karies profunda. Kofferdam angelegt für absolute Trockenlegung. MOD Kompositfüllung.',
        teeth: ['36'],
    },
    {
        id: 'F_M24_05-p-direct-capping',
        description: 'P (direkte Überkappung) bei Pulpaeröffnung',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'lang',
        dictation: 'Zahn 36 Karies profunda. Bei Exkavation punktförmige Pulpaeröffnung. Blutstillung mit NaOCl. Direkte Überkappung mit MTA. Kompositfüllung.',
        teeth: ['36'],
        answers: {
            'medical_vipr': 'positiv',
            'medical_ueberkappung': 'direkt',
        },
    },
    {
        id: 'F_M24_06-fluor',
        description: 'Fluoridierung chip emission',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Karies. MO Kompositfüllung. Abschließende Fluoridierung mit Duraphat-Lack.',
        teeth: ['16'],
    },
];
