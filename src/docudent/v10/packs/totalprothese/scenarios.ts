import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const totalprotheseScenarios: ClinicalScenario[] = [
    {
        id: 'TOTALPROTHESE_01-pkv-konventionell',
        description: 'PKV konventionelle Totalprothese',
        treatmentId: 'totalprothese',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Konventionelle Totalprothese im Oberkiefer eingegliedert und Sitz kontrolliert.',
        expectedChips: ['totalprothese_konventionell'],
        expectedBillingPresent: ['GOZ_5220'],
    },
    {
        id: 'TOTALPROTHESE_02-pkv-immediat',
        description: 'PKV Immediat-Totalprothese',
        treatmentId: 'totalprothese',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Immediat-Totalprothese eingegliedert, Druckstellen in Kontrolle dokumentiert.',
        expectedChips: ['totalprothese_immediat'],
        expectedBillingPresent: ['GOZ_5230'],
    },
];
