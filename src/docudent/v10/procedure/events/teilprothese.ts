import type { ClinicalEventBundle } from './types';

function readTeilprothese(facts: Record<string, unknown>): { type?: string; phase?: string } {
    return (facts.teilprothese as { type?: string; phase?: string } | undefined) ?? {};
}

export const teilprotheseBundles: ClinicalEventBundle[] = [
    {
        id: 'teilprothese.typ.interim',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilprothese'
            && readTeilprothese(facts).type === 'interim',
        emitChips: ['teilprothese_interim'],
    },
    {
        id: 'teilprothese.typ.modellguss',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilprothese'
            && readTeilprothese(facts).type === 'modellguss',
        emitChips: ['teilprothese_modellguss'],
    },
    {
        id: 'teilprothese.phase.kontrolle',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilprothese'
            && readTeilprothese(facts).phase === 'kontrolle',
        emitChips: ['teilprothese_kontrolle'],
    },
];

export const teilprotheseAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'teilprothese.askback.typ',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilprothese'
            && !readTeilprothese(facts).type,
        requiresFacts: ['teilprothese.type'],
        askbacks: ['medical_teilprothese_typ'],
    },
    {
        id: 'teilprothese.askback.phase',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'teilprothese'
            && !readTeilprothese(facts).phase,
        requiresFacts: ['teilprothese.phase'],
        askbacks: ['medical_teilprothese_phase'],
    },
];
