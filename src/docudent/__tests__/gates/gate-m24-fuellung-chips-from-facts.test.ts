/**
 * Gate Test: M24 Fuellung Chip Emission from Facts
 *
 * Validates that fuellung chips emit correctly from facts.
 */

import { describe, test, expect } from 'vitest';
import { applyMedicalKb } from '../../medical_kb/engine/applyMedicalKb';

describe('gate-m24-fuellung-chips-from-facts', () => {
    // ═══════════════════════════════════════════════════════════════
    // LA CHIPS
    // ═══════════════════════════════════════════════════════════════

    test('anesthesiaType=leitung emits la_leitung', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    anesthesiaType: 'leitung',
                },
            },
        });
        expect(result.emittedChips).toContain('la_leitung');
    });

    test('anesthesiaType=infiltration emits la_infiltr', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    anesthesiaType: 'infiltration',
                },
            },
        });
        expect(result.emittedChips).toContain('la_infiltr');
    });

    test('surfaceAnesthesia=true emits oberflaeche_la', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    surfaceAnesthesia: true,
                },
            },
        });
        expect(result.emittedChips).toContain('oberflaeche_la');
    });

    // ═══════════════════════════════════════════════════════════════
    // ISOLATION
    // ═══════════════════════════════════════════════════════════════

    test('isolation=kofferdam emits kofferdam', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    isolation: 'kofferdam',
                },
            },
        });
        expect(result.emittedChips).toContain('kofferdam');
    });

    // ═══════════════════════════════════════════════════════════════
    // CAPPING
    // ═══════════════════════════════════════════════════════════════

    test('capping.type=direct emits p', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                capping: {
                    performed: 'yes',
                    type: 'direct',
                },
            },
        });
        expect(result.emittedChips).toContain('p');
    });

    // ═══════════════════════════════════════════════════════════════
    // FLUORIDATION
    // ═══════════════════════════════════════════════════════════════

    test('fluoridation=true emits fluor', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                fuellung: {
                    fluoridation: true,
                },
            },
        });
        expect(result.emittedChips).toContain('fluor');
    });

    // ═══════════════════════════════════════════════════════════════
    // DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    test('M24 chip emission is deterministic 50x', () => {
        const facts = {
            treatmentId: 'fuellung',
            fuellung: {
                anesthesiaType: 'infiltration',
                isolation: 'kofferdam',
                fluoridation: true,
            },
        };

        const results: string[] = [];
        for (let i = 0; i < 50; i++) {
            const result = applyMedicalKb({ treatmentId: 'fuellung', facts });
            results.push(result.emittedChips.sort().join(','));
        }

        expect(new Set(results).size).toBe(1);
    });
});
