import { describe, it, expect } from 'vitest';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import { matchProcedureGraph } from '../../procedure/resolver/matchProcedureGraph';
import { resolveContractContext } from '../../procedure/resolver/resolveContractContext';

describe('Procedure: common anesthesia askback', () => {
    it('suggests LA type when anesthesia is ambiguous', () => {
        const facts = {
            treatmentId: 'fuellung',
            anesthesiaAmbiguous: true,
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '26', facts }] },
            treatmentId: 'fuellung',
            tooth: '26',
        });
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.optionalAskbacks).toContain('medical_la_type');
    });
});
