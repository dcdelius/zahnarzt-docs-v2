import type { ClinicalEventBundle } from './types';

function readBruecke(facts: Record<string, unknown>): { type?: string; phase?: string } {
    return (facts.bruecke as { type?: string; phase?: string } | undefined) ?? {};
}

export const brueckeBundles: ClinicalEventBundle[] = [
    {
        id: 'bruecke.typ.definitiv',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'bruecke'
            && readBruecke(facts).type === 'definitiv',
        emitChips: ['bruecke_definitiv'],
    },
    {
        id: 'bruecke.typ.provisorisch',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'bruecke'
            && readBruecke(facts).type === 'provisorisch',
        emitChips: ['bruecke_provisorisch'],
    },
    {
        id: 'bruecke.phase.kontrolle',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'bruecke'
            && readBruecke(facts).phase === 'kontrolle',
        emitChips: ['bruecke_kontrolle'],
    },
];

export const brueckeAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'bruecke.askback.typ',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'bruecke'
            && !readBruecke(facts).type,
        requiresFacts: ['bruecke.type'],
        askbacks: ['medical_bruecke_typ'],
    },
    {
        id: 'bruecke.askback.phase',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'bruecke'
            && !readBruecke(facts).phase,
        requiresFacts: ['bruecke.phase'],
        askbacks: ['medical_bruecke_phase'],
    },
];
