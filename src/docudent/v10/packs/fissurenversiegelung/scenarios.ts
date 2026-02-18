import type { ClinicalScenario } from '../../qa/runClinicalSuite';

export const fissurenversiegelungScenarios: ClinicalScenario[] = [
    {
        id: 'FV_01-gkv-ip',
        description: 'GKV Fissurenversiegelung',
        treatmentId: 'fissurenversiegelung',
        insuranceType: 'GKV',
        textLength: 'mittel',
        dictation: 'Fissurenversiegelung kariesfreier Fissuren an 16 zur Prophylaxe durchgeführt.',
        expectedChips: ['fissurenversiegelung_standard'],
        expectedBillingPresent: ['BEMA_IP5'],
    },
    {
        id: 'FV_02-pkv-goz',
        description: 'PKV Fissurenversiegelung',
        treatmentId: 'fissurenversiegelung',
        insuranceType: 'PKV',
        textLength: 'mittel',
        dictation: 'Fissurenversiegelung mit Kunststoff bei erhöhtem Kariesrisiko.',
        expectedChips: ['fissurenversiegelung_standard'],
        expectedBillingPresent: ['GOZ_2000'],
    },
];
