/**
 * Hash Utils — Unit Tests
 *
 * Tests deterministic hashing across different key orders and nested structures.
 */

import { describe, it, expect } from 'vitest';
import { deepStableStringify, computeSettingsHashSync } from '../hashUtils';

describe('deepStableStringify', () => {
    it('produces identical output for same object with different key order', () => {
        const obj1 = { z: 1, a: 2, m: 3 };
        const obj2 = { a: 2, m: 3, z: 1 };
        const obj3 = { m: 3, z: 1, a: 2 };

        expect(deepStableStringify(obj1)).toBe(deepStableStringify(obj2));
        expect(deepStableStringify(obj2)).toBe(deepStableStringify(obj3));
    });

    it('handles nested objects with different key orders', () => {
        const obj1 = {
            z: { c: 1, a: 2 },
            a: { x: 3, b: 4 },
        };
        const obj2 = {
            a: { b: 4, x: 3 },
            z: { a: 2, c: 1 },
        };

        expect(deepStableStringify(obj1)).toBe(deepStableStringify(obj2));
    });

    it('handles arrays (preserves order)', () => {
        const obj1 = { items: [3, 1, 2] };
        const obj2 = { items: [3, 1, 2] };
        const obj3 = { items: [1, 2, 3] };

        expect(deepStableStringify(obj1)).toBe(deepStableStringify(obj2));
        expect(deepStableStringify(obj1)).not.toBe(deepStableStringify(obj3));
    });

    it('handles deeply nested structures', () => {
        const obj1 = {
            level1: {
                z: { nested: { deep: { value: 42 } } },
                a: { other: true },
            },
        };
        const obj2 = {
            level1: {
                a: { other: true },
                z: { nested: { deep: { value: 42 } } },
            },
        };

        expect(deepStableStringify(obj1)).toBe(deepStableStringify(obj2));
    });

    it('handles null and undefined', () => {
        const obj1 = { a: null, b: undefined };
        const obj2 = { b: undefined, a: null };

        expect(deepStableStringify(obj1)).toBe(deepStableStringify(obj2));
    });

    it('handles primitives', () => {
        expect(deepStableStringify('hello')).toBe('"hello"');
        expect(deepStableStringify(123)).toBe('123');
        expect(deepStableStringify(true)).toBe('true');
        expect(deepStableStringify(null)).toBe('null');
    });
});

describe('computeSettingsHashSync', () => {
    it('produces same hash for same object with different key order', () => {
        const obj1 = { z: 'value', a: 'other' };
        const obj2 = { a: 'other', z: 'value' };

        const hash1 = computeSettingsHashSync(obj1);
        const hash2 = computeSettingsHashSync(obj2);

        expect(hash1).toBe(hash2);
    });

    it('produces different hash for different values', () => {
        const obj1 = { setting: 'value1' };
        const obj2 = { setting: 'value2' };

        const hash1 = computeSettingsHashSync(obj1);
        const hash2 = computeSettingsHashSync(obj2);

        expect(hash1).not.toBe(hash2);
    });

    it('produces consistent hash across runs', () => {
        const settings = {
            'fuellung.defaults.trockenlegung': 'kofferdam',
            'endo.defaults.spuelprotokoll': 'naocl_edta',
        };

        const hash1 = computeSettingsHashSync(settings);
        const hash2 = computeSettingsHashSync(settings);
        const hash3 = computeSettingsHashSync(settings);

        expect(hash1).toBe(hash2);
        expect(hash2).toBe(hash3);
    });

    it('hash format is correct', () => {
        const hash = computeSettingsHashSync({ test: true });
        expect(hash).toMatch(/^djb2:[0-9a-f]{8}$/);
    });
});

describe('Real settings scenario', () => {
    it('complex settings object produces deterministic hash', () => {
        const settings1 = {
            fuellung: {
                defaults: {
                    trockenlegung: 'kofferdam',
                    ueberkappungMaterial: 'mta',
                    anesthesia: {
                        ukPosteriorMode: 'leitung',
                        okPosteriorMode: 'infiltration',
                    },
                },
            },
            endo: {
                defaults: {
                    spuelprotokoll: 'naocl_edta',
                    mikroskop: true,
                },
            },
        };

        // Same data, different construction order
        const settings2 = {
            endo: {
                defaults: {
                    mikroskop: true,
                    spuelprotokoll: 'naocl_edta',
                },
            },
            fuellung: {
                defaults: {
                    anesthesia: {
                        okPosteriorMode: 'infiltration',
                        ukPosteriorMode: 'leitung',
                    },
                    ueberkappungMaterial: 'mta',
                    trockenlegung: 'kofferdam',
                },
            },
        };

        const hash1 = computeSettingsHashSync(settings1);
        const hash2 = computeSettingsHashSync(settings2);

        expect(hash1).toBe(hash2);
    });
});
