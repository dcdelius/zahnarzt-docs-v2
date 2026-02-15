import type { ClinicalEventBundle } from './types';

export const pzrBundles: ClinicalEventBundle[] = [
    {
        id: 'pzr.baseline',
        scope: 'per_instance',
        match: () => true,
        emitChips: ['pzr_vollstaendig'],
    },
    {
        id: 'pzr.zahnstein_entfernung',
        scope: 'per_instance',
        match: (facts) => (facts.pzr as { zahnsteinEntfernung?: boolean } | undefined)?.zahnsteinEntfernung === true,
        emitChips: ['zahnstein_entfernung'],
    },
    {
        id: 'pzr.fluoridierung',
        scope: 'per_instance',
        match: (facts) => (facts.pzr as { fluoridation?: boolean } | undefined)?.fluoridation === true,
        emitChips: ['fluoridierung'],
    },
];

export const pzrAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'pzr.askback.zahnstein',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'pzr'
            && (facts.pzr as { zahnsteinEntfernung?: boolean } | undefined)?.zahnsteinEntfernung === undefined,
        requiresFacts: ['pzr.zahnsteinEntfernung'],
        askbacks: ['pzr_zahnstein'],
    },
    {
        id: 'pzr.askback.fluoridation',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'pzr'
            && (facts.pzr as { fluoridation?: boolean } | undefined)?.fluoridation === undefined,
        requiresFacts: ['pzr.fluoridation'],
        askbacks: ['pzr_fluoridation'],
    },
];
