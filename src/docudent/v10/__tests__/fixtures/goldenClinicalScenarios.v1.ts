/**
 * M14: Golden Clinical Scenarios v1
 *
 * Realistic dictations for testing the engine's medical logic.
 * Each scenario defines expected askbacks, chips, and billing.
 *
 * Categories:
 * - P: Profunda/deep caries (triggers ueberkappung askback)
 * - B: Bleeding mentions (triggers hemostasis askback)
 * - S: Sensitivity mentions (triggers sensitivity askback)
 * - M: Multi-tooth scenarios
 * - T: Typos/synonyms
 * - N: Normal cavity (no special askbacks expected)
 * - E: Endo scenarios
 */

import type { ClinicalScenario } from '../../qa/runClinicalSuite';

// ═══════════════════════════════════════════════════════════════
// PROFUNDA / DEEP CARIES SCENARIOS
// ═══════════════════════════════════════════════════════════════

const profundaScenarios: ClinicalScenario[] = [
    {
        id: 'P01-profunda-triggers-ueberkappung',
        description: 'Deep caries (profunda) triggers ueberkappung askback',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies profunda, Kompositfüllung',
        expectedAskbacks: ['ueberkappung'],
    },
    {
        id: 'P02-profunda-ueberkappung-yes-gkv',
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
        id: 'P03-profunda-ueberkappung-no',
        description: 'Deep caries + no capping = cp_not_required (text only)',
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
    {
        id: 'P04-profunda-ueberkappung-yes-pkv',
        description: 'Deep caries + capping yes (PKV) = cp chip + GOZ billing',
        treatmentId: 'fuellung',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 tiefe Karies, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
            'medical_ueberkappung': 'indirekt',
        },
        expectedChips: ['cp'],
    },
    {
        id: 'P05-pulpannah-triggers-ueberkappung',
        description: 'Pulpennah (synonym for deep) triggers ueberkappung',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 26 DO Karies pulpennah, Kavität Klasse II',
        expectedAskbacks: ['ueberkappung'],
    },
];

// ═══════════════════════════════════════════════════════════════
// BLEEDING / HEMOSTASIS SCENARIOS
// ═══════════════════════════════════════════════════════════════

const bleedingScenarios: ClinicalScenario[] = [
    {
        id: 'B01-bleeding-triggers-hemostasis',
        description: 'Bleeding mention triggers hemostasis askback',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies, Kavität blutet stark, Kompositfüllung',
        expectedAskbacks: ['blutung'],
    },
    {
        id: 'B02-blutend-synonym',
        description: 'Blutend (adjective) triggers hemostasis',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 blutende Kavität, Füllung gelegt',
        expectedAskbacks: ['blutung'],
    },
    {
        id: 'B03-bleeding-with-hemostasis-answer',
        description: 'Bleeding + hemostasis answer = appropriate chip',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies profunda, starke Blutung',
        answers: {
            'medical_vipr': 'positiv',
            'medical_blutung': 'ja',
            'medical_ueberkappung': 'nein',
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// SENSITIVITY SCENARIOS
// ═══════════════════════════════════════════════════════════════

const sensitivityScenarios: ClinicalScenario[] = [
    {
        id: 'S01-sensitivity-mention',
        description: 'Überempfindlich triggers sensitivity askback',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 überempfindlich auf Kälte, Karies',
        expectedAskbacks: ['vipr'],
    },
    {
        id: 'S02-vipr-positiv',
        description: 'ViPr positiv documented',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies, positiver Vitalitätstest',
        answers: {
            'medical_vipr': 'positiv',
        },
        expectedChips: ['vipr_pos'],
    },
    {
        id: 'S03-vipr-negativ',
        description: 'ViPr negativ documented',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Karies, negativer Vitalitätstest',
        answers: {
            'medical_vipr': 'negativ',
        },
        expectedChips: ['vipr_neg'],
    },
];

// ═══════════════════════════════════════════════════════════════
// MULTI-TOOTH SCENARIOS
// ═══════════════════════════════════════════════════════════════

const multiToothScenarios: ClinicalScenario[] = [
    {
        id: 'M01-two-teeth-same-depth',
        description: 'Two teeth with same treatment',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 und 26 MOD Karies, Kompositfüllungen',
        teeth: ['16', '26'],
    },
    {
        id: 'M02-one-profunda-one-normal',
        description: 'One deep, one normal = scoped ueberkappung question',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 tiefe Karies profunda, Zahn 26 normale Karies',
        teeth: ['16', '26'],
        // Expect ueberkappung scoped to tooth 16 only
    },
    {
        id: 'M03-three-teeth-all-normal',
        description: 'Three teeth all normal - no special askbacks',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zähne 16, 26, 36 Karies media, Kompositfüllungen',
        teeth: ['16', '26', '36'],
    },
    {
        id: 'M04-multi-tooth-with-answers',
        description: 'Multi-tooth with scoped answers',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 und 36 MOD Karies',
        teeth: ['16', '36'],
        answers: {
            'medical_vipr::tooth:16': 'positiv',
            'medical_vipr::tooth:36': 'positiv',
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// TYPO / SYNONYM SCENARIOS
// ═══════════════════════════════════════════════════════════════

const typoScenarios: ClinicalScenario[] = [
    {
        id: 'T01-sehr-tief',
        description: '"Sehr tief" triggers deep caries logic',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 sehr tiefe Karies, Kompositfüllung',
        expectedAskbacks: ['ueberkappung'],
    },
    {
        id: 'T02-pulpannah',
        description: 'Pulpannah variant spelling',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Karies pulpannah, fast am Nerv',
        expectedAskbacks: ['ueberkappung'],
    },
    {
        id: 'T03-blutend',
        description: 'blutend adjective form',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 26 blutend, Kavität Klasse II',
        expectedAskbacks: ['blutung'],
    },
    {
        id: 'T04-ueberempfindlich',
        description: 'überempfindlich variant',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Patient berichtet über Überempfindlichkeit',
    },
    {
        id: 'T05-composit-spelling',
        description: 'composit vs komposit spelling',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies, Compositfüllung gelegt',
        answers: {
            'medical_vipr': 'positiv',
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// NORMAL CAVITY SCENARIOS (NO SPECIAL ASKBACKS)
// ═══════════════════════════════════════════════════════════════

const normalScenarios: ClinicalScenario[] = [
    {
        id: 'N01-simple-filling',
        description: 'Simple filling, no deep caries = no ueberkappung',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
        },
        // Should NOT have ueberkappung askback for non-deep caries
    },
    {
        id: 'N02-media-caries',
        description: 'Caries media = no deep caries triggers',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 26 Karies media, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
        },
    },
    {
        id: 'N03-superficial-caries',
        description: 'Oberflächliche Karies = definitely no deep caries',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 oberflächliche Karies, einfache Füllung',
        answers: {
            'medical_vipr': 'positiv',
        },
    },
];

// ═══════════════════════════════════════════════════════════════
// ENDO SCENARIOS
// ═══════════════════════════════════════════════════════════════

const endoScenarios: ClinicalScenario[] = [
    {
        id: 'E01-simple-endo',
        description: 'Simple root canal',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Wurzelbehandlung durchgeführt',
    },
    {
        id: 'E02-endo-with-canals',
        description: 'Endo with canal count',
        treatmentId: 'endo',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Wurzelkanalbehandlung, 3 Kanäle aufbereitet',
    },
];

// ═══════════════════════════════════════════════════════════════
// ANESTHESIA SCENARIOS (M15)
// ═══════════════════════════════════════════════════════════════

const anesthesiaScenarios: ClinicalScenario[] = [
    {
        id: 'A01-infiltration-explicit',
        description: 'Explicit infiltration anesthesia mentioned',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Infiltrationsanästhesie, MOD Karies, Kompositfüllung',
        expectedTextPresent: ['Anästhesie'],
    },
    {
        id: 'A02-leitung-explicit',
        description: 'Explicit Leitungsanästhesie mentioned',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Leitungsanästhesie n. mandibularis, MOD Karies',
        expectedAskbacks: ['anesthesia'],
    },
    {
        id: 'A03-spritze-vague',
        description: 'Vague "Spritze" without type - should require confirmation',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Spritze gegeben, Kompositfüllung',
        // Should trigger type askback or not generate billing without confirmation
    },
    {
        id: 'A04-no-anesthesia-mentioned',
        description: 'No anesthesia mentioned - should NOT trigger askback',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
        },
        // Should NOT have anesthesia-related output
    },
    {
        id: 'A05-betaubung-synonym',
        description: 'Betäubung synonym detected',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 26 Betäubung, Kavität Klasse II, Kompositfüllung',
    },
];

// ═══════════════════════════════════════════════════════════════
// ISOLATION SCENARIOS (M15)
// ═══════════════════════════════════════════════════════════════

const isolationScenarios: ClinicalScenario[] = [
    {
        id: 'I01-kofferdam-absolute',
        description: 'Kofferdam (absolute isolation) mentioned',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 unter Kofferdam, MOD Kompositfüllung',
        expectedTextPresent: ['Kofferdam'],
    },
    {
        id: 'I02-spanngummi-synonym',
        description: 'Spanngummi synonym for kofferdam',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 unter Spanngummi, Kompositfüllung',
        expectedTextPresent: ['Kofferdam'],
    },
    {
        id: 'I03-watterollen-relative',
        description: 'Watterollen (relative isolation) mentioned',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 36 Trockenlegung mit Watterollen, Füllung',
    },
    {
        id: 'I04-no-isolation-mentioned',
        description: 'No isolation mentioned - should not add isolation text',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 MOD Karies, Kompositfüllung',
        answers: {
            'medical_vipr': 'positiv',
        },
        expectedTextAbsent: ['Kofferdam', 'Spanngummi'],
    },
];

// ═══════════════════════════════════════════════════════════════
// FALSE POSITIVE PREVENTION SCENARIOS (M15)
// ═══════════════════════════════════════════════════════════════

const falsePositiveScenarios: ClinicalScenario[] = [
    {
        id: 'F01-vague-tief-not-profunda',
        description: 'Just "tief" without profunda context - should not trigger capping',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Kavität, sehr tiefe Füllung notwendig',
        // "tief" alone shouldn't trigger ueberkappung without caries context
    },
    {
        id: 'F02-nervnah-red-herring',
        description: 'Patient mentions "sensitive teeth" without clinical finding',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Patient berichtet über empfindliche Zähne allgemein, Zahn 16 Karies media',
        answers: {
            'medical_vipr': 'positiv',
        },
        // Should not trigger capping for general sensitivity complaint
    },
    {
        id: 'F03-blut-in-name-not-bleeding',
        description: 'Word containing "blut" but not bleeding mention',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 Füllung, Patient nimmt Blutdruckmedikamente',
        // Blutdruck should NOT trigger hemostasis askback
    },
    {
        id: 'F04-inferred-anesthesia-no-billing',
        description: 'Anesthesia inferred but not confirmed - no billing',
        treatmentId: 'fuellung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 16 schmerzfrei behandelt',
        // "schmerzfrei" hints at anesthesia but is not confirmation
    },
];

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL SCENARIOS
// ═══════════════════════════════════════════════════════════════

export const goldenClinicalScenariosV1: ClinicalScenario[] = [
    ...profundaScenarios,
    ...bleedingScenarios,
    ...sensitivityScenarios,
    ...multiToothScenarios,
    ...typoScenarios,
    ...normalScenarios,
    ...endoScenarios,
    ...anesthesiaScenarios,
    ...isolationScenarios,
    ...falsePositiveScenarios,
];

/**
 * Get scenarios by category prefix.
 */
export function getScenariosByCategory(prefix: string): ClinicalScenario[] {
    return goldenClinicalScenariosV1.filter(s => s.id.startsWith(prefix));
}

/**
 * Get a single scenario by ID.
 */
export function getScenarioById(id: string): ClinicalScenario | undefined {
    return goldenClinicalScenariosV1.find(s => s.id === id);
}
