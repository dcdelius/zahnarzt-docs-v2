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
    {
        id: 'X_03-extraction-with-kofferdam',
        description: 'Extraktion mit Kofferdam dokumentiert',
        treatmentId: 'extraction',
        insuranceType: 'GKV',
        textLength: 'kurz',
        dictation: 'Extraktion Zahn 46 unter Kofferdam, Blutstillung, Wundversorgung.',
    },
    {
        id: 'X_04-extraction-pkv',
        description: 'PKV Extraktion mit Leitungsanästhesie',
        treatmentId: 'extraction',
        insuranceType: 'PKV',
        textLength: 'lang',
        dictation: 'PKV Patient, Zahn 48 extrahiert, Leitungsanästhesie, Wundversorgung, postoperativ instruiert.',
    },
    {
        id: 'X_05-extraction-followup',
        description: 'Extraktion mit Nachsorgehinweis',
        treatmentId: 'extraction',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Extraktion Zahn 18, Infiltration, Wundversorgung durchgeführt, Verlaufskontrolle empfohlen.',
    },
];
