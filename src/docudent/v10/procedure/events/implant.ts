import type { ClinicalEventBundle } from './types';

function readImplant(facts: Record<string, unknown>): { phase?: string; nachsorge?: string } {
    return (facts.implant as { phase?: string; nachsorge?: string } | undefined) ?? {};
}

export const implantBundles: ClinicalEventBundle[] = [
    {
        id: 'implant.phase.insertion',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'implant'
            && readImplant(facts).phase === 'insertion',
        emitChips: ['implant_insertion'],
    },
    {
        id: 'implant.phase.freilegung',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'implant'
            && readImplant(facts).phase === 'freilegung',
        emitChips: ['implant_freilegung'],
    },
    {
        id: 'implant.nachsorge',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'implant'
            && readImplant(facts).nachsorge === 'ja',
        emitChips: ['implant_nachsorge'],
    },
];

export const implantAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'implant.askback.phase',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'implant'
            && !readImplant(facts).phase,
        requiresFacts: ['implant.phase'],
        askbacks: ['medical_implant_phase'],
    },
    {
        id: 'implant.askback.nachsorge',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'implant'
            && !readImplant(facts).nachsorge,
        requiresFacts: ['implant.nachsorge'],
        askbacks: ['medical_implant_nachsorge'],
    },
];
