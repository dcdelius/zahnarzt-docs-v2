import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const teilkroneScenarios: ClinicalScenario[] = [
    {
        id: 'TK_01-gkv-teilkrone',
        description: 'GKV Teilkrone definitiv',
        treatmentId: 'teilkrone',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Teilkronenversorgung an Zahn 16 definitiv eingegliedert.',
        expectedChips: ['teilkrone_definitiv'],
        expectedBillingPresent: ['BEMA_20c'],
    },
    {
        id: 'TK_02-pkv-provisorium',
        description: 'PKV provisorische Teilkrone',
        treatmentId: 'teilkrone',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Provisorische Teilkrone an Zahn 26 eingesetzt.',
        expectedChips: ['teilkrone_provisorium'],
        expectedBillingPresent: ['GOZ_2260'],
    },
];
