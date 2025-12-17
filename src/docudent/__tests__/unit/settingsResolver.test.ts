/**
 * Unit Tests: Settings Resolver
 *
 * Tests the hierarchical settings resolution logic including:
 * - System defaults initialization
 * - Override layer application
 * - Diff computation between resolved settings
 */

import { describe, it, expect } from 'vitest';
import {
    initializeSystemDefaults,
    applyOverrideLayer,
    resolveSettings,
    computeSettingsDiffBetween,
    extractSettingsValues,
} from '../../core/settings/settingsResolver';

import type { SettingsHierarchy } from '../../contracts/settingsContracts';

describe('Settings Resolver', () => {
    describe('initializeSystemDefaults', () => {
        it('should initialize all settings with source=system', () => {
            const resolved = initializeSystemDefaults();

            // Check fuellung defaults
            expect(resolved.fuellung.mkvDefaults.mehrschicht.source).toBe('system');
            expect(resolved.fuellung.mkvDefaults.mehrschicht.isDefault).toBe(true);
            expect(resolved.fuellung.mkvDefaults.mehrschicht.value).toBe(true);

            expect(resolved.fuellung.defaults.trockenlegung.source).toBe('system');
            expect(resolved.fuellung.defaults.trockenlegung.value).toBe('kofferdam');

            // Check endo defaults
            expect(resolved.endo.defaults.mikroskop.source).toBe('system');
            expect(resolved.endo.defaults.mikroskop.value).toBe(false);
            expect(resolved.endo.defaults.obturation.value).toBe('thermoplastisch');
        });

        it('should mark all values as isDefault and not overridden', () => {
            const resolved = initializeSystemDefaults();

            expect(resolved.fuellung.defaults.anesthesia.enabled.isDefault).toBe(true);
            expect(resolved.fuellung.defaults.anesthesia.enabled.wasOverridden).toBe(false);
            expect(resolved.fuellung.defaults.anesthesia.ukPosteriorMode.isDefault).toBe(true);
        });
    });

    describe('applyOverrideLayer', () => {
        it('should apply org override and update source metadata', () => {
            const base = initializeSystemDefaults();
            const patched = applyOverrideLayer(
                base,
                {
                    fuellung: {
                        defaults: { trockenlegung: 'relativ' },
                    },
                },
                'org',
                'org_123',
                '2025-01-01T00:00:00Z'
            );

            expect(patched.fuellung.defaults.trockenlegung.value).toBe('relativ');
            expect(patched.fuellung.defaults.trockenlegung.source).toBe('org');
            expect(patched.fuellung.defaults.trockenlegung.refId).toBe('org_123');
            expect(patched.fuellung.defaults.trockenlegung.isDefault).toBe(false);
            expect(patched.fuellung.defaults.trockenlegung.wasOverridden).toBe(true);

            // Other values should remain unchanged
            expect(patched.fuellung.mkvDefaults.mehrschicht.source).toBe('system');
        });

        it('should allow nested override (anesthesia sub-object)', () => {
            const base = initializeSystemDefaults();
            const patched = applyOverrideLayer(
                base,
                {
                    fuellung: {
                        defaults: {
                            anesthesia: { ukPosteriorMode: 'infiltration' },
                        },
                    },
                },
                'provider',
                'dr_smith'
            );

            expect(patched.fuellung.defaults.anesthesia.ukPosteriorMode.value).toBe('infiltration');
            expect(patched.fuellung.defaults.anesthesia.ukPosteriorMode.source).toBe('provider');

            // Other anesthesia fields should remain system defaults
            expect(patched.fuellung.defaults.anesthesia.enabled.source).toBe('system');
            expect(patched.fuellung.defaults.anesthesia.okPosteriorMode.source).toBe('system');
        });
    });

    describe('resolveSettings', () => {
        it('should resolve empty hierarchy to system defaults', () => {
            const resolved = resolveSettings({});

            expect(resolved.fuellung.defaults.trockenlegung.source).toBe('system');
            expect(resolved.fuellung.defaults.trockenlegung.value).toBe('kofferdam');
        });

        it('should apply hierarchy in correct order (nearest wins)', () => {
            const hierarchy: SettingsHierarchy = {
                org: {
                    refId: 'org_1',
                    overrides: {
                        fuellung: { defaults: { trockenlegung: 'relativ' } },
                    },
                },
                provider: {
                    refId: 'dr_smith',
                    overrides: {
                        fuellung: { defaults: { trockenlegung: 'kofferdam' } },
                    },
                },
            };

            const resolved = resolveSettings(hierarchy);

            // Provider override should win over org
            expect(resolved.fuellung.defaults.trockenlegung.value).toBe('kofferdam');
            expect(resolved.fuellung.defaults.trockenlegung.source).toBe('provider');
        });

        it('should handle partial overrides at different levels', () => {
            const hierarchy: SettingsHierarchy = {
                org: {
                    refId: 'org_1',
                    overrides: {
                        endo: { defaults: { mikroskop: true } },
                    },
                },
                practice: {
                    refId: 'practice_1',
                    overrides: {
                        fuellung: { mkvDefaults: { mehrschicht: false } },
                    },
                },
            };

            const resolved = resolveSettings(hierarchy);

            expect(resolved.endo.defaults.mikroskop.value).toBe(true);
            expect(resolved.endo.defaults.mikroskop.source).toBe('org');

            expect(resolved.fuellung.mkvDefaults.mehrschicht.value).toBe(false);
            expect(resolved.fuellung.mkvDefaults.mehrschicht.source).toBe('practice');

            // Unaffected values remain system defaults
            expect(resolved.fuellung.defaults.aufklaerungEnabled.source).toBe('system');
        });

        it('should handle session overrides (never persisted)', () => {
            const hierarchy: SettingsHierarchy = {
                session: {
                    overrides: {
                        fuellung: { defaults: { aufklaerungEnabled: false } },
                    },
                },
            };

            const resolved = resolveSettings(hierarchy);

            expect(resolved.fuellung.defaults.aufklaerungEnabled.value).toBe(false);
            expect(resolved.fuellung.defaults.aufklaerungEnabled.source).toBe('session');
        });
    });

    describe('computeSettingsDiffBetween', () => {
        it('should return empty diff for identical settings', () => {
            const a = initializeSystemDefaults();
            const b = initializeSystemDefaults();

            const diff = computeSettingsDiffBetween(a, b);

            expect(diff.diffs).toHaveLength(0);
            expect(diff.valueChanges).toBe(0);
            expect(diff.sourceOnlyChanges).toBe(0);
        });

        it('should detect value changes', () => {
            const baseline = initializeSystemDefaults();
            const current = applyOverrideLayer(
                baseline,
                { fuellung: { defaults: { trockenlegung: 'relativ' } } },
                'provider',
                'dr_smith'
            );

            const diff = computeSettingsDiffBetween(baseline, current);

            expect(diff.valueChanges).toBe(1);
            expect(diff.diffs).toHaveLength(1);
            expect(diff.diffs[0].path).toBe('fuellung.defaults.trockenlegung');
            expect(diff.diffs[0].baseValue).toBe('kofferdam');
            expect(diff.diffs[0].currentValue).toBe('relativ');
            expect(diff.diffs[0].valueChanged).toBe(true);
        });

        it('should detect source-only changes (same value, different source)', () => {
            // System default is 'kofferdam', org overrides to 'kofferdam' (same value)
            const baseline = initializeSystemDefaults();
            const current = applyOverrideLayer(
                baseline,
                { fuellung: { defaults: { trockenlegung: 'kofferdam' } } },
                'org',
                'org_1'
            );

            const diff = computeSettingsDiffBetween(baseline, current);

            // Value is same, but source changed
            expect(diff.sourceOnlyChanges).toBe(1);
            expect(diff.valueChanges).toBe(0);
            expect(diff.diffs[0].sourceChanged).toBe(true);
            expect(diff.diffs[0].valueChanged).toBe(false);
        });
    });

    describe('extractSettingsValues', () => {
        it('should strip metadata and return plain values', () => {
            const resolved = initializeSystemDefaults();
            const values = extractSettingsValues(resolved);

            expect(values.fuellung?.mkvDefaults?.mehrschicht).toBe(true);
            expect(values.fuellung?.defaults?.trockenlegung).toBe('kofferdam');
            expect(values.endo?.defaults?.obturation).toBe('thermoplastisch');

            // Should not have metadata
            expect((values.fuellung?.mkvDefaults as any)?.mehrschicht?.source).toBeUndefined();
        });
    });
});
