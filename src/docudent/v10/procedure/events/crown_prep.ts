import type { ClinicalEventBundle } from './types';

export const crownPrepBundles: ClinicalEventBundle[] = [
    {
        id: 'crown_prep.praeparation',
        scope: 'per_instance',
        match: (facts) => (facts.crownPrep as { preparation?: boolean } | undefined)?.preparation === true,
        emitChips: ['praeparation'],
    },
    {
        id: 'crown_prep.abformung',
        scope: 'per_instance',
        match: (facts) => (facts.crownPrep as { impression?: boolean } | undefined)?.impression === true,
        emitChips: ['abformung'],
    },
    {
        id: 'crown_prep.provisorium',
        scope: 'per_instance',
        match: (facts) => (facts.crownPrep as { provisional?: boolean } | undefined)?.provisional === true,
        emitChips: ['provisorium'],
    },
];

export const crownPrepAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'crown_prep.askback.preparation',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'crown_prep'
            && (facts.crownPrep as { preparation?: boolean } | undefined)?.preparation === undefined,
        requiresFacts: ['crownPrep.preparation'],
        askbacks: ['crown_prep_preparation'],
    },
    {
        id: 'crown_prep.askback.impression',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'crown_prep'
            && (facts.crownPrep as { impression?: boolean } | undefined)?.impression === undefined,
        requiresFacts: ['crownPrep.impression'],
        askbacks: ['crown_prep_impression'],
    },
    {
        id: 'crown_prep.askback.provisional',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'crown_prep'
            && (facts.crownPrep as { provisional?: boolean } | undefined)?.provisional === undefined,
        requiresFacts: ['crownPrep.provisional'],
        askbacks: ['crown_prep_provisional'],
    },
];
