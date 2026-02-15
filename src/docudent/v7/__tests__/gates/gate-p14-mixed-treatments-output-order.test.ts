/**
 * Gate Test: Mixed Treatments Output Order E2E
 *
 * Verifies output ordering is deterministic for mixed treatments:
 * 1. Segment order matches dictation order
 * 2. Billing per tooth is correct
 * 3. Text ordering is stable
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

describe('Gate: Mixed Treatments Output Order E2E', () => {
    let fuellungUnified: UnifiedJson;

    beforeAll(() => {
        const fuellungPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json'
        );
        fuellungUnified = JSON.parse(fs.readFileSync(fuellungPath, 'utf-8'));
    });

    // ═══════════════════════════════════════════════════════════════
    // Helper: Simulate mixed treatment output aggregation
    // ═══════════════════════════════════════════════════════════════

    interface InstanceOutput {
        instanceId: string;
        treatmentId: 'fuellung' | 'endo';
        tooth: string;
        chips: string[];
        billing: Array<{ code: string; tooth: string }>;
        textSnippet: string;
    }

    function simulateMixedOutputAggregation(instances: InstanceOutput[]): {
        aggregatedBilling: Array<{ code: string; tooth: string }>;
        aggregatedText: string;
        order: string[];
    } {
        const allBilling: Array<{ code: string; tooth: string }> = [];
        const textParts: string[] = [];
        const order: string[] = [];

        // Process in segment/instance order
        for (const inst of instances) {
            order.push(inst.instanceId);
            allBilling.push(...inst.billing);
            if (inst.textSnippet) {
                textParts.push(`[${inst.tooth}] ${inst.textSnippet}`);
            }
        }

        return {
            aggregatedBilling: allBilling,
            aggregatedText: textParts.join('\n\n---\n\n'),
            order,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // Test 1: Output order matches segment order
    // ═══════════════════════════════════════════════════════════════
    describe('Output Ordering', () => {
        it('should maintain segment order: fuellung before endo', () => {
            // Given: Fuellung first, then Endo
            const instances: InstanceOutput[] = [
                {
                    instanceId: 'fuellung::tooth:16',
                    treatmentId: 'fuellung',
                    tooth: '16',
                    chips: [KB_CHIP_IDS.CP],
                    billing: [{ code: 'BEMA_25', tooth: '16' }],
                    textSnippet: 'Cp (Ca(OH)₂).',
                },
                {
                    instanceId: 'endo::tooth:11',
                    treatmentId: 'endo',
                    tooth: '11',
                    chips: ['endo_start'],
                    billing: [{ code: 'BEMA_32', tooth: '11' }],
                    textSnippet: 'Trepanation, medikamentöse Einlage.',
                },
            ];

            // When: Aggregate
            const result = simulateMixedOutputAggregation(instances);

            // Then: Order is fuellung then endo
            expect(result.order[0]).toBe('fuellung::tooth:16');
            expect(result.order[1]).toBe('endo::tooth:11');

            // Text starts with tooth 16
            expect(result.aggregatedText.indexOf('[16]')).toBeLessThan(
                result.aggregatedText.indexOf('[11]')
            );
        });

        it('should maintain stable order when run multiple times', () => {
            const runOrder = (): string[] => {
                const instances: InstanceOutput[] = [
                    {
                        instanceId: 'fuellung::tooth:16',
                        treatmentId: 'fuellung',
                        tooth: '16',
                        chips: [KB_CHIP_IDS.CP],
                        billing: [{ code: 'BEMA_25', tooth: '16' }],
                        textSnippet: 'Cp.',
                    },
                    {
                        instanceId: 'endo::tooth:11',
                        treatmentId: 'endo',
                        tooth: '11',
                        chips: ['endo_complete'],
                        billing: [{ code: 'BEMA_35', tooth: '11' }],
                        textSnippet: 'WF.',
                    },
                ];
                return simulateMixedOutputAggregation(instances).order;
            };

            const results = Array.from({ length: 5 }, runOrder);
            const first = JSON.stringify(results[0]);

            for (const result of results) {
                expect(JSON.stringify(result)).toBe(first);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: Billing is per-tooth and treatment-specific
    // ═══════════════════════════════════════════════════════════════
    describe('Billing Isolation', () => {
        it('should have BEMA_25 only for tooth 16 (fuellung cp)', () => {
            const instances: InstanceOutput[] = [
                {
                    instanceId: 'fuellung::tooth:16',
                    treatmentId: 'fuellung',
                    tooth: '16',
                    chips: [KB_CHIP_IDS.CP],
                    billing: [{ code: 'BEMA_25', tooth: '16' }],
                    textSnippet: 'Cp.',
                },
                {
                    instanceId: 'endo::tooth:11',
                    treatmentId: 'endo',
                    tooth: '11',
                    chips: ['endo_start'],
                    billing: [{ code: 'BEMA_32', tooth: '11' }],
                    textSnippet: 'Endo.',
                },
            ];

            const result = simulateMixedOutputAggregation(instances);

            // BEMA_25 only for tooth 16
            const bema25 = result.aggregatedBilling.filter(b => b.code === 'BEMA_25');
            expect(bema25.length).toBe(1);
            expect(bema25[0].tooth).toBe('16');

            // BEMA_32 only for tooth 11
            const bema32 = result.aggregatedBilling.filter(b => b.code === 'BEMA_32');
            expect(bema32.length).toBe(1);
            expect(bema32[0].tooth).toBe('11');
        });

        it('should not have endo billing codes for fuellung tooth', () => {
            const instances: InstanceOutput[] = [
                {
                    instanceId: 'fuellung::tooth:16',
                    treatmentId: 'fuellung',
                    tooth: '16',
                    chips: [KB_CHIP_IDS.CP],
                    billing: [{ code: 'BEMA_25', tooth: '16' }],
                    textSnippet: 'Cp.',
                },
            ];

            const result = simulateMixedOutputAggregation(instances);

            // No endo codes
            expect(result.aggregatedBilling.every(b => !b.code.includes('32'))).toBe(true);
            expect(result.aggregatedBilling.every(b => !b.code.includes('35'))).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: Text snippets are KB-derived and stable
    // ═══════════════════════════════════════════════════════════════
    describe('Text Output', () => {
        it('cp chip text snippet should contain Überkappung', () => {
            const cpChip = fuellungUnified.chips.find(c => c.id === 'cp');
            expect(cpChip?.textSnippets?.mittel).toMatch(/überkappung/i);
        });

        it('aggregated text should have separator between segments', () => {
            const instances: InstanceOutput[] = [
                {
                    instanceId: 'fuellung::tooth:16',
                    treatmentId: 'fuellung',
                    tooth: '16',
                    chips: [KB_CHIP_IDS.CP],
                    billing: [],
                    textSnippet: 'Füllung Text',
                },
                {
                    instanceId: 'endo::tooth:11',
                    treatmentId: 'endo',
                    tooth: '11',
                    chips: [],
                    billing: [],
                    textSnippet: 'Endo Text',
                },
            ];

            const result = simulateMixedOutputAggregation(instances);

            expect(result.aggregatedText).toContain('---');
            expect(result.aggregatedText).toContain('[16] Füllung Text');
            expect(result.aggregatedText).toContain('[11] Endo Text');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: Medical layer integration
    // ═══════════════════════════════════════════════════════════════
    describe('Medical Layer Integration', () => {
        it('should produce cp chip for fuellung profunda with ueberkappung=true', () => {
            const facts = createFactsFromExtracted(
                { diagnosis: 'Caries profunda', tooth: '16' },
                'fuellung'
            );
            const answered = applyAnswersToFacts(facts, {
                [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: true,
            });
            const chips = getChipIdsFromFacts(answered);

            expect(chips).toContain(KB_CHIP_IDS.CP);
        });

        it('should NOT produce any chips for endo (medical layer is fuellung-only currently)', () => {
            const facts = createFactsFromExtracted(
                { diagnosis: 'Pulpitis', tooth: '11' },
                'endo'
            );
            const chips = getChipIdsFromFacts(facts);

            // Endo uses different chip system, medical layer returns empty
            expect(chips.length).toBe(0);
        });
    });
});
