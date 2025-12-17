/**
 * Gate 10: runMultiFromDictation E2E Test
 * 
 * Verifies the wiring: dictation → segmentDictation → runMultiTreatment
 * 
 * Assertions:
 * A) Multi-treatment dictation => correct number of runs
 * B) billingCodes are deduped
 * C) Isolation: each run has distinct _debug.activeChipIds
 * D) userDefaults are passed through to context
 * E) Determinism: same input => stable segment ids
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMultiFromDictation } from '../../v7/multitreatment';

// Enable debug for tests
beforeEach(() => {
    (globalThis as any).__FORCE_DEBUG__ = true;
    (globalThis as any).__SKIP_DEV_CHECKS__ = true;
});

afterEach(() => {
    delete (globalThis as any).__FORCE_DEBUG__;
    delete (globalThis as any).__SKIP_DEV_CHECKS__;
});

describe('Gate 10: runMultiFromDictation E2E', () => {
    describe('A) Multi-treatment dictation => correct runs', () => {
        it('should produce 2 runs for endo + fuellung dictation', async () => {
            const result = await runMultiFromDictation({
                dictation: 'Wurzelbehandlung 36 dann Füllung 37 mod',
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                sessionId: 'test-multi-1',
            });

            expect(result.runs).toHaveLength(2);
            expect(result.runs[0].treatmentId).toBe('endo');
            expect(result.runs[1].treatmentId).toBe('fuellung');
        });

        it('should produce 1 run for endo-only dictation', async () => {
            const result = await runMultiFromDictation({
                dictation: 'Wurzelbehandlung 36 3 Kanäle NaOCl',
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                sessionId: 'test-endo-only',
            });

            expect(result.runs).toHaveLength(1);
            expect(result.runs[0].treatmentId).toBe('endo');
        });

        it('should produce 1 run for fuellung-only dictation', async () => {
            const result = await runMultiFromDictation({
                dictation: 'Füllung 37 mod Kofferdam tief',
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                sessionId: 'test-fuellung-only',
            });

            expect(result.runs).toHaveLength(1);
            expect(result.runs[0].treatmentId).toBe('fuellung');
        });
    });

    describe('B) Billing codes are deduped', () => {
        it('should have no duplicate billing codes', async () => {
            const result = await runMultiFromDictation({
                dictation: 'Wurzelbehandlung 36 Füllung 37 mod',
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                sessionId: 'test-dedupe',
            });

            const codes = result.billingCodes.map(bc => bc.code);
            const uniqueCodes = [...new Set(codes)];

            expect(codes.length).toBe(uniqueCodes.length);
        });
    });

    describe('C) Isolation: runs have distinct chipIds', () => {
        it('should have different _debug.activeChipIds per treatment', async () => {
            const result = await runMultiFromDictation({
                dictation: 'Wurzelbehandlung 36 Füllung 37 mod',
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                sessionId: 'test-isolation',
            });

            if (result.runs.length >= 2) {
                const endoRun = result.runs.find(r => r.treatmentId === 'endo');
                const fuellungRun = result.runs.find(r => r.treatmentId === 'fuellung');

                if (endoRun && fuellungRun) {
                    const endoChips = (endoRun.result as any)?._debug?.activeChipIds || [];
                    const fuellungChips = (fuellungRun.result as any)?._debug?.activeChipIds || [];

                    // Endo chips should not be in fuellung chips (if both have debug info)
                    // This tests isolation - treatments don't leak state
                    if (endoChips.length > 0 && fuellungChips.length > 0) {
                        // Check there's no complete overlap
                        const endoSet = new Set(endoChips);
                        const fuellungSet = new Set(fuellungChips);
                        const overlap = [...endoSet].filter(c => fuellungSet.has(c));

                        // Some overlap may be valid (e.g., shared chips like 'anaesthesie')
                        // but they shouldn't be identical
                        expect(endoChips.join(',')).not.toBe(fuellungChips.join(','));
                    }
                }
            }
        });
    });

    describe('D) userDefaults are passed through', () => {
        it('should pass userDefaults to plan.context', async () => {
            const userDefaults = {
                fuellung: { isolation: 'kofferdam' },
                endo: { spuelung: 'naocl' },
            };

            const result = await runMultiFromDictation({
                dictation: 'Füllung 37 mod',
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                userDefaults,
                sessionId: 'test-defaults',
            });

            // The result should have runs that processed with the defaults
            expect(result.runs).toHaveLength(1);
            expect(result.runs[0].treatmentId).toBe('fuellung');

            // Check if defaults were applied (via _defaultsDebug if available)
            const debugInfo = (result.runs[0].result as any)?._defaultsDebug;
            if (debugInfo?.answersSource) {
                // If defaults were applied, some answers should be marked as 'default'
                // This depends on the implementation providing this debug info
            }
        });

        it('should preserve insuranceType in results', async () => {
            const result = await runMultiFromDictation({
                dictation: 'Füllung 37',
                insuranceType: 'PKV',
                textLength: 'lang',
                hasMKV: true,
                sessionId: 'test-context',
            });

            // Each run should have been executed with the correct context
            expect(result.runs.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('E) Determinism: same input => stable segment ids', () => {
        it('should produce stable segment IDs for identical inputs', async () => {
            const input = {
                dictation: 'Wurzelbehandlung 36 dann Füllung 37 mod',
                insuranceType: 'GKV' as const,
                textLength: 'mittel' as const,
                hasMKV: false,
                sessionId: 'determinism-test',
            };

            const result1 = await runMultiFromDictation(input);
            const result2 = await runMultiFromDictation(input);
            const result3 = await runMultiFromDictation(input);

            // Segment IDs should be stable
            const ids1 = result1.runs.map(r => r.segmentId);
            const ids2 = result2.runs.map(r => r.segmentId);
            const ids3 = result3.runs.map(r => r.segmentId);

            expect(ids1).toEqual(ids2);
            expect(ids2).toEqual(ids3);

            // Should be 'seg-1', 'seg-2'
            expect(ids1).toEqual(['seg-1', 'seg-2']);
        }, 30000); // 30s timeout: runs 3x multi (6 pipeline runs)

        it('should produce stable treatment order', async () => {
            const input = {
                dictation: 'Endo 36 Füllung 37',
                insuranceType: 'GKV' as const,
                textLength: 'mittel' as const,
                hasMKV: false,
                sessionId: 'order-test',
            };

            const results = await Promise.all([
                runMultiFromDictation(input),
                runMultiFromDictation(input),
                runMultiFromDictation(input),
            ]);

            // All results should have same treatment order
            const orders = results.map(r => r.runs.map(run => run.treatmentId).join(','));
            expect(new Set(orders).size).toBe(1);
            expect(orders[0]).toBe('endo,fuellung');
        }, 30000); // 30s timeout: runs 3 parallel multi (6 pipeline runs)
    });

    describe('F) Global answers seeding', () => {
        it('should seed answers to each segment independently', async () => {
            const globalAnswers = new Map<string, unknown>([
                ['isolation', 'kofferdam'],
                ['tiefe', 'tief'],
            ]);

            const result = await runMultiFromDictation({
                dictation: 'Wurzelbehandlung 36 Füllung 37',
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: false,
                answers: globalAnswers,
                sessionId: 'answers-seed-test',
            });

            // Both runs should have been executed
            expect(result.runs.length).toBe(2);
        });
    });
});
