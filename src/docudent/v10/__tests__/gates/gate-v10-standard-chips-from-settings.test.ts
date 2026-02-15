import { describe, it, expect } from 'vitest';
import type { ContractContext } from '../../procedure/types';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import { matchProcedureGraph } from '../../procedure/resolver/matchProcedureGraph';

describe('Gate: V10 Standard Chips From Settings', () => {
    it('emits standard chips via contract.standard_chips node', () => {
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeDefined();

        const contract: ContractContext = {
            values: { standardChips: ['finishing'] },
        };

        const facts = { treatmentId: 'fuellung' };
        const match = matchProcedureGraph(facts, contract, graph!);

        expect(match.matchedNodeIds).toContain('contract.standard_chips');

        const emitted = new Set<string>();
        for (const nodeId of match.matchedNodeIds) {
            const node = graph!.nodes.find(n => n.id === nodeId);
            if (!node) continue;
            const staticChips = node.emitChips ?? [];
            const dynamicChips = node.emitChipsFrom ? node.emitChipsFrom(facts, contract) : [];
            for (const chipId of [...staticChips, ...dynamicChips]) {
                emitted.add(chipId);
            }
        }

        expect(Array.from(emitted)).toContain('finishing');
    });
});
