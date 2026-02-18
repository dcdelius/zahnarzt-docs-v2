import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const schieneScenarios: ClinicalScenario[] = [
    {
        id: 'SCHIENE_01-gkv-okklusion',
        description: 'GKV Okklusionsschiene eingegliedert',
        treatmentId: 'schiene',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Okklusionsschiene fuer Zahnreihe eingegliedert, Anpassung und Tragehinweise besprochen.',
        expectedChips: ['schiene_okklusionsschiene'],
        expectedBillingPresent: ['BEMA_K1'],
    },
    {
        id: 'SCHIENE_02-pkv-protrusion',
        description: 'PKV Protrusionsschiene eingegliedert',
        treatmentId: 'schiene',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Protrusionsschiene eingegliedert und Zielposition dokumentiert.',
        expectedChips: ['schiene_protrusionsschiene'],
        expectedBillingPresent: ['GOZ_7010'],
    },
];
