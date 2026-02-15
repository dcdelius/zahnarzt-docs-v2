/**
 * TREATMENT ENGINE TESTS
 * 
 * Tests the new centralized treatment architecture.
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import {
    processTreatment,
    getDefaultActiveChips,
    getActiveUpsells
} from '../sonia/behandlungen/_shared/engine';
import { TreatmentContext } from '../sonia/behandlungen/_shared/types';

describe('Treatment Engine', () => {

    describe('Filling Treatment Definition', () => {

        it('has no required outputs (all are chips now)', () => {
            const required = FILLING_TREATMENT.requiredOutputs;

            // All outputs are now configurable as chips
            expect(required.length).toBe(0);
        });

        it('has chips for all phases', () => {
            const chips = FILLING_TREATMENT.chips;

            // Befund
            expect(chips.find(c => c.id === 'vipr_pos')).toBeDefined();
            expect(chips.find(c => c.id === 'perk_neg')).toBeDefined();
            // Anästhesie
            expect(chips.find(c => c.id === 'la_infiltr')).toBeDefined();
            expect(chips.find(c => c.id === 'la_leitung')).toBeDefined();
            // Trockenlegung
            expect(chips.find(c => c.id === 'kofferdam')).toBeDefined();
            // Durchführung
            expect(chips.find(c => c.id === 'adhesive')).toBeDefined();
            expect(chips.find(c => c.id === 'schicht')).toBeDefined();
        });

        it('has billing rules for F-codes', () => {
            const fCodeRule = FILLING_TREATMENT.billingRules.find(r => r.id === 'f_code');
            expect(fCodeRule).toBeDefined();
            expect(fCodeRule?.logic[3].GKV).toBe('BEMA_13c');
        });

        it('has upsells defined', () => {
            const upsells = FILLING_TREATMENT.upsells;

            expect(upsells.find(u => u.id === 'upsell_cp')).toBeDefined();
            expect(upsells.find(u => u.id === 'upsell_fluor')).toBeDefined();
        });
    });

    describe('Default Chips', () => {

        it('returns default active chips', () => {
            const defaults = getDefaultActiveChips(FILLING_TREATMENT);

            expect(defaults).toContain('vipr_pos');
            expect(defaults).toContain('perk_neg');
            expect(defaults).toContain('la_infiltr');
            expect(defaults).toContain('kofferdam');
            expect(defaults).toContain('adhesive');
            expect(defaults).toContain('schicht');
            expect(defaults).not.toContain('la_leitung');
        });
    });

    describe('Process Treatment - GKV', () => {

        it('generates F-code from surfaces when no chips active', () => {
            const context: TreatmentContext = {
                treatment: FILLING_TREATMENT,
                insuranceType: 'GKV',
                activeChips: [],
                extractedData: { surfaces: ['m', 'o', 'd'] },
                acceptedUpsells: []
            };

            const result = processTreatment(context);

            console.log('\n=== GKV NO CHIPS ===');
            console.log('Text Lines:', result.textLines);
            console.log('Billing:', result.billingCodes);

            // With no chips active, only F-code from surfaces
            expect(result.billingCodes).toContain('BEMA 13c');
        });

        it('includes chip outputs when active', () => {
            const context: TreatmentContext = {
                treatment: FILLING_TREATMENT,
                insuranceType: 'GKV',
                activeChips: ['la_infiltr', 'kofferdam', 'vipr_pos'],
                extractedData: { surfaces: ['m', 'o'] },
                acceptedUpsells: []
            };

            const result = processTreatment(context);

            console.log('\n=== GKV WITH CHIPS ===');
            console.log('Text Lines:', result.textLines);
            console.log('Billing:', result.billingCodes);

            // Leistungs-Chips appear in textLines
            expect(result.textLines.some(l => l.includes('Lokalanästhesie'))).toBe(true);
            expect(result.textLines.some(l => l.includes('Kofferdam'))).toBe(true);

            // Befund-Chips appear in dataPatches
            expect(result.dataPatches.vitality).toBe('+');

            expect(result.billingCodes).toContain('BEMA 40');
            expect(result.billingCodes).toContain('BEMA 12');
            expect(result.billingCodes).toContain('BEMA 13b');
        });

        it('excludes chip outputs when inactive', () => {
            const context: TreatmentContext = {
                treatment: FILLING_TREATMENT,
                insuranceType: 'GKV',
                activeChips: ['la_infiltr'],
                extractedData: { surfaces: ['o'] },
                acceptedUpsells: []
            };

            const result = processTreatment(context);

            console.log('\n=== GKV WITHOUT KOFFERDAM ===');
            console.log('Text Lines:', result.textLines);
            console.log('Billing:', result.billingCodes);

            expect(result.textLines.every(l => !l.includes('Kofferdam'))).toBe(true);
            expect(result.billingCodes).not.toContain('BEMA 12');
            expect(result.billingCodes).toContain('BEMA 40');
            expect(result.billingCodes).toContain('BEMA 13');
        });
    });

    describe('Process Treatment - PKV', () => {

        it('uses GOZ codes for PKV', () => {
            const context: TreatmentContext = {
                treatment: FILLING_TREATMENT,
                insuranceType: 'PKV',
                activeChips: ['la_infiltr', 'kofferdam', 'adhesive', 'schicht'],
                extractedData: { surfaces: ['m', 'o', 'd'] },
                acceptedUpsells: []
            };

            const result = processTreatment(context);

            console.log('\n=== PKV FULL ===');
            console.log('Billing:', result.billingCodes);

            // Nach Billing-Fix:
            // GOZ 2100 = 3 Flächen (nicht 2120!)
            // GOZ 2197/2060 sind in F-Code INKLUDIERT - nicht separat!
            expect(result.billingCodes).toContain('GOZ 2100'); // F3 (3 Flächen)
            expect(result.billingCodes).toContain('GOZ 0090'); // LA
            expect(result.billingCodes).toContain('GOZ 2040'); // Kofferdam
            // GOZ 2197 und 2060 NICHT im Output - sind in F-Code inkludiert!
        });
    });

    describe('Upsells', () => {

        it('shows CP upsell when diagnosis contains profunda', () => {
            const data = { diagnosis: 'C. profunda' };
            const upsells = getActiveUpsells(FILLING_TREATMENT, data);

            expect(upsells.find(u => u.id === 'upsell_cp')).toBeDefined();
        });

        it('hides CP upsell when diagnosis does not contain profunda', () => {
            const data = { diagnosis: 'C. media' };
            const upsells = getActiveUpsells(FILLING_TREATMENT, data);

            expect(upsells.find(u => u.id === 'upsell_cp')).toBeUndefined();
        });

        it('shows fluoridation upsell when missing', () => {
            const data = { surfaces: ['o'] };
            const upsells = getActiveUpsells(FILLING_TREATMENT, data);

            expect(upsells.find(u => u.id === 'upsell_fluor')).toBeDefined();
        });
    });

    describe('F-Code Logic', () => {

        it('calculates correct F-code for surface count', () => {
            const tests = [
                { surfaces: ['o'], expected: 'BEMA 13' },
                { surfaces: ['m', 'o'], expected: 'BEMA 13b' },
                { surfaces: ['m', 'o', 'd'], expected: 'BEMA 13c' },
                { surfaces: ['m', 'o', 'd', 'b'], expected: 'BEMA 13d' },
            ];

            for (const test of tests) {
                const result = processTreatment({
                    treatment: FILLING_TREATMENT,
                    insuranceType: 'GKV',
                    activeChips: [],
                    extractedData: { surfaces: test.surfaces },
                    acceptedUpsells: []
                });

                expect(result.billingCodes).toContain(test.expected);
            }
        });
    });

});
