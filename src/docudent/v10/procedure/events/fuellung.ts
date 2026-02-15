import type { ClinicalEventBundle } from './types';

export const fuellungBaselineBundles: ClinicalEventBundle[] = [
    {
        id: 'fuellung.baseline',
        scope: 'per_instance',
        match: () => true,
        emitChips: ['fuellung_grundleistung'],
    },
    {
        id: 'fuellung.fluor',
        scope: 'per_instance',
        match: (facts) => (facts.fuellung as { fluoridation?: boolean } | undefined)?.fluoridation === true,
        emitChips: ['fluor'],
    },
    {
        id: 'fuellung.exkavation',
        scope: 'per_instance',
        match: (facts) => facts.exkavationPerformed === true,
        emitChips: ['exkavation'],
    },
    {
        id: 'fuellung.finishing',
        scope: 'per_instance',
        match: (facts) => facts.finishingPerformed === true,
        emitChips: ['finishing'],
    },
    {
        id: 'fuellung.material.komposit',
        scope: 'per_instance',
        match: (facts) => facts.materialMentioned === 'komposit',
        emitChips: ['fuellung_material_komposit'],
    },
    {
        id: 'fuellung.material.giz',
        scope: 'per_instance',
        match: (facts) => facts.materialMentioned === 'giz',
        emitChips: ['fuellung_material_giz'],
    },
];

export const fuellungMaterialDetailBundles: ClinicalEventBundle[] = [
    {
        id: 'fuellung.material.adhesive',
        scope: 'per_instance',
        match: (facts) => facts.adhesiveMentioned === true,
        emitChips: ['fuellung_material_adhesive'],
    },
    {
        id: 'fuellung.material.etch',
        scope: 'per_instance',
        match: (facts) => facts.etchMentioned === true,
        emitChips: ['fuellung_material_etch'],
    },
    {
        id: 'fuellung.material.matrix',
        scope: 'per_instance',
        match: (facts) => facts.matrixMentioned === true,
        emitChips: ['fuellung_material_matrix'],
    },
    {
        id: 'fuellung.material.keil',
        scope: 'per_instance',
        match: (facts) => facts.keilMentioned === true,
        emitChips: ['fuellung_material_keil'],
    },
    {
        id: 'fuellung.material.kontaktpunkt',
        scope: 'per_instance',
        match: (facts) => facts.kontaktpunktMentioned === true,
        emitChips: ['fuellung_kontaktpunkt'],
    },
    {
        id: 'fuellung.material.flowable',
        scope: 'per_instance',
        match: (facts) => facts.flowableMentioned === true,
        emitChips: ['fuellung_material_flowable'],
    },
    {
        id: 'fuellung.material.bulk',
        scope: 'per_instance',
        match: (facts) => facts.bulkMentioned === true,
        emitChips: ['fuellung_material_bulk'],
    },
];

export const fuellungTechniqueBundles: ClinicalEventBundle[] = [
    {
        id: 'fuellung.tech.adhesive.mehrschicht',
        scope: 'per_instance',
        match: (facts) =>
            facts.adhesiveTechnique === true
            && facts.layeringMentioned !== 'yes',
        emitChips: ['mehrschicht'],
    },
    {
        id: 'fuellung.tech.layering.mehrschicht',
        scope: 'per_instance',
        match: (facts) => facts.layeringMentioned === 'yes',
        emitChips: ['mehrschicht'],
    },
    {
        id: 'fuellung.tech.adhesive.basic',
        scope: 'per_instance',
        match: (facts) => facts.adhesiveTechnique === false,
        emitChips: ['komposit_basic'],
    },
];

export const fuellungCappingBundles: ClinicalEventBundle[] = [
    {
        id: 'fuellung.capping.indirect',
        scope: 'per_instance',
        match: (facts) =>
            facts.capping?.performed === 'yes'
            && facts.pulpaOpened !== true,
        emitChips: ['cp'],
        requiresFacts: ['pulpaOpened'],
        askbacks: ['medical_ueberkappung', 'medical_ueberkappung_material'],
        constraints: [{ type: 'forbid_chip', chipId: 'p' }],
    },
    {
        id: 'fuellung.capping.direct',
        scope: 'per_instance',
        match: (facts) =>
            facts.capping?.performed === 'yes'
            && facts.pulpaOpened === true,
        emitChips: ['p'],
        requiresFacts: ['pulpaOpened'],
        askbacks: ['medical_ueberkappung', 'medical_ueberkappung_material'],
        constraints: [{ type: 'forbid_chip', chipId: 'cp' }],
    },
    {
        id: 'fuellung.capping.not_required',
        scope: 'per_instance',
        match: (facts) =>
            facts.capping?.performed === 'no'
            && (facts.cariesDepth === 'profunda' || facts.cariesDepth === 'pulp_near'),
        emitChips: ['cp_not_required'],
    },
];

export const fuellungAskbackBundles: ClinicalEventBundle[] = [
    {
        id: 'fuellung.askback.capping_material',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'fuellung'
            && facts.capping?.performed === 'yes'
            && !facts.capping?.material,
        requiresFacts: ['capping.material'],
        askbacks: ['medical_ueberkappung_material'],
    },
    {
        id: 'fuellung.askback.layering',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'fuellung'
            && facts.materialMentioned === 'komposit'
            && (facts.cavityExtentHint === 'medium' || facts.cavityExtentHint === 'large')
            && (facts.layeringMentioned === undefined || facts.layeringMentioned === 'unknown'),
        askbacks: ['fuellung_layering'],
    },
    {
        id: 'fuellung.askback.adhesive_technique',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'fuellung'
            && facts.materialMentioned === 'komposit'
            && facts.adhesiveTechnique === undefined,
        askbacks: ['fuellung_adhesive'],
    },
    {
        id: 'fuellung.askback.material',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'fuellung'
            && (facts.materialMentioned === undefined || facts.materialMentioned === 'unknown'),
        requiresFacts: ['materialMentioned'],
        askbacks: ['fuellung_material'],
    },
    {
        id: 'fuellung.askback.isolation',
        scope: 'per_instance',
        match: (facts) =>
            facts.treatmentId === 'fuellung'
            && (facts.isolationMentioned === undefined || facts.isolationMentioned === 'unknown'),
        askbacks: ['fuellung_isolation'],
    },
];
