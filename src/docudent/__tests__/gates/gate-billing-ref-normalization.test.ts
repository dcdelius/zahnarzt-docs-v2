/**
 * gate-billing-ref-normalization.test.ts
 * 
 * GATE: Validates BillingRef normalization layer works correctly.
 * Ensures BEL_II_XXXX → BEL_XXXX mapping is consistent.
 */

import { describe, it, expect } from 'vitest';
import {
    normalizeBillingRefId,
    getBillingSystem,
    BEL_II_ALIAS_MAP,
    getBillingRefDisplayId,
    isValidBillingRefFormat
} from '../../core/billing/billingRefNormalization';

describe('gate-billing-ref-normalization', () => {
    describe('normalizeBillingRefId', () => {
        it('should normalize BEL_II_XXXX to BEL_XXXX', () => {
            expect(normalizeBillingRefId('BEL_II_8010')).toBe('BEL_8010');
            expect(normalizeBillingRefId('BEL_II_0010')).toBe('BEL_0010');
            expect(normalizeBillingRefId('BEL_II_1220')).toBe('BEL_1220');
            expect(normalizeBillingRefId('BEL_II_8070')).toBe('BEL_8070');
        });

        it('should pass through already normalized BEL refs', () => {
            expect(normalizeBillingRefId('BEL_8010')).toBe('BEL_8010');
            expect(normalizeBillingRefId('BEL_0010')).toBe('BEL_0010');
        });

        it('should pass through BEMA refs unchanged (except aliases)', () => {
            expect(normalizeBillingRefId('BEMA_13a')).toBe('BEMA_13a');
            expect(normalizeBillingRefId('BEMA_98e')).toBe('BEMA_98e');
            expect(normalizeBillingRefId('BEMA_41a')).toBe('BEMA_41a');
        });

        it('should alias BEMA_41 to BEMA_41a', () => {
            expect(normalizeBillingRefId('BEMA_41')).toBe('BEMA_41a');
        });

        it('should pass through GOZ refs unchanged', () => {
            expect(normalizeBillingRefId('GOZ_2390')).toBe('GOZ_2390');
            expect(normalizeBillingRefId('GOZ_0090')).toBe('GOZ_0090');
        });

        it('should handle empty/null inputs', () => {
            expect(normalizeBillingRefId('')).toBe('');
        });

        it('should normalize all 10 missing BEL_II refs from G25', () => {
            const missingRefs = [
                'BEL_II_1220', 'BEL_II_8010', 'BEL_II_8030', 'BEL_II_3010',
                'BEL_II_8070', 'BEL_II_8023', 'BEL_II_8027', 'BEL_II_0010',
                'BEL_II_0120', 'BEL_II_8022'
            ];

            for (const ref of missingRefs) {
                const normalized = normalizeBillingRefId(ref);
                expect(normalized.startsWith('BEL_')).toBe(true);
                expect(normalized).not.toContain('II');
            }
        });
    });

    describe('getBillingSystem', () => {
        it('should identify BEMA system', () => {
            expect(getBillingSystem('BEMA_13a')).toBe('BEMA');
            expect(getBillingSystem('BEMA_98e')).toBe('BEMA');
        });

        it('should identify GOZ system', () => {
            expect(getBillingSystem('GOZ_2390')).toBe('GOZ');
            expect(getBillingSystem('GOZ_0090')).toBe('GOZ');
        });

        it('should identify BEL_II system (before BEL)', () => {
            expect(getBillingSystem('BEL_II_8010')).toBe('BEL_II');
        });

        it('should identify BEL system (normalized)', () => {
            expect(getBillingSystem('BEL_8010')).toBe('BEL');
        });

        it('should identify GOÄ system', () => {
            expect(getBillingSystem('GOÄ_252')).toBe('GOÄ');
        });

        it('should return UNKNOWN for unrecognized refs', () => {
            expect(getBillingSystem('RANDOM_123')).toBe('UNKNOWN');
        });
    });

    describe('BEL_II_ALIAS_MAP', () => {
        it('should contain all 10 missing refs from G25', () => {
            const missingRefs = [
                'BEL_II_1220', 'BEL_II_8010', 'BEL_II_8030', 'BEL_II_3010',
                'BEL_II_8070', 'BEL_II_8023', 'BEL_II_8027', 'BEL_II_0010',
                'BEL_II_0120', 'BEL_II_8022'
            ];

            for (const ref of missingRefs) {
                expect(BEL_II_ALIAS_MAP[ref]).toBeDefined();
                expect(BEL_II_ALIAS_MAP[ref]).toMatch(/^BEL_\d{4}$/);
            }
        });
    });

    describe('getBillingRefDisplayId', () => {
        it('should return display form for canonical BEL refs', () => {
            expect(getBillingRefDisplayId('BEL_8010')).toBe('BEL_II_8010');
            expect(getBillingRefDisplayId('BEL_0010')).toBe('BEL_II_0010');
        });

        it('should pass through non-BEL refs', () => {
            expect(getBillingRefDisplayId('BEMA_13a')).toBe('BEMA_13a');
            expect(getBillingRefDisplayId('GOZ_2390')).toBe('GOZ_2390');
        });
    });

    describe('isValidBillingRefFormat', () => {
        it('should validate BEMA format', () => {
            expect(isValidBillingRefFormat('BEMA_13a')).toBe(true);
            expect(isValidBillingRefFormat('BEMA_98e')).toBe(true);
        });

        it('should validate GOZ format', () => {
            expect(isValidBillingRefFormat('GOZ_2390')).toBe(true);
            expect(isValidBillingRefFormat('GOZ_0090')).toBe(true);
        });

        it('should validate BEL_II format', () => {
            expect(isValidBillingRefFormat('BEL_II_8010')).toBe(true);
        });

        it('should validate BEL format', () => {
            expect(isValidBillingRefFormat('BEL_8010')).toBe(true);
        });

        it('should reject invalid formats', () => {
            expect(isValidBillingRefFormat('INVALID')).toBe(false);
            expect(isValidBillingRefFormat('123')).toBe(false);
        });
    });
});
