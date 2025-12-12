import { describe, it, expect } from 'vitest';
import { normalizeExtractedData } from '../normalizeExtractedData';
import { MASTER_TEMPLATE_V3 } from '../../../data/masterTemplate';

describe('normalizeExtractedData', () => {
    it('normalizes tooth notation with dots', () => {
        const { normalized, warnings } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            tooth: '1.6'
        });

        expect(normalized.tooth).toBe('16');
        expect(warnings.length).toBe(0);
    });

    it('rejects invalid FDI notation', () => {
        const { normalized, warnings } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            tooth: '99'
        });

        expect(normalized.tooth).toBeUndefined();
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].field).toBe('tooth');
        expect(warnings[0].reason).toContain('Invalid FDI');
    });

    it('normalizes surfaces from string notation', () => {
        const { normalized } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            surfaces: 'mod'
        });

        expect(normalized.surfaces).toEqual(['m', 'o', 'd']);
    });

    it('normalizes anesthesia synonyms', () => {
        const { normalized } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            anesthesia: 'ILA'
        });

        expect(normalized.anesthesia).toBe('Infiltration');
    });

    it('normalizes "keine Spritze" to "Keine"', () => {
        const { normalized } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            anesthesia: 'keine Spritze'
        });

        expect(normalized.anesthesia).toBe('Keine');
    });

    it('warns on invalid enum values', () => {
        const { normalized, warnings } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            anesthesia: 'Vollnarkose'
        });

        expect(normalized.anesthesia).toBeUndefined();
        expect(warnings.some(w => w.field === 'anesthesia')).toBe(true);
    });

    it('filters invalid surfaces', () => {
        const { normalized, warnings } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            surfaces: ['m', 'o', 'invalid', 'x']
        });

        // normalizeSurfaces filters silently for surfaces field
        expect(normalized.surfaces).toEqual(['m', 'o']);
        // No warning for surfaces filtering (only for complete failure)
    });

    it('normalizes boolean values from strings', () => {
        const { normalized } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            matrix: 'ja',
            adhesive: 'true'
        });

        expect(normalized.matrix).toBe(true);
        expect(normalized.adhesive).toBe(true);
    });

    it('handles complex extraction with multiple normalization', () => {
        const { normalized, warnings } = normalizeExtractedData(MASTER_TEMPLATE_V3, {
            tooth: '1.6',
            surfaces: 'mod',
            anesthesia: 'ILA',
            material: 'Tetric',
            matrix: 'ja',
            adhesive: true
        });

        expect(normalized.tooth).toBe('16');
        expect(normalized.surfaces).toEqual(['m', 'o', 'd']);
        expect(normalized.anesthesia).toBe('Infiltration');
        expect(normalized.material).toBe('Tetric');
        expect(normalized.matrix).toBe(true);
        expect(normalized.adhesive).toBe(true);
        expect(warnings.length).toBe(0);
    });
});
