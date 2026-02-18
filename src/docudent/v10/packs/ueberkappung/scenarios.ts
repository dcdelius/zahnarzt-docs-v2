import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const ueberkappungScenarios: ClinicalScenario[] = [
    {
        id: 'UK_01-indirekt-gkv',
        description: 'Indirekte Ueberkappung GKV',
        treatmentId: 'ueberkappung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Indirekte Ueberkappung Zahn 26 mit CaOH2 bei pulpanaher Karies.',
        expectedChips: ['ueberkappung_indirekt'],
        expectedBillingPresent: ['BEMA_25'],
    },
    {
        id: 'UK_02-direkt-pkv',
        description: 'Direkte Ueberkappung PKV',
        treatmentId: 'ueberkappung',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Direkte Ueberkappung mit MTA bei Pulpaeroeffnung Zahn 36.',
        expectedChips: ['ueberkappung_direkt'],
        expectedBillingPresent: ['GOZ_2340'],
    },
];
