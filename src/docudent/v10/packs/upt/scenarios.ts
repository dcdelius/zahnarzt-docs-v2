import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const uptScenarios: ClinicalScenario[] = [
    {
        id: 'UPT_01-gkv-grad-b',
        description: 'GKV UPT Grad B',
        treatmentId: 'upt',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'UPT Grad B an Zahn 36 durchgefuehrt.',
        expectedChips: ['upt_grad_b'],
        expectedBillingPresent: ['BEMA_UPTb'],
    },
    {
        id: 'UPT_02-gkv-grad-c',
        description: 'GKV UPT Grad C',
        treatmentId: 'upt',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Unterstuetzende Parodontitistherapie Grad C an Zahn 37.',
        expectedChips: ['upt_grad_c'],
        expectedBillingPresent: ['BEMA_UPTc'],
    },
];
