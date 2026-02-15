import type { ClinicalEventBundle } from './types';
import type { ProcedureNode } from '../types';

export function buildProcedureNodesFromBundles(bundles: ClinicalEventBundle[]): ProcedureNode[] {
    return bundles.map(bundle => ({
        id: bundle.id,
        scope: bundle.scope,
        match: bundle.match,
        defaultsFromSettings: bundle.defaultsFromSettings,
        requiresFacts: bundle.requiresFacts,
        askbacks: bundle.askbacks,
        emitChips: bundle.emitChips,
        emitChipsFrom: bundle.emitChipsFrom,
        constraints: bundle.constraints,
        eventBundleId: bundle.id,
    }));
}
