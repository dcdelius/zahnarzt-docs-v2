/**
 * Billing Inference Tests
 * 
 * Testet die Integration zwischen Diktat-Extraktion und Abrechnungslogik
 */

import { describe, it, expect } from 'vitest';
import {
    inferBilling,
    inferBillingForTooth,
    inferBillingForFilling,
    ExtractedData,
    InsuranceType
} from '../sonia/billing/knowledgeBase/logic/billingInference';

describe('Billing Inference', () => {

    // ═══════════════════════════════════════════════════════════════
    // EINZELZAHN / KRONE
    // ═══════════════════════════════════════════════════════════════

    describe('Krone - GKV', () => {
        it('sollte Festzuschuss für weitgehend zerstörten Zahn berechnen', () => {
            const result = inferBilling({
                tooth: '25',
                diagnosis: 'Caries profunda',
                versorgungsart: 'krone'
            }, 'GKV', 'ohne');

            expect(result.zahnSituation).toBeDefined();
            expect(result.zahnSituation!.weitgehendZerstoert).toBe(true);
            expect(result.befundResult!.befunde).toContain('FZ_1.1');
            expect(result.befundResult!.befunde).toContain('FZ_1.3');  // 25 im VB
            expect(result.festzuschuss!.gesamtbetrag).toBeGreaterThan(200);
        });

        it('sollte Verblendbereich korrekt erkennen', () => {
            // Zahn 25 = im VB
            const result25 = inferBilling({ tooth: '25', diagnosis: 'profunda' }, 'GKV');
            expect(result25.verblendbereich).toBe(true);
            expect(result25.befundResult!.befunde).toContain('FZ_1.3');

            // Zahn 36 = NICHT im VB
            const result36 = inferBilling({ tooth: '36', diagnosis: 'profunda' }, 'GKV');
            expect(result36.verblendbereich).toBe(false);
            expect(result36.befundResult!.befunde).not.toContain('FZ_1.3');
        });

        it('sollte Stift-Festzuschuss erkennen', () => {
            const result = inferBilling({
                tooth: '16',
                diagnosis: 'Caries profunda',
                nachEndo: true,
                stiftart: 'konfektioniert'
            }, 'GKV');

            expect(result.befundResult!.befunde).toContain('FZ_1.1');
            expect(result.befundResult!.befunde).toContain('FZ_1.4');  // Stift
        });

        it('sollte Warnung bei fehlendem VB generieren', () => {
            const result = inferBilling({
                tooth: '46',  // Außerhalb VB!
                diagnosis: 'profunda',
                versorgungsart: 'krone'  // Explizit Krone für VB-Warnung
            }, 'GKV');

            const warnings = result.suggestions.filter(s => s.type === 'warnung');
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings.some(w => w.description.toLowerCase().includes('verblendbereich'))).toBe(true);
        });

        it('sollte gleichartige Versorgung erkennen', () => {
            const result = inferBilling({
                tooth: '25',
                diagnosis: 'profunda',
                material: 'Vollkeramik'
            }, 'GKV');

            const gleichartig = result.suggestions.find(s => s.id?.includes('gleichartig'));
            expect(gleichartig).toBeDefined();
            expect(gleichartig!.type).toBe('bema');
        });

        it('sollte korrekten Festzuschussbetrag 2025 liefern', () => {
            const result = inferBilling({
                tooth: '25',
                diagnosis: 'weitgehend zerstört',
                stiftart: 'konfektioniert',
                nachEndo: true  // nachEndo triggert Stift
            }, 'GKV', '10_jahre');

            // FZ 1.1 + 1.3 + 1.4 mit 10J Bonus
            // 286.57 + 73.01 + 69.14 = 428.72€
            expect(result.festzuschuss!.gesamtbetrag).toBeCloseTo(428.72, 0);
        });
    });

    describe('Krone - PKV', () => {
        it('sollte GOZ-Positionen vorschlagen', () => {
            const result = inferBilling({
                tooth: '25',
                diagnosis: 'Caries profunda'
            }, 'PKV');

            expect(result.insuranceType).toBe('PKV');

            const gozSuggestions = result.suggestions.filter(s => s.type === 'goz');
            expect(gozSuggestions.length).toBeGreaterThan(0);
            expect(gozSuggestions.some(s => s.code === 'GOZ_2200')).toBe(true);
        });

        it('sollte Stift-Präparation bei Endo vorschlagen', () => {
            const result = inferBilling({
                tooth: '25',
                diagnosis: 'profunda',
                nachEndo: true
            }, 'PKV');

            const stiftSuggestion = result.suggestions.find(s => s.code === 'GOZ_2195');
            expect(stiftSuggestion).toBeDefined();
        });

        it('sollte Faktorsteigerung vorschlagen bei profunda', () => {
            const result = inferBilling({
                tooth: '36',
                diagnosis: 'Caries profunda'
            }, 'PKV');

            const faktorSuggestion = result.suggestions.find(s => s.id?.includes('faktor'));
            expect(faktorSuggestion).toBeDefined();
            expect(faktorSuggestion!.type).toBe('optimierung');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // BRÜCKE
    // ═══════════════════════════════════════════════════════════════

    describe('Brücke - GKV', () => {
        it('sollte FZ 2.1 für Brücke mit 1 fehlendem Zahn berechnen', () => {
            const result = inferBilling({
                pfeiler: ['14', '16'],
                fehlend: ['15'],
                versorgungsart: 'bruecke'
            }, 'GKV');

            expect(result.befundklasse).toBe(2);
            expect(result.festzuschuss).toBeDefined();
            expect(result.festzuschuss!.befunde).toContain('FZ_2.1');
        });

        it('sollte Verblendungen für VB-Zähne zählen', () => {
            const result = inferBilling({
                pfeiler: ['14', '16'],  // 14 im VB, 16 nicht
                fehlend: ['15'],        // 15 im VB
                versorgungsart: 'bruecke'
            }, 'GKV');

            const vbSuggestion = result.suggestions.find(s => s.id === 'vb_bruecke');
            expect(vbSuggestion).toBeDefined();
            expect(vbSuggestion!.description).toContain('2');  // 14 + 15 = 2 im VB
        });

        it('sollte korrekten Festzuschuss für 4-gliedrige Brücke berechnen', () => {
            const result = inferBilling({
                pfeiler: ['13', '17'],
                fehlend: ['14', '15', '16'],
                versorgungsart: 'bruecke'
            }, 'GKV', 'ohne');

            // FZ 2.3 (3 fehlend) + Verblendungen
            expect(result.festzuschuss!.gesamtbetrag).toBeGreaterThan(700);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FÜLLUNG
    // ═══════════════════════════════════════════════════════════════

    describe('Füllung - GKV', () => {
        it('sollte BEMA 13a für einflächige Füllung vorschlagen', () => {
            const result = inferBilling({
                tooth: '16',
                surfaces: ['o'],
                material: 'Komposit',
                versorgungsart: 'fuellung'
            }, 'GKV');

            const bemaSuggestion = result.suggestions.find(s => s.code === 'BEMA_13a');
            expect(bemaSuggestion).toBeDefined();
        });

        it('sollte BEMA 13b für zweiflächige Füllung vorschlagen', () => {
            const result = inferBilling({
                tooth: '16',
                surfaces: ['m', 'o'],
                versorgungsart: 'fuellung'
            }, 'GKV');

            const bemaSuggestion = result.suggestions.find(s => s.code === 'BEMA_13b');
            expect(bemaSuggestion).toBeDefined();
        });

        it('sollte BEMA 13c für dreiflächige Füllung vorschlagen', () => {
            const result = inferBilling({
                tooth: '16',
                surfaces: ['m', 'o', 'd'],
                versorgungsart: 'fuellung'
            }, 'GKV');

            const bemaSuggestion = result.suggestions.find(s => s.code === 'BEMA_13c');
            expect(bemaSuggestion).toBeDefined();
        });

        it('sollte Adhäsiv-Mehrkosten bei Komposit vorschlagen', () => {
            const result = inferBilling({
                tooth: '16',
                surfaces: ['m', 'o'],
                material: 'Tetric Evo',
                versorgungsart: 'fuellung'
            }, 'GKV');

            const adhaesiv = result.suggestions.find(s => s.code === 'GOZ_2197');
            expect(adhaesiv).toBeDefined();
            expect(adhaesiv!.description).toContain('Mehrkosten');
        });
    });

    describe('Füllung - PKV', () => {
        it('sollte GOZ 2080 für zweiflächige Füllung vorschlagen', () => {
            const result = inferBillingForFilling('16', ['m', 'o'], 'Komposit', 'PKV');

            const gozSuggestion = result.suggestions.find(s => s.code === 'GOZ_2080');
            expect(gozSuggestion).toBeDefined();
        });

        it('sollte GOZ 2100 für dreiflächige Füllung vorschlagen', () => {
            const result = inferBillingForFilling('36', ['m', 'o', 'd'], 'Komposit', 'PKV');

            const gozSuggestion = result.suggestions.find(s => s.code === 'GOZ_2100');
            expect(gozSuggestion).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    describe('Helper Functions', () => {
        it('inferBillingForTooth sollte korrekt funktionieren', () => {
            const result = inferBillingForTooth('25', 'profunda', 'GKV', 'ohne');

            expect(result.befundResult).toBeDefined();
            expect(result.festzuschuss).toBeDefined();
        });

        it('inferBillingForFilling sollte korrekt funktionieren', () => {
            const result = inferBillingForFilling('16', ['m', 'o', 'd'], 'Komposit', 'GKV');

            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions.some(s => s.code === 'BEMA_13c')).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    describe('Edge Cases', () => {
        it('sollte bei fehlenden Daten graceful degraden', () => {
            const result = inferBilling({}, 'GKV');

            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.suggestions[0].type).toBe('warnung');
        });

        it('sollte bei ungültiger Zahnnummer weitarbeiten', () => {
            const result = inferBilling({
                tooth: 'xyz',
                diagnosis: 'profunda'
            }, 'GKV');

            expect(result).toBeDefined();
            // Sollte nicht crashen
        });

        it('sollte Bonus-Status korrekt verarbeiten', () => {
            const ohne = inferBilling({ tooth: '25', diagnosis: 'profunda' }, 'GKV', 'ohne');
            const mit5j = inferBilling({ tooth: '25', diagnosis: 'profunda' }, 'GKV', '5_jahre');
            const mit10j = inferBilling({ tooth: '25', diagnosis: 'profunda' }, 'GKV', '10_jahre');

            expect(ohne.festzuschuss!.gesamtbetrag).toBeLessThan(mit5j.festzuschuss!.gesamtbetrag);
            expect(mit5j.festzuschuss!.gesamtbetrag).toBeLessThan(mit10j.festzuschuss!.gesamtbetrag);
        });
    });
});
