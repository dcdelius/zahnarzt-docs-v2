import type { ClinicalEventBundle } from './types';

function readTrauma(facts: Record<string, unknown>): { art?: string; schienung?: string; kontrolle?: string } {
    return (facts.trauma as { art?: string; schienung?: string; kontrolle?: string } | undefined) ?? {};
}

export const traumaBundles: ClinicalEventBundle[] = [
    {
        id: 'trauma.baseline',
        scope: 'per_instance',
        match: (facts) => facts.treatmentId === 'trauma',
        emitChips: ['trauma_baseline'],
    },
    {
        id: 'trauma.schienung.semipermanent',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'trauma'
            && readTrauma(facts).schienung === 'ja',
        emitChips: ['trauma_schienung_semipermanent'],
    },
    {
        id: 'trauma.kontrolle.empfohlen',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'trauma'
            && readTrauma(facts).kontrolle === 'ja',
        emitChips: ['trauma_kontrolle_empfohlen'],
    },
];

export const traumaAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'trauma.askback.art',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'trauma'
            && !readTrauma(facts).art,
        requiresFacts: ['trauma.art'],
        askbacks: ['medical_trauma_art'],
    },
    {
        id: 'trauma.askback.schienung',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'trauma'
            && !readTrauma(facts).schienung,
        requiresFacts: ['trauma.schienung'],
        askbacks: ['medical_trauma_schienung'],
    },
    {
        id: 'trauma.askback.kontrolle',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'trauma'
            && !readTrauma(facts).kontrolle,
        requiresFacts: ['trauma.kontrolle'],
        askbacks: ['medical_trauma_kontrolle'],
        optional: true,
    },
];
