import type { ProcedureGraph } from '../types';

export interface GateMissingEventBundlesResult {
    ok: boolean;
    missing: string[];
    warnings: string[];
    mode: 'warn' | 'block';
    blocked: boolean;
}

export function gateMissingEventBundles(
    graph: ProcedureGraph | undefined,
    options?: { logger?: (message: string, payload: unknown) => void; mode?: 'warn' | 'block' }
): GateMissingEventBundlesResult {
    const mode = options?.mode ?? 'warn';

    if (!graph) {
        return { ok: true, missing: [], warnings: [], mode, blocked: false };
    }

    const missing = graph.nodes
        .filter(node => !node.eventBundleId)
        .map(node => node.id);

    const warnings = missing.map(id => `Procedure node "${id}" has no event bundle origin`);

    if (missing.length > 0) {
        const logger = options?.logger ?? ((message, payload) => console.warn(message, payload));
        logger(`[GATE][${mode.toUpperCase()}] Procedure nodes without event bundles`, {
            graphId: graph.id,
            count: missing.length,
            nodes: missing,
        });
    }

    return {
        ok: missing.length === 0,
        missing,
        warnings,
        mode,
        blocked: mode === 'block' && missing.length > 0,
    };
}
