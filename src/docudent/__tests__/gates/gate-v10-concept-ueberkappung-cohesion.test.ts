/**
 * Gate: Überkappung concept cohesion (single-entry effects)
 *
 * Ensures concept-driven askbacks + chips are emitted together
 * (no fragmentation across rules/files).
 */

import { describe, it, expect } from 'vitest';
import { applyMedicalKb } from '../../medical_kb/engine/applyMedicalKb';

describe('Gate: Überkappung concept cohesion', () => {
    it('Profunda + unknown capping → requires ueberkappung askback', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'unknown' },
            },
        });

        expect(result.requiredAskbacks).toContain('medical_ueberkappung');
        expect(result.trace.firedConcepts.some(id => id.includes('concept:indirect-capping'))).toBe(true);
        expect(result.trace.firedConcepts.some(id => id.includes('concept:direct-capping'))).toBe(true);
    });

    it('Überkappung yes + pulpaClosed → cp chip + material askback', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'yes', material: 'unknown' },
                pulpaOpened: false,
            },
        });

        expect(result.requiredAskbacks).toContain('medical_ueberkappung_material');
        expect(result.emittedChips).toContain('cp');
        expect(result.trace.firedConcepts).toContain('concept:indirect-capping:indirect_cp');
    });

    it('Überkappung yes + pulpaOpened → p chip + material askback', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                cariesDepth: 'profunda',
                capping: { performed: 'yes', material: 'unknown' },
                pulpaOpened: true,
            },
        });

        expect(result.requiredAskbacks).toContain('medical_ueberkappung_material');
        expect(result.emittedChips).toContain('p');
        expect(result.trace.firedConcepts).toContain('concept:direct-capping:direct_p');
    });
});
