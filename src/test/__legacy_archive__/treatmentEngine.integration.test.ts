/**
 * Integration Tests für TreatmentEngine
 * 
 * Verifiziert alle Fälle aus REFERENZ_KOMPOSITFUELLUNG.md
 * 
 * KORRIGIERTE Struktur:
 * - billingCodes ist string[] nicht {code: string}[]
 * - Punkte aus Katalog: BEMA 40 = 8, BEMA 12 = 10, BEMA 25 = 15
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    loadTreatmentJSON,
    lookupBillingCode,
    processChipsToBilling,
    getDefaultActiveChipsFromJSON
} from '../docudent/core/billing/knowledgeBase/logic/treatmentEngine';

describe('TreatmentEngine Integration Tests (REFERENZ_KOMPOSITFUELLUNG.md)', () => {

    beforeAll(() => {
        loadTreatmentJSON('fuellung');
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 1: GKV Standard (Kassenleistung)
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 1: GKV Standard - BEMA Kassenleistung', () => {

        it('Zahn 36 do: BEMA 13b + 41a + 12', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_leitung', 'kofferdam', 'komposit_basic'],
                'GKV',
                false,
                { surfaces: ['d', 'o'], tooth: '36' }
            );

            // billingCodes ist string[]!
            expect(result.billingCodes).toContain('BEMA_41a');
            expect(result.billingCodes).toContain('BEMA_12');
            expect(result.billingCodes).toContain('BEMA_13b');
            expect(result.billingCodes).not.toContain('GOZ_2197');
        });

        it('GKV Standard: BEMA 13 für einflächig', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['komposit_basic'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '16' }
            );

            expect(result.billingCodes).toContain('BEMA_13');
        });

        it('GKV Standard: BEMA 13c für dreiflächig (mod)', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['komposit_basic'],
                'GKV',
                false,
                { surfaces: ['m', 'o', 'd'], tooth: '26' }
            );

            expect(result.billingCodes).toContain('BEMA_13c');
        });

        it('GKV Standard: BEMA 13d für mehr als 3-flächig', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['komposit_basic'],
                'GKV',
                false,
                { surfaces: ['m', 'o', 'd', 'b'], tooth: '46' }
            );

            expect(result.billingCodes).toContain('BEMA_13d');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 2: GKV mit Mehrkostenvereinbarung (MKV)
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 2: GKV mit Mehrkostenvereinbarung (MKV)', () => {

        it('GKV + MKV: BEMA + GOZ 2197 (Adhäsivtechnik)', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['komposit_basic', 'mehrschicht'],
                'GKV',
                true, // hasMKV = true
                { surfaces: ['m', 'o'], tooth: '16' }
            );

            expect(result.billingCodes).toContain('BEMA_13b');
            expect(result.billingCodes).toContain('GOZ_2197');
        });

        it('GKV + MKV + Kofferdam: BEMA 12 + 13 + GOZ 2197', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['kofferdam', 'komposit_basic', 'mehrschicht'],
                'GKV',
                true,
                { surfaces: ['o', 'd'], tooth: '36' }
            );

            expect(result.billingCodes).toContain('BEMA_12');
            expect(result.billingCodes).toContain('BEMA_13b');
            expect(result.billingCodes).toContain('GOZ_2197');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 3: PKV - Komplette GOZ Abrechnung
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 3: PKV - Komplette GOZ Abrechnung', () => {

        it('PKV: GOZ 2080 für zweiflächig (KEIN GOZ 2197!)', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_infiltr', 'kofferdam', 'komposit_basic'],
                'PKV',
                false,
                { surfaces: ['m', 'o'], tooth: '16' }
            );

            expect(result.billingCodes).toContain('GOZ_0090');
            expect(result.billingCodes).toContain('GOZ_2040');
            expect(result.billingCodes).toContain('GOZ_2080');
            expect(result.billingCodes).not.toContain('GOZ_2197');
        });

        it('PKV: GOZ 2060 für einflächig', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['komposit_basic'],
                'PKV',
                false,
                { surfaces: ['o'], tooth: '46' }
            );

            expect(result.billingCodes).toContain('GOZ_2060');
        });

        it('PKV: GOZ 2100 für dreiflächig', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['komposit_basic'],
                'PKV',
                false,
                { surfaces: ['m', 'o', 'd'], tooth: '26' }
            );

            expect(result.billingCodes).toContain('GOZ_2100');
        });

        it('PKV: GOZ 2120 für mehr als 3-flächig', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['komposit_basic'],
                'PKV',
                false,
                { surfaces: ['m', 'o', 'd', 'b'], tooth: '16' }
            );

            expect(result.billingCodes).toContain('GOZ_2120');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 4: Überkappung (Cp/P)
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 4: Überkappung bei tiefer Karies', () => {

        it('GKV: BEMA 25 für indirekte Überkappung (Cp)', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['cp', 'komposit_basic'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '36' }
            );

            expect(result.billingCodes).toContain('BEMA_25');
            expect(result.billingCodes).toContain('BEMA_13');
        });

        it('GKV: BEMA 26 für direkte Überkappung (P)', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['p', 'komposit_basic'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '46' }
            );

            expect(result.billingCodes).toContain('BEMA_26');
        });

        it('PKV: GOZ 2330 für indirekte Überkappung', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['cp', 'komposit_basic'],
                'PKV',
                false,
                { surfaces: ['o'], tooth: '16' }
            );

            expect(result.billingCodes).toContain('GOZ_2330');
        });

        it('PKV: GOZ 2340 für direkte Überkappung', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['p', 'komposit_basic'],
                'PKV',
                false,
                { surfaces: ['o'], tooth: '26' }
            );

            expect(result.billingCodes).toContain('GOZ_2340');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 5: Anästhesiearten
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 5: Anästhesiearten', () => {

        it('GKV Infiltration: BEMA 40', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_infiltr', 'komposit_basic'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '16' }
            );
            expect(result.billingCodes).toContain('BEMA_40');
        });

        it('GKV Leitung: BEMA 41a', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_leitung', 'komposit_basic'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '36' }
            );
            expect(result.billingCodes).toContain('BEMA_41a');
        });

        it('PKV Infiltration: GOZ 0090', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_infiltr', 'komposit_basic'],
                'PKV',
                false,
                { surfaces: ['o'], tooth: '16' }
            );
            expect(result.billingCodes).toContain('GOZ_0090');
        });

        it('PKV Leitung: GOZ 0100', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_leitung', 'komposit_basic'],
                'PKV',
                false,
                { surfaces: ['o'], tooth: '36' }
            );
            expect(result.billingCodes).toContain('GOZ_0100');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 6: Katalog-Werte (verifizierte Werte aus bema.json)
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 6: Katalog-Werte korrekt', () => {

        it('BEMA Punkte aus Katalog', () => {
            expect(lookupBillingCode('BEMA_40')?.punkte).toBe(8);    // Infiltration
            expect(lookupBillingCode('BEMA_41a')?.punkte).toBe(12);  // Leitung (aktueller Katalogwert)
            expect(lookupBillingCode('BEMA_12')?.punkte).toBe(10);   // Kofferdam (aktueller Wert!)
            expect(lookupBillingCode('BEMA_25')?.punkte).toBe(15);   // Cp
            expect(lookupBillingCode('BEMA_13b')?.punkte).toBe(45);  // 2-flächig
        });

        it('GOZ Honorar aus Katalog', () => {
            const goz2080 = lookupBillingCode('GOZ_2080');
            expect(goz2080).toBeDefined();
            expect(goz2080?.betrag_23).toBeGreaterThan(0);

            const goz2197 = lookupBillingCode('GOZ_2197');
            expect(goz2197).toBeDefined();
            expect(goz2197?.betrag_23).toBeGreaterThan(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 7: Text-Generierung
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 7: Text-Generierung', () => {

        it('Generiert Text für aktivierte Chips', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_infiltr', 'kofferdam', 'komposit_basic', 'finishing'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '16' }
            );

            expect(result.textLines.length).toBeGreaterThan(0);
        });

        it('Mehrschicht-Chip erzeugt Mehrschicht-Text', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['mehrschicht'],
                'GKV',
                true,
                { surfaces: ['m', 'o'], tooth: '16' }
            );

            const hasMultilayer = result.textLines.some(line =>
                line.toLowerCase().includes('mehrschicht') ||
                line.toLowerCase().includes('schicht')
            );
            expect(hasMultilayer).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 8: Dokumentationshinweise
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 8: Dokumentationshinweise', () => {

        it('Cp: Warnung wegen Material-Dokumentation', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['cp', 'komposit_basic'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '16' }
            );

            const hasDocWarning = result.warnings.some(w =>
                w.toLowerCase().includes('material')
            );
            expect(hasDocWarning).toBe(true);
        });

        it('Kofferdam: Warnung wegen Dokumentationspflicht', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['kofferdam', 'komposit_basic'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '16' }
            );

            const hasKofferdamWarning = result.warnings.some(w =>
                w.toLowerCase().includes('kofferdam')
            );
            expect(hasKofferdamWarning).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 9: Versicherungstyp-Trennung
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 9: Versicherungstyp-Trennung', () => {

        it('PKV: Nur GOZ, keine BEMA', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_infiltr', 'kofferdam', 'komposit_basic'],
                'PKV',
                false,
                { surfaces: ['m', 'o'], tooth: '16' }
            );

            const bemaCodes = result.billingCodes.filter(c => c.startsWith('BEMA_'));
            const gozCodes = result.billingCodes.filter(c => c.startsWith('GOZ_'));

            expect(bemaCodes).toHaveLength(0);
            expect(gozCodes.length).toBeGreaterThan(0);
        });

        it('GKV ohne MKV: Nur BEMA, keine GOZ', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_infiltr', 'kofferdam', 'komposit_basic'],
                'GKV',
                false,
                { surfaces: ['m', 'o'], tooth: '16' }
            );

            const bemaCodes = result.billingCodes.filter(c => c.startsWith('BEMA_'));
            const gozCodes = result.billingCodes.filter(c => c.startsWith('GOZ_'));

            expect(bemaCodes.length).toBeGreaterThan(0);
            expect(gozCodes).toHaveLength(0);
        });

        it('GKV mit MKV: BEMA + GOZ 2197', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['la_infiltr', 'mehrschicht'],
                'GKV',
                true, // MKV!
                { surfaces: ['m', 'o'], tooth: '16' }
            );

            const bemaCodes = result.billingCodes.filter(c => c.startsWith('BEMA_'));
            const gozCodes = result.billingCodes.filter(c => c.startsWith('GOZ_'));

            expect(bemaCodes.length).toBeGreaterThan(0);
            expect(gozCodes).toContain('GOZ_2197');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FALL 10: Rückgabestruktur
    // ═══════════════════════════════════════════════════════════════
    describe('Fall 10: Rückgabestruktur', () => {

        it('Vollständige Struktur', () => {
            const result = processChipsToBilling(
                'fuellung',
                ['komposit_basic'],
                'GKV',
                false,
                { surfaces: ['o'], tooth: '16' }
            );

            expect(result).toHaveProperty('billingCodes');
            expect(result).toHaveProperty('textLines');
            expect(result).toHaveProperty('warnings');
            expect(result).toHaveProperty('optimierungen');
            expect(result).toHaveProperty('billingDetails');
            expect(Array.isArray(result.billingCodes)).toBe(true);
        });
    });
});
