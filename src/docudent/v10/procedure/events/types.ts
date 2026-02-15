import type { ContractContext, EventConstraint, FactScope } from '../types';

export interface ClinicalEventBundle {
    id: string;
    scope: FactScope;
    match: (facts: Record<string, unknown>, contract: ContractContext) => boolean;
    defaultsFromSettings?: string[];
    requiresFacts?: string[];
    askbacks?: string[];
    emitChips?: string[];
    emitChipsFrom?: (facts: Record<string, unknown>, contract: ContractContext) => string[];
    disclosures?: string[];
    billingRefs?: string[];
    outputTextRef?: string;
    constraints?: EventConstraint[];
}
