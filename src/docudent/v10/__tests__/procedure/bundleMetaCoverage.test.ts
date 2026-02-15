import { describe, it, expect } from 'vitest';
import { getBundleMetaForTreatment } from '../../procedure/bundleMeta';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import { allEventBundles } from '../../procedure/events/allBundles';

describe('Bundle meta coverage', () => {
    const treatments = ['fuellung', 'endo', 'extraction', 'pzr', 'crown_prep'];

    it('covers all graph nodes and entry nodes', () => {
        for (const treatmentId of treatments) {
            const meta = getBundleMetaForTreatment(treatmentId);
            expect(meta).toBeDefined();
            const graph = getProcedureGraphForTreatment(treatmentId);
            expect(graph).toBeDefined();
            const ids = new Set(meta?.bundles.map(b => b.id));

            for (const node of graph!.nodes) {
                expect(ids.has(node.id)).toBe(true);
            }
            for (const entryId of graph!.entryNodes) {
                expect(ids.has(entryId)).toBe(true);
            }
        }
    });

    it('matches static emitChips for bundled nodes', () => {
        const bundleMap = new Map(allEventBundles.map(bundle => [bundle.id, bundle]));

        for (const treatmentId of treatments) {
            const meta = getBundleMetaForTreatment(treatmentId)!;
            const metaMap = new Map(meta.bundles.map(bundle => [bundle.id, bundle]));
            for (const [id, metaEntry] of metaMap.entries()) {
                const bundle = bundleMap.get(id);
                if (!bundle?.emitChips?.length) continue;
                expect(metaEntry.chipIds).toEqual(bundle.emitChips);
                if (metaEntry.chipIds?.length) {
                    expect(metaEntry.textRefIds).toEqual(metaEntry.chipIds);
                }
            }
        }
    });
});
