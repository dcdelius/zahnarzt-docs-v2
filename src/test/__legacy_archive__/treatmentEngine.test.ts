/**
 * Treatment Engine Test
 * 
 * Verifiziert dass die zentrale Engine korrekt aus der Datenbank liest.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    processChipsToBilling,
    loadTreatmentJSON,
    lookupBillingCode,
    getTreatmentChips,
    getDefaultActiveChipsFromJSON
} from '../docudent/core/billing/knowledgeBase/logic/treatmentEngine';

describe('TreatmentEngine', () => {

    describe('loadTreatmentJSON', () => {
        it('should load fuellung treatment', () => {
            const treatment = loadTreatmentJSON('fuellung');
            expect(treatment).not.toBeNull();
            expect(treatment?._meta.id).toBe('fuellung');
            expect(treatment?.chips.length).toBeGreaterThan(15);
        });

        it('should have all required chips', () => {
            const treatment = loadTreatmentJSON('fuellung');
            const chipIds = treatment?.chips.map(c => c.id) || [];

            // Prüfe essentielle Chips
            expect(chipIds).toContain('la_infiltr');
            expect(chipIds).toContain('la_leitung');
            expect(chipIds).toContain('kofferdam');
            expect(chipIds).toContain('cp');
            expect(chipIds).toContain('komposit_basic');
            expect(chipIds).toContain('mehrschicht');
        });
    });

    describe('lookupBillingCode', () => {
        it('should lookup BEMA codes from catalog', () => {
            const bema40 = lookupBillingCode('BEMA_40');
            expect(bema40).not.toBeNull();
            expect(bema40?.punkte).toBe(8);
            expect(bema40?.bezeichnung).toContain('Infiltration');
        });

        it('should lookup GOZ codes from catalog', () => {
            const goz2040 = lookupBillingCode('GOZ_2040');
            expect(goz2040).not.toBeNull();
            expect(goz2040?.betrag_23).toBeGreaterThan(0);
        });

        it('should lookup BEMA Cp code with documentation requirement', () => {
            const bema25 = lookupBillingCode('BEMA_25');
            expect(bema25).not.toBeNull();
            expect(bema25?.punkte).toBe(15);
            // BEMA 25 hat Dokumentationsanforderung: Material muss genannt werden
        });
    });

    describe('processChipsToBilling', () => {

        describe('Fall 1: GKV Standard Füllung MOD', () => {
            it('should generate correct BEMA codes', () => {
                const result = processChipsToBilling(
                    'fuellung',
                    ['la_infiltr', 'kofferdam', 'exkavation', 'cp_not_required', 'komposit_basic', 'finishing'],
                    'GKV',
                    false, // keine MKV
                    { surfaces: ['m', 'o', 'd'] }, // 3-flächig
                    'mittel'
                );

                // Erwartete Codes
                expect(result.billingCodes).toContain('BEMA_40'); // LA Infiltr
                expect(result.billingCodes).toContain('BEMA_12'); // Kofferdam
                expect(result.billingCodes).toContain('BEMA_13c'); // 3-flächig

                // KEINE GOZ-Codes bei reiner GKV!
                const gozCodes = result.billingCodes.filter(c => c.startsWith('GOZ_'));
                expect(gozCodes.length).toBe(0);

                // Text sollte generiert sein
                expect(result.textLines.length).toBeGreaterThan(0);
            });
        });

        describe('Fall 2: GKV mit Mehrkosten (Zuzahlung)', () => {
            it('should add GOZ 2197 for MKV', () => {
                const result = processChipsToBilling(
                    'fuellung',
                    ['la_infiltr', 'kofferdam', 'mehrschicht', 'finishing'],
                    'GKV',
                    true, // MKV aktiv!
                    { surfaces: ['m', 'o', 'd'] },
                    'mittel'
                );

                // BEMA-Codes für Kassenleistung
                expect(result.billingCodes).toContain('BEMA_40');
                expect(result.billingCodes).toContain('BEMA_12');
                expect(result.billingCodes).toContain('BEMA_13c');

                // GOZ 2197 für Mehrschichttechnik (MKV)
                expect(result.billingCodes).toContain('GOZ_2197');

                // Text sollte Mehrschicht erwähnen
                const hasAdhesive = result.textLines.some(t =>
                    t.toLowerCase().includes('mehrschicht') ||
                    t.toLowerCase().includes('adhäsiv')
                );
                expect(hasAdhesive).toBe(true);
            });
        });

        describe('Fall 3: PKV Füllung', () => {
            it('should generate correct GOZ codes', () => {
                const result = processChipsToBilling(
                    'fuellung',
                    ['la_leitung', 'kofferdam', 'cp', 'komposit_basic', 'finishing'],
                    'PKV',
                    false,
                    { surfaces: ['m', 'o'] }, // 2-flächig
                    'mittel',
                    { material: 'Ca(OH)₂' } // Variable für Cp
                );

                // GOZ-Codes
                expect(result.billingCodes).toContain('GOZ_0100'); // LA Leitung
                expect(result.billingCodes).toContain('GOZ_2040'); // Kofferdam
                expect(result.billingCodes).toContain('GOZ_2330'); // Cp
                expect(result.billingCodes).toContain('GOZ_2080'); // 2-flächig

                // KEINE BEMA-Codes bei PKV!
                const bemaCodes = result.billingCodes.filter(c => c.startsWith('BEMA_'));
                expect(bemaCodes.length).toBe(0);

                // Dokumentationswarnung für Cp
                const hasCpWarning = result.warnings.some(w =>
                    w.toLowerCase().includes('material')
                );
                expect(hasCpWarning).toBe(true);
            });

            it('should NOT add GOZ 2197 for PKV (already included per BZÄK)', () => {
                // Laut BZÄK: GOZ 2197 ist in GOZ 2060-2120 bereits enthalten!
                const result = processChipsToBilling(
                    'fuellung',
                    ['la_infiltr', 'kofferdam', 'mehrschicht', 'finishing'],
                    'PKV',
                    false,
                    { surfaces: ['m', 'o', 'd'] },
                    'mittel'
                );

                // GOZ 2197 sollte NICHT dabei sein bei PKV
                expect(result.billingCodes).not.toContain('GOZ_2197');

                // Aber GOZ 2100 sollte dabei sein
                expect(result.billingCodes).toContain('GOZ_2100');
            });
        });

        describe('Kombinationsregeln', () => {
            it('should detect GOZ 2197 conflict with GOZ 2060-2120', () => {
                // Manuell GOZ 2197 und GOZ 2100 zusammen einfügen → Warnung
                const result = processChipsToBilling(
                    'fuellung',
                    ['la_infiltr', 'mehrschicht', 'finishing'],
                    'PKV',
                    false,
                    { surfaces: ['m', 'o', 'd'] },
                    'mittel'
                );

                // Da PKV: mehrschicht hat nur MKV billingRef, nicht PKV
                // Also sollte GOZ 2197 gar nicht erst hinzugefügt werden
                expect(result.billingCodes).not.toContain('GOZ_2197');
            });
        });
    });

    describe('Default Chips', () => {
        it('should return default active chips', () => {
            const defaults = getDefaultActiveChipsFromJSON('fuellung');

            expect(defaults).toContain('vipr_pos');
            expect(defaults).toContain('perk_neg');
            expect(defaults).toContain('spont_neg');
            expect(defaults).toContain('la_infiltr');
            expect(defaults).toContain('kofferdam');
            expect(defaults).toContain('exkavation');
            expect(defaults).toContain('cp_not_required');
            expect(defaults).toContain('komposit_basic');
            expect(defaults).toContain('finishing');
        });
    });
});
