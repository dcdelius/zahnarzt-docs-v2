import type { ProcedureGraph, ProcedureNode } from '../../types';
import { capabilityNodes } from '../capabilities';
import { buildProcedureNodesFromBundles } from '../../events/buildProcedureNodes';
import { crownPrepAskbackBundles, crownPrepBundles } from '../../events/crown_prep';
import { endoAskbackBundles, endoBundles, endoStrictEvidenceBundles } from '../../events/endo';
import { extractionAskbackBundles, extractionBundles } from '../../events/extraction';
import { fissurenversiegelungAskbackBundles, fissurenversiegelungBundles } from '../../events/fissurenversiegelung';
import { fuellungAskbackBundles, fuellungBaselineBundles, fuellungCappingBundles, fuellungMaterialDetailBundles, fuellungStrictEvidenceBundles, fuellungTechniqueBundles } from '../../events/fuellung';
import { kroneAskbackBundles, kroneBundles } from '../../events/krone';
import { brueckeAskbackBundles, brueckeBundles } from '../../events/bruecke';
import { teilkroneAskbackBundles, teilkroneBundles } from '../../events/teilkrone';
import { wsrAskbackBundles, wsrBundles } from '../../events/wsr';
import { traumaAskbackBundles, traumaBundles } from '../../events/trauma';
import { implantAskbackBundles, implantBundles } from '../../events/implant';
import { schieneAskbackBundles, schieneBundles } from '../../events/schiene';
import { teilprotheseAskbackBundles, teilprotheseBundles } from '../../events/teilprothese';
import { totalprotheseAskbackBundles, totalprotheseBundles } from '../../events/totalprothese';
import { parodontologieAskbackBundles, parodontologieBundles } from '../../events/parodontologie';
import { pzrAskbackBundles, pzrBundles } from '../../events/pzr';
import { roentgenAskbackBundles, roentgenBundles } from '../../events/roentgen';
import { untersuchungAskbackBundles, untersuchungBundles } from '../../events/untersuchung';
import { uptAskbackBundles, uptBundles } from '../../events/upt';
import { ueberkappungAskbackBundles, ueberkappungBundles } from '../../events/ueberkappung';

const fuellungCappingNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungCappingBundles);
const fuellungBaselineNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungBaselineBundles);
const fuellungMaterialDetailNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungMaterialDetailBundles);
const fuellungTechniqueNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungTechniqueBundles);
const fuellungAskbackNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungAskbackBundles);
const fuellungStrictEvidenceNodes: ProcedureNode[] = buildProcedureNodesFromBundles(fuellungStrictEvidenceBundles);

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
        'fuellung.strict.capping.vitality',
        'fuellung.strict.capping.percussion',
        'fuellung.strict.capping.roentgen_indikation',
        'fuellung.strict.capping.roentgen_typ',
        'fuellung.strict.capping.roentgen_zeitpunkt',
        'fuellung.strict.capping.roentgen_befund',
    ],
    nodes: [
        ...capabilityNodes,
        ...fuellungBaselineNodes,
        ...fuellungCappingNodes,
        ...fuellungMaterialDetailNodes,
        ...fuellungTechniqueNodes,
        ...fuellungAskbackNodes,
        ...fuellungStrictEvidenceNodes,
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
const fissurenversiegelungNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...fissurenversiegelungBundles,
    ...fissurenversiegelungAskbackBundles,
]);
const kroneNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...kroneBundles,
    ...kroneAskbackBundles,
]);
const brueckeNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...brueckeBundles,
    ...brueckeAskbackBundles,
]);
const teilkroneNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...teilkroneBundles,
    ...teilkroneAskbackBundles,
]);
const wsrNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...wsrBundles,
    ...wsrAskbackBundles,
]);
const traumaNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...traumaBundles,
    ...traumaAskbackBundles,
]);
const implantNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...implantBundles,
    ...implantAskbackBundles,
]);
const schieneNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...schieneBundles,
    ...schieneAskbackBundles,
]);
const teilprotheseNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...teilprotheseBundles,
    ...teilprotheseAskbackBundles,
]);
const totalprotheseNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...totalprotheseBundles,
    ...totalprotheseAskbackBundles,
]);
const parodontologieNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...parodontologieBundles,
    ...parodontologieAskbackBundles,
]);
const uptNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...uptBundles,
    ...uptAskbackBundles,
]);
const endoNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...endoBundles,
    ...endoAskbackBundles,
    ...endoStrictEvidenceBundles,
]);
const roentgenNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...roentgenBundles,
    ...roentgenAskbackBundles,
]);
const untersuchungNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...untersuchungBundles,
    ...untersuchungAskbackBundles,
]);
const ueberkappungNodes: ProcedureNode[] = buildProcedureNodesFromBundles([
    ...ueberkappungBundles,
    ...ueberkappungAskbackBundles,
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

export const treatmentKroneGraphV1: ProcedureGraph = {
    id: 'treatment.krone.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'krone.art.vollkrone',
        'krone.art.provisorium',
        'krone.eingliederung.definitiv',
        'krone.askback.art',
        'krone.askback.eingliederung',
    ],
    nodes: [...capabilityNodes, ...kroneNodes],
    edges: [],
};

export const treatmentBrueckeGraphV1: ProcedureGraph = {
    id: 'treatment.bruecke.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'bruecke.typ.definitiv',
        'bruecke.typ.provisorisch',
        'bruecke.phase.kontrolle',
        'bruecke.askback.typ',
        'bruecke.askback.phase',
    ],
    nodes: [...capabilityNodes, ...brueckeNodes],
    edges: [],
};

export const treatmentTeilkroneGraphV1: ProcedureGraph = {
    id: 'treatment.teilkrone.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'teilkrone.art.definitiv',
        'teilkrone.art.provisorium',
        'teilkrone.eingliederung.definitiv',
        'teilkrone.askback.art',
        'teilkrone.askback.eingliederung',
    ],
    nodes: [...capabilityNodes, ...teilkroneNodes],
    edges: [],
};

export const treatmentWSRGraphV1: ProcedureGraph = {
    id: 'treatment.wsr.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'wsr.zugang.trepaniert',
        'wsr.zugang.osteotomie',
        'wsr.lokalisation.front_praemolar',
        'wsr.lokalisation.molar',
        'wsr.askback.zugang',
        'wsr.askback.lokalisation',
    ],
    nodes: [...capabilityNodes, ...wsrNodes],
    edges: [],
};

export const treatmentTraumaGraphV1: ProcedureGraph = {
    id: 'treatment.trauma.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'trauma.baseline',
        'trauma.schienung.semipermanent',
        'trauma.kontrolle.empfohlen',
        'trauma.askback.art',
        'trauma.askback.schienung',
        'trauma.askback.kontrolle',
    ],
    nodes: [...capabilityNodes, ...traumaNodes],
    edges: [],
};

export const treatmentImplantGraphV1: ProcedureGraph = {
    id: 'treatment.implant.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'implant.phase.insertion',
        'implant.phase.freilegung',
        'implant.nachsorge',
        'implant.askback.phase',
        'implant.askback.nachsorge',
    ],
    nodes: [...capabilityNodes, ...implantNodes],
    edges: [],
};

export const treatmentSchieneGraphV1: ProcedureGraph = {
    id: 'treatment.schiene.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'schiene.typ.okklusionsschiene',
        'schiene.typ.protrusionsschiene',
        'schiene.phase.kontrolle',
        'schiene.askback.typ',
        'schiene.askback.phase',
    ],
    nodes: [...capabilityNodes, ...schieneNodes],
    edges: [],
};

export const treatmentTeilprotheseGraphV1: ProcedureGraph = {
    id: 'treatment.teilprothese.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'teilprothese.typ.interim',
        'teilprothese.typ.modellguss',
        'teilprothese.phase.kontrolle',
        'teilprothese.askback.typ',
        'teilprothese.askback.phase',
    ],
    nodes: [...capabilityNodes, ...teilprotheseNodes],
    edges: [],
};

export const treatmentTotalprotheseGraphV1: ProcedureGraph = {
    id: 'treatment.totalprothese.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'totalprothese.typ.konventionell',
        'totalprothese.typ.immediat',
        'totalprothese.phase.kontrolle',
        'totalprothese.askback.typ',
        'totalprothese.askback.phase',
    ],
    nodes: [...capabilityNodes, ...totalprotheseNodes],
    edges: [],
};

export const treatmentRoentgenGraphV1: ProcedureGraph = {
    id: 'treatment.roentgen.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'roentgen.typ.einzelzahn',
        'roentgen.typ.opg',
        'roentgen.befundung',
        'roentgen.askback.indikation',
        'roentgen.askback.typ',
        'roentgen.askback.zeitpunkt',
        'roentgen.askback.befund',
    ],
    nodes: [...capabilityNodes, ...roentgenNodes],
    edges: [],
};

export const treatmentUntersuchungGraphV1: ProcedureGraph = {
    id: 'treatment.untersuchung.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'untersuchung.baseline',
        'untersuchung.askback.anlass',
        'untersuchung.askback.befunde',
        'untersuchung.askback.beurteilung',
    ],
    nodes: [...capabilityNodes, ...untersuchungNodes],
    edges: [],
};

export const treatmentUeberkappungGraphV1: ProcedureGraph = {
    id: 'treatment.ueberkappung.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'ueberkappung.baseline.direkt',
        'ueberkappung.baseline.indirekt',
        'ueberkappung.material.mta',
        'ueberkappung.material.caoh2',
        'ueberkappung.material.biodentine',
        'ueberkappung.askback.art',
        'ueberkappung.askback.material',
    ],
    nodes: [...capabilityNodes, ...ueberkappungNodes],
    edges: [],
};

export const treatmentFissurenversiegelungGraphV1: ProcedureGraph = {
    id: 'treatment.fissurenversiegelung.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'fissurenversiegelung.baseline',
        'fissurenversiegelung.askback.indikation',
        'fissurenversiegelung.askback.material',
    ],
    nodes: [...capabilityNodes, ...fissurenversiegelungNodes],
    edges: [],
};

export const treatmentParodontologieGraphV1: ProcedureGraph = {
    id: 'treatment.parodontologie.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'parodontologie.phase.status',
        'parodontologie.phase.ait',
        'parodontologie.phase.upt.a',
        'parodontologie.phase.upt.b',
        'parodontologie.phase.upt.c',
        'parodontologie.askback.phase',
        'parodontologie.askback.upt_grad',
    ],
    nodes: [...capabilityNodes, ...parodontologieNodes],
    edges: [],
};

export const treatmentUptGraphV1: ProcedureGraph = {
    id: 'treatment.upt.graph.v1',
    entryNodes: [
        'contract.standard_chips',
        'contract.mkv.insurance',
        'contract.mkv.justification',
        'upt.grad.a',
        'upt.grad.b',
        'upt.grad.c',
        'upt.askback.grad',
        'upt.askback.intervall',
    ],
    nodes: [...capabilityNodes, ...uptNodes],
    edges: [],
};

export const treatmentGraphs: ProcedureGraph[] = [
    treatmentFuellungGraphV1,
    treatmentExtractionGraphV1,
    treatmentEndoGraphV1,
    treatmentPzrGraphV1,
    treatmentCrownPrepGraphV1,
    treatmentKroneGraphV1,
    treatmentBrueckeGraphV1,
    treatmentTeilkroneGraphV1,
    treatmentWSRGraphV1,
    treatmentTraumaGraphV1,
    treatmentImplantGraphV1,
    treatmentSchieneGraphV1,
    treatmentTeilprotheseGraphV1,
    treatmentTotalprotheseGraphV1,
    treatmentParodontologieGraphV1,
    treatmentUptGraphV1,
    treatmentFissurenversiegelungGraphV1,
    treatmentUeberkappungGraphV1,
    treatmentUntersuchungGraphV1,
    treatmentRoentgenGraphV1,
];

export function getProcedureGraphForTreatment(treatmentId: string): ProcedureGraph | undefined {
    if (treatmentId === 'fuellung') return treatmentFuellungGraphV1;
    if (treatmentId === 'extraction') return treatmentExtractionGraphV1;
    if (treatmentId === 'endo') return treatmentEndoGraphV1;
    if (treatmentId === 'pzr') return treatmentPzrGraphV1;
    if (treatmentId === 'crown_prep') return treatmentCrownPrepGraphV1;
    if (treatmentId === 'krone') return treatmentKroneGraphV1;
    if (treatmentId === 'bruecke') return treatmentBrueckeGraphV1;
    if (treatmentId === 'teilkrone') return treatmentTeilkroneGraphV1;
    if (treatmentId === 'wsr') return treatmentWSRGraphV1;
    if (treatmentId === 'trauma') return treatmentTraumaGraphV1;
    if (treatmentId === 'implant') return treatmentImplantGraphV1;
    if (treatmentId === 'schiene') return treatmentSchieneGraphV1;
    if (treatmentId === 'teilprothese') return treatmentTeilprotheseGraphV1;
    if (treatmentId === 'totalprothese') return treatmentTotalprotheseGraphV1;
    if (treatmentId === 'parodontologie') return treatmentParodontologieGraphV1;
    if (treatmentId === 'upt') return treatmentUptGraphV1;
    if (treatmentId === 'fissurenversiegelung') return treatmentFissurenversiegelungGraphV1;
    if (treatmentId === 'ueberkappung') return treatmentUeberkappungGraphV1;
    if (treatmentId === 'untersuchung') return treatmentUntersuchungGraphV1;
    if (treatmentId === 'roentgen') return treatmentRoentgenGraphV1;
    return treatmentGraphs.find(graph => graph.id.includes(treatmentId));
}
