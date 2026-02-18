import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const wsrScenarios: ClinicalScenario[] = [
    {
        id: 'WSR_01-gkv-trepaniert',
        description: 'GKV WSR trepaniert',
        treatmentId: 'wsr',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Wurzelspitzenresektion an Zahn 11 am eroeffneten Zahn durchgefuehrt.',
        expectedChips: ['wsr_bema_54'],
        expectedBillingPresent: ['BEMA_54'],
    },
    {
        id: 'WSR_02-pkv-molar',
        description: 'PKV WSR Molar',
        treatmentId: 'wsr',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Wurzelspitzenresektion an Zahn 36 mit Osteotomie im Molarenbereich.',
        expectedChips: ['wsr_goz_3120'],
        expectedBillingPresent: ['GOZ_3120'],
    },
];
