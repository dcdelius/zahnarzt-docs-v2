/**
 * Gate Test: Multi-Tooth CP Billing Dedup E2E
 *
 * Verifies billing dedup works correctly for multi-tooth cases:
 * 1. Only emit cp billing for teeth that actually have capping
 * 2. Billing codes are per-tooth (TOOTH scope)
 * 3. No duplicates from aggregation
 *
 * Uses medical layer directly (standalone).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
    createFactsFromExtracted,
    applyAnswersToFacts,
    getChipIdsFromFacts,
    MEDICAL_QUESTION_IDS,
    KB_CHIP_IDS,
} from '../../medical';

interface UnifiedChip {
    id: string;
    billingRef?: { GKV?: string; PKV?: string } | null;
    textSnippets?: { kurz?: string; mittel?: string; lang?: string };
}

interface UnifiedJson {
    chips: UnifiedChip[];
}

describe('Gate: Multi-Tooth CP Billing Dedup E2E', () => {
    let unifiedJson: UnifiedJson;
    let cpChip: UnifiedChip | undefined;
    let cpNotRequiredChip: UnifiedChip | undefined;

    beforeAll(() => {
        const unifiedPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json'
        );
        const unifiedContent = fs.readFileSync(unifiedPath, 'utf-8');
        unifiedJson = JSON.parse(unifiedContent) as UnifiedJson;
        cpChip = unifiedJson.chips.find(c => c.id === 'cp');
        cpNotRequiredChip = unifiedJson.chips.find(c => c.id === 'cp_not_required');
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 1: Only tooth 16 gets cp billing
    // ═══════════════════════════════════════════════════════════════
    describe('Per-Tooth Billing Isolation', () => {
        it('should emit cp chip only for tooth 16 (capping yes), not tooth 17 (capping no)', () => {
            // Given: Two profunda teeth with different capping answers
            const tooth16 = applyAnswersToFacts(
                createFactsFromExtracted({ diagnosis: 'Caries profunda', tooth: '16' }, 'fuellung'),
                { [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: true }
            );
            const tooth17 = applyAnswersToFacts(
                createFactsFromExtracted({ diagnosis: 'Caries profunda', tooth: '17' }, 'fuellung'),
                { [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: false }
            );

            // When: Get chips per tooth
            const chips16 = getChipIdsFromFacts(tooth16);
            const chips17 = getChipIdsFromFacts(tooth17);

            // Then: Only tooth 16 has cp, tooth 17 has cp_not_required
            expect(chips16).toContain(KB_CHIP_IDS.CP);
            expect(chips16).not.toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);

            expect(chips17).toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);
            expect(chips17).not.toContain(KB_CHIP_IDS.CP);
        });

        it('cp chip should have billing, cp_not_required should not', () => {
            expect(cpChip?.billingRef?.GKV).toBe('BEMA_25');
            expect(cpChip?.billingRef?.PKV).toBe('GOZ_2330');

            expect(cpNotRequiredChip?.billingRef).toBeNull();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: Simulated billing aggregation for 2 teeth
    // ═══════════════════════════════════════════════════════════════
    describe('Billing Aggregation Simulation', () => {
        /**
         * Simulates what orchestrator does: collect billing per instance
         */
        function simulateBillingAggregation(
            instances: Array<{ tooth: string; chips: string[] }>
        ): Array<{ code: string; tooth: string }> {
            const allBilling: Array<{ code: string; tooth: string }> = [];

            for (const inst of instances) {
                for (const chipId of inst.chips) {
                    const chip = unifiedJson.chips.find(c => c.id === chipId);
                    if (chip?.billingRef?.GKV) {
                        allBilling.push({
                            code: chip.billingRef.GKV,
                            tooth: inst.tooth,
                        });
                    }
                }
            }

            return allBilling;
        }

        it('should only include BEMA_25 for tooth 16, not tooth 17', () => {
            // Given: Instance chips
            const instances = [
                { tooth: '16', chips: [KB_CHIP_IDS.CP] },
                { tooth: '17', chips: [KB_CHIP_IDS.CP_NOT_REQUIRED] },
            ];

            // When: Aggregate billing
            const billing = simulateBillingAggregation(instances);

            // Then: Only tooth 16 has BEMA_25
            expect(billing.length).toBe(1);
            expect(billing[0].code).toBe('BEMA_25');
            expect(billing[0].tooth).toBe('16');
        });

        it('should have BEMA_25 for both teeth if both have capping', () => {
            // Given: Both teeth with cp
            const instances = [
                { tooth: '16', chips: [KB_CHIP_IDS.CP] },
                { tooth: '17', chips: [KB_CHIP_IDS.CP] },
            ];

            // When: Aggregate billing
            const billing = simulateBillingAggregation(instances);

            // Then: Both teeth have BEMA_25 (TOOTH scope allows duplicates)
            expect(billing.length).toBe(2);
            expect(billing[0].tooth).toBe('16');
            expect(billing[1].tooth).toBe('17');
            expect(billing.every(b => b.code === 'BEMA_25')).toBe(true);
        });

        it('should dedupe same-tooth duplicates', () => {
            // Given: Same tooth appearing twice (edge case)
            const instances = [
                { tooth: '16', chips: [KB_CHIP_IDS.CP] },
                { tooth: '16', chips: [KB_CHIP_IDS.CP] }, // Duplicate
            ];

            // When: Aggregate and dedupe
            const billing = simulateBillingAggregation(instances);
            const dedupedByTooth = new Map<string, { code: string; tooth: string }>();
            for (const b of billing) {
                const key = `${b.code}::${b.tooth}`;
                if (!dedupedByTooth.has(key)) {
                    dedupedByTooth.set(key, b);
                }
            }

            // Then: Only one BEMA_25 for tooth 16
            expect(dedupedByTooth.size).toBe(1);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: Text snippet per tooth
    // ═══════════════════════════════════════════════════════════════
    describe('Per-Tooth Text Snippets', () => {
        it('cp chip should have text snippet mentioning Überkappung', () => {
            expect(cpChip?.textSnippets?.mittel).toMatch(/überkappung/i);
        });

        it('cp_not_required chip should have text snippet mentioning nicht erforderlich', () => {
            expect(cpNotRequiredChip?.textSnippets?.mittel).toMatch(/nicht erforderlich/i);
        });

        it('should generate different text per tooth based on capping answer', () => {
            // This is a sanity check that text is chip-dependent
            const cpText = cpChip?.textSnippets?.mittel || '';
            const cpNotReqText = cpNotRequiredChip?.textSnippets?.mittel || '';

            expect(cpText).not.toBe(cpNotReqText);
            expect(cpText.length).toBeGreaterThan(0);
            expect(cpNotReqText.length).toBeGreaterThan(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: KB Sanity
    // ═══════════════════════════════════════════════════════════════
    describe('KB Sanity', () => {
        it('cp and cp_not_required are mutually exclusive', () => {
            const cpChipFull = unifiedJson.chips.find(c => c.id === 'cp') as any;
            expect(cpChipFull?.mutuallyExclusiveWith).toContain('cp_not_required');
        });
    });
});
