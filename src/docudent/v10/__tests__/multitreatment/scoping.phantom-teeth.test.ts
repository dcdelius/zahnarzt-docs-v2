/**
 * Scoping Phantom Tooth Tests
 * 
 * Verifies that prices, dates, and times are NOT extracted as teeth.
 */

import { describe, it, expect } from 'vitest';
import { scopeExtractionToInstances } from '../../multitreatment/scoping';

describe('Phantom Tooth Prevention', () => {
    describe('Endo root-canal values should not create phantom teeth', () => {
        it('should not infer tooth 21 from "D 21" working-length value', () => {
            const result = scopeExtractionToInstances(
                'Zahn 36. Zweiter Termin. Arbeitslängen per Apex Locator: MB 20, ML 19, D 21. NaOCl + EDTA.',
                'endo'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['36']);
        });

        it('should keep explicit endo tooth references', () => {
            const result = scopeExtractionToInstances(
                'Endo Zahn 21. Arbeitslängen per Apex Locator: MB 20, D 21. NaOCl Spülung.',
                'endo'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['21']);
        });
    });

    describe('Prices should not create phantom teeth', () => {
        it('should not parse "120€" as tooth 12 or 20', () => {
            const result = scopeExtractionToInstances(
                'Zahn 27 mod Komposit, 120€ Mehrkosten',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['27']);
        });

        it('should not parse "150 Euro" as tooth 15', () => {
            const result = scopeExtractionToInstances(
                'Zahn 36 okklusal, Mehrkosten 150 Euro',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['36']);
        });

        it('should not parse "320€" as tooth 32', () => {
            const result = scopeExtractionToInstances(
                'Zahn 46 mod 320€',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['46']);
        });
    });

    describe('Dates should not create phantom teeth', () => {
        it('should not parse "2024" as tooth 20 or 24', () => {
            const result = scopeExtractionToInstances(
                'Zahn 27 vom 2024-01-15',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['27']);
        });
    });

    describe('Times should not create phantom teeth', () => {
        it('should not parse "12:30" as tooth 12 or 30', () => {
            const result = scopeExtractionToInstances(
                'Zahn 36 Termin 12:30',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['36']);
        });
    });

    describe('Multi-digit numbers should not create phantom teeth', () => {
        it('should not parse "100" or "200" as teeth', () => {
            const result = scopeExtractionToInstances(
                'Zahn 27 mod 100mg Medikament',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['27']);
        });
    });

    describe('Valid teeth should still be extracted', () => {
        it('should extract single tooth correctly', () => {
            const result = scopeExtractionToInstances(
                'Zahn 27 mod mit Anästhesie',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['27']);
        });

        it('should extract multiple teeth correctly', () => {
            const result = scopeExtractionToInstances(
                'Zahn 27 mod; Zahn 36 okklusal',
                'fuellung'
            );

            expect(result.instances.length).toBe(2);
            const allTeeth = result.instances.flatMap(i => i.teeth);
            expect(allTeeth).toContain('27');
            expect(allTeeth).toContain('36');
        });

        it('should extract tooth without "Zahn" prefix', () => {
            const result = scopeExtractionToInstances(
                '27 mod Komposit',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['27']);
        });
    });

    describe('Edge cases', () => {
        it('should handle complex dictation with price and multiple teeth', () => {
            const result = scopeExtractionToInstances(
                'Zahn 27 mod mit Anästhesie, tief, 120€ Mehrkosten',
                'fuellung'
            );

            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['27']);
            expect(result.instances[0].surfaces).toEqual(expect.arrayContaining(['m', 'o', 'd']));
        });

        it('should not parse tooth numbers outside FDI range (49, 50, etc)', () => {
            const result = scopeExtractionToInstances(
                'Zahn 49 nicht vorhanden',
                'fuellung'
            );

            // Should fallback to unknown since 49 is not valid FDI
            expect(result.instances.length).toBe(1);
            expect(result.instances[0].teeth).toEqual(['unknown']);
        });
    });
});
