/**
 * Settings Validator — Unit Tests
 *
 * Tests SSOT validation for settings overrides.
 */

import { describe, it, expect } from 'vitest';
import {
    validateOverrides,
    sanitizeOverrides,
    getAllowedSettingsPaths,
    ALLOWED_SETTINGS_PATHS,
} from '../../src/docudent/contracts/settingsValidator';

describe('validateOverrides', () => {
    it('rejects unknown path', () => {
        const result = validateOverrides({
            'invalid.unknown.path': 'value',
        });

        expect(result.ok).toBe(false);
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].code).toBe('UNKNOWN_PATH');
        expect(result.issues[0].path).toBe('invalid.unknown.path');
    });

    it('rejects value not in allowedValuesByPath', () => {
        const result = validateOverrides({
            'fuellung.defaults.trockenlegung': 'invalid_value',
        });

        expect(result.ok).toBe(false);
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].code).toBe('INVALID_VALUE');
        expect(result.issues[0].allowedValues).toContain('kofferdam');
    });

    it('supports boolean allowed values', () => {
        const result = validateOverrides({
            'fuellung.defaults.anesthesia.enabled': true,
            'endo.defaults.mikroskop': false,
        });

        expect(result.ok).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('rejects non-boolean for boolean path', () => {
        const result = validateOverrides({
            'fuellung.defaults.anesthesia.enabled': 'yes', // Should be boolean
        });

        expect(result.ok).toBe(false);
        expect(result.issues[0].code).toBe('TYPE_MISMATCH');
    });

    it('accepts canonical string values', () => {
        const result = validateOverrides({
            'fuellung.defaults.trockenlegung': 'kofferdam',
            'fuellung.defaults.ueberkappungMaterial': 'mta',
            'fuellung.defaults.anesthesia.ukPosteriorMode': 'leitung',
        });

        expect(result.ok).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('accepts endo enum values', () => {
        const result = validateOverrides({
            'endo.defaults.eal': 'immer',
            'endo.defaults.spuelprotokoll': 'naocl_edta',
            'endo.defaults.aktivierung': 'ultraschall',
        });

        expect(result.ok).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('empty overrides returns EMPTY_PATCH', () => {
        const result = validateOverrides({});

        expect(result.ok).toBe(false);
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].code).toBe('EMPTY_PATCH');
    });

    it('returns multiple issues for multiple invalid entries', () => {
        const result = validateOverrides({
            'unknown.path': 'value',
            'fuellung.defaults.trockenlegung': 'bad_value',
            'fuellung.defaults.anesthesia.enabled': 'string', // should be boolean
        });

        expect(result.ok).toBe(false);
        expect(result.issues.length).toBeGreaterThanOrEqual(3);
    });
});

describe('sanitizeOverrides', () => {
    it('drops invalid keys but keeps valid ones', () => {
        const result = sanitizeOverrides({
            'fuellung.defaults.trockenlegung': 'kofferdam', // valid
            'unknown.path': 'value', // invalid
            'fuellung.defaults.anesthesia.enabled': true, // valid
        });

        expect(result.sanitized).toEqual({
            'fuellung.defaults.trockenlegung': 'kofferdam',
            'fuellung.defaults.anesthesia.enabled': true,
        });
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].path).toBe('unknown.path');
    });

    it('returns empty sanitized if all invalid', () => {
        const result = sanitizeOverrides({
            'bad.path1': 'value',
            'bad.path2': 'value',
        });

        expect(Object.keys(result.sanitized)).toHaveLength(0);
        expect(result.issues).toHaveLength(2);
    });
});

describe('getAllowedSettingsPaths', () => {
    it('returns all allowed paths as array', () => {
        const paths = getAllowedSettingsPaths();

        expect(Array.isArray(paths)).toBe(true);
        expect(paths.length).toBeGreaterThan(10); // Should have more than 10 paths
        expect(paths).toContain('fuellung.defaults.trockenlegung');
        expect(paths).toContain('endo.defaults.eal');
    });
});

describe('ALLOWED_SETTINGS_PATHS', () => {
    it('includes both registry and boolean paths', () => {
        expect(ALLOWED_SETTINGS_PATHS.has('fuellung.defaults.trockenlegung')).toBe(true);
        expect(ALLOWED_SETTINGS_PATHS.has('fuellung.defaults.anesthesia.enabled')).toBe(true);
        expect(ALLOWED_SETTINGS_PATHS.has('endo.defaults.mikroskop')).toBe(true);
    });
});
