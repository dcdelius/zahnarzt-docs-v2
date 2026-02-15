/**
 * Golden Medical Cases v1
 *
 * 20 test cases covering medical layer scenarios:
 * - Deep filling (profunda) with various synonyms
 * - Bleeding/hemostasis
 * - Sensitivity
 * - Multi-tooth scoping
 * - Mixed treatments
 * - Insurance variants
 */

import type { TreatmentFacts } from '../../medical/types';

export interface GoldenMedicalCase {
    id: string;
    description: string;
    input: {
        dictation: string;
        treatmentId: 'fuellung' | 'endo';
        insuranceType: 'GKV' | 'PKV' | 'MKV';
        textLength: 'kurz' | 'mittel' | 'lang';
        /** Pre-filled answers for follow-up assertions */
        answers?: Record<string, unknown>;
        /** For multi-tooth: list of teeth to process */
        teeth?: string[];
    };
    expect: {
        /** Partial facts to assert */
        facts?: Partial<TreatmentFacts>;
        /** Required askback IDs (may be scoped with ::tooth:XX) */
        askbacks?: string[];
        /** Chips that should be emitted */
        chips?: string[];
        /** Billing codes that must appear */
        billingMustContain?: string[];
        /** Billing codes that must NOT appear */
        billingMustNotContain?: string[];
        /** Text patterns that must match (regex) */
        textMustMatch?: RegExp[];
    };
}

export const GOLDEN_MEDICAL_CASES: GoldenMedicalCase[] = [
    // ═══════════════════════════════════════════════════════════════
    // DEEP FILLING — BASIC SCENARIOS (1-5)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'profunda-requires-ueberkappung',
        description: 'Deep filling with profunda diagnosis requires Überkappung askback',
        input: {
            dictation: 'Zahn 16 MOD-Füllung bei Caries profunda. Anästhesie, Kofferdam.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { cariesDepth: 'profunda' },
            askbacks: ['medical_ueberkappung'],
        },
    },
    {
        id: 'profunda-yes-emits-cp',
        description: 'Deep filling with capping YES emits cp chip and BEMA_25',
        input: {
            dictation: 'Zahn 16 MOD-Füllung bei Caries profunda.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
            answers: { medical_ueberkappung: 'yes', medical_ueberkappung_material: 'Ca(OH)₂' },
        },
        expect: {
            chips: ['cp'],
            billingMustContain: ['BEMA_25'],
        },
    },
    {
        id: 'profunda-no-emits-cp-not-required',
        description: 'Deep filling with capping NO emits cp_not_required (text only)',
        input: {
            dictation: 'Zahn 36 OD-Füllung bei Caries profunda.',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'kurz',
            answers: { medical_ueberkappung: 'no' },
        },
        expect: {
            chips: ['cp_not_required'],
            billingMustNotContain: ['BEMA_25', 'GOZ_2330'],
        },
    },
    {
        id: 'multitooth-scoped-askback',
        description: 'Multi-tooth: profunda on 16, normal on 17 → scoped askback only for 16',
        input: {
            dictation: 'Zahn 16 tiefe Karies, Zahn 17 Karies media. Beide Füllungen.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            teeth: ['16', '17'],
        },
        expect: {
            askbacks: ['medical_ueberkappung::tooth:16'],
        },
    },
    {
        id: 'mixed-treatments-ordering',
        description: 'Mixed Füllung + Endo: each has its own askbacks, no cross-contamination',
        input: {
            dictation: 'Zahn 16 Füllung Caries profunda. Zahn 36 Endo Trepanation.',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            teeth: ['16'],
        },
        expect: {
            askbacks: ['medical_ueberkappung::tooth:16'],
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // BLEEDING / HEMOSTASIS (6-7)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'bleeding-heavy-requires-hemostasis',
        description: 'Heavy bleeding requires hemostasis askback',
        input: {
            dictation: 'Zahn 26 Füllung. Starke Blutung bei Exkavation.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { bleeding: { detected: 'yes', heavy: true } },
            askbacks: ['medical_hemostasis'],
        },
    },
    {
        id: 'bleeding-mild-with-hemostasis',
        description: 'Mild bleeding with hemostasis mentioned',
        input: {
            dictation: 'Zahn 46 Füllung. Leichte Blutung, Blutstillung mit AlCl3.',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { bleeding: { detected: 'yes', hemostasisPerformed: 'yes' } },
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // SENSITIVITY (8-9)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'sensitivity-high-requires-followup',
        description: 'High sensitivity requires followup askback',
        input: {
            dictation: 'Zahn 16 Füllung. Patient sehr empfindlich auf Kälte.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { sensitivity: { reported: 'yes', level: 'high' } },
            askbacks: ['medical_sensitivity_followup'],
        },
    },
    {
        id: 'sensitivity-with-desensitizer',
        description: 'Sensitivity treated with Duraphat',
        input: {
            dictation: 'Zahn 36 überempfindlich. Duraphat aufgetragen.',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { sensitivity: { reported: 'yes', desensitizerApplied: 'yes' } },
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // NO TRIGGER BASELINE (10)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'no-trigger-normal-caries',
        description: 'Normal caries depth → no medical askbacks',
        input: {
            dictation: 'Zahn 16 okklusal Füllung bei Karies media.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { cariesDepth: 'normal' },
            askbacks: [],
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // SYNONYMS & TYPOS (11-12)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'synonym-sehr-tief',
        description: 'Synonym "sehr tief" triggers profunda',
        input: {
            dictation: 'Zahn 16 MOD-Füllung. Kavität sehr tief.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { cariesDepth: 'profunda' },
            askbacks: ['medical_ueberkappung'],
        },
    },
    {
        id: 'typo-pulpannah',
        description: 'Common typo "pulpannah" still triggers profunda',
        input: {
            dictation: 'Zahn 36 Füllung. Pulpannah exkaviert.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { cariesDepth: 'pulp_near' },
            askbacks: ['medical_ueberkappung'],
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // MKV & TEXT LENGTHS (13-15)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'mkv-profunda',
        description: 'MKV insurance with profunda',
        input: {
            dictation: 'Zahn 26 MOD bei Caries profunda.',
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { cariesDepth: 'profunda' },
            askbacks: ['medical_ueberkappung'],
        },
    },
    {
        id: 'text-kurz-profunda',
        description: 'Short text with profunda',
        input: {
            dictation: '16 MOD profunda.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { cariesDepth: 'profunda' },
            askbacks: ['medical_ueberkappung'],
        },
    },
    {
        id: 'text-lang-profunda',
        description: 'Long text with profunda buried in context',
        input: {
            dictation: 'Patient kommt zur Behandlung einer kariösen Läsion am Zahn 16. Nach Inspektion und Sondierung zeigt sich eine Caries profunda distal mit Verdacht auf Pulpabeteiligung. Anästhesie Infiltration. Kofferdam angelegt. Exkavation vorsichtig durchgeführt.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'lang',
        },
        expect: {
            facts: { cariesDepth: 'profunda' },
            askbacks: ['medical_ueberkappung'],
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // NASTY DICTATIONS (16-17)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'nasty-dictation-1',
        description: 'Messy real-world dictation with abbreviations and typos',
        input: {
            dictation: 'z16 mod füllung profunda tieff exkav cp mit caoh ähhm anästh la kofferdam',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
        },
        expect: {
            facts: { cariesDepth: 'profunda' },
            askbacks: ['medical_ueberkappung'],
        },
    },
    {
        id: 'nasty-dictation-2',
        description: 'Mixed language and incomplete sentences',
        input: {
            dictation: 'Zahn 36, deep caries near pulp. Überkappung ja mit MTA. Starke Blutung gestillt.',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
        },
        expect: {
            facts: {
                cariesDepth: 'profunda', // 'deep' triggers profunda
                bleeding: { detected: 'yes' },
            },
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLEX SCENARIOS (18-20)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'multitooth-three-teeth',
        description: 'Three teeth with mixed depths',
        input: {
            dictation: 'Zahn 16 profunda, Zahn 26 media, Zahn 36 pulpanah. Alle Füllungen.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            teeth: ['16', '26', '36'],
        },
        expect: {
            askbacks: ['medical_ueberkappung::tooth:16', 'medical_ueberkappung::tooth:36'],
        },
    },
    {
        id: 'pkv-profunda-yes-goz',
        description: 'PKV with profunda and capping yes → GOZ_2330',
        input: {
            dictation: 'Zahn 16 MOD-Füllung Caries profunda.',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'kurz',
            answers: { medical_ueberkappung: 'yes', medical_ueberkappung_material: 'MTA' },
        },
        expect: {
            chips: ['cp'],
            billingMustContain: ['GOZ_2330'],
        },
    },
    {
        id: 'profunda-plus-bleeding-combo',
        description: 'Profunda with bleeding → two askbacks',
        input: {
            dictation: 'Zahn 16 tiefe Füllung mit starker Blutung bei Exkavation.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        },
        expect: {
            facts: {
                cariesDepth: 'profunda',
                bleeding: { detected: 'yes', heavy: true },
            },
            askbacks: ['medical_ueberkappung', 'medical_hemostasis'],
        },
    },
];

// Helper: Get case by ID
export function getGoldenCase(id: string): GoldenMedicalCase | undefined {
    return GOLDEN_MEDICAL_CASES.find(c => c.id === id);
}

// Helper: Get all case IDs
export function getAllGoldenCaseIds(): string[] {
    return GOLDEN_MEDICAL_CASES.map(c => c.id);
}
