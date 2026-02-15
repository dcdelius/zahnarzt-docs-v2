/**
 * Gate Test: Medical Engine Parity for Deep Filling
 *
 * Verifies that applyMedicalKb produces the same askbacks and chips
 * as the original hardcoded medical layer functions for deep filling scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
    applyMedicalKb,
    evaluateAskbacks,
    getChipIdsFromFacts,
    type TreatmentFacts,
} from '../../medical';

describe('Gate M6: Medical Engine Parity for Deep Filling', () => {
    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 1: Profunda + No Answer → Ueberkappung Askback Required
    // ═══════════════════════════════════════════════════════════════

    describe('Profunda with unknown capping', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'fuellung',
            cariesDepth: 'profunda',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
        };

        it('legacy evaluateAskbacks requires ueberkappung', () => {
            const bundle = evaluateAskbacks(facts);
            expect(bundle.required.length).toBeGreaterThan(0);
            expect(bundle.required.some(q => q.questionKey === 'ueberkappung')).toBe(true);
        });

        it('applyMedicalKb requires ueberkappung', () => {
            const result = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(result.requiredAskbacks.some(id => id.includes('ueberkappung'))).toBe(true);
        });

        it('both agree on chip emission: none for unknown', () => {
            const legacyChips = getChipIdsFromFacts(facts);
            const engineResult = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(legacyChips.length).toBe(0);
            expect(engineResult.emittedChips.length).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 2: Profunda + Capping Yes → cp Chip
    // ═══════════════════════════════════════════════════════════════

    describe('Profunda with capping=yes', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'fuellung',
            cariesDepth: 'profunda',
            capping: { performed: 'yes', material: 'Ca(OH)₂' },
            counseling: { pulpitisRisk: 'yes' },
        };

        it('legacy getChipIdsFromFacts emits cp', () => {
            const chips = getChipIdsFromFacts(facts);
            expect(chips).toContain('cp');
        });

        it('applyMedicalKb emits cp', () => {
            const result = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(result.emittedChips).toContain('cp');
        });

        it('both agree: no more ueberkappung askback needed', () => {
            const legacyBundle = evaluateAskbacks(facts);
            const engineResult = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });

            const legacyUeberkappung = legacyBundle.required.find(q => q.questionKey === 'ueberkappung');
            const engineUeberkappung = engineResult.requiredAskbacks.find(id => id === 'medical_ueberkappung');

            // No ueberkappung askback since it's already answered
            expect(legacyUeberkappung).toBeUndefined();
            expect(engineUeberkappung).toBeUndefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 3: Profunda + Capping No → cp_not_required Chip
    // ═══════════════════════════════════════════════════════════════

    describe('Profunda with capping=no', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'fuellung',
            cariesDepth: 'profunda',
            capping: { performed: 'no' },
            counseling: { pulpitisRisk: 'yes' },
        };

        it('legacy getChipIdsFromFacts emits cp_not_required', () => {
            const chips = getChipIdsFromFacts(facts);
            expect(chips).toContain('cp_not_required');
        });

        it('applyMedicalKb emits cp_not_required', () => {
            const result = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(result.emittedChips).toContain('cp_not_required');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 4: Normal Caries → No Medical Askbacks or Chips
    // ═══════════════════════════════════════════════════════════════

    describe('Normal caries depth', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'fuellung',
            cariesDepth: 'normal',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
        };

        it('legacy evaluateAskbacks returns no required askbacks', () => {
            const bundle = evaluateAskbacks(facts);
            expect(bundle.required.length).toBe(0);
        });

        it('applyMedicalKb returns no required askbacks', () => {
            const result = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            // Engine may still fire rules but not for ueberkappung
            expect(result.requiredAskbacks.filter(id => id.includes('ueberkappung'))).toHaveLength(0);
        });

        it('no chips emitted for normal depth', () => {
            const legacyChips = getChipIdsFromFacts(facts);
            const engineResult = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'fuellung',
            });
            expect(legacyChips.filter(c => c.startsWith('cp'))).toHaveLength(0);
            expect(engineResult.emittedChips.filter(c => c.startsWith('cp'))).toHaveLength(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 5: Defaults applied by engine
    // ═══════════════════════════════════════════════════════════════

    describe('Defaults application', () => {
        it('engine applies pulpitisRisk default for profunda', () => {
            const facts = {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
            };

            const result = applyMedicalKb({
                facts: facts as Record<string, unknown>,
                treatmentId: 'fuellung',
            });

            // Facts should be updated with default
            const counseling = result.facts.counseling as { pulpitisRisk?: string };
            expect(counseling?.pulpitisRisk).toBe('yes');
            expect(result.trace.appliedDefaults).toContain('default-pulpitis-risk-profunda');
        });

        it('engine does not override existing pulpitisRisk value', () => {
            const facts = {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'no' }, // Already set
            };

            const result = applyMedicalKb({
                facts: facts as Record<string, unknown>,
                treatmentId: 'fuellung',
            });

            // Default should NOT override
            const counseling = result.facts.counseling as { pulpitisRisk?: string };
            expect(counseling?.pulpitisRisk).toBe('no');
            expect(result.trace.appliedDefaults).not.toContain('default-pulpitis-risk-profunda');
        });
    });
});
