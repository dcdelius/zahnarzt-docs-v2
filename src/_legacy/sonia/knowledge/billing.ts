import { BillingItem } from './types';

export const BILLING_CATALOG: BillingItem[] = [
    // --- CONSERVATIVE ---
    {
        id: 'anesthesia_ila',
        domain: 'conservative',
        payer: 'BOTH',
        codes: { gkv: 'BEMA 40', pkv: 'GOZ 0090' },
        label: 'Infiltrationsanästhesie',
        priority: 100,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForILA' },
        requires: [
            { fieldId: 'anesthesia', message: 'Anästhesieart muss gewählt sein' }
        ],
        group: 'anesthesia_type'
    },
    {
        id: 'anesthesia_leit',
        domain: 'conservative',
        payer: 'BOTH',
        codes: { gkv: 'BEMA 41', pkv: 'GOZ 0100' },
        label: 'Leitungsanästhesie',
        priority: 100,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForLeit' },
        requires: [
            { fieldId: 'anesthesia', message: 'Anästhesieart muss gewählt sein' }
        ],
        group: 'anesthesia_type'
    },
    {
        id: 'bmf',
        domain: 'conservative',
        payer: 'BOTH',
        codes: { gkv: 'BEMA 12', pkv: 'GOZ 2030' },
        label: 'Besondere Maßnahmen (bMF)',
        priority: 80,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForBmf' },
        requires: [
            { fieldId: 'bmf', mustBeNonDefault: true, message: 'Grund für bMF angeben (z.B. Blutung)' }
        ]
    },
    {
        id: 'kofferdam',
        domain: 'conservative',
        payer: 'BOTH',
        codes: { gkv: 'BEMA 12', pkv: 'GOZ 2040' },
        label: 'Kofferdam',
        priority: 85,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForKofferdam' },
        requires: [
            { fieldId: 'isolation', mustBeNonDefault: true, mustBeTruthy: true, message: 'Kofferdam bestätigen' }
        ]
    },
    {
        id: 'conditioning',
        domain: 'conservative',
        payer: 'PKV', // GOZ only
        codes: { pkv: 'GOZ 2197' },
        label: 'Adhäsive Befestigung',
        priority: 90,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForConditioning' },
        requires: [
            { fieldId: 'conditioning', mustBeTruthy: true, message: 'Konditionierung/Bonding bestätigen' }
        ]
    },
    {
        id: 'layering',
        domain: 'conservative',
        payer: 'PKV',
        codes: { pkv: 'GOZ 2060' },
        label: 'Schichttechnik',
        priority: 88,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForLayering' },
        requires: [
            { fieldId: 'technique', mustBeNonDefault: true, mustBeTruthy: true, message: 'Schichttechnik bestätigen' }
        ]
    },
    {
        id: 'cp',
        domain: 'conservative',
        payer: 'BOTH',
        codes: { gkv: 'BEMA 25', pkv: 'GOZ 2330' },
        label: 'Indirekte Überkappung (Cp)',
        priority: 70,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForCp' },
        requires: [
            { fieldId: 'pulp_capping', message: 'Überkappung bestätigen' }
        ],
        group: 'pulp_protection'
    },
    {
        id: 'p',
        domain: 'conservative',
        payer: 'BOTH',
        codes: { gkv: 'BEMA 26', pkv: 'GOZ 2340' },
        label: 'Direkte Überkappung (P)',
        priority: 70,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForP' },
        requires: [
            { fieldId: 'pulp_capping', message: 'Überkappung bestätigen' }
        ],
        group: 'pulp_protection'
    },
    {
        id: 'fluoridation',
        domain: 'conservative',
        payer: 'BOTH',
        codes: { gkv: 'BEMA IP4', pkv: 'GOZ 1020' },
        label: 'Fluoridierung',
        priority: 60,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForFluoridation' },
        requires: [
            { fieldId: 'fluoridation', mustBeTruthy: true, message: 'Fluoridierung bestätigen' }
        ]
    },
    {
        id: 'xray',
        domain: 'conservative',
        payer: 'BOTH',
        codes: { gkv: 'BEMA Ä925a', pkv: 'GOZ 5000' },
        label: 'Röntgen',
        priority: 50,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForXray' },
        requires: [
            { fieldId: 'xray', mustBeTruthy: true, message: 'Röntgenaufnahme bestätigen' }
        ]
    },
    {
        id: 'bite_registration',
        domain: 'conservative',
        payer: 'PKV',
        codes: { pkv: 'GOZ 8000' },
        label: 'Klinische Funktionsanalyse',
        priority: 40,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForBiteRegistration' },
        requires: [
            { fieldId: 'bite_registration', mustBeTruthy: true, message: 'Funktionsanalyse bestätigen' }
        ]
    },

    // --- ENDO ---
    {
        id: 'endo_mach_prep',
        domain: 'endo',
        payer: 'PKV',
        codes: { pkv: 'GOZ 2400' },
        label: 'Maschinelle Aufbereitung',
        priority: 90,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForMachinePrep' },
        requires: [
            { fieldId: 'machine_preparation', mustBeNonDefault: true, mustBeTruthy: true, message: 'Maschinelle Aufbereitung bestätigen' }
        ]
    },
    {
        id: 'endo_elect_len',
        domain: 'endo',
        payer: 'PKV',
        codes: { pkv: 'GOZ 2410' },
        label: 'Endometrie',
        priority: 90,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForLengthMeasurement' },
        requires: [
            { fieldId: 'length_measurement', mustBeNonDefault: true, mustBeTruthy: true, message: 'Endometrie bestätigen' }
        ]
    },

    // --- ANALOG ---
    {
        id: 'analog_matrix',
        domain: 'conservative',
        payer: 'PKV',
        codes: { pkv: 'GOZ 2030a' },
        label: 'Analog: Matrizensystem',
        priority: 30,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForMatrix' },
        requires: [
            { fieldId: 'matrix_system', mustBeNonDefault: true, mustBeTruthy: true, message: 'Matrizensystem angeben' }
        ]
    },
    {
        id: 'analog_detector',
        domain: 'conservative',
        payer: 'PKV',
        codes: { pkv: 'GOZ 2030a' },
        label: 'Analog: Kariesdetektor',
        priority: 30,
        eligibility: { mode: 'auto', predicateId: 'isEligibleForCariesDetector' },
        requires: [
            { fieldId: 'caries_detector', mustBeNonDefault: true, mustBeTruthy: true, message: 'Kariesdetektor bestätigen' }
        ]
    }
];
