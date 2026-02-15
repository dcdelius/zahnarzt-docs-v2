import { describe, it, expect } from 'vitest';
import { applyAnswersToFacts } from '../../facts/applyAnswersToFacts';
import type { TreatmentFacts } from '../../facts/types';

describe('applyAnswersToFacts', () => {
    it('derives cavityExtentHint from surface answers', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'fuellung',
            cariesDepth: 'unknown',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
        };

        const answers = new Map<string, unknown>([
            ['surfaces', 'm,o,d'],
        ]);

        const updated = applyAnswersToFacts(facts, answers);

        expect(updated.surfaces).toEqual(['m', 'o', 'd']);
        expect(updated.cavityExtentHint).toBe('large');
    });

    it('applies wound care answer for extraction', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'extraction',
            cariesDepth: 'unknown',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
        };

        const answers = new Map<string, unknown>([
            ['wound_care', 'yes'],
        ]);

        const updated = applyAnswersToFacts(facts, answers);

        expect(updated.woundCare).toBe(true);
    });

    it('applies PZR answers', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'pzr',
            cariesDepth: 'unknown',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
        };

        const answers = new Map<string, unknown>([
            ['pzr_zahnstein', 'ja'],
            ['pzr_fluoridation', 'no'],
        ]);

        const updated = applyAnswersToFacts(facts, answers);

        expect(updated.pzr?.zahnsteinEntfernung).toBe(true);
        expect(updated.pzr?.fluoridation).toBe(false);
    });

    it('applies crown prep answers', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'crown_prep',
            cariesDepth: 'unknown',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
        };

        const answers = new Map<string, unknown>([
            ['crown_prep_preparation', 'yes'],
            ['crown_prep_impression', 'ja'],
            ['crown_prep_provisional', 'nein'],
        ]);

        const updated = applyAnswersToFacts(facts, answers);

        expect(updated.crownPrep?.preparation).toBe(true);
        expect(updated.crownPrep?.impression).toBe(true);
        expect(updated.crownPrep?.provisional).toBe(false);
    });

    it('normalizes fluoridation and surface anesthesia answers', () => {
        const facts: TreatmentFacts = {
            treatmentId: 'fuellung',
            cariesDepth: 'unknown',
            capping: { performed: 'unknown' },
            counseling: { pulpitisRisk: 'unknown' },
        };

        const answers = new Map<string, unknown>([
            ['fluoridation', 'no'],
            ['surface_anesthesia', 'ja'],
        ]);

        const updated = applyAnswersToFacts(facts, answers);

        expect(updated.fuellung?.fluoridation).toBe(false);
        expect(updated.surfaceAnesthesia).toBe(true);
    });
});
