import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const pzrScenarios: ClinicalScenario[] = [
    {
        id: 'P_01-pzr-basic',
        description: 'PZR vollständig',
        treatmentId: 'pzr',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'PZR vollständig durchgeführt, Zahnstein und Beläge entfernt, poliert',
    },
    {
        id: 'P_02-pzr-with-fluoride',
        description: 'PZR mit Fluoridierung',
        treatmentId: 'pzr',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Professionelle Zahnreinigung mit Fluoridierung',
    },
];
