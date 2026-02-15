/**
 * Gate M13.1: Firestore Fallback Source Marking
 *
 * GATE DEFINITION:
 * When Firestore flag is enabled but Firestore is unavailable,
 * the provider must mark source as 'firestore_fallback'.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firestoreTreatmentKbProvider } from '../../../v10/kb/treatment/providers/firestoreProvider';
import { jsonTreatmentKbProvider } from '../../../v10/kb/treatment/providers/jsonProvider';

describe('Gate M13.1: Firestore Fallback Source Marking', () => {
    const originalLocalStorage = globalThis.localStorage;
    const originalEnv = process.env.VITE_KB_FIRESTORE;

    beforeEach(() => {
        // Clear any existing flag
        delete process.env.VITE_KB_FIRESTORE;
    });

    afterEach(() => {
        // Restore original state
        if (originalEnv !== undefined) {
            process.env.VITE_KB_FIRESTORE = originalEnv;
        } else {
            delete process.env.VITE_KB_FIRESTORE;
        }
    });

    it('without flag, source is json', () => {
        // Ensure flag is off
        delete process.env.VITE_KB_FIRESTORE;

        const meta = jsonTreatmentKbProvider.getMeta('fuellung');

        expect(meta).toBeDefined();
        expect(meta?.source).toBe('json');
    });

    it('with flag enabled, source is firestore_fallback', () => {
        // Enable Firestore flag (via env since we're in Node/Vitest)
        process.env.VITE_KB_FIRESTORE = 'true';

        const meta = firestoreTreatmentKbProvider.getMeta('fuellung');

        expect(meta).toBeDefined();
        expect(meta?.source).toBe('firestore_fallback');
    });

    it('fallback has same version and hash as json', () => {
        // Get baseline from JSON provider
        const jsonMeta = jsonTreatmentKbProvider.getMeta('fuellung');

        // Enable flag
        process.env.VITE_KB_FIRESTORE = 'true';

        // Get from firestore provider (which falls back)
        const firestoreMeta = firestoreTreatmentKbProvider.getMeta('fuellung');

        expect(firestoreMeta).toBeDefined();
        expect(firestoreMeta?.version).toBe(jsonMeta?.version);
        expect(firestoreMeta?.hash).toBe(jsonMeta?.hash);
        expect(firestoreMeta?.source).toBe('firestore_fallback');
    });

    it('KB content is identical for fallback', () => {
        // Get baseline
        const jsonKb = jsonTreatmentKbProvider.getTreatmentKb('fuellung');

        // Enable flag
        process.env.VITE_KB_FIRESTORE = 'true';

        // Get via firestore provider
        const firestoreKb = firestoreTreatmentKbProvider.getTreatmentKb('fuellung');

        // Content should be identical (same underlying JSON)
        expect(firestoreKb).toEqual(jsonKb);
    });

    it('endo treatment also marks firestore_fallback', () => {
        process.env.VITE_KB_FIRESTORE = 'true';

        const meta = firestoreTreatmentKbProvider.getMeta('endo');

        expect(meta).toBeDefined();
        expect(meta?.source).toBe('firestore_fallback');
    });

    it('unknown treatment returns null even with flag', () => {
        process.env.VITE_KB_FIRESTORE = 'true';

        const meta = firestoreTreatmentKbProvider.getMeta('nonexistent');

        expect(meta).toBeNull();
    });
});
