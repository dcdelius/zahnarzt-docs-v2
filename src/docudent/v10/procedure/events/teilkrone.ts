import type { ClinicalEventBundle } from './types';

function readTeilkrone(facts: Record<string, unknown>): { type?: string; placement?: string } {
    return (facts.teilkrone as { type?: string; placement?: string } | undefined) ?? {};
}

export const teilkroneBundles: ClinicalEventBundle[] = [
    {
        id: 'teilkrone.art.definitiv',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilkrone'
            && readTeilkrone(facts).type === 'teilkrone',
        emitChips: ['teilkrone_definitiv'],
    },
    {
        id: 'teilkrone.art.provisorium',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilkrone'
            && readTeilkrone(facts).type === 'provisorium',
        emitChips: ['teilkrone_provisorium'],
    },
    {
        id: 'teilkrone.eingliederung.definitiv',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilkrone'
            && readTeilkrone(facts).placement === 'definitiv',
        emitChips: ['teilkrone_eingliederung_definitiv'],
    },
];

export const teilkroneAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'teilkrone.askback.art',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilkrone'
            && !readTeilkrone(facts).type,
        requiresFacts: ['teilkrone.type'],
        askbacks: ['medical_teilkrone_art'],
    },
    {
        id: 'teilkrone.askback.eingliederung',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilkrone'
            && !readTeilkrone(facts).placement,
        requiresFacts: ['teilkrone.placement'],
        askbacks: ['medical_teilkrone_eingliederung'],
    },
];
