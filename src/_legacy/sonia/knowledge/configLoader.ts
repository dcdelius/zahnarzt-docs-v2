import { PracticeConfig, SmartRule, BillingItem, ChipDefinition } from './types';
import { cloneDeep } from 'lodash';

// Mock Practice Config
export const MOCK_PRACTICE_CONFIG: PracticeConfig = {
    practiceId: 'praxis_demo',
    pinnedKnowledgeVersion: '2025.11.27',
    features: {
        autoSuggest: true,
        aggressiveBilling: false
    },
    rules: {
        disabled: ['anesthesia_filling'], // Example: Disable this rule
        overrides: {
            'kofferdam': {
                priority: 100, // Boost priority
                then: { label: 'Kofferdam (Praxis-Standard)' }
            }
        }
    },
    billing: {
        factors: {
            'GOZ_2197': 3.5 // Increase factor for adhesive
        }
    }
};

export interface ResolvedKnowledge {
    rules: Record<string, SmartRule>;
    billing: Record<string, BillingItem>;
    chips: Record<string, ChipDefinition>;
}

export function resolvePracticeKnowledge(
    globalRules: SmartRule[],
    globalBilling: BillingItem[],
    globalChips: ChipDefinition[],
    config: PracticeConfig
): ResolvedKnowledge {

    // 1. Rules
    const rulesMap: Record<string, SmartRule> = {};
    globalRules.forEach(rule => {
        // Skip disabled rules
        if (config.rules?.disabled?.includes(rule.id)) return;

        let activeRule = cloneDeep(rule);

        // Apply overrides
        const override = config.rules?.overrides?.[rule.id];
        if (override) {
            if (override.priority !== undefined) activeRule.then.priority = override.priority;
            if (override.then?.label) activeRule.then.label = override.then.label;
            // Add more override logic as needed
        }
        rulesMap[rule.id] = activeRule;
    });

    // 2. Billing
    const billingMap: Record<string, BillingItem> = {};
    globalBilling.forEach(item => {
        // Billing items usually aren't disabled, but maybe excluded?
        // For now, just copy.
        billingMap[item.id] = item;

        // Apply factors (if we store them on the item, which we currently don't in the interface, 
        // but we could add a 'practiceFactor' field dynamically or handle it in the engine)
    });

    // 3. Chips
    const chipsMap: Record<string, ChipDefinition> = {};
    globalChips.forEach(chip => {
        // Chips filtering logic could go here (e.g. visibility toggles)
        chipsMap[chip.id] = chip;
    });

    return {
        rules: rulesMap,
        billing: billingMap,
        chips: chipsMap
    };
}
