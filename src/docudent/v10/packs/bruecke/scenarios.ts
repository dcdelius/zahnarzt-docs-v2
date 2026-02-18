import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const brueckeScenarios: ClinicalScenario[] = [
    {
        id: 'BRUECKE_01-pkv-definitiv',
        description: 'PKV definitive Bruecke',
        treatmentId: 'bruecke',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Definitive Bruecke regio 36 eingegliedert und Okklusion kontrolliert.',
        expectedChips: ['bruecke_definitiv'],
        expectedBillingPresent: ['GOZ_5070'],
    },
    {
        id: 'BRUECKE_02-pkv-provisorisch',
        description: 'PKV provisorische Bruecke',
        treatmentId: 'bruecke',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Provisorische Bruecke zur Uebergangsversorgung eingegliedert.',
        expectedChips: ['bruecke_provisorisch'],
        expectedBillingPresent: ['GOZ_5120'],
    },
];
