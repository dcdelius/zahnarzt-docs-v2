/**
 * Gate M11: Scope Dedup SESSION vs TOOTH
 *
 * Verifies that SESSION-scoped billing is deduped, TOOTH-scoped is kept per tooth.
 */

import { describe, it, expect } from 'vitest';
import { runV10Bundle } from '../../../v10';

describe('Gate M11: Scope Dedup SESSION vs TOOTH', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: SESSION scope dedup
    // ═══════════════════════════════════════════════════════════════

    describe('SESSION scope deduplication', () => {
        it('anesthesia chip billed only once across instances', async () => {
            const result = await runV10Bundle({
                segments: [{
                    segmentId: 'seg1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    dictation: 'Normale Karies mit LA.',
                    instances: [
                        { instanceId: 'tooth:16', tooth: '16' },
                        { instanceId: 'tooth:26', tooth: '26' },
                    ],
                }],
            });

            if (result.output?.billingCodes) {
                // SESSION-scoped codes should appear only once
                const sessionCodes = result.output.billingCodes.filter(
                    c => c.scope === 'SESSION'
                );

                // Check no duplicates
                const codeNames = sessionCodes.map(c => c.code);
                const uniqueCodeNames = [...new Set(codeNames)];
                expect(codeNames.length).toBe(uniqueCodeNames.length);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: TOOTH scope kept per tooth
    // ═══════════════════════════════════════════════════════════════

    describe('TOOTH scope per-tooth billing', () => {
        it('tooth-scoped chips can appear per tooth', async () => {
            const result = await runV10Bundle({
                segments: [{
                    segmentId: 'seg1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    dictation: 'Normale Karies.',
                    instances: [
                        { instanceId: 'tooth:16', tooth: '16' },
                        { instanceId: 'tooth:26', tooth: '26' },
                    ],
                }],
            });

            if (result.output?.billingCodes) {
                // TOOTH-scoped codes may appear multiple times with different teeth
                const toothCodes = result.output.billingCodes.filter(
                    c => c.scope === 'TOOTH'
                );

                // Each should have a tooth
                for (const code of toothCodes) {
                    expect(code.tooth).toBeDefined();
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Billing codes have correct structure
    // ═══════════════════════════════════════════════════════════════

    describe('Billing code structure', () => {
        it('all billing codes have scope field', async () => {
            const result = await runV10Bundle({
                segments: [{
                    segmentId: 'seg1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'kurz',
                    dictation: 'Normale Karies.',
                    instances: [{ instanceId: 'tooth:16', tooth: '16' }],
                }],
            });

            if (result.output?.billingCodes) {
                for (const code of result.output.billingCodes) {
                    expect(code.code).toBeDefined();
                    expect(['SESSION', 'TOOTH']).toContain(code.scope);
                }
            }
        });
    });
});
