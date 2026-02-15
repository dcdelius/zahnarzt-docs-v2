import { describe, it, expect } from 'vitest';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import { matchProcedureGraph } from '../../procedure/resolver/matchProcedureGraph';
import { resolveContractContext } from '../../procedure/resolver/resolveContractContext';

describe('Procedure: Fuellung askback bundles', () => {
    it('requires capping material askback when missing', () => {
        const facts = {
            treatmentId: 'fuellung',
            capping: { performed: 'yes' },
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '36', facts }] },
            treatmentId: 'fuellung',
            tooth: '36',
        });
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.requiredAskbacks).toContain('medical_ueberkappung_material');
    });

    it('requires layering + adhesive askbacks when missing for Komposit', () => {
        const facts = {
            treatmentId: 'fuellung',
            materialMentioned: 'komposit',
            layeringMentioned: 'unknown',
            adhesiveTechnique: undefined,
            cavityExtentHint: 'medium',
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '21', facts }] },
            treatmentId: 'fuellung',
            tooth: '21',
        });
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.optionalAskbacks).toEqual(expect.arrayContaining([
            'fuellung_layering',
            'fuellung_adhesive',
        ]));
    });

    it('requires isolation askback when unknown', () => {
        const facts = {
            treatmentId: 'fuellung',
            isolationMentioned: 'unknown',
        };
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [{ instanceId: 'i1', tooth: '36', facts }] },
            treatmentId: 'fuellung',
            tooth: '36',
        });
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeDefined();
        const result = matchProcedureGraph(facts, contract, graph!);

        expect(result.optionalAskbacks).toContain('fuellung_isolation');
    });
});
