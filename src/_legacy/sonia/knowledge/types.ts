export type FieldType = 'string' | 'text' | 'boolean' | 'multiselect' | 'select' | 'date';

export interface FieldDefinition {
    id: string;           // e.g. "anesthesia", "surfaces"
    label: string;        // UI Label e.g. "Anästhesie"
    type: FieldType;
    options?: string[];   // For select/multiselect
    defaultValue?: any;
    required?: boolean;
}

export type FieldDictionary = Record<string, FieldDefinition>;

export interface ChipDefinition {
    id: string;           // e.g. "anesthesia_ila"
    label: string;        // Text on chip e.g. "Infiltrationsanästhesie"
    category: string;     // e.g. "anesthesia"

    // What happens when clicked?
    patches: Array<{
        op: 'replace' | 'add' | 'remove';
        path: string;     // References FieldDefinition.id
        value: any;
    }>;

    // Text snippet to inject
    textSnippet?: string;
}

export interface BillingRequirement {
    fieldId: string;
    mustBeNonDefault?: boolean;
    mustBeTruthy?: boolean; // Value must be truthy (not false/null/undefined/empty)
    expectedValue?: any; // Value must match this exactly
    message: string;
    severity?: 'warning' | 'error';
}

export interface BillingItem {
    id: string;
    domain: 'conservative' | 'endo' | 'prosthetics' | 'surgery';
    payer: 'GKV' | 'PKV' | 'BOTH';
    codes: { gkv?: string; pkv?: string };
    label: string;
    priority: number;

    // Logic: When is this item eligible?
    eligibility?: {
        mode?: 'auto' | 'manual'; // Default 'auto' if predicateId present, 'manual' otherwise? No, explicit is better.
        requiredFields?: Array<{ path: string; includes?: string }>;
        predicateId?: string; // Reference to complex logic
    };

    // Requirements: What documentation must exist?
    requires?: BillingRequirement[];

    // Conflicts/Exclusivity
    excludes?: string[]; // IDs of other billing items
    group?: string;      // Mutual exclusion group
}

export interface RequirementHit {
    fieldId: string;
    satisfied: boolean;
    message: string;
}

export interface BillingSuggestion {
    itemId: string;
    payer: 'GKV' | 'PKV' | 'BOTH';
    code: string;
    label: string;
    priority: number;
    why: string[];
    requires: RequirementHit[];
    status: 'suggested' | 'blocked' | 'excluded';
    blocks?: string[];
}

export interface BillingEngineResult {
    suggested: BillingSuggestion[];
    blocked: BillingSuggestion[];
    excluded: BillingSuggestion[];
    requiredDocs: Array<{ fieldId: string; reason: string; forItemIds: string[] }>;
}

export interface SmartRule {
    id: string;
    category: string;

    // Trigger Condition
    when: {
        predicateId?: string; // Primary logic hook
        missing?: string[];   // Fields that must be empty
        // Legacy support or simple triggers
        requiredFields?: Array<{ path: string; includes?: string; equals?: any }>;
    };

    // The Suggestion
    then: {
        label: string;
        description: string;
        reasoning: string;
        priority: number;

        // Actions
        billingRefs?: string[]; // References BillingItem.id
        patches?: Array<{       // Data updates
            op: 'replace' | 'add';
            path: string;
            value: any;
        }>;
    };
}

export interface PracticeConfig {
    practiceId: string;
    pinnedKnowledgeVersion?: string; // e.g. "2025.11.27"

    // Toggles
    features: {
        autoSuggest: boolean;
        aggressiveBilling: boolean;
    };

    // Overrides
    rules?: {
        disabled: string[]; // Rule IDs
        overrides: Record<string, { // Rule ID -> Partial Override
            priority?: number;
            then?: { label?: string };
        }>;
    };

    billing?: {
        factors: Record<string, number>; // e.g. "GOZ_2197": 3.5
    };
}

export interface TemplateV3 {
    id: string;
    title: string;
    systemVersion: 'v3';
    treatmentType: string;
    version: number;

    rulesetId: string;

    renderSpec: {
        sections: Array<{
            id: 'summary' | 'billing' | 'procedure' | 'forensic' | 'extras';
            required: boolean;
            title?: string;
        }>;
        strict: true;
    };

    requiredFacts: string[];

    blueprint?: {
        summary?: string;
        procedure?: string;
        forensic?: string;
        billing?: string;
        extras?: string;
    };

    renderMode?: 'deterministic' | 'llm_polish' | 'llm_generate';

    // For extraction (backward compatibility / extraction logic)
    fields: FieldDefinition[];

    defaults?: {
        insuranceType?: 'GKV' | 'PKV';
        showBillingCodes?: boolean;
        includeRisks?: boolean;
        forensicLevel?: 'minimal' | 'standard' | 'detailed';
        textLength?: 'standard' | 'short' | 'detailed';
        activeStandards?: string[];
        [key: string]: any; // Allow arbitrary defaults for fields
    };
}
