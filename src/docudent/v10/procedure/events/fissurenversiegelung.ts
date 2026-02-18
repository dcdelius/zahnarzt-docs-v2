import type { ClinicalEventBundle } from './types';

export const fissurenversiegelungBundles: ClinicalEventBundle[] = [
    {
        id: 'fissurenversiegelung.baseline',
        scope: 'per_instance',
        match: (facts) => facts.treatmentId === 'fissurenversiegelung',
        emitChips: ['fissurenversiegelung_standard', 'fissurenversiegelung_kontrolle'],
    },
];

export const fissurenversiegelungAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'fissurenversiegelung.askback.indikation',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'fissurenversiegelung'
            && !(facts.fissurenversiegelung as { indication?: string } | undefined)?.indication,
        requiresFacts: ['fissurenversiegelung.indication'],
        askbacks: ['medical_fissuren_indikation'],
    },
    {
        id: 'fissurenversiegelung.askback.material',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'fissurenversiegelung'
            && !(facts.fissurenversiegelung as { material?: string } | undefined)?.material,
        requiresFacts: ['fissurenversiegelung.material'],
        askbacks: ['medical_fissuren_material'],
    },
];
