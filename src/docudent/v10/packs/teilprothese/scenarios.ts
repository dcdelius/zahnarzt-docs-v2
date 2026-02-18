import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const teilprotheseScenarios: ClinicalScenario[] = [
    {
        id: 'TEILPROTHESE_01-pkv-interim',
        description: 'PKV Interimsteilprothese',
        treatmentId: 'teilprothese',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Interimsteilprothese regio 36 eingegliedert und Sitz kontrolliert.',
        expectedChips: ['teilprothese_interim'],
        expectedBillingPresent: ['GOZ_5200'],
    },
    {
        id: 'TEILPROTHESE_02-pkv-modellguss',
        description: 'PKV Modellgussprothese',
        treatmentId: 'teilprothese',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Modellgussprothese im Unterkiefer eingesetzt, Druckstellen kontrolliert.',
        expectedChips: ['teilprothese_modellguss'],
        expectedBillingPresent: ['GOZ_5210'],
    },
];
