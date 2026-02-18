import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const kroneScenarios: ClinicalScenario[] = [
    {
        id: 'KR_01-gkv-vollkrone',
        description: 'GKV Vollkrone',
        treatmentId: 'krone',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Vollkrone an Zahn 16 definitiv eingegliedert.',
        expectedChips: ['krone_vollkrone'],
        expectedBillingPresent: ['BEMA_20a'],
    },
    {
        id: 'KR_02-pkv-provisorium',
        description: 'PKV provisorische Krone',
        treatmentId: 'krone',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Provisorische Krone an Zahn 26 eingesetzt.',
        expectedChips: ['krone_provisorium'],
        expectedBillingPresent: ['GOZ_2270'],
    },
];
