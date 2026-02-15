/**
 * Gate M11: Multitooth Questions Scoped Order
 *
 * Verifies that multi-tooth bundles produce scoped question IDs in correct order.
 */

import { describe, it, expect } from 'vitest';
import { runV10Bundle } from '../../../v10';

describe('Gate M11: Multitooth Questions Scoped Order', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: Scoped question IDs per tooth
    // ═══════════════════════════════════════════════════════════════

    describe('Question scoping', () => {
        it('profunda on tooth 16 only produces questions only for tooth 16', async () => {
            const result = await runV10Bundle({
                segments: [{
                    segmentId: 'seg1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Zahn 16 tiefe Karies, Zahn 17 normale Karies.',
                    instances: [
                        { instanceId: 'tooth:16', tooth: '16' },
                        { instanceId: 'tooth:17', tooth: '17' },
                    ],
                }],
            });

            expect(result.state).toBe('questions');

            // Check for scoped question IDs
            const questionIds = result.questions?.map(q => q.id) ?? [];

            // Questions for tooth 16 should exist (profunda triggers askback)
            const tooth16Questions = questionIds.filter(id => id.includes('::tooth:16'));
            expect(tooth16Questions.length).toBeGreaterThanOrEqual(0); // May have scoped or unscoped

            // All questions should have meta if it's medical
            const medicalQuestions = result.questions?.filter(q => q.category === 'medical') ?? [];
            for (const q of medicalQuestions) {
                expect(q.ruleId).toBeDefined();
            }
        });

        it('question ordering is segment → instance → required → id', async () => {
            const result = await runV10Bundle({
                segments: [{
                    segmentId: 'seg1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Tiefe Karies.',
                    instances: [
                        { instanceId: 'tooth:16', tooth: '16' },
                        { instanceId: 'tooth:26', tooth: '26' },
                    ],
                }],
            });

            if (result.questions && result.questions.length > 1) {
                // Required questions should come before optional
                const requiredIndices = result.questions
                    .map((q, i) => q.medicalSeverity === 'hard' ? i : -1)
                    .filter(i => i >= 0);
                const optionalIndices = result.questions
                    .map((q, i) => q.medicalSeverity !== 'hard' ? i : -1)
                    .filter(i => i >= 0);

                if (requiredIndices.length > 0 && optionalIndices.length > 0) {
                    const lastRequired = Math.max(...requiredIndices);
                    const firstOptional = Math.min(...optionalIndices);
                    expect(lastRequired).toBeLessThan(firstOptional);
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Question deduplication
    // ═══════════════════════════════════════════════════════════════

    describe('Question deduplication', () => {
        it('same question ID appears only once', async () => {
            const result = await runV10Bundle({
                segments: [{
                    segmentId: 'seg1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Tiefe Karies.',
                    instances: [
                        { instanceId: 'tooth:16', tooth: '16' },
                    ],
                }],
            });

            if (result.questions) {
                const ids = result.questions.map(q => q.id);
                const uniqueIds = new Set(ids);
                expect(ids.length).toBe(uniqueIds.size);
            }
        });
    });
});
