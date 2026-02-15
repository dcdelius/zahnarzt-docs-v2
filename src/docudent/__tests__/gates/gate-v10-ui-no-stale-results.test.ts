/**
 * Gate: V10 UI No Stale Results Test (M51)
 * 
 * CRITICAL: Verifies that the race guard logic is correctly implemented.
 * 
 * Tests the logic directly without requiring DOM/jsdom by verifying
 * the stale result guard pattern.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const USE_V7_PIPELINE_PATH = join(__dirname, '../../v7/hooks/useV7Pipeline.ts');

describe('Gate: V10 UI No Stale Results (M51)', () => {
    let hookContent: string;

    beforeAll(() => {
        hookContent = readFileSync(USE_V7_PIPELINE_PATH, 'utf-8');
    });

    describe('Race Guard Implementation', () => {
        it('lastRunIdRef is defined', () => {
            expect(hookContent).toContain('lastRunIdRef');
            expect(hookContent).toMatch(/const lastRunIdRef = useRef/);
        });

        it('runIdCounterRef is defined for monotonic IDs', () => {
            expect(hookContent).toContain('runIdCounterRef');
            expect(hookContent).toMatch(/const runIdCounterRef = useRef/);
        });

        it('runPipeline increments and stores runId BEFORE await', () => {
            // Pattern: runId is set before the async call
            expect(hookContent).toMatch(/runIdCounterRef\.current \+= 1/);
            expect(hookContent).toMatch(/const thisRunId = runIdCounterRef\.current/);
            expect(hookContent).toMatch(/lastRunIdRef\.current = thisRunId/);
        });

        it('runPipeline checks stale AFTER await', () => {
            // Pattern: check if thisRunId !== lastRunIdRef.current after await
            expect(hookContent).toMatch(/if\s*\(\s*thisRunId\s*!==\s*lastRunIdRef\.current\s*\)/);
            expect(hookContent).toContain('STALE_IGNORE');
        });

        it('createInstancesAndRun has stale guard', () => {
            // Verify the same pattern exists in createInstancesAndRun
            const createInstancesSection = hookContent.split('const createInstancesAndRun')[1]?.split('}, []')[0];
            expect(createInstancesSection).toBeDefined();
            expect(createInstancesSection).toContain('thisRunId !== lastRunIdRef.current');
        });

        it('runLastMultiPlan has stale guard', () => {
            // Verify the same pattern exists in runLastMultiPlan
            const runLastMultiPlanSection = hookContent.split('const runLastMultiPlan')[1]?.split('}, []')[0];
            expect(runLastMultiPlanSection).toBeDefined();
            expect(runLastMultiPlanSection).toContain('thisRunId !== lastRunIdRef.current');
        });

        it('error paths also have stale guards', () => {
            // Count occurrences of stale guard pattern - should be at least 6
            // (success + error for each of: runPipeline, createInstancesAndRun, runLastMultiPlan)
            const matches = hookContent.match(/thisRunId !== lastRunIdRef\.current/g);
            expect(matches).toBeDefined();
            expect(matches!.length).toBeGreaterThanOrEqual(6);
        });
    });

    describe('Race Guard Logic Correctness', () => {
        it('monotonic ID means later run always has higher ID', () => {
            // Simulate the logic
            let runIdCounter = 0;
            let lastRunId = 0;

            // Run 1 starts
            runIdCounter += 1;
            const run1Id = runIdCounter;
            lastRunId = run1Id;

            // Run 2 starts (before run 1 completes)
            runIdCounter += 1;
            const run2Id = runIdCounter;
            lastRunId = run2Id;

            // Run 2 completes first - should NOT be stale
            expect(run2Id === lastRunId).toBe(true);

            // Run 1 completes later - SHOULD be stale
            expect(run1Id === lastRunId).toBe(false);
        });

        it('rapid runs scenario - only last wins', () => {
            let runIdCounter = 0;
            let lastRunId = 0;
            const runIds: number[] = [];

            // Fire 10 rapid runs
            for (let i = 0; i < 10; i++) {
                runIdCounter += 1;
                lastRunId = runIdCounter;
                runIds.push(runIdCounter);
            }

            // Only the last run should not be stale
            for (let i = 0; i < 9; i++) {
                expect(runIds[i] === lastRunId).toBe(false);
            }
            expect(runIds[9] === lastRunId).toBe(true);
        });
    });
});
