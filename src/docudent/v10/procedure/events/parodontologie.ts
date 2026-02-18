import type { ClinicalEventBundle } from './types';

function readParo(
    facts: Record<string, unknown>
): { phase?: string; uptGrade?: string } {
    return (facts.parodontologie as { phase?: string; uptGrade?: string } | undefined) ?? {};
}

export const parodontologieBundles: ClinicalEventBundle[] = [
    {
        id: 'parodontologie.phase.status',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'parodontologie'
            && readParo(facts).phase === 'status',
        emitChips: ['parodontologie_status'],
    },
    {
        id: 'parodontologie.phase.ait',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'parodontologie'
            && readParo(facts).phase === 'ait',
        emitChips: ['parodontologie_ait'],
    },
    {
        id: 'parodontologie.phase.upt.a',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'parodontologie'
            && readParo(facts).phase === 'upt'
            && readParo(facts).uptGrade === 'a',
        emitChips: ['parodontologie_upt_a'],
    },
    {
        id: 'parodontologie.phase.upt.b',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'parodontologie'
            && readParo(facts).phase === 'upt'
            && readParo(facts).uptGrade === 'b',
        emitChips: ['parodontologie_upt_b'],
    },
    {
        id: 'parodontologie.phase.upt.c',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'parodontologie'
            && readParo(facts).phase === 'upt'
            && readParo(facts).uptGrade === 'c',
        emitChips: ['parodontologie_upt_c'],
    },
];

export const parodontologieAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'parodontologie.askback.phase',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'parodontologie'
            && !readParo(facts).phase,
        requiresFacts: ['parodontologie.phase'],
        askbacks: ['medical_parodontologie_phase'],
    },
    {
        id: 'parodontologie.askback.upt_grad',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'parodontologie'
            && readParo(facts).phase === 'upt'
            && !readParo(facts).uptGrade,
        requiresFacts: ['parodontologie.uptGrade'],
        askbacks: ['medical_parodontologie_upt_grad'],
    },
];
