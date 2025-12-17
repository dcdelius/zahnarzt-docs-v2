/**
 * Billing Validation Tests
 * 
 * Testet die Regel-Validierung mit echten Daten aus kombinationen.json
 */

import { describe, it, expect } from 'vitest';
import {
    validateBillingCodes,
    sindCodesKompatibel,
    loadBillingRules,
    getRegelnFuerCode
} from '../sonia/billing/knowledgeBase/logic/billingValidation';

describe('Billing Validation', () => {

    describe('loadBillingRules', () => {
        it('sollte Regeln aus kombinationen.json laden', () => {
            const rules = loadBillingRules();

            expect(rules.length).toBeGreaterThan(10);
            expect(rules[0]).toHaveProperty('id');
            expect(rules[0]).toHaveProperty('typ');
            expect(rules[0]).toHaveProperty('betrifft');
        });
    });

    describe('validateBillingCodes', () => {
        it('sollte GOZ 2197 + GOZ 2060 als Konflikt erkennen', () => {
            const result = validateBillingCodes(['GOZ_2197', 'GOZ_2060']);

            expect(result.gueltig).toBe(false);
            expect(result.konflikte.length).toBeGreaterThan(0);
            expect(result.warnungen.some(w => w.includes('REGRESS'))).toBe(true);
        });

        it('sollte GOZ 2197 + GOZ 2080 als Konflikt erkennen', () => {
            const result = validateBillingCodes(['GOZ_2197', 'GOZ_2080']);

            expect(result.gueltig).toBe(false);
            expect(result.konflikte.some(k => k.regelId === 'regel_goz2197_nicht_neben_2060')).toBe(true);
        });

        it('sollte GOZ 2197 + GOZ 2100 als Konflikt erkennen', () => {
            const result = validateBillingCodes(['GOZ_2197', 'GOZ_2100']);

            expect(result.gueltig).toBe(false);
        });

        it('sollte BEMA 13a + BEMA 40 als gültig erkennen (keine Regress-Konflikte)', () => {
            const result = validateBillingCodes(['BEMA_13a', 'BEMA_40']);

            // Gültig = keine REGRESS-Konflikte
            expect(result.gueltig).toBe(true);
            // Es kann aber Warnungen geben (z.B. UK-Molar sollte Leitung sein)
        });

        it('sollte Dokumentations-Hinweis für BEMA 25 (Cp) geben', () => {
            const result = validateBillingCodes(['BEMA_25']);

            // Sollte Hinweis auf Dokumentationspflicht enthalten
            expect(result.hinweise.some(h => h.includes('Cp') || h.includes('pulpanah'))).toBe(true);
        });

        it('sollte Dokumentations-Hinweis für BEMA 12 geben', () => {
            const result = validateBillingCodes(['BEMA_12']);

            expect(result.hinweise.some(h => h.includes('Kofferdam') || h.includes('12'))).toBe(true);
        });
    });

    describe('sindCodesKompatibel', () => {
        it('sollte GOZ 2197 + GOZ 2060 als inkompatibel erkennen', () => {
            expect(sindCodesKompatibel('GOZ_2197', 'GOZ_2060')).toBe(false);
        });

        it('sollte BEMA 13a + BEMA 40 als kompatibel erkennen', () => {
            expect(sindCodesKompatibel('BEMA_13a', 'BEMA_40')).toBe(true);
        });

        it('sollte GOZ 2200 + GOZ 2197 als kompatibel erkennen', () => {
            // Krone + Adhäsiv ist erlaubt
            expect(sindCodesKompatibel('GOZ_2200', 'GOZ_2197')).toBe(true);
        });
    });

    describe('getRegelnFuerCode', () => {
        it('sollte Regeln für BEMA 12 finden', () => {
            const rules = getRegelnFuerCode('BEMA_12');

            expect(rules.length).toBeGreaterThan(0);
            expect(rules.some(r => r.id.includes('bema12'))).toBe(true);
        });

        it('sollte Regeln für GOZ 2197 finden', () => {
            const rules = getRegelnFuerCode('GOZ_2197');

            expect(rules.length).toBeGreaterThan(0);
            expect(rules.some(r => r.id.includes('goz2197'))).toBe(true);
        });

        it('sollte leeres Array für unbekannten Code zurückgeben', () => {
            const rules = getRegelnFuerCode('UNKNOWN_CODE');

            expect(rules).toEqual([]);
        });
    });

    describe('Realistische Szenarien', () => {
        it('sollte GKV Füllung mit Cp validieren und Warnungen ausgeben', () => {
            const codes = ['BEMA_13c', 'BEMA_25'];  // 3-fl Füllung + Cp
            const result = validateBillingCodes(codes);

            // Die Validierung gibt Warnungen aus (Dokumentationspflicht)
            // Das ist korrekt - BEMA 25 braucht dokumentierte Diagnose "profunda"
            expect(result.warnungen.length).toBeGreaterThan(0);
            expect(result.warnungen.some(w => w.includes('Cp') || w.includes('profunda'))).toBe(true);
        });

        it('sollte PKV Füllung mit falschem Adhäsiv erkennen', () => {
            const codes = ['GOZ_2100', 'GOZ_2197'];  // 3-fl Füllung + Adhäsiv (FALSCH!)
            const result = validateBillingCodes(codes);

            expect(result.gueltig).toBe(false);
            expect(result.warnungen.some(w => w.includes('REGRESS'))).toBe(true);
        });

        it('sollte MKV-Kombination validieren', () => {
            const codes = ['BEMA_13a', 'GOZ_2197'];  // BEMA Füllung + GOZ Adhäsiv (MKV)
            const result = validateBillingCodes(codes);

            // Das ist erlaubt bei MKV
            expect(result.gueltig).toBe(true);
        });
    });
});
