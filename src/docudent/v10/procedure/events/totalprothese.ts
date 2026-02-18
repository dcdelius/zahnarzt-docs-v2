import type { ClinicalEventBundle } from './types';

function readTotalprothese(facts: Record<string, unknown>): { type?: string; phase?: string } {
    return (facts.totalprothese as { type?: string; phase?: string } | undefined) ?? {};
}

export const totalprotheseBundles: ClinicalEventBundle[] = [
    {
        id: 'totalprothese.typ.konventionell',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'totalprothese'
            && readTotalprothese(facts).type === 'konventionell',
        emitChips: ['totalprothese_konventionell'],
    },
    {
        id: 'totalprothese.typ.immediat',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'totalprothese'
            && readTotalprothese(facts).type === 'immediat',
        emitChips: ['totalprothese_immediat'],
    },
    {
        id: 'totalprothese.phase.kontrolle',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'totalprothese'
            && readTotalprothese(facts).phase === 'kontrolle',
        emitChips: ['totalprothese_kontrolle'],
    },
];

export const totalprotheseAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'totalprothese.askback.typ',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'totalprothese'
            && !readTotalprothese(facts).type,
        requiresFacts: ['totalprothese.type'],
        askbacks: ['medical_totalprothese_typ'],
    },
    {
        id: 'totalprothese.askback.phase',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'totalprothese'
            && !readTotalprothese(facts).phase,
        requiresFacts: ['totalprothese.phase'],
        askbacks: ['medical_totalprothese_phase'],
    },
];
