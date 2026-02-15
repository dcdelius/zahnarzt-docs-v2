/**
 * Gate Test: Aufklärung Setting Toggle
 * 
 * Ensures that aufklaerungEnabled setting works correctly:
 * - Default value is true
 * - Interface contracts are correct
 * 
 * NOTE: Persistence tests require browser environment with localStorage.
 * This test focuses on default values and type contracts only.
 */

import { describe, it, expect } from 'vitest';
import {
    getFuellungDefaults,
    DEFAULT_SETTINGS,
    type FuellungDefaults,
} from '../../v7/settings/settingsStore';

describe('Gate: Aufklärung Setting Toggle', () => {
    // ════════════════════════════════════════════════════════════════
    // Default value
    // ════════════════════════════════════════════════════════════════
    it('should have aufklaerungEnabled=true by default', () => {
        const defaults = getFuellungDefaults();
        expect(defaults.aufklaerungEnabled).toBe(true);
    });

    it('should be present in DEFAULT_SETTINGS', () => {
        expect(DEFAULT_SETTINGS.fuellung?.defaults?.aufklaerungEnabled).toBe(true);
    });

    // ════════════════════════════════════════════════════════════════
    // Type contract
    // ════════════════════════════════════════════════════════════════
    it('should have aufklaerungEnabled in FuellungDefaults type', () => {
        // Type-level test: if this compiles, the type includes aufklaerungEnabled
        const testDefaults: FuellungDefaults = {
            trockenlegung: 'kofferdam',
            ueberkappungMaterial: 'caoh',
            anesthesia: {
                enabled: true,
                ukPosteriorMode: 'leitung',
                okPosteriorMode: 'infiltration',
                frontMode: 'infiltration',
            },
            matrix: {
                approximalMode: 'sektional',
                wedge: 'holz',
                ring: 'ja',
            },
            aufklaerungEnabled: true,
        };

        expect(testDefaults.aufklaerungEnabled).toBe(true);
    });

    it('should allow aufklaerungEnabled=false in type definition', () => {
        // Verify false is a valid value
        const testDefaults: FuellungDefaults = {
            trockenlegung: 'kofferdam',
            ueberkappungMaterial: 'caoh',
            anesthesia: {
                enabled: true,
                ukPosteriorMode: 'leitung',
                okPosteriorMode: 'infiltration',
                frontMode: 'infiltration',
            },
            matrix: {
                approximalMode: 'sektional',
                wedge: 'holz',
                ring: 'ja',
            },
            aufklaerungEnabled: false,
        };

        expect(testDefaults.aufklaerungEnabled).toBe(false);
    });

    // ════════════════════════════════════════════════════════════════
    // Default values contain all required fields
    // ════════════════════════════════════════════════════════════════
    it('should return all required FuellungDefaults fields', () => {
        const defaults = getFuellungDefaults();

        // All fields should be present
        expect(defaults.trockenlegung).toBeDefined();
        expect(defaults.ueberkappungMaterial).toBeDefined();
        expect(defaults.anesthesia).toBeDefined();
        expect(defaults.matrix).toBeDefined();
        expect(defaults.aufklaerungEnabled).toBeDefined();

        // Types should be correct
        expect(typeof defaults.aufklaerungEnabled).toBe('boolean');
    });
});
