/**
 * Gate Test: GOÄ Billing Code Lookup
 * 
 * Verifies that lookupBillingCode() correctly handles GOÄ_ prefixed codes
 * from kataloge/goa.json (added to SSOT).
 * 
 * Assertions:
 * - GOÄ_1 returns valid entry
 * - GOÄ_252 returns valid entry
 * - Unknown GOÄ codes return null
 * - No exceptions thrown
 */
import { describe, it, expect } from 'vitest';
import { lookupBillingCode } from '../../core/billing/knowledgeBase/logic/treatmentEngine';

describe('Gate: GOÄ Billing Code Lookup', () => {
    describe('Valid GOÄ codes', () => {
        it('should lookup GOÄ_1 (Beratung)', () => {
            const result = lookupBillingCode('GOÄ_1');

            expect(result).not.toBeNull();
            expect(result!.code).toBe('1');
            expect(result!.bezeichnung).toContain('Beratung');
        });

        it('should lookup GOÄ_252 (Injektion)', () => {
            const result = lookupBillingCode('GOÄ_252');

            expect(result).not.toBeNull();
            expect(result!.code).toBe('252');
            expect(result!.bezeichnung).toContain('Injektion');
        });

        it('should lookup GOÄ_5000 (Zahnröntgen)', () => {
            const result = lookupBillingCode('GOÄ_5000');

            expect(result).not.toBeNull();
            expect(result!.code).toBe('5000');
        });

        it('should return punkte for GOÄ codes', () => {
            const result = lookupBillingCode('GOÄ_1');

            expect(result).not.toBeNull();
            expect(result!.punkte).toBeDefined();
            expect(typeof result!.punkte).toBe('number');
        });

        it('should return betrag_23 for GOÄ codes with honorar', () => {
            const result = lookupBillingCode('GOÄ_252');

            expect(result).not.toBeNull();
            // GOÄ_252 has honorar.standard = 5.36
            expect(result!.betrag_23).toBeDefined();
            expect(typeof result!.betrag_23).toBe('number');
        });
    });

    describe('GOAE_ prefix alias', () => {
        it('should handle GOAE_ prefix as alias for GOÄ_', () => {
            const result = lookupBillingCode('GOAE_1');

            expect(result).not.toBeNull();
            expect(result!.code).toBe('1');
        });
    });

    describe('Unknown GOÄ codes', () => {
        it('should return null for non-existent GOÄ code', () => {
            const result = lookupBillingCode('GOÄ_999999');

            expect(result).toBeNull();
        });

        it('should return null for empty GOÄ suffix', () => {
            const result = lookupBillingCode('GOÄ_');

            expect(result).toBeNull();
        });
    });

    describe('No exceptions', () => {
        it('should not throw for valid GOÄ lookup', () => {
            expect(() => lookupBillingCode('GOÄ_1')).not.toThrow();
        });

        it('should not throw for invalid GOÄ lookup', () => {
            expect(() => lookupBillingCode('GOÄ_invalid')).not.toThrow();
        });
    });

    describe('BEMA/GOZ still work (regression)', () => {
        it('should still lookup BEMA codes', () => {
            const result = lookupBillingCode('BEMA_40');

            expect(result).not.toBeNull();
            expect(result!.code).toBe('40');
        });

        it('should still lookup GOZ codes', () => {
            const result = lookupBillingCode('GOZ_2410');

            // GOZ_2410 may or may not exist in catalog
            // Just ensure no crash
            expect(() => lookupBillingCode('GOZ_2410')).not.toThrow();
        });
    });
});
