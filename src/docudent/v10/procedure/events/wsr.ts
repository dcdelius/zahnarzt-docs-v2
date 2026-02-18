import type { ClinicalEventBundle } from './types';

function readWSR(facts: Record<string, unknown>): { zugang?: string; lokalisation?: string } {
    return (facts.wsr as { zugang?: string; lokalisation?: string } | undefined) ?? {};
}

export const wsrBundles: ClinicalEventBundle[] = [
    {
        id: 'wsr.zugang.trepaniert',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'wsr'
            && readWSR(facts).zugang === 'trepaniert',
        emitChips: ['wsr_bema_54'],
    },
    {
        id: 'wsr.zugang.osteotomie',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'wsr'
            && readWSR(facts).zugang === 'osteotomie',
        emitChips: ['wsr_bema_55'],
    },
    {
        id: 'wsr.lokalisation.front_praemolar',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'wsr'
            && readWSR(facts).lokalisation === 'front_praemolar',
        emitChips: ['wsr_goz_3110'],
    },
    {
        id: 'wsr.lokalisation.molar',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'wsr'
            && readWSR(facts).lokalisation === 'molar',
        emitChips: ['wsr_goz_3120'],
    },
];

export const wsrAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'wsr.askback.zugang',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'wsr'
            && facts.insuranceType === 'GKV'
            && !readWSR(facts).zugang,
        requiresFacts: ['wsr.zugang'],
        askbacks: ['medical_wsr_zugang'],
    },
    {
        id: 'wsr.askback.lokalisation',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'wsr'
            && facts.insuranceType === 'PKV'
            && !readWSR(facts).lokalisation,
        requiresFacts: ['wsr.lokalisation'],
        askbacks: ['medical_wsr_lokalisation'],
    },
];
