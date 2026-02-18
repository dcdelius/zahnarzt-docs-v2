import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const parodontologieScenarios: ClinicalScenario[] = [
    {
        id: 'PAR_01-gkv-ait',
        description: 'GKV antiinfektioese Therapie',
        treatmentId: 'parodontologie',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Geschlossene antiinfektioese Parodontaltherapie an 36 und 37 durchgefuehrt.',
        expectedChips: ['parodontologie_ait'],
        expectedBillingPresent: ['BEMA_AIT'],
    },
    {
        id: 'PAR_02-pkv-status',
        description: 'PKV Parodontalstatus',
        treatmentId: 'parodontologie',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Parodontalstatus und parodontales Screening an Zahn 16 erhoben.',
        expectedChips: ['parodontologie_status'],
        expectedBillingPresent: ['GOZ_4000'],
    },
];
