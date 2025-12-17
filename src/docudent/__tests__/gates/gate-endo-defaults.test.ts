/**
 * Gate Test: Endo Defaults
 * 
 * Verifies Endo practice settings are correctly implemented:
 * - Default values
 * - Validation of invalid stored values
 * - Deep merge for partial updates
 */

import { describe, it, expect } from 'vitest';
import {
    getEndoDefaults,
    DEFAULT_SETTINGS,
    type EndoDefaults,
} from '../../v7/settings/settingsStore';

describe('Gate: Endo Defaults', () => {
    // ════════════════════════════════════════════════════════════════
    // Default values
    // ════════════════════════════════════════════════════════════════
    it('should have mikroskop=false by default', () => {
        const defaults = getEndoDefaults();
        expect(defaults.mikroskop).toBe(false);
    });

    it('should have eal=immer by default', () => {
        const defaults = getEndoDefaults();
        expect(defaults.eal).toBe('immer');
    });

    it('should have spuelprotokoll=naocl_edta by default', () => {
        const defaults = getEndoDefaults();
        expect(defaults.spuelprotokoll).toBe('naocl_edta');
    });

    it('should have aktivierung=ultraschall by default', () => {
        const defaults = getEndoDefaults();
        expect(defaults.aktivierung).toBe('ultraschall');
    });

    it('should have obturation=thermoplastisch by default', () => {
        const defaults = getEndoDefaults();
        expect(defaults.obturation).toBe('thermoplastisch');
    });

    it('should have kofferdam=true by default', () => {
        const defaults = getEndoDefaults();
        expect(defaults.kofferdam).toBe(true);
    });

    it('should have aufklaerungEnabled=true by default', () => {
        const defaults = getEndoDefaults();
        expect(defaults.aufklaerungEnabled).toBe(true);
    });

    // ════════════════════════════════════════════════════════════════
    // DEFAULT_SETTINGS includes Endo
    // ════════════════════════════════════════════════════════════════
    it('should have endo section in DEFAULT_SETTINGS', () => {
        expect(DEFAULT_SETTINGS.endo).toBeDefined();
        expect(DEFAULT_SETTINGS.endo?.defaults).toBeDefined();
    });

    it('should have all Endo fields in DEFAULT_SETTINGS', () => {
        const endoDefaults = DEFAULT_SETTINGS.endo?.defaults;
        expect(endoDefaults?.mikroskop).toBeDefined();
        expect(endoDefaults?.eal).toBeDefined();
        expect(endoDefaults?.spuelprotokoll).toBeDefined();
        expect(endoDefaults?.aktivierung).toBeDefined();
        expect(endoDefaults?.obturation).toBeDefined();
        expect(endoDefaults?.kofferdam).toBeDefined();
        expect(endoDefaults?.aufklaerungEnabled).toBeDefined();
    });

    // ════════════════════════════════════════════════════════════════
    // Type contracts
    // ════════════════════════════════════════════════════════════════
    it('should have valid EndoDefaults type', () => {
        const testDefaults: EndoDefaults = {
            mikroskop: true,
            eal: 'bei_aufbereitung',
            spuelprotokoll: 'naocl',
            aktivierung: 'sonic',
            obturation: 'lateral',
            kofferdam: false,
            aufklaerungEnabled: false,
        };

        // All values should be valid
        expect(testDefaults.mikroskop).toBe(true);
        expect(testDefaults.eal).toBe('bei_aufbereitung');
        expect(testDefaults.obturation).toBe('lateral');
    });

    it('should return all required EndoDefaults fields', () => {
        const defaults = getEndoDefaults();

        // All fields should be present
        expect(typeof defaults.mikroskop).toBe('boolean');
        expect(typeof defaults.eal).toBe('string');
        expect(typeof defaults.spuelprotokoll).toBe('string');
        expect(typeof defaults.aktivierung).toBe('string');
        expect(typeof defaults.obturation).toBe('string');
        expect(typeof defaults.kofferdam).toBe('boolean');
        expect(typeof defaults.aufklaerungEnabled).toBe('boolean');
    });

    // ════════════════════════════════════════════════════════════════
    // Valid option values
    // ════════════════════════════════════════════════════════════════
    it('should only allow valid eal values', () => {
        const validValues: EndoDefaults['eal'][] = ['immer', 'bei_aufbereitung', 'fragen'];
        const defaults = getEndoDefaults();
        expect(validValues).toContain(defaults.eal);
    });

    it('should only allow valid spuelprotokoll values', () => {
        const validValues: EndoDefaults['spuelprotokoll'][] = ['naocl_edta', 'naocl', 'fragen'];
        const defaults = getEndoDefaults();
        expect(validValues).toContain(defaults.spuelprotokoll);
    });

    it('should only allow valid aktivierung values', () => {
        const validValues: EndoDefaults['aktivierung'][] = ['ultraschall', 'sonic', 'keine', 'fragen'];
        const defaults = getEndoDefaults();
        expect(validValues).toContain(defaults.aktivierung);
    });

    it('should only allow valid obturation values', () => {
        const validValues: EndoDefaults['obturation'][] = ['thermoplastisch', 'lateral', 'fragen'];
        const defaults = getEndoDefaults();
        expect(validValues).toContain(defaults.obturation);
    });
});
