import type { ClinicalEventBundle } from './types';
import type { ContractContext, FactScope } from '../types';

const hasChip = (contract: { values?: Record<string, unknown> } | undefined, chipId: string): boolean => {
    const available = contract?.values?.availableChips as string[] | undefined;
    if (!Array.isArray(available) || available.length === 0) return true;
    return available.includes(chipId);
};

type RadiologyField = 'indication' | 'type' | 'timing' | 'findings';

type RadiologyIdSuffixes = {
    indication: string;
    type: string;
    timing: string;
    findings: string;
};

type RadiologyAskbackMode = 'strict_only' | 'always';

const defaultRadiologyIdSuffixes: RadiologyIdSuffixes = {
    indication: 'roentgen_indikation',
    type: 'roentgen_typ',
    timing: 'roentgen_zeitpunkt',
    findings: 'roentgen_befund',
};

function hasRadiologyField(facts: Record<string, unknown>, field: RadiologyField): boolean {
    const value = (facts.radiology as Record<string, unknown> | undefined)?.[field];
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== undefined && value !== null;
}

export function isStrictKzvContract(contract: ContractContext): boolean {
    return contract?.values?.strictKzv === true;
}

export function createRadiologyEvidenceAskbackBundles(args: {
    idPrefix: string;
    scope?: FactScope;
    mode?: RadiologyAskbackMode;
    applies: (facts: Record<string, unknown>, contract: ContractContext) => boolean;
    idSuffixes?: Partial<RadiologyIdSuffixes>;
}): ClinicalEventBundle[] {
    const scope = args.scope ?? 'per_instance';
    const mode = args.mode ?? 'always';
    const suffixes: RadiologyIdSuffixes = {
        ...defaultRadiologyIdSuffixes,
        ...(args.idSuffixes ?? {}),
    };

    const isApplicable = (facts: Record<string, unknown>, contract: ContractContext): boolean => {
        if (!args.applies(facts, contract)) return false;
        if (mode === 'strict_only') return isStrictKzvContract(contract);
        return true;
    };

    const build = (
        field: RadiologyField,
        suffix: string,
        askbackId: string
    ): ClinicalEventBundle => ({
        id: `${args.idPrefix}.${suffix}`,
        scope,
        match: (facts, contract) =>
            isApplicable(facts, contract)
            && !hasRadiologyField(facts, field),
        requiresFacts: [`radiology.${field}`],
        askbacks: [askbackId],
    });

    return [
        build('indication', suffixes.indication, 'medical_roentgen_indikation'),
        build('type', suffixes.type, 'medical_roentgen_typ'),
        build('timing', suffixes.timing, 'medical_roentgen_zeitpunkt'),
        build('findings', suffixes.findings, 'medical_roentgen_befund'),
    ];
}

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
