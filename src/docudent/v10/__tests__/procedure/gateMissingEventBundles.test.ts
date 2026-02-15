import { describe, it, expect } from 'vitest';
import { gateMissingEventBundles } from '../../procedure/gates/gateMissingEventBundles';
import type { ProcedureGraph } from '../../procedure/types';

describe('gateMissingEventBundles', () => {
    it('flags nodes without eventBundleId', () => {
        const graph: ProcedureGraph = {
            id: 'test.graph',
            entryNodes: [],
            nodes: [
                {
                    id: 'node.with.bundle',
                    scope: 'per_instance',
                    match: () => true,
                    eventBundleId: 'bundle.a',
                },
                {
                    id: 'node.missing.bundle',
                    scope: 'per_instance',
                    match: () => true,
                },
            ],
            edges: [],
        };

        const result = gateMissingEventBundles(graph, { logger: () => {} });
        expect(result.ok).toBe(false);
        expect(result.missing).toEqual(['node.missing.bundle']);
    });

    it('passes when all nodes are bundled', () => {
        const graph: ProcedureGraph = {
            id: 'test.graph',
            entryNodes: [],
            nodes: [
                {
                    id: 'node.a',
                    scope: 'per_instance',
                    match: () => true,
                    eventBundleId: 'bundle.a',
                },
                {
                    id: 'node.b',
                    scope: 'per_instance',
                    match: () => true,
                    eventBundleId: 'bundle.b',
                },
            ],
            edges: [],
        };

        const result = gateMissingEventBundles(graph, { logger: () => {} });
        expect(result.ok).toBe(true);
        expect(result.missing).toEqual([]);
    });
});
