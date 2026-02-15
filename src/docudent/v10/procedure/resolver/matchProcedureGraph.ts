import type { ContractContext, ProcedureGraph } from '../types';

export interface MatchProcedureGraphResult {
    matchedNodeIds: string[];
    requiredAskbacks: string[];
    optionalAskbacks: string[];
}

export function matchProcedureGraph(
    facts: Record<string, unknown>,
    contract: ContractContext,
    graph: ProcedureGraph
): MatchProcedureGraphResult {
    const matchedNodeIds: string[] = [];
    const requiredAskbacks: string[] = [];
    const optionalAskbacks: string[] = [];

    const readFactValue = (path: string): unknown => {
        if (!path) return undefined;
        return path.split('.').reduce((acc, key) => {
            if (acc && typeof acc === 'object') {
                return (acc as Record<string, unknown>)[key];
            }
            return undefined;
        }, facts as Record<string, unknown>);
    };

    const isMissingFact = (value: unknown): boolean => {
        if (value === undefined || value === null) return true;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === '' || normalized === 'unknown') return true;
        }
        if (Array.isArray(value)) return value.length === 0;
        return false;
    };

    for (const node of graph.nodes) {
        if (!node.match(facts, contract)) continue;
        const missingRequired = (node.requiresFacts ?? []).filter(path =>
            isMissingFact(readFactValue(path))
        );
        if (missingRequired.length > 0) {
            if (node.askbacks?.length) {
                requiredAskbacks.push(...node.askbacks);
            }
            continue;
        }
        matchedNodeIds.push(node.id);
        if (node.askbacks?.length) {
            optionalAskbacks.push(...node.askbacks);
        }
    }

    return { matchedNodeIds, requiredAskbacks, optionalAskbacks };
}
