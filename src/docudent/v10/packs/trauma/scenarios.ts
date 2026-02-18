import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const traumaScenarios: ClinicalScenario[] = [
    {
        id: 'TRAUMA_01-gkv-schienung',
        description: 'GKV Trauma mit semipermanenter Schienung',
        treatmentId: 'trauma',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahntrauma an Zahn 11 nach Luxation, semipermanente Schienung angelegt.',
        expectedChips: ['trauma_schienung_semipermanent'],
        expectedBillingPresent: ['BEMA_100'],
    },
    {
        id: 'TRAUMA_02-pkv-schienung',
        description: 'PKV Trauma mit semipermanenter Schienung',
        treatmentId: 'trauma',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Zahntrauma an Zahn 21 mit semipermanenter Schienung.',
        expectedChips: ['trauma_schienung_semipermanent'],
        expectedBillingPresent: ['GOZ_7070'],
    },
];
