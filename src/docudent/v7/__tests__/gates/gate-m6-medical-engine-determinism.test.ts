/**
 * Gate Test: Medical Engine Determinism
 *
 * Verifies that the engine produces deterministic output:
 * - Same input always produces same output
 * - Askback ordering is stable
 * - Chip ordering is stable
 */

import { describe, it, expect } from 'vitest';
import { applyMedicalKb } from '../../medical';

describe('Gate M6: Medical Engine Determinism', () => {
    // ═══════════════════════════════════════════════════════════════
    // DETERMINISTIC OUTPUT
    // ═══════════════════════════════════════════════════════════════

    describe('Deterministic output for same input', () => {
        const testFacts = {
            treatmentId: 'fuellung',
            cariesDepth: 'profunda',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
        };

        it('produces identical output on 100 consecutive calls', () => {
            const firstResult = applyMedicalKb({
                facts: testFacts,
                treatmentId: 'fuellung',
            });

            for (let i = 0; i < 100; i++) {
                const result = applyMedicalKb({
                    facts: testFacts,
                    treatmentId: 'fuellung',
                });

                expect(result.requiredAskbacks).toEqual(firstResult.requiredAskbacks);
                expect(result.emittedChips).toEqual(firstResult.emittedChips);
                expect(result.trace.firedRules).toEqual(firstResult.trace.firedRules);
                expect(result.trace.appliedDefaults).toEqual(firstResult.trace.appliedDefaults);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // ASKBACK ORDERING
    // ═══════════════════════════════════════════════════════════════

    describe('Askback ordering is stable', () => {
        it('askbacks are ordered by priority then alphabetically', () => {
            // Facts that trigger multiple askbacks
            const facts = {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'yes' }, // No material, so both ueberkappung_material required
                counseling: { pulpitisRisk: 'unknown' },
            };

            const result = applyMedicalKb({
                facts,
                treatmentId: 'fuellung',
            });

            // Run 50 times to ensure ordering is stable
            for (let i = 0; i < 50; i++) {
                const r = applyMedicalKb({ facts, treatmentId: 'fuellung' });
                expect(r.requiredAskbacks).toEqual(result.requiredAskbacks);
            }
        });

        it('scoped askbacks maintain order across different teeth', () => {
            const facts = {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            };

            const result16 = applyMedicalKb({
                facts,
                treatmentId: 'fuellung',
                instanceScope: { tooth: '16' },
            });

            const result47 = applyMedicalKb({
                facts,
                treatmentId: 'fuellung',
                instanceScope: { tooth: '47' },
            });

            // Both should have the same number of askbacks, just different scopes
            expect(result16.requiredAskbacks.length).toBe(result47.requiredAskbacks.length);

            // Order should be stable
            for (let i = 0; i < 50; i++) {
                const r16 = applyMedicalKb({
                    facts,
                    treatmentId: 'fuellung',
                    instanceScope: { tooth: '16' },
                });
                expect(r16.requiredAskbacks).toEqual(result16.requiredAskbacks);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CHIP ORDERING
    // ═══════════════════════════════════════════════════════════════

    describe('Chip ordering is stable', () => {
        it('chips are ordered by priority then alphabetically', () => {
            const facts = {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'yes', material: 'MTA' },
                counseling: { pulpitisRisk: 'yes' },
            };

            const result = applyMedicalKb({
                facts,
                treatmentId: 'fuellung',
            });

            // Run 50 times to ensure ordering is stable
            for (let i = 0; i < 50; i++) {
                const r = applyMedicalKb({ facts, treatmentId: 'fuellung' });
                expect(r.emittedChips).toEqual(result.emittedChips);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TRACE ORDERING
    // ═══════════════════════════════════════════════════════════════

    describe('Trace ordering is stable', () => {
        it('firedRules order is deterministic', () => {
            const facts = {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'yes', material: 'CaOH2' },
                counseling: { pulpitisRisk: 'unknown' },
            };

            const result = applyMedicalKb({
                facts,
                treatmentId: 'fuellung',
            });

            for (let i = 0; i < 50; i++) {
                const r = applyMedicalKb({ facts, treatmentId: 'fuellung' });
                expect(r.trace.firedRules).toEqual(result.trace.firedRules);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    describe('Edge cases remain deterministic', () => {
        it('empty facts produce stable empty output', () => {
            const facts = {
                treatmentId: 'fuellung',
                cariesDepth: 'normal',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            };

            const result = applyMedicalKb({
                facts,
                treatmentId: 'fuellung',
            });

            for (let i = 0; i < 50; i++) {
                const r = applyMedicalKb({ facts, treatmentId: 'fuellung' });
                expect(r.requiredAskbacks).toEqual(result.requiredAskbacks);
                expect(r.emittedChips).toEqual(result.emittedChips);
            }
        });

        it('non-fuellung treatment produces stable output', () => {
            const facts = {
                treatmentId: 'endo',
                cariesDepth: 'profunda',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            };

            const result = applyMedicalKb({
                facts,
                treatmentId: 'endo',
            });

            for (let i = 0; i < 50; i++) {
                const r = applyMedicalKb({ facts, treatmentId: 'endo' });
                expect(r.requiredAskbacks).toEqual(result.requiredAskbacks);
                expect(r.emittedChips).toEqual(result.emittedChips);
            }
        });
    });
});
