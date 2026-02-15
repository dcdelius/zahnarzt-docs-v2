import { describe, it, expect } from 'vitest';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import { matchProcedureGraph } from '../../procedure/resolver/matchProcedureGraph';
import { resolveContractContext } from '../../procedure/resolver/resolveContractContext';

describe('Procedure: Endo askback bundles', () => {
    it('requires endo defaults askbacks when missing', () => {
        const facts = {
            treatmentId: 'endo',
            endo: {},
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '36', facts }] },
            treatmentId: 'endo',
            tooth: '36',
        });
        const graph = getProcedureGraphForTreatment('endo');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.requiredAskbacks).toEqual(expect.arrayContaining([
            'medical_isolation',
            'medical_wl_method',
            'medical_wf_technique',
            'medical_irrigation',
            'endo_medication',
            'endo_canal_count',
        ]));
    });
});
