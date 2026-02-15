/**
 * Medical Knowledge Base Schema v1
 *
 * TypeScript definitions for the medical knowledge base.
 * All medical rules must have sourceRefs linking to sources.v1.yaml anchors.
 */

// ═══════════════════════════════════════════════════════════════
// SOURCE REFERENCE
// ═══════════════════════════════════════════════════════════════

export interface SourceRef {
    /** Reference to sources.v1.yaml source id */
    sourceId: string;
    /** Reference to anchor within that source */
    anchorId: string;
    /** Optional: specific quote or note */
    note?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONCEPTS
// ═══════════════════════════════════════════════════════════════

export interface Concept {
    id: string;
    name: string;
    description: string;
    aliases?: string[];
    sourceRefs?: SourceRef[];
    /** Optional shared conditions for a concept */
    when?: RuleCondition[];
    /** Optional direct effects (single-case concept) */
    effects?: ConceptEffects;
    /** Optional multi-case concept (preferred for complex concepts) */
    cases?: ConceptCase[];
    /** Priority for concept evaluation (lower = higher priority) */
    priority?: number;
}

export interface ConceptEffects {
    requiredAskbacks?: string[];
    optionalAskbacks?: string[];
    emitChips?: string[];
}

export interface ConceptCase {
    id: string;
    when: RuleCondition[];
    effects: ConceptEffects;
    priority?: number;
}

// ═══════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════

export interface RuleCondition {
    /** Field path to check, e.g., "facts.cariesDepth" */
    field: string;
    /** Operator: eq, neq, in, gt, lt, exists, contains, empty */
    op: 'eq' | 'neq' | 'in' | 'gt' | 'lt' | 'exists' | 'contains' | 'empty';
    /** Value to compare */
    value: unknown;
}

export interface RuleAction {
    /** Action type */
    type: 'require_askback' | 'emit_chip' | 'set_default' | 'add_warning';
    /** Target (askback id, chip id, field path) */
    target: string;
    /** Optional value for set_default */
    value?: unknown;
    /** Rationale for this action */
    rationale?: string;
}

export interface Rule {
    id: string;
    name: string;
    description: string;
    /** Tag: 'medical' rules MUST have sourceRefs */
    tags: ('medical' | 'billing' | 'technical' | 'ux')[];
    /** When conditions (AND logic) */
    when: RuleCondition[];
    /** Then actions */
    then: RuleAction[];
    /** REQUIRED for medical rules */
    sourceRefs?: SourceRef[];
    /** Priority for ordering (lower = higher priority) */
    priority?: number;
    /** Active flag */
    active: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ASKBACKS
// ═══════════════════════════════════════════════════════════════

export interface AskbackDefinition {
    id: string;
    questionKey: string;
    name: string;
    rationale: string;
    category: 'medical' | 'forensic' | 'billing' | 'ux';
    /** When this askback should trigger */
    triggerConditions: RuleCondition[];
    /** Whether it's required or optional */
    required: boolean;
    /** Source for medical askbacks */
    sourceRefs?: SourceRef[];
    /** Options for single-type askbacks (SSOT for UI buttons) */
    options?: Array<{
        id: string;
        label: string;
        dataValue: string;
    }>;
}

// ═══════════════════════════════════════════════════════════════
// CHIPS
// ═══════════════════════════════════════════════════════════════

export interface ChipDefinition {
    id: string;
    name: string;
    description: string;
    /** KB chip ID (maps to unified.json) */
    kbChipId: string;
    /** Activation rationale */
    activationRationale: string;
    /** Source if medically motivated */
    sourceRefs?: SourceRef[];
}

// ═══════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════

export interface DefaultSetting {
    id: string;
    field: string;
    value: unknown;
    /** When to apply this default */
    conditions: RuleCondition[];
    rationale: string;
    sourceRefs?: SourceRef[];
}

// ═══════════════════════════════════════════════════════════════
// FULL MEDICAL KB
// ═══════════════════════════════════════════════════════════════

export interface MedicalKB {
    version: string;
    generatedAt: string;
    concepts: Concept[];
    rules: Rule[];
    askbacks: AskbackDefinition[];
    chips: ChipDefinition[];
    defaults: DefaultSetting[];
}
