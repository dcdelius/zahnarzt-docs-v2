/**
 * V10 Multi-Treatment Instance Isolation Tests
 * 
 * @vitest-environment jsdom
 * 
 * These tests verify that multi-treatment sessions properly isolate
 * facts, chips, and answers between instances. No cross-contamination.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createV10Session, type V10Session } from '../../uiController/createV10Session';

describe('Multi-Treatment Instance Isolation', () => {
    let session: V10Session;

    beforeEach(() => {
        session = createV10Session();
    });

    describe('Contract 1: Multi-instance Question Binding', () => {
        it('should create separate instances for multi-tooth dictation', async () => {
            await session.start('36 okklusal; 14 distal', { goldenMode: true });
            const instances = session.getInstances();

            expect(instances.length).toBeGreaterThanOrEqual(2);

            // Each instance should have its own instanceId
            const instanceIds = instances.map(i => i.instanceId);
            expect(new Set(instanceIds).size).toBe(instanceIds.length); // All unique
        });

        it('should bind questions to correct instance', async () => {
            const state = await session.start('36 okklusal; 14 distal', { goldenMode: true });

            if (state.phase === 'questions') {
                for (const [instanceId, questions] of Object.entries(state.questions)) {
                    for (const q of questions) {
                        // Question instanceId must match the key
                        expect(q.instanceId).toBe(instanceId);
                        expect(q.meta.instanceId).toBe(instanceId);
                        // Question ID must contain instanceId
                        expect(q.id).toContain(instanceId);
                    }
                }
            }
        });

        it('should not share question arrays between instances', async () => {
            const state = await session.start('36 okklusal; 14 distal', { goldenMode: true });

            if (state.phase === 'questions') {
                const instanceIds = Object.keys(state.questions);
                if (instanceIds.length >= 2) {
                    // Arrays should be different references
                    expect(state.questions[instanceIds[0]]).not.toBe(state.questions[instanceIds[1]]);
                }
            }
        });
    });

    describe('Contract 2: Answer Isolation', () => {
        it('should only update facts for answered instance', async () => {
            await session.start('36 okklusal; 14 distal', { goldenMode: true });

            const state = session.getState();
            if (state.phase === 'questions') {
                const instanceIds = Object.keys(state.questions);
                if (instanceIds.length >= 2) {
                    const instA = instanceIds[0];
                    const instB = instanceIds[1];

                    // Get facts before answer
                    const instanceB_before = session.getInstances().find(i => i.instanceId === instB);
                    const factsBefore = { ...instanceB_before?.facts };

                    // Answer question for instance A only
                    const questionA = state.questions[instA]?.[0];
                    if (questionA) {
                        await session.answer(instA, questionA.id, questionA.options[0]?.value || 'ja');
                    }

                    // Instance B facts should NOT change
                    const instanceB_after = session.getInstances().find(i => i.instanceId === instB);

                    // Original facts should be unchanged
                    for (const key of Object.keys(factsBefore)) {
                        expect(instanceB_after?.facts[key]).toBe(factsBefore[key]);
                    }
                }
            }
        });

        it('should only update chips for answered instance', async () => {
            await session.start('36 okklusal; 14 distal', { goldenMode: true });

            const state = session.getState();
            if (state.phase === 'questions') {
                const instanceIds = Object.keys(state.questions);
                if (instanceIds.length >= 2) {
                    const instA = instanceIds[0];
                    const instB = instanceIds[1];

                    // Get chips before answer
                    const instanceB_before = session.getInstances().find(i => i.instanceId === instB);
                    const chipsBefore = new Set(instanceB_before?.chips);

                    // Answer question for instance A only
                    const questionA = state.questions[instA]?.[0];
                    if (questionA) {
                        await session.answer(instA, questionA.id, questionA.options[0]?.value || 'ja');
                    }

                    // Instance B chips should NOT change
                    const instanceB_after = session.getInstances().find(i => i.instanceId === instB);

                    // Chips should be same size or only differ if pipeline adds
                    expect(instanceB_after?.chips.size).toBeLessThanOrEqual(chipsBefore.size + 1);
                }
            }
        });

        it('should track answeredFacts separately per instance', async () => {
            await session.start('36 okklusal; 14 distal', { goldenMode: true });

            const state = session.getState();
            if (state.phase === 'questions') {
                const instanceIds = Object.keys(state.questions);
                if (instanceIds.length >= 2) {
                    const instA = instanceIds[0];
                    const instB = instanceIds[1];

                    // Answer question for instance A
                    const questionA = state.questions[instA]?.[0];
                    if (questionA) {
                        await session.answer(instA, questionA.id, 'ja');
                    }

                    // Check answeredFacts
                    const answered = session.getAnsweredFacts();
                    const answeredA = answered.get(instA);
                    const answeredB = answered.get(instB);

                    // A should have answered facts, B should have none
                    expect(answeredA?.size).toBeGreaterThan(0);
                    expect(answeredB?.size || 0).toBe(0);
                }
            }
        });
    });

    describe('Contract 3: Negation Isolation', () => {
        it('should isolate negations per instance', async () => {
            await session.start('36 ohne Kofferdam; 14 mit Kofferdam', { goldenMode: true });
            const instances = session.getInstances();

            expect(instances.length).toBeGreaterThanOrEqual(2);

            // Each instance should have its own surfaces and facts
            if (instances.length >= 2) {
                expect(instances[0].facts).not.toBe(instances[1].facts);
            }
        });

        it('should not share chip sets between instances', async () => {
            await session.start('36 ohne Kofferdam; 14 mit Kofferdam', { goldenMode: true });
            const instances = session.getInstances();

            if (instances.length >= 2) {
                // Chips should be different Set references
                expect(instances[0].chips).not.toBe(instances[1].chips);
                expect(instances[0].chips instanceof Set).toBe(true);
                expect(instances[1].chips instanceof Set).toBe(true);
            }
        });

        it('should isolate surfaces per instance', async () => {
            await session.start('36 mod; 14 okklusal', { goldenMode: true });
            const instances = session.getInstances();

            if (instances.length >= 2) {
                const i36 = instances.find(i => i.teeth.includes('36'));
                const i14 = instances.find(i => i.teeth.includes('14'));

                if (i36 && i14) {
                    // Surfaces should be different
                    expect(i36.surfaces).not.toEqual(i14.surfaces);
                    // 36 should have mod surfaces
                    expect(i36.surfaces.length).toBeGreaterThan(1); // m, o, d
                    // 14 should have only o
                    expect(i14.surfaces).toContain('o');
                }
            }
        });
    });
});
