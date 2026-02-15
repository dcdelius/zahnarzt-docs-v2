import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const extractionScenarios: ClinicalScenario[] = [
    {
        id: 'X_01-extraction-basic',
        description: 'Einfache Extraktion',
        treatmentId: 'extraction',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 38 einfache Extraktion durchgeführt',
    },
    {
        id: 'X_02-extraction-with-la',
        description: 'Extraktion mit Anästhesie und Wundversorgung',
        treatmentId: 'extraction',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Zahn 28 Extraktion, Infiltrationsanästhesie, Wundversorgung und Naht',
    },
];
