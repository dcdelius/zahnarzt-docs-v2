export type FactScope = 'global' | 'per_instance';
export type ProvenanceSource =
    | 'dictation'
    | 'askback'
    | 'settings.user'
    | 'settings.practice'
    | 'manual';

export interface Provenance {
    source: ProvenanceSource;
    confidence?: number;
    scope?: FactScope;
    instanceId?: string;
}

export interface ProcedureFacts {
    global: Record<string, unknown>;
    instances: Array<{
        instanceId: string;
        tooth?: string;
        facts: Record<string, unknown>;
        provenance?: Record<string, Provenance>;
    }>;
}

export interface ContractContext {
    values: Record<string, unknown>;
    provenance?: Record<string, Provenance>;
}

export interface Capability {
    id: string;
    providesNodes: string[];
    providesChips: string[];
    settingsSchemaRef?: string;
    askbacksRef?: string;
}

export interface EventConstraint {
    type: 'forbid_chip' | 'require_chip' | 'sequence';
    chipId: string;
}

export interface ProcedureNode {
    id: string;
    scope: FactScope;
    match: (facts: Record<string, unknown>, contract: ContractContext) => boolean;
    defaultsFromSettings?: string[];
    requiresFacts?: string[];
    askbacks?: string[];
    emitChips?: string[];
    emitChipsFrom?: (facts: Record<string, unknown>, contract: ContractContext) => string[];
    constraints?: EventConstraint[];
    eventBundleId?: string;
}

export interface ProcedureEdge {
    from: string;
    to: string;
    type?: 'requires' | 'excludes' | 'sequence';
}

export interface ProcedureGraph {
    id: string;
    nodes: ProcedureNode[];
    edges?: ProcedureEdge[];
    entryNodes: string[];
}

export interface ChipEmission {
    chipId: string;
    emitterNodeId: string;
    paramsFromFacts?: string[];
}
