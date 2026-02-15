/**
 * Gate Test: M24 Fuellung No False Positive Billing
 *
 * Ensures fuellung chips don't emit without proper triggers.
 */

import { describe, test, expect } from 'vitest';
import { applyMedicalKb } from '../../medical_kb/engine/applyMedicalKb';

describe('gate-m24-fuellung-no-false-positive-billing', () => {
    // ═══════════════════════════════════════════════════════════════
    // TREATMENT ID GUARD
    // ═══════════════════════════════════════════════════════════════

    test('endo treatment does NOT emit fuellung LA chips', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                fuellung: {
                    anesthesiaType: 'infiltration',
                },
            },
        });
        // Fuellung LA chips should NOT emit for endo treatment
        expect(result.emittedChips).not.toContain('la_infiltr');
    });

    // ═══════════════════════════════════════════════════════════════
    // MISSING TRIGGERS
    // ═══════════════════════════════════════════════════════════════

    test('fuellung without anesthesiaType does NOT emit LA chips', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    // No anesthesia info
                },
            },
        });
        expect(result.emittedChips).not.toContain('la_infiltr');
        expect(result.emittedChips).not.toContain('la_leitung');
    });

    test('fuellung without surfaceAnesthesia does NOT emit oberflaeche_la', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    surfaceAnesthesia: false,
                },
            },
        });
        expect(result.emittedChips).not.toContain('oberflaeche_la');
    });

    test('fuellung without isolation does NOT emit kofferdam', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    // No isolation
                },
            },
        });
        expect(result.emittedChips).not.toContain('kofferdam');
    });

    test('fuellung with relativ isolation does NOT emit kofferdam', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    isolation: 'relativ',
                },
            },
        });
        expect(result.emittedChips).not.toContain('kofferdam');
    });

    test('fuellung without fluoridation does NOT emit fluor', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    fluoridation: false,
                },
            },
        });
        expect(result.emittedChips).not.toContain('fluor');
    });

    test('fuellung indirect capping does NOT emit p', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                capping: {
                    performed: 'yes',
                    type: 'indirect',
                },
            },
        });
        expect(result.emittedChips).not.toContain('p');
    });
});
