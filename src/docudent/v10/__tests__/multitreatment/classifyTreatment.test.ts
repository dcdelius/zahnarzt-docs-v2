import { describe, expect, it } from 'vitest';
import { classifyTreatmentId } from '../../multitreatment/classifyTreatment';

describe('classifyTreatmentId', () => {
    it('does not classify words containing "ex" as extraction', () => {
        const classification = classifyTreatmentId('Der aesthetische Wunsch wurde explizit genannt, Kompositversorgung an 16.');
        expect(classification.treatmentId).toBe('fuellung');
    });

    it('classifies explicit extraction shorthand as extraction', () => {
        const classification = classifyTreatmentId('EX 48 mit Luxation und Alveolenrevision erfolgt.');
        expect(classification.treatmentId).toBe('extraction');
    });
});
