import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const untersuchungScenarios: ClinicalScenario[] = [
    {
        id: 'U_01-gkv-basis',
        description: 'GKV eingehende Untersuchung',
        treatmentId: 'untersuchung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Eingehende Untersuchung zur Kontrolluntersuchung, Befunde unauffaellig.',
        expectedChips: ['untersuchung_eingehend'],
        expectedBillingPresent: ['BEMA_01'],
    },
    {
        id: 'U_02-pkv-befund',
        description: 'PKV eingehende Untersuchung mit Therapiebedarf',
        treatmentId: 'untersuchung',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Eingehende Untersuchung, kariologische Befunde und Therapiebedarf dokumentiert.',
        expectedChips: ['untersuchung_eingehend'],
        expectedBillingPresent: ['GOZ_0010'],
    },
];
