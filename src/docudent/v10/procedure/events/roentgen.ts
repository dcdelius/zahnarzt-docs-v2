import type { ClinicalEventBundle } from './types';
import { createRadiologyEvidenceAskbackBundles } from './common';

function readRadiologyType(facts: Record<string, unknown>): string {
    const value = (facts.radiology as { type?: string } | undefined)?.type;
    if (typeof value !== 'string') return '';
    return value.toLowerCase().trim();
}

function isOpgType(type: string): boolean {
    return type.includes('opg') || type.includes('panorama');
}

export const roentgenBundles: ClinicalEventBundle[] = [
    {
        id: 'roentgen.typ.einzelzahn',
        scope: 'per_instance',
        match: (facts) => {
            if (facts.treatmentId !== 'roentgen') return false;
            const type = readRadiologyType(facts);
            return type.length > 0 && !isOpgType(type);
        },
        emitChips: ['roentgen_einzelzahn'],
    },
    {
        id: 'roentgen.typ.opg',
        scope: 'per_instance',
        match: (facts) => {
            if (facts.treatmentId !== 'roentgen') return false;
            const type = readRadiologyType(facts);
            return type.length > 0 && isOpgType(type);
        },
        emitChips: ['roentgen_opg'],
    },
    {
        id: 'roentgen.befundung',
        scope: 'per_instance',
        match: () => true,
        emitChips: ['roentgen_befundung'],
    },
];

export const roentgenAskbackBundles: ClinicalEventBundle[] = createRadiologyEvidenceAskbackBundles({
    idPrefix: 'roentgen.askback',
    applies: (facts) => facts.treatmentId === 'roentgen',
    idSuffixes: {
        indication: 'indikation',
        type: 'typ',
        timing: 'zeitpunkt',
        findings: 'befund',
    },
});
