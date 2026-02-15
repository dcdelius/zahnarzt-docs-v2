/**
 * Gate: BEL2 Runtime Wiring
 * 
 * Validates that the ZE/lab billing pipeline correctly calls BEL2 SSOT
 * for catalog-driven resolution of labor position codes.
 * 
 * This gate proves that:
 * 1. generiereHKPKrone() uses valid BEL2 codes from catalog
 * 2. belKurztext is populated for valid codes
 * 3. No warnings for properly mapped codes
 * 4. Output is deterministic (2 runs identical)
 * 5. No placeholder '001' remains in output
 */
import { describe, it, expect } from 'vitest';
import {
    generiereHKPKrone,
    generiereHKPBruecke,
    HKPResult,
    LaborPosition
} from '../../core/billing/knowledgeBase/logic/hkpGenerator';
import { ZahnSituation, LueckenSituation } from '../../core/billing/knowledgeBase/logic/befundLogic';
import { resolveBel2CodeFromRaw, lookupBel2 } from '../../core/billing/knowledgeBase/logic/bel2Catalog';

// ═══════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════

const KRONE_FIXTURE: ZahnSituation = {
    zahnNummer: 26,
    zustand: 'weitgehend_zerstoert',
    imVerblendbereich: false,
    nachEndo: false
};

const KRONE_FIXTURE_ENDO: ZahnSituation = {
    zahnNummer: 16,
    zustand: 'weitgehend_zerstoert',
    imVerblendbereich: false,
    nachEndo: true,
    stiftart: 'konfektioniert'
};

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('GATE: BEL2 Runtime Wiring', () => {
    // ═══════════════════════════════════════════════════════════
    // A) CATALOG-DRIVEN RESOLUTION UNIT TESTS
    // ═══════════════════════════════════════════════════════════

    describe('A) resolveBel2CodeFromRaw - Catalog-Driven', () => {
        it('resolves valid 4-digit code existing in catalog', () => {
            // BEL_0010 = Modell (known to exist from gate-bel2-catalog-ssot)
            const result = resolveBel2CodeFromRaw('0010');
            expect(result.code).toBe('BEL_0010');
            expect(result.kurztext).toBe('Modell');
        });

        it('resolves BEL_XXXX format if it exists in catalog', () => {
            const result = resolveBel2CodeFromRaw('BEL_0010');
            expect(result.code).toBe('BEL_0010');
            expect(result.kurztext).toBeTruthy();
        });

        it('resolves BEL_1021 (Vollkrone/Metall) - the crown code', () => {
            const result = resolveBel2CodeFromRaw('BEL_1021');
            expect(result.code).toBe('BEL_1021');
            expect(result.kurztext).toBe('Vollkrone/Metall');
        });

        it('returns null for 4-digit code NOT in catalog', () => {
            // 9999 is unlikely to exist
            const result = resolveBel2CodeFromRaw('9999');
            expect(result.code).toBeNull();
            expect(result.reason).toBe('notFound');
            expect(result.candidatesTried).toContain('BEL_9999');
        });

        it('returns null for short placeholder like "001" (not in catalog)', () => {
            // '001' -> BEL_0001 which doesn't exist
            const result = resolveBel2CodeFromRaw('001');
            expect(result.code).toBeNull();
            expect(result.reason).toBe('notFound');
            expect(result.candidatesTried).toContain('BEL_0001');
        });

        it('never invents codes - only returns codes that exist', () => {
            // Even if we pass '10' which would normalize to BEL_0010,
            // it should only return if that code exists
            const result = resolveBel2CodeFromRaw('10');
            if (result.code) {
                // Verify it actually exists
                const entry = lookupBel2(result.code);
                expect(entry).not.toBeNull();
            }
        });

        it('handles invalid input gracefully', () => {
            const result = resolveBel2CodeFromRaw('abc');
            expect(result.code).toBeNull();
            expect(result.reason).toBe('invalid');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // B) PLACEHOLDER ELIMINATION
    // ═══════════════════════════════════════════════════════════

    describe('B) Placeholder Elimination', () => {
        it('laborPositionen do NOT contain placeholder "001"', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');

            for (const lp of hkp.laborPositionen) {
                expect(lp.belNr).not.toBe('001');
            }
        });

        it('laborPositionen have valid BEL_XXXX codes', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');
            const firstLabor = hkp.laborPositionen[0];

            expect(firstLabor.belNr).toMatch(/^BEL_\d{4}$/);
        });

        it('crown labor uses BEL_1021 (Vollkrone/Metall)', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');
            const firstLabor = hkp.laborPositionen[0];

            expect(firstLabor.belNr).toBe('BEL_1021');
        });

        it('belKurztext is populated for valid codes', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');
            const firstLabor = hkp.laborPositionen[0];

            expect(firstLabor.belKurztext).toBe('Vollkrone/Metall');
        });

        it('no BEL2 warnings for properly mapped codes', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');

            const bel2Warnings = hkp.hinweise.filter(h => h.includes('[BEL2]'));
            expect(bel2Warnings.length).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // C) HKP OUTPUT STRUCTURE
    // ═══════════════════════════════════════════════════════════

    describe('C) HKP Output Structure', () => {
        it('generiereHKPKrone produces laborPositionen array', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');
            expect(hkp.laborPositionen).toBeDefined();
            expect(hkp.laborPositionen.length).toBeGreaterThan(0);
        });

        it('laborPositionen have belNr field after processing', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');
            const firstLabor = hkp.laborPositionen[0];
            expect(firstLabor.belNr).toBeDefined();
        });

        it('multiple crowns each get BEL2 enrichment', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE, KRONE_FIXTURE_ENDO], 'gleichartig', 'ohne');

            expect(hkp.laborPositionen.length).toBe(2);
            for (const lp of hkp.laborPositionen) {
                expect(lp.belNr).toBe('BEL_1021');
                expect(lp.belKurztext).toBe('Vollkrone/Metall');
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // D) DETERMINISM
    // ═══════════════════════════════════════════════════════════

    describe('D) Determinism', () => {
        it('two identical calls produce identical output', () => {
            const hkp1 = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');
            const hkp2 = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');

            expect(JSON.stringify(hkp1)).toBe(JSON.stringify(hkp2));
        });

        it('hinweise are deterministic', () => {
            const hkp1 = generiereHKPKrone([KRONE_FIXTURE, KRONE_FIXTURE_ENDO], 'gleichartig', 'ohne');
            const hkp2 = generiereHKPKrone([KRONE_FIXTURE, KRONE_FIXTURE_ENDO], 'gleichartig', 'ohne');

            expect(hkp1.hinweise).toEqual(hkp2.hinweise);
        });

        it('laborPositionen order is stable', () => {
            const hkp1 = generiereHKPKrone([KRONE_FIXTURE, KRONE_FIXTURE_ENDO], 'gleichartig', 'ohne');
            const hkp2 = generiereHKPKrone([KRONE_FIXTURE, KRONE_FIXTURE_ENDO], 'gleichartig', 'ohne');

            expect(hkp1.laborPositionen.length).toBe(hkp2.laborPositionen.length);
            for (let i = 0; i < hkp1.laborPositionen.length; i++) {
                expect(hkp1.laborPositionen[i].bezeichnung).toBe(hkp2.laborPositionen[i].bezeichnung);
                expect(hkp1.laborPositionen[i].belNr).toBe(hkp2.laborPositionen[i].belNr);
                expect(hkp1.laborPositionen[i].belKurztext).toBe(hkp2.laborPositionen[i].belKurztext);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // E) CATALOG INTEGRATION PROOF
    // ═══════════════════════════════════════════════════════════

    describe('E) Catalog Integration Proof', () => {
        it('BEL_1021 exists in catalog (sanity check)', () => {
            const entry = lookupBel2('BEL_1021');
            expect(entry).not.toBeNull();
            expect(entry?.kurztext).toBe('Vollkrone/Metall');
        });

        it('catalog lookup was used (belKurztext matches catalog)', () => {
            const hkp = generiereHKPKrone([KRONE_FIXTURE], 'gleichartig', 'ohne');
            const firstLabor = hkp.laborPositionen[0];

            // If belKurztext is populated, catalog was consulted
            const catalogEntry = lookupBel2('BEL_1021');
            expect(firstLabor.belKurztext).toBe(catalogEntry?.kurztext);
        });
    });
});
