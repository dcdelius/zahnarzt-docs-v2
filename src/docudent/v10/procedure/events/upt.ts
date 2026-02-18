import type { ClinicalEventBundle } from './types';

function readUpt(facts: Record<string, unknown>): { grade?: string; interval?: string } {
    return (facts.upt as { grade?: string; interval?: string } | undefined) ?? {};
}

export const uptBundles: ClinicalEventBundle[] = [
    {
        id: 'upt.grad.a',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'upt'
            && readUpt(facts).grade === 'a',
        emitChips: ['upt_grad_a', 'upt_recall_dokumentiert'],
    },
    {
        id: 'upt.grad.b',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'upt'
            && readUpt(facts).grade === 'b',
        emitChips: ['upt_grad_b', 'upt_recall_dokumentiert'],
    },
    {
        id: 'upt.grad.c',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'upt'
            && readUpt(facts).grade === 'c',
        emitChips: ['upt_grad_c', 'upt_recall_dokumentiert'],
    },
];

export const uptAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'upt.askback.grad',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'upt'
            && !readUpt(facts).grade,
        requiresFacts: ['upt.grade'],
        askbacks: ['medical_upt_grad'],
    },
    {
        id: 'upt.askback.intervall',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'upt'
            && !readUpt(facts).interval,
        requiresFacts: ['upt.interval'],
        askbacks: ['medical_upt_intervall'],
    },
];
