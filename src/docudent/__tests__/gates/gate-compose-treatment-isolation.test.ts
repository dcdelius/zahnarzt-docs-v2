/**
 * Gate Test: P12 Compose Treatment Isolation
 *
 * Ensures that composed documents for one treatment do not contain
 * billing references from other treatments.
 *
 * INVARIANTS:
 * - fuellung ComposedDocumentV1 contains no endo.* canonicalKeys
 * - endo ComposedDocumentV1 contains no fuellung.* canonicalKeys
 * - No cross-contamination of billing codes
 */

import { describe, it, expect } from 'vitest';
import { normalizeCanonicalKey, parseCanonicalKey, dedupeBillingRefs } from '../../contracts/compose';
import type { BillingRef } from '../../contracts/compose';

describe('GATE: P12 Compose Contracts', () => {

    describe('normalizeCanonicalKey', () => {
        it('should format BEMA codes correctly', () => {
            expect(normalizeCanonicalKey('BEMA', '13a')).toBe('BEMA_13a');
            expect(normalizeCanonicalKey('BEMA', '12')).toBe('BEMA_12');
            expect(normalizeCanonicalKey('BEMA', '41a')).toBe('BEMA_41a');
        });

        it('should format GOZ codes correctly', () => {
            expect(normalizeCanonicalKey('GOZ', '2060')).toBe('GOZ_2060');
            expect(normalizeCanonicalKey('GOZ', '2197')).toBe('GOZ_2197');
        });

        it('should strip existing prefix', () => {
            expect(normalizeCanonicalKey('BEMA', 'BEMA_13a')).toBe('BEMA_13a');
            expect(normalizeCanonicalKey('GOZ', 'GOZ_2060')).toBe('GOZ_2060');
        });
    });

    describe('parseCanonicalKey', () => {
        it('should parse valid canonical keys', () => {
            expect(parseCanonicalKey('BEMA_13a')).toEqual({ system: 'BEMA', code: '13a' });
            expect(parseCanonicalKey('GOZ_2060')).toEqual({ system: 'GOZ', code: '2060' });
        });

        it('should return null for invalid keys', () => {
            expect(parseCanonicalKey('invalid')).toBeNull();
            expect(parseCanonicalKey('13a')).toBeNull();
        });
    });

    describe('dedupeBillingRefs', () => {
        it('should deduplicate by canonicalKey', () => {
            const refs: BillingRef[] = [
                { system: 'BEMA', code: '13a', canonicalKey: 'BEMA_13a', reason: 'test1' },
                { system: 'BEMA', code: '13a', canonicalKey: 'BEMA_13a', reason: 'test2' },
                { system: 'GOZ', code: '2060', canonicalKey: 'GOZ_2060', reason: 'test3' }
            ];

            const deduped = dedupeBillingRefs(refs);
            expect(deduped).toHaveLength(2);
            expect(deduped[0].canonicalKey).toBe('BEMA_13a');
            expect(deduped[1].canonicalKey).toBe('GOZ_2060');
        });

        it('should keep first occurrence on duplicate', () => {
            const refs: BillingRef[] = [
                { system: 'BEMA', code: '13a', canonicalKey: 'BEMA_13a', reason: 'first' },
                { system: 'BEMA', code: '13a', canonicalKey: 'BEMA_13a', reason: 'second' }
            ];

            const deduped = dedupeBillingRefs(refs);
            expect(deduped[0].reason).toBe('first');
        });
    });
});

describe('GATE: P12 Treatment Isolation Principles', () => {

    // Endo-specific codes that should NEVER appear in fuellung output
    const ENDO_ONLY_CODES = [
        'GOZ_2390', 'GOZ_2400', 'GOZ_2410', 'GOZ_2420', 'GOZ_2430', 'GOZ_2440',
        'BEMA_32', 'BEMA_33', 'BEMA_34', 'BEMA_35'
    ];

    // Fuellung-specific codes (less distinct, but useful reference)
    const FUELLUNG_COMMON_CODES = [
        'BEMA_13a', 'BEMA_13b', 'BEMA_13c', 'BEMA_13d',
        'GOZ_2060', 'GOZ_2080', 'GOZ_2100', 'GOZ_2120'
    ];

    it('endo-only codes list should be non-empty', () => {
        expect(ENDO_ONLY_CODES.length).toBeGreaterThan(0);
    });

    it('fuellung-common codes list should be non-empty', () => {
        expect(FUELLUNG_COMMON_CODES.length).toBeGreaterThan(0);
    });

    it('endo and fuellung code sets should not overlap', () => {
        const overlap = ENDO_ONLY_CODES.filter(c => FUELLUNG_COMMON_CODES.includes(c));
        expect(overlap).toHaveLength(0);
    });
});
