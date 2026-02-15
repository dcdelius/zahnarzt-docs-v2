/**
 * Gate M13: Medical KB Hash Stability
 *
 * GATE DEFINITION:
 * Medical KB hash must be stable across multiple runs.
 * Same content → same hash (canonicalization).
 */

import { describe, it, expect } from 'vitest';
import { jsonMedicalKbProvider, clearMedicalKbCache } from '../../../v10/kb/medical';
import { computeKbHash } from '../../../v10/kb/util';

describe('Gate M13: Medical KB Hash Stability', () => {
    it('hash is stable across multiple getMeta() calls', () => {
        clearMedicalKbCache();

        const meta1 = jsonMedicalKbProvider.getMeta();
        const meta2 = jsonMedicalKbProvider.getMeta();

        expect(meta1.hash).toBe(meta2.hash);
        expect(meta1.version).toBe(meta2.version);
        expect(meta1.source).toBe('json');
    });

    it('hash is deterministic after cache clear', () => {
        clearMedicalKbCache();
        const hash1 = jsonMedicalKbProvider.getMeta().hash;

        clearMedicalKbCache();
        const hash2 = jsonMedicalKbProvider.getMeta().hash;

        expect(hash1).toBe(hash2);
    });

    it('hash is non-empty and has reasonable length', () => {
        const meta = jsonMedicalKbProvider.getMeta();

        expect(meta.hash).toBeDefined();
        expect(meta.hash.length).toBeGreaterThanOrEqual(12);
    });

    it('version is present', () => {
        const meta = jsonMedicalKbProvider.getMeta();

        expect(meta.version).toBeDefined();
        expect(meta.version.length).toBeGreaterThan(0);
    });

    it('computeKbHash is consistent for same input', () => {
        const obj = { a: 1, b: { c: 2 } };

        const hash1 = computeKbHash(obj);
        const hash2 = computeKbHash(obj);

        expect(hash1).toBe(hash2);
    });

    it('computeKbHash produces different hashes for different inputs', () => {
        const hash1 = computeKbHash({ a: 1 });
        const hash2 = computeKbHash({ a: 2 });

        expect(hash1).not.toBe(hash2);
    });

    it('computeKbHash handles key order (canonicalization)', () => {
        // Different key order should produce same hash
        const hash1 = computeKbHash({ a: 1, b: 2 });
        const hash2 = computeKbHash({ b: 2, a: 1 });

        expect(hash1).toBe(hash2);
    });
});
