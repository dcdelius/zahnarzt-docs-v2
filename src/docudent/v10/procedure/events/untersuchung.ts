import type { ClinicalEventBundle } from './types';

export const untersuchungBundles: ClinicalEventBundle[] = [
    {
        id: 'untersuchung.baseline',
        scope: 'per_instance',
        match: () => true,
        emitChips: ['untersuchung_eingehend', 'untersuchung_befunddoku'],
    },
];

export const untersuchungAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'untersuchung.askback.anlass',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'untersuchung'
            && !(facts.untersuchung as { reason?: string } | undefined)?.reason,
        requiresFacts: ['untersuchung.reason'],
        askbacks: ['medical_untersuchung_anlass'],
    },
    {
        id: 'untersuchung.askback.befunde',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'untersuchung'
            && !(facts.untersuchung as { findings?: string } | undefined)?.findings,
        requiresFacts: ['untersuchung.findings'],
        askbacks: ['medical_untersuchung_befunde'],
    },
    {
        id: 'untersuchung.askback.beurteilung',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'untersuchung'
            && !(facts.untersuchung as { assessment?: string } | undefined)?.assessment,
        requiresFacts: ['untersuchung.assessment'],
        askbacks: ['medical_untersuchung_beurteilung'],
    },
];
