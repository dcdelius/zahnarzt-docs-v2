import type { ClinicalEventBundle } from './types';

function readSchiene(facts: Record<string, unknown>): { type?: string; phase?: string } {
    return (facts.schiene as { type?: string; phase?: string } | undefined) ?? {};
}

export const schieneBundles: ClinicalEventBundle[] = [
    {
        id: 'schiene.typ.okklusionsschiene',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'schiene'
            && readSchiene(facts).type === 'okklusionsschiene',
        emitChips: ['schiene_okklusionsschiene'],
    },
    {
        id: 'schiene.typ.protrusionsschiene',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'schiene'
            && readSchiene(facts).type === 'protrusionsschiene',
        emitChips: ['schiene_protrusionsschiene'],
    },
    {
        id: 'schiene.phase.kontrolle',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'schiene'
            && readSchiene(facts).phase === 'kontrolle',
        emitChips: ['schiene_kontrolle'],
    },
];

export const schieneAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'schiene.askback.typ',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'schiene'
            && !readSchiene(facts).type,
        requiresFacts: ['schiene.type'],
        askbacks: ['medical_schiene_typ'],
    },
    {
        id: 'schiene.askback.phase',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'schiene'
            && !readSchiene(facts).phase,
        requiresFacts: ['schiene.phase'],
        askbacks: ['medical_schiene_phase'],
    },
];
