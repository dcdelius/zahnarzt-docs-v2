import { describe, it, expect } from 'vitest';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import { matchProcedureGraph } from '../../procedure/resolver/matchProcedureGraph';
import { resolveContractContext } from '../../procedure/resolver/resolveContractContext';

describe('Procedure: Fuellung capping required facts', () => {
    it('asks for ueberkappung when pulpaOpened is missing', () => {
        const facts = {
            treatmentId: 'fuellung',
            capping: { performed: 'yes' },
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '11', facts }] },
            treatmentId: 'fuellung',
            tooth: '11',
        });
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.matchedNodeIds).not.toContain('fuellung.capping.indirect');
        expect(result.matchedNodeIds).not.toContain('fuellung.capping.direct');
        expect(result.requiredAskbacks).toContain('medical_ueberkappung');
    });

    it('matches correct capping node when pulpaOpened is known', () => {
        const base = {
            treatmentId: 'fuellung',
            capping: { performed: 'yes' },
        };
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeDefined();

        const indirectFacts = { ...base, pulpaOpened: false };
        const indirectContract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i2', tooth: '12', facts: indirectFacts }] },
            treatmentId: 'fuellung',
            tooth: '12',
        });
        const indirectResult = matchProcedureGraph(indirectFacts, indirectContract, graph!);
        expect(indirectResult.matchedNodeIds).toContain('fuellung.capping.indirect');

        const directFacts = { ...base, pulpaOpened: true };
        const directContract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i3', tooth: '13', facts: directFacts }] },
            treatmentId: 'fuellung',
            tooth: '13',
        });
        const directResult = matchProcedureGraph(directFacts, directContract, graph!);
        expect(directResult.matchedNodeIds).toContain('fuellung.capping.direct');
    });
});
