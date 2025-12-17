/**
 * Unit Tests: settingsStore
 * 
 * Tests localStorage-based practice settings for MKV defaults,
 * anesthesia defaults, and matrix defaults.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getSettings,
    setSettings,
    getFuellungMkvDefaults,
    setFuellungMkvDefaults,
    getFuellungDefaults,
    setFuellungDefaults,
    resetSettings,
    DEFAULT_SETTINGS
} from '../../v7/settings/settingsStore';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

// Override both window.localStorage and global.localStorage
Object.defineProperty(global, 'window', {
    value: { localStorage: localStorageMock },
    writable: true,
});
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

describe('settingsStore', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('getSettings', () => {
        it('returns DEFAULT_SETTINGS when localStorage is empty', () => {
            const settings = getSettings();
            expect(settings).toEqual(DEFAULT_SETTINGS);
        });

        it('returns stored settings when valid JSON exists', () => {
            const customSettings = {
                fuellung: {
                    mkvDefaults: { mehrschicht: false, adhasiv: true }
                }
            };
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify(customSettings));

            const settings = getSettings();
            expect(settings.fuellung?.mkvDefaults?.mehrschicht).toBe(false);
            expect(settings.fuellung?.mkvDefaults?.adhasiv).toBe(true);
        });

        it('returns DEFAULT_SETTINGS when localStorage has invalid JSON', () => {
            localStorageMock.setItem('docudent_settings_v7', 'invalid-json{');

            const settings = getSettings();
            expect(settings).toEqual(DEFAULT_SETTINGS);
        });
    });

    describe('getFuellungMkvDefaults', () => {
        it('returns default values when not set', () => {
            const defaults = getFuellungMkvDefaults();
            expect(defaults.mehrschicht).toBe(true);
            expect(defaults.adhasiv).toBe(true);
        });

        it('returns stored values when set', () => {
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify({
                fuellung: { mkvDefaults: { mehrschicht: false, adhasiv: false } }
            }));

            const defaults = getFuellungMkvDefaults();
            expect(defaults.mehrschicht).toBe(false);
            expect(defaults.adhasiv).toBe(false);
        });

        it('handles partial/malformed settings gracefully', () => {
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify({
                fuellung: { mkvDefaults: { mehrschicht: 'not-a-boolean' } }
            }));

            const defaults = getFuellungMkvDefaults();
            expect(defaults.mehrschicht).toBe(true); // Falls back to default
            expect(defaults.adhasiv).toBe(true); // Falls back to default
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // FUELLUNG DEFAULTS (trockenlegung, ueberkappung, anesthesia, matrix)
    // ═══════════════════════════════════════════════════════════════
    describe('getFuellungDefaults', () => {
        it('returns default values when not set', () => {
            const defaults = getFuellungDefaults();
            expect(defaults.trockenlegung).toBe('kofferdam');
            expect(defaults.ueberkappungMaterial).toBe('caoh');
            expect(defaults.anesthesia.enabled).toBe(true);
            expect(defaults.anesthesia.ukPosteriorMode).toBe('leitung');
            expect(defaults.anesthesia.okPosteriorMode).toBe('infiltration');
            expect(defaults.anesthesia.frontMode).toBe('infiltration');
            expect(defaults.matrix.approximalMode).toBe('sektional');
            expect(defaults.matrix.wedge).toBe('holz');
            expect(defaults.matrix.ring).toBe('ja');
        });

        it('returns stored trockenlegung + ueberkappung values', () => {
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify({
                fuellung: {
                    defaults: {
                        trockenlegung: 'relativ',
                        ueberkappungMaterial: 'mta',
                        anesthesia: {
                            enabled: true,
                            ukPosteriorMode: 'leitung',
                            okPosteriorMode: 'infiltration',
                            frontMode: 'infiltration'
                        },
                        matrix: {
                            approximalMode: 'sektional',
                            wedge: 'holz',
                            ring: 'ja'
                        }
                    }
                }
            }));

            const defaults = getFuellungDefaults();
            expect(defaults.trockenlegung).toBe('relativ');
            expect(defaults.ueberkappungMaterial).toBe('mta');
        });

        it('returns stored anesthesia values', () => {
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify({
                fuellung: {
                    defaults: {
                        trockenlegung: 'kofferdam',
                        ueberkappungMaterial: 'caoh',
                        anesthesia: {
                            enabled: false,
                            ukPosteriorMode: 'intraligamentaer',
                            okPosteriorMode: 'fragen',
                            frontMode: 'fragen'
                        },
                        matrix: {
                            approximalMode: 'sektional',
                            wedge: 'holz',
                            ring: 'ja'
                        }
                    }
                }
            }));

            const defaults = getFuellungDefaults();
            expect(defaults.anesthesia.enabled).toBe(false);
            expect(defaults.anesthesia.ukPosteriorMode).toBe('intraligamentaer');
            expect(defaults.anesthesia.okPosteriorMode).toBe('fragen');
            expect(defaults.anesthesia.frontMode).toBe('fragen');
        });

        it('returns stored matrix values', () => {
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify({
                fuellung: {
                    defaults: {
                        trockenlegung: 'kofferdam',
                        ueberkappungMaterial: 'caoh',
                        anesthesia: {
                            enabled: true,
                            ukPosteriorMode: 'leitung',
                            okPosteriorMode: 'infiltration',
                            frontMode: 'infiltration'
                        },
                        matrix: {
                            approximalMode: 'tofflemire',
                            wedge: 'kunststoff',
                            ring: 'nein'
                        }
                    }
                }
            }));

            const defaults = getFuellungDefaults();
            expect(defaults.matrix.approximalMode).toBe('tofflemire');
            expect(defaults.matrix.wedge).toBe('kunststoff');
            expect(defaults.matrix.ring).toBe('nein');
        });

        it('handles invalid anesthesia values gracefully', () => {
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify({
                fuellung: {
                    defaults: {
                        trockenlegung: 'kofferdam',
                        ueberkappungMaterial: 'caoh',
                        anesthesia: {
                            enabled: 'invalid',
                            ukPosteriorMode: 'invalid',
                            okPosteriorMode: 'invalid',
                            frontMode: 'invalid'
                        },
                        matrix: {
                            approximalMode: 'sektional',
                            wedge: 'holz',
                            ring: 'ja'
                        }
                    }
                }
            }));

            const defaults = getFuellungDefaults();
            expect(defaults.anesthesia.enabled).toBe(true); // Falls back
            expect(defaults.anesthesia.ukPosteriorMode).toBe('leitung'); // Falls back
            expect(defaults.anesthesia.okPosteriorMode).toBe('infiltration'); // Falls back
            expect(defaults.anesthesia.frontMode).toBe('infiltration'); // Falls back
        });

        it('handles invalid matrix values gracefully', () => {
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify({
                fuellung: {
                    defaults: {
                        trockenlegung: 'kofferdam',
                        ueberkappungMaterial: 'caoh',
                        anesthesia: {
                            enabled: true,
                            ukPosteriorMode: 'leitung',
                            okPosteriorMode: 'infiltration',
                            frontMode: 'infiltration'
                        },
                        matrix: {
                            approximalMode: 'invalid',
                            wedge: 'invalid',
                            ring: 'invalid'
                        }
                    }
                }
            }));

            const defaults = getFuellungDefaults();
            expect(defaults.matrix.approximalMode).toBe('sektional'); // Falls back
            expect(defaults.matrix.wedge).toBe('holz'); // Falls back
            expect(defaults.matrix.ring).toBe('ja'); // Falls back
        });
    });

    describe('setFuellungDefaults', () => {
        it('updates trockenlegung only', () => {
            setFuellungDefaults({ trockenlegung: 'relativ' });

            const defaults = getFuellungDefaults();
            expect(defaults.trockenlegung).toBe('relativ');
            expect(defaults.ueberkappungMaterial).toBe('caoh'); // Unchanged
            expect(defaults.anesthesia.ukPosteriorMode).toBe('leitung'); // Unchanged
            expect(defaults.matrix.approximalMode).toBe('sektional'); // Unchanged
        });

        it('updates anesthesia partially (deep merge)', () => {
            setFuellungDefaults({
                anesthesia: { enabled: false, ukPosteriorMode: 'infiltration' } as any
            });

            const defaults = getFuellungDefaults();
            expect(defaults.anesthesia.enabled).toBe(false);
            expect(defaults.anesthesia.ukPosteriorMode).toBe('infiltration');
            expect(defaults.anesthesia.okPosteriorMode).toBe('infiltration'); // Unchanged
            expect(defaults.anesthesia.frontMode).toBe('infiltration'); // Unchanged
        });

        it('updates matrix partially (deep merge)', () => {
            setFuellungDefaults({
                matrix: { wedge: 'kunststoff' } as any
            });

            const defaults = getFuellungDefaults();
            expect(defaults.matrix.wedge).toBe('kunststoff');
            expect(defaults.matrix.approximalMode).toBe('sektional'); // Unchanged
            expect(defaults.matrix.ring).toBe('ja'); // Unchanged
        });
    });

    describe('setSettings', () => {
        it('saves settings to localStorage', () => {
            setSettings({ fuellung: { mkvDefaults: { mehrschicht: false, adhasiv: true } } });

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'docudent_settings_v7',
                expect.any(String)
            );
        });

        it('merges with existing settings', () => {
            localStorageMock.setItem('docudent_settings_v7', JSON.stringify({
                fuellung: { mkvDefaults: { mehrschicht: true, adhasiv: true } }
            }));

            setSettings({ fuellung: { mkvDefaults: { mehrschicht: false, adhasiv: false } } });

            const saved = JSON.parse(localStorageMock.setItem.mock.calls[1][1]);
            expect(saved.fuellung.mkvDefaults.mehrschicht).toBe(false);
        });
    });

    describe('setFuellungMkvDefaults', () => {
        it('updates specific MKV defaults', () => {
            setFuellungMkvDefaults({ mehrschicht: false });

            const defaults = getFuellungMkvDefaults();
            expect(defaults.mehrschicht).toBe(false);
            expect(defaults.adhasiv).toBe(true); // Unchanged
        });
    });

    describe('resetSettings', () => {
        it('removes settings from localStorage', () => {
            localStorageMock.setItem('docudent_settings_v7', '{}');
            resetSettings();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('docudent_settings_v7');
        });
    });
});
