/**
 * Gate M12.2: testOnly Fixtures Smoke Test
 *
 * GATE DEFINITION:
 * testOnly overrides must work in test mode and be ignored in production.
 */

import { describe, it, expect } from 'vitest';
import {
    isTestMode,
    getTestOnlyOverrides,
} from '../../../v10/testOnly';

describe('Gate M12.2: testOnly Fixtures Smoke', () => {
    describe('isTestMode', () => {
        it('returns true in vitest environment', () => {
            // We're running in vitest, so this should be true
            expect(isTestMode()).toBe(true);
        });
    });

    describe('getTestOnlyOverrides', () => {
        it('returns no overrides when testOnly is undefined', () => {
            const result = getTestOnlyOverrides(undefined);

            expect(result.applied).toBe(false);
            expect(result.appliedTypes).toHaveLength(0);
            expect(result.skipCombinability).toBe(false);
        });

        it('returns extraction override when forceExtraction provided', () => {
            const result = getTestOnlyOverrides({
                enabled: true,
                forceExtraction: { tooth: '16', surfaces: ['m', 'o', 'd'] },
            });

            expect(result.applied).toBe(true);
            expect(result.appliedTypes).toContain('extraction');
            expect(result.extraction).toEqual({ tooth: '16', surfaces: ['m', 'o', 'd'] });
        });

        it('returns chips override when forceChips provided', () => {
            const result = getTestOnlyOverrides({
                enabled: true,
                forceChips: ['BEMA_13a', 'BEMA_28'],
            });

            expect(result.applied).toBe(true);
            expect(result.appliedTypes).toContain('chips');
            expect(result.chips).toEqual(['BEMA_13a', 'BEMA_28']);
        });

        it('returns skipCombinability flag', () => {
            const result = getTestOnlyOverrides({
                enabled: true,
                skipCombinability: true,
            });

            expect(result.applied).toBe(true);
            expect(result.appliedTypes).toContain('skipCombinability');
            expect(result.skipCombinability).toBe(true);
        });

        it('returns multiple overrides when provided', () => {
            const result = getTestOnlyOverrides({
                enabled: true,
                forceExtraction: { tooth: '16' },
                forceChips: ['BEMA_13a'],
                skipCombinability: true,
            });

            expect(result.applied).toBe(true);
            expect(result.appliedTypes).toContain('extraction');
            expect(result.appliedTypes).toContain('chips');
            expect(result.appliedTypes).toContain('skipCombinability');
        });
    });

    describe('testOnly integration with V10 pipeline', () => {
        it('testOnly.forceExtraction overrides extraction', async () => {
            const { runV10 } = await import('../../../v10');

            const result = await runV10({
                dictation: 'Some random text',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
                testOnly: {
                    enabled: true,
                    forceExtraction: {
                        tooth: '99', // Invalid tooth, but forced
                        surfaces: ['x', 'y', 'z'],
                    },
                },
            });

            // Should have testOnlyApplied flag
            expect(result.meta.testOnlyApplied).toBe(true);

            // Trace should include testOnly marker
            const hasTestOnlyMarker = result.meta.traceLines?.some(
                line => line.startsWith('testOnly:')
            );
            expect(hasTestOnlyMarker).toBe(true);
        });

        it('testOnly.forceChips overrides chip emission', async () => {
            const { runV10 } = await import('../../../v10');

            const result = await runV10({
                dictation: 'Zahn 16 Karies',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['medical_anesthesia', 'nein'],
                    ['medical_vitality', 'positiv'],
                ]),
                testOnly: {
                    enabled: true,
                    forceChips: ['BEMA_13a'],
                    skipCombinability: true,
                },
            });

            if (result.state === 'output') {
                // Billing codes should reflect forced chips
                expect(result.output?.billingCodes).toContain('BEMA_13a');
            }
        });
    });
});
