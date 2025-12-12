import { ResolvedKnowledge } from './configLoader';
import { TemplateV3, FieldDefinition, ChipDefinition, SmartRule, BillingItem } from './types';
import { FIELD_DICTIONARY } from './fields';

export interface RuntimeContext {
    templateId: string;
    fields: FieldDefinition[];
    chips: ChipDefinition[];
    rules: SmartRule[];
    billing: BillingItem[];
    systemPromptId: string;
}

export function resolveTemplateRuntime(
    knowledge: ResolvedKnowledge,
    template: TemplateV3
): RuntimeContext {

    // 1. Resolve Fields
    const activeFields = template.fields
        .map(id => FIELD_DICTIONARY[id])
        .filter(f => !!f); // Filter out undefined

    // 2. Resolve Chips
    // Chips are selected based on 'groups' defined in the template
    // e.g. group 'anesthesia' -> all chips with category 'anesthesia'
    const activeChips = Object.values(knowledge.chips).filter(chip =>
        template.groups.includes(chip.category) || template.defaultChips.includes(chip.id)
    );

    // 3. Resolve Rules
    // Rules are also selected based on 'groups' (categories)
    const activeRules = Object.values(knowledge.rules).filter(rule =>
        template.groups.includes(rule.category)
    );

    // 4. Resolve Billing
    // Billing items are generally all available, but we could filter by catalog or relevance if needed.
    // For now, we include all, as the engine filters by eligibility.
    const activeBilling = Object.values(knowledge.billing);

    return {
        templateId: template.id,
        fields: activeFields,
        chips: activeChips,
        rules: activeRules,
        billing: activeBilling,
        systemPromptId: template.systemPromptId
    };
}
