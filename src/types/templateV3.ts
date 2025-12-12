export type FieldType = 'string' | 'text' | 'number' | 'boolean' | 'enum' | 'multiselect';

export interface TemplateField {
    id: string;
    label: string;
    type: FieldType;
    required?: boolean;
    options?: string[]; // For enum/multiselect
    defaultValue?: any;
    placeholder?: string;
    description?: string; // Helper text for the user
}

export type ConditionOperator = 'eq' | 'neq' | 'in' | 'contains' | 'exists' | 'notExists';

export interface RuleCondition {
    fieldId: string;
    operator: ConditionOperator;
    value?: any;
}

export type RuleActionType = 'require' | 'setDefault' | 'warn' | 'error';

export interface RuleAction {
    type: RuleActionType;
    targetFieldId?: string; // For require/setDefault
    value?: any; // For setDefault
    message?: string; // For warn/error
}

export interface TemplateRule {
    id: string;
    description?: string;
    when: RuleCondition[]; // All must be true (AND)
    then: RuleAction[];
}

export interface RenderBlockConfig {
    id: string;
    title: string;
    type: 'bullets' | 'text';
    fields: string[]; // Field IDs to include in this block
    template?: string; // For text blocks: "Patient complains of {complaint}."
}

export interface RenderConfig {
    blocks: RenderBlockConfig[];
}

export interface BillingTokenRule {
    id: string;
    when: RuleCondition[];
    tokens: string[]; // e.g., ["GOZ_2050", "BEMA_13a"]
}

export interface TemplateV3 {
    id: string;
    version: number;
    title: string;
    category: string;
    systemVersion: string; // v3

    fields: TemplateField[];
    rules: TemplateRule[];
    renderConfig: RenderConfig;
    billingRules?: BillingTokenRule[];

    practiceDefaults?: {
        standardLeistungen?: string;
    };

    aiSettings?: {
        textLength?: string;
        forensicLevel?: string;
        blueprint?: string;
    };

    // Metadata
    description: string;
    createdAt: string;
    updatedAt: string;
}

export type FieldKey = string;

export interface ExtractionWarning {
    code: string;
    message: string;
}

export interface ExtractionMeta {
    confidenceByField: Record<string, number>;  // 0..1
    evidenceByField: Record<string, string>;    // verbatim snippet
    warnings?: ExtractionWarning[];
}

export interface ExtractionResult {
    data: Record<FieldKey, any | null>;
    meta: ExtractionMeta;
    rawModelOutput?: string;
    model: string;
}



export interface ValidationIssue {
    code: string;
    type: 'error' | 'warning' | 'info';
    path: string;
    message: string;
    hint?: string;
    blocking?: boolean; // Keep for backward compatibility/logic if needed, or map to type='error'
}

export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    blockingIssues: ValidationIssue[];
    normalizedData: Record<string, any>; // Data with defaults applied
}
