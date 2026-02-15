import type { ClinicalEventBundle } from './types';

export const extractionBundles: ClinicalEventBundle[] = [
    {
        id: 'extraction.baseline',
        scope: 'per_instance',
        match: () => true,
        emitChips: ['extraktion_einfach'],
    },
    {
        id: 'extraction.woundcare',
        scope: 'per_instance',
        match: (facts) => facts.woundCare === true,
        emitChips: ['wundversorgung'],
    },
];

export const extractionAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'extraction.askback.la_type',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'extraction'
            && (facts.anesthesia === undefined || facts.anesthesia === 'unknown' || facts.anesthesiaAmbiguous === true),
        requiresFacts: ['anesthesia'],
        askbacks: ['medical_la_type'],
    },
    {
        id: 'extraction.askback.wound_care',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'extraction'
            && facts.woundCare === undefined,
        requiresFacts: ['woundCare'],
        askbacks: ['wound_care'],
    },
];
