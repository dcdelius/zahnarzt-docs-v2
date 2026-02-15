import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const crownPrepScenarios: ClinicalScenario[] = [
    {
        id: 'C_01-crown-prep-basic',
        description: 'Kronenpräparation',
        treatmentId: 'crown_prep',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Zahn 11 Kronenpräparation',
    },
    {
        id: 'C_02-crown-prep-full',
        description: 'Kronenpräparation mit Abformung und Provisorium',
        treatmentId: 'crown_prep',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Zahn 21 Kronenpräparation, Abformung und Provisorium eingesetzt',
    },
];
