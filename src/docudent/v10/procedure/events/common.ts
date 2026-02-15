import type { ClinicalEventBundle } from './types';

const hasChip = (contract: { values?: Record<string, unknown> } | undefined, chipId: string): boolean => {
    const available = contract?.values?.availableChips as string[] | undefined;
    if (!Array.isArray(available) || available.length === 0) return true;
    return available.includes(chipId);
};

export const commonEventBundles: ClinicalEventBundle[] = [
    {
        id: 'contract.standard_chips',
        scope: 'per_instance',
        match: (_facts, contract) =>
            Array.isArray(contract.values?.standardChips)
            && (contract.values.standardChips as unknown[]).length > 0,
        emitChipsFrom: (_facts, contract) =>
            (contract.values.standardChips as string[] | undefined) ?? [],
    },
    {
        id: 'contract.mkv.insurance',
        scope: 'per_instance',
        match: (facts, contract) =>
            hasChip(contract, 'insurance_gkv_mkv')
            && facts.mkvPresent === true
            && facts.nurKasse !== true
            && (facts.mehrkostenConfirmed === true || facts.mehrkostenMentioned === true),
        emitChips: ['insurance_gkv_mkv'],
    },
    {
        id: 'contract.mkv.justification',
        scope: 'per_instance',
        match: (facts, contract) => {
            const justification = facts.mkvJustification as unknown;
            return hasChip(contract, 'mkv_begruendung')
                && facts.mkvPresent === true
                && facts.nurKasse !== true
                && (facts.mehrkostenConfirmed === true || facts.mehrkostenMentioned === true)
                && justification !== undefined
                && justification !== null
                && justification !== 'unknown'
                && String(justification).length > 0;
        },
        emitChips: ['mkv_begruendung'],
    },
    {
        id: 'common.anesthesia.surface',
        scope: 'per_instance',
        match: (facts) => facts.surfaceAnesthesia === true,
        emitChips: ['oberflaeche_la'],
    },
    {
        id: 'common.askback.la_type',
        scope: 'per_instance',
        match: (facts) => facts.anesthesiaAmbiguous === true,
        askbacks: ['medical_la_type'],
    },
    {
        id: 'common.anesthesia.generic',
        scope: 'per_instance',
        match: (facts, contract) =>
            hasChip(contract, 'la_generic')
            && facts.anesthesiaAmbiguous === true,
        emitChips: ['la_generic'],
    },
    {
        id: 'common.anesthesia.infiltration',
        scope: 'per_instance',
        match: (facts) =>
            facts.anesthesiaAmbiguous !== true
            && (
                facts.anesthesia === 'infiltr'
                || (facts.anesthesia as { type?: string } | undefined)?.type === 'infiltr'
                || (facts.endo as { anesthesiaType?: string } | undefined)?.anesthesiaType === 'infiltration'
            ),
        emitChips: ['la_infiltr'],
    },
    {
        id: 'common.anesthesia.block',
        scope: 'per_instance',
        match: (facts) =>
            facts.anesthesiaAmbiguous !== true
            && (
                facts.anesthesia === 'leitung'
                || (facts.anesthesia as { type?: string } | undefined)?.type === 'leitung'
                || (facts.endo as { anesthesiaType?: string } | undefined)?.anesthesiaType === 'leitung'
            ),
        emitChips: ['la_leitung'],
    },
    {
        id: 'common.anesthesia.ila',
        scope: 'per_instance',
        match: (facts) =>
            facts.anesthesiaAmbiguous !== true
            && (
                facts.anesthesia === 'ila'
                || (facts.anesthesia as { type?: string } | undefined)?.type === 'ila'
            ),
        emitChips: ['la_ila'],
    },
    {
        id: 'common.isolation.kofferdam',
        scope: 'per_instance',
        match: (facts, contract) =>
            hasChip(contract, 'kofferdam')
            && (
                facts.kofferdamUsed === true ||
                (facts.kofferdam as { present?: boolean } | undefined)?.present === true ||
                (facts.endo as { kofferdam?: boolean } | undefined)?.kofferdam === true
            ),
        emitChips: ['kofferdam'],
    },
    {
        id: 'common.isolation.relative',
        scope: 'per_instance',
        match: (facts, contract) =>
            hasChip(contract, 'rel_trocken')
            && facts.isolationMentioned === 'relative',
        emitChips: ['rel_trocken'],
    },
    {
        id: 'common.vitality.pos',
        scope: 'per_instance',
        match: (facts, contract) =>
            hasChip(contract, 'vipr_pos')
            && facts.vitality === 'pos',
        emitChips: ['vipr_pos'],
    },
    {
        id: 'common.vitality.neg',
        scope: 'per_instance',
        match: (facts, contract) =>
            hasChip(contract, 'vipr_neg')
            && facts.vitality === 'neg',
        emitChips: ['vipr_neg'],
    },
    {
        id: 'common.percussion.pos',
        scope: 'per_instance',
        match: (facts, contract) =>
            hasChip(contract, 'perk_pos')
            && facts.percussion === 'pos',
        emitChips: ['perk_pos'],
    },
    {
        id: 'common.percussion.neg',
        scope: 'per_instance',
        match: (facts, contract) =>
            hasChip(contract, 'perk_neg')
            && facts.percussion === 'neg',
        emitChips: ['perk_neg'],
    },
];
