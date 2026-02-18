import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const roentgenScenarios: ClinicalScenario[] = [
    {
        id: 'R_01-einzelzahn-gkv',
        description: 'Einzelzahnaufnahme GKV mit vollstaendiger Evidenz',
        treatmentId: 'roentgen',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Roentgen Einzelzahnaufnahme 46 zur Diagnostik, Befund unauffaellig',
        answers: {
            medical_roentgen_indikation: 'diagnostik',
            medical_roentgen_typ: 'einzelzahn',
            medical_roentgen_zeitpunkt: 'intraoperativ',
            medical_roentgen_befund: 'unauffaellig',
        },
        expectedChips: ['roentgen_einzelzahn'],
        expectedBillingPresent: ['BEMA_Ä925a'],
    },
    {
        id: 'R_02-opg-pkv',
        description: 'OPG PKV mit vollstaendiger Evidenz',
        treatmentId: 'roentgen',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'OPG zur Therapieplanung, Befund apikale Auffaelligkeit regio 36',
        answers: {
            medical_roentgen_indikation: 'planung',
            medical_roentgen_typ: 'opg',
            medical_roentgen_zeitpunkt: 'praeoperativ',
            medical_roentgen_befund: 'apikale_auffaelligkeit',
        },
        expectedChips: ['roentgen_opg'],
        expectedBillingPresent: ['GOZ_5004'],
    },
];
