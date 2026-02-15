import { describe, it, expect } from 'vitest';
import { allEventBundles, eventBundleIds } from '../../procedure/events/allBundles';
import { treatmentGraphs } from '../../procedure/registry/treatments';

describe('Event bundle coverage', () => {
    it('has no duplicate bundle IDs', () => {
        const ids = allEventBundles.map(bundle => bundle.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });

    it('covers all procedure nodes and entry nodes', () => {
        const missing: Array<{ graph: string; nodeId: string }> = [];

        for (const graph of treatmentGraphs) {
            for (const node of graph.nodes) {
                if (!eventBundleIds.has(node.id)) {
                    missing.push({ graph: graph.id, nodeId: node.id });
                }
            }
            for (const entryId of graph.entryNodes) {
                if (!eventBundleIds.has(entryId)) {
                    missing.push({ graph: graph.id, nodeId: entryId });
                }
            }
        }

        expect(missing).toEqual([]);
    });
});
