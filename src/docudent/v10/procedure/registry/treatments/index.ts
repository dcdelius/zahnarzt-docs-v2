import type { ProcedureGraph, ProcedureNode } from '../../types';
import { capabilityNodes } from '../capabilities';
import { buildProcedureNodesFromBundles } from '../../events/buildProcedureNodes';
import { crownPrepAskbackBundles, crownPrepBundles } from '../../events/crown_prep';
import { endoAskbackBundles, endoBundles } from '../../events/endo';
import { extractionAskbackBundles, extractionBundles } from '../../events/extraction';
import { fuellungAskbackBundles, fuellungBaselineBundles, fuellungCappingBundles, fuellungMaterialDetailBundles, fuellungTechniqueBundles } from '../../events/fuellung';
import { pzrAskbackBundles, pzrBundles } from '../../events/pzr';

const fuellungCappingNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungCappingBundles);
const fuellungBaselineNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungBaselineBundles);
const fuellungMaterialDetailNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungMaterialDetailBundles);
const fuellungTechniqueNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungTechniqueBundles);
const fuellungAskbackNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungAskbackBundles);

export const treatmentFuellungGraphV1: ProcedureGraph = {
    id: 'treatment.fuellung.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'common.anesthesia.infiltration',
        'common.anesthesia.block',
        'common.anesthesia.ila',
        'common.isolation.kofferdam',
        'common.isolation.relative',
        'common.vitality.pos',
        'common.vitality.neg',
        'common.percussion.pos',
        'common.percussion.neg',
        'fuellung.baseline',
        'fuellung.fluor',
        'fuellung.exkavation',
        'fuellung.finishing',
        'fuellung.material.komposit',
        'fuellung.material.giz',
        'fuellung.capping.indirect',
        'fuellung.capping.direct',
        'fuellung.material.adhesive',
        'fuellung.material.etch',
        'fuellung.material.matrix',
        'fuellung.material.flowable',
        'fuellung.material.bulk',
        'fuellung.tech.adhesive.mehrschicht',
        'fuellung.tech.layering.mehrschicht',
        'fuellung.tech.adhesive.basic',
        'fuellung.capping.not_required',
        'fuellung.askback.capping_material',
        'fuellung.askback.layering',
        'fuellung.askback.adhesive_technique',
        'fuellung.askback.material',
        'fuellung.askback.isolation',
    ],
    nodes: [
        ...capabilityNodes,
        ...fuellungBaselineNodes,
        ...fuellungCappingNodes,
        ...fuellungMaterialDetailNodes,
        ...fuellungTechniqueNodes,
        ...fuellungAskbackNodes,
    ],
    edges: [],
};

const extractionNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...extractionBundles,
    ...extractionAskbackBundles,
]);
const pzrNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...pzrBundles,
    ...pzrAskbackBundles,
]);
const crownPrepNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...crownPrepBundles,
    ...crownPrepAskbackBundles,
]);
const endoNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...endoBundles,
    ...endoAskbackBundles,
]);

export const treatmentExtractionGraphV1: ProcedureGraph = {
    id: 'treatment.extraction.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'extraction.baseline',
        'extraction.woundcare',
        'extraction.askback.la_type',
        'extraction.askback.wound_care',
    ],
    nodes: [...capabilityNodes, ...extractionNodes],
    edges: [],
};

export const treatmentEndoGraphV1: ProcedureGraph = {
    id: 'treatment.endo.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'common.anesthesia.infiltration',
        'common.anesthesia.block',
        'common.anesthesia.ila',
        'common.isolation.kofferdam',
        'common.isolation.relative',
        'common.vitality.pos',
        'common.vitality.neg',
        'common.percussion.pos',
        'common.percussion.neg',
        ...endoNodes.map(n => n.id),
    ],
    nodes: [...capabilityNodes, ...endoNodes],
    edges: [],
};

export const treatmentPzrGraphV1: ProcedureGraph = {
    id: 'treatment.pzr.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'pzr.baseline',
        'pzr.zahnstein_entfernung',
        'pzr.fluoridierung',
        'pzr.askback.zahnstein',
        'pzr.askback.fluoridation',
    ],
    nodes: [...capabilityNodes, ...pzrNodes],
    edges: [],
};

export const treatmentCrownPrepGraphV1: ProcedureGraph = {
    id: 'treatment.crown_prep.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'crown_prep.praeparation',
        'crown_prep.abformung',
        'crown_prep.provisorium',
        'crown_prep.askback.preparation',
        'crown_prep.askback.impression',
        'crown_prep.askback.provisional',
    ],
    nodes: [...capabilityNodes, ...crownPrepNodes],
    edges: [],
};

export const treatmentGraphs: ProcedureGraph[] = [
    treatmentFuellungGraphV1,
    treatmentExtractionGraphV1,
    treatmentEndoGraphV1,
    treatmentPzrGraphV1,
    treatmentCrownPrepGraphV1,
];

export function getProcedureGraphForTreatment(treatmentId: string): ProcedureGraph | undefined {
    if (treatmentId === 'fuellung') return treatmentFuellungGraphV1;
    if (treatmentId === 'extraction') return treatmentExtractionGraphV1;
    if (treatmentId === 'endo') return treatmentEndoGraphV1;
    if (treatmentId === 'pzr') return treatmentPzrGraphV1;
    if (treatmentId === 'crown_prep') return treatmentCrownPrepGraphV1;
    return treatmentGraphs.find(graph => graph.id.includes(treatmentId));
}
