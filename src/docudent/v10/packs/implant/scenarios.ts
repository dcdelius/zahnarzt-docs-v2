import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const implantScenarios: ClinicalScenario[] = [
    {
        id: 'IMPL_01-pkv-insertion',
        description: 'PKV Implantatinsertion',
        treatmentId: 'implant',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Implantatinsertion regio 36 durchgefuehrt, Nachsorge besprochen.',
        expectedChips: ['implant_insertion'],
        expectedBillingPresent: ['GOZ_9000'],
    },
    {
        id: 'IMPL_02-pkv-freilegung',
        description: 'PKV Implantatfreilegung',
        treatmentId: 'implant',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Implantat regio 46 freigelegt.',
        expectedChips: ['implant_freilegung'],
        expectedBillingPresent: ['GOZ_9040'],
    },
];
