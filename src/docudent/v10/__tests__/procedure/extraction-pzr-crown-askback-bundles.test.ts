import { describe, it, expect } from 'vitest';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import { matchProcedureGraph } from '../../procedure/resolver/matchProcedureGraph';
import { resolveContractContext } from '../../procedure/resolver/resolveContractContext';

describe('Procedure: Extraction askback bundles', () => {
    it('requires LA type + wound care when missing', () => {
        const facts = {
            treatmentId: 'extraction',
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '18', facts }] },
            treatmentId: 'extraction',
            tooth: '18',
        });
        const graph = getProcedureGraphForTreatment('extraction');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.requiredAskbacks).toEqual(expect.arrayContaining([
            'medical_la_type',
            'wound_care',
        ]));
    });
});

describe('Procedure: PZR askback bundles', () => {
    it('requires zahnstein + fluoridation when missing', () => {
        const facts = {
            treatmentId: 'pzr',
            pzr: {},
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '36', facts }] },
            treatmentId: 'pzr',
            tooth: '36',
        });
        const graph = getProcedureGraphForTreatment('pzr');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.requiredAskbacks).toEqual(expect.arrayContaining([
            'pzr_zahnstein',
            'pzr_fluoridation',
        ]));
    });
});

describe('Procedure: Crown prep askback bundles', () => {
    it('requires preparation + impression + provisional when missing', () => {
        const facts = {
            treatmentId: 'crown_prep',
            crownPrep: {},
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '21', facts }] },
            treatmentId: 'crown_prep',
            tooth: '21',
        });
        const graph = getProcedureGraphForTreatment('crown_prep');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.requiredAskbacks).toEqual(expect.arrayContaining([
            'crown_prep_preparation',
            'crown_prep_impression',
            'crown_prep_provisional',
        ]));
    });
});
