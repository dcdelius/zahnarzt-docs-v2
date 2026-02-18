import { describe, expect, it } from 'vitest';
import { classifyTreatmentId, detectTreatmentSignals } from '../../multitreatment/classifyTreatment';

describe('classifyTreatmentId', () => {
    it('classifies crown preparation wording as crown_prep', () => {
        const classification = classifyTreatmentId('Zahn 16 fuer Krone beschliffen und Provisorium eingesetzt.');
        expect(classification.treatmentId).toBe('crown_prep');
    });

    it('does not classify extraction as crown prep when support words are present', () => {
        const classification = classifyTreatmentId('Extraktion Zahn 28 mit Luxation, anschliessend Provisorium zur Wundabdeckung.');
        expect(classification.treatmentId).toBe('extraction');
    });

    it('does not classify support words alone as crown prep', () => {
        const classification = classifyTreatmentId('Provisorium kontrolliert, Verlauf unauffaellig.');
        expect(classification.treatmentId).toBe('fuellung');
        expect(classification.confidence).toBe('low');
    });

    it('does not classify support words with tooth reference as crown prep', () => {
        const classification = classifyTreatmentId('Zahn 16 Provisorium kontrolliert, Verlauf unauffaellig.');
        expect(classification.treatmentId).toBe('fuellung');
        expect(classification.confidence).toBe('low');
    });

    it('does not classify words containing "ex" as extraction', () => {
        const classification = classifyTreatmentId('Der aesthetische Wunsch wurde explizit genannt, Kompositversorgung an 16.');
        expect(classification.treatmentId).toBe('fuellung');
    });

    it('classifies explicit extraction shorthand as extraction', () => {
        const classification = classifyTreatmentId('EX 48 mit Luxation und Alveolenrevision erfolgt.');
        expect(classification.treatmentId).toBe('extraction');
    });

    it('detects endo reliably in flowing wording with trepaniert and kanaele', () => {
        const classification = classifyTreatmentId(
            'Zahn 27 wurde trepaniert, Kanaele aufbereitet und mit NaOCl gespuelt.'
        );
        expect(classification.treatmentId).toBe('endo');
    });

    it('suppresses fuellung signal in crown prep plus OPG context without explicit fuellung wording', () => {
        const signals = detectTreatmentSignals(
            'Zahn 11 fuer Krone praepariert, abgeformt, provisorisch versorgt; zusaetzlich OPG angefertigt.'
        );
        expect(signals.some((signal) => signal.treatmentId === 'fuellung')).toBe(false);
    });
});
