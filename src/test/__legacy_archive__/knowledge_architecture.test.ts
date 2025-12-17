import { describe, it, expect } from 'vitest';
import { resolvePracticeKnowledge, MOCK_PRACTICE_CONFIG } from '../sonia/knowledge/configLoader';
import { resolveTemplateRuntime } from '../sonia/knowledge/runtimeResolver';
import { FILLING_HIGH_PERFORMANCE } from '../sonia/templates/catalog/fillingHighPerformance';
import { CHIP_CATALOG } from '../sonia/knowledge/chips';
import { BILLING_CATALOG } from '../sonia/knowledge/billing';
import { SmartRule } from '../sonia/knowledge/types';

// Mock Global Rules
const MOCK_GLOBAL_RULES: SmartRule[] = [
    {
        id: 'anesthesia_filling',
        category: 'anesthesia',
        when: { predicateId: 'needsInjection' },
        then: {
            label: 'Anästhesie?',
            description: 'Fehlt',
            reasoning: 'Standard',
            priority: 10
        }
    },
    {
        id: 'kofferdam',
        category: 'isolation',
        when: { predicateId: 'needsKofferdam' },
        then: {
            label: 'Kofferdam?',
            description: 'Fehlt',
            reasoning: 'Standard',
            priority: 5
        }
    }
];

describe('Global Knowledge Architecture', () => {

    it('should merge practice config correctly', () => {
        const resolved = resolvePracticeKnowledge(
            MOCK_GLOBAL_RULES,
            BILLING_CATALOG,
            CHIP_CATALOG,
            MOCK_PRACTICE_CONFIG
        );

        // 1. Check Disabled Rule
        // 'anesthesia_filling' is disabled in MOCK_PRACTICE_CONFIG
        expect(resolved.rules['anesthesia_filling']).toBeUndefined();

        // 2. Check Overridden Rule
        // 'kofferdam' has priority boosted to 100 and label changed
        const kofferdam = resolved.rules['kofferdam'];
        expect(kofferdam).toBeDefined();
        expect(kofferdam.then.priority).toBe(100);
        expect(kofferdam.then.label).toBe('Kofferdam (Praxis-Standard)');
    });

    it('should resolve template runtime context', () => {
        const knowledge = resolvePracticeKnowledge(
            MOCK_GLOBAL_RULES,
            BILLING_CATALOG,
            CHIP_CATALOG,
            MOCK_PRACTICE_CONFIG
        );

        const context = resolveTemplateRuntime(knowledge, FILLING_HIGH_PERFORMANCE);

        // 1. Check Fields
        // Template references 'tooth', 'surfaces', etc.
        expect(context.fields.find(f => f.id === 'tooth')).toBeDefined();
        expect(context.fields.find(f => f.id === 'surfaces')).toBeDefined();

        // 2. Check Chips
        // Template includes group 'anesthesia', so anesthesia chips should be present
        const anesthesiaChip = context.chips.find(c => c.category === 'anesthesia');
        expect(anesthesiaChip).toBeDefined();

        // 3. Check Rules
        // Template includes group 'isolation', so kofferdam rule should be present
        const kofferdamRule = context.rules.find(r => r.id === 'kofferdam');
        expect(kofferdamRule).toBeDefined();
    });
});
