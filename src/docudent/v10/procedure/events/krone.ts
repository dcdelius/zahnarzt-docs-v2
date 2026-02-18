import type { ClinicalEventBundle } from './types';

function readKrone(facts: Record<string, unknown>): { type?: string; placement?: string } {
    return (facts.krone as { type?: string; placement?: string } | undefined) ?? {};
}

export const kroneBundles: ClinicalEventBundle[] = [
    {
        id: 'krone.art.vollkrone',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'krone'
            && readKrone(facts).type === 'vollkrone',
        emitChips: ['krone_vollkrone'],
    },
    {
        id: 'krone.art.provisorium',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'krone'
            && readKrone(facts).type === 'provisorium',
        emitChips: ['krone_provisorium'],
    },
    {
        id: 'krone.eingliederung.definitiv',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'krone'
            && readKrone(facts).placement === 'definitiv',
        emitChips: ['krone_eingliederung_definitiv'],
    },
];

export const kroneAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'krone.askback.art',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'krone'
            && !readKrone(facts).type,
        requiresFacts: ['krone.type'],
        askbacks: ['medical_krone_art'],
    },
    {
        id: 'krone.askback.eingliederung',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'krone'
            && !readKrone(facts).placement,
        requiresFacts: ['krone.placement'],
        askbacks: ['medical_krone_eingliederung'],
    },
];
