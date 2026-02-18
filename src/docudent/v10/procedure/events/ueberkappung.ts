import type { ClinicalEventBundle } from './types';

function readMaterial(facts: Record<string, unknown>): string {
    const material = (facts.capping as { material?: string } | undefined)?.material;
    if (typeof material !== 'string') return '';
    return material.toLowerCase();
}

export const ueberkappungBundles: ClinicalEventBundle[] = [
    {
        id: 'ueberkappung.baseline.direkt',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'ueberkappung'
            && (facts.capping as { performed?: string } | undefined)?.performed === 'yes'
            && (facts as { pulpaOpened?: boolean }).pulpaOpened === true,
        emitChips: ['ueberkappung_direkt'],
    },
    {
        id: 'ueberkappung.baseline.indirekt',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'ueberkappung'
            && (facts.capping as { performed?: string } | undefined)?.performed === 'yes'
            && (facts as { pulpaOpened?: boolean }).pulpaOpened !== true,
        emitChips: ['ueberkappung_indirekt'],
    },
    {
        id: 'ueberkappung.material.mta',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'ueberkappung'
            && readMaterial(facts).includes('mta'),
        emitChips: ['ueberkappung_material_mta'],
    },
    {
        id: 'ueberkappung.material.caoh2',
        scope: 'per_instance',
        match: (facts) => {
            if (facts.treatmentId !== 'ueberkappung') return false;
            const material = readMaterial(facts);
            return material.includes('ca') || material.includes('hydroxid') || material.includes('oh');
        },
        emitChips: ['ueberkappung_material_caoh2'],
    },
    {
        id: 'ueberkappung.material.biodentine',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'ueberkappung'
            && readMaterial(facts).includes('biodentine'),
        emitChips: ['ueberkappung_material_biodentine'],
    },
];

export const ueberkappungAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'ueberkappung.askback.art',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'ueberkappung'
            && (facts.capping as { performed?: string } | undefined)?.performed !== 'yes',
        requiresFacts: ['capping.performed'],
        askbacks: ['medical_ueberkappung'],
    },
    {
        id: 'ueberkappung.askback.material',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'ueberkappung'
            && (facts.capping as { performed?: string; material?: string } | undefined)?.performed === 'yes'
            && !((facts.capping as { material?: string } | undefined)?.material),
        requiresFacts: ['capping.material'],
        askbacks: ['medical_ueberkappung_material'],
    },
];
