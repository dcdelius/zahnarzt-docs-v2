/**
 * Gate Test: M22 No False Positive Endo Billing
 *
 * Ensures endo chips don't emit from non-endo treatments or vague context.
 */

import { describe, test, expect } from 'vitest';
import { applyMedicalKb } from '../../medical_kb/engine/applyMedicalKb';

describe('gate-m22-no-false-positive-endo-billing', () => {
    // ═══════════════════════════════════════════════════════════════
    // TREATMENT ID GUARD
    // ═══════════════════════════════════════════════════════════════

    test('fuellung treatment does NOT emit endo chips', () => {
        const result = applyMedicalKb({
            treatmentId: 'fuellung',
            facts: {
                treatmentId: 'fuellung',
                endo: {  // Accidentally set endo facts
                    step: 'trepanation',
                    kofferdam: true,
                },
            },
        });

        // Should NOT emit any endo chips
        expect(result.emittedChips).not.toContain('trepanation');
        expect(result.emittedChips).not.toContain('kofferdam');
    });

    test('missing treatmentId does NOT emit endo chips', () => {
        const result = applyMedicalKb({
            treatmentId: '',
            facts: {
                treatmentId: '',
                endo: {
                    step: 'trepanation',
                },
            },
        });

        expect(result.emittedChips).not.toContain('trepanation');
    });

    // ═══════════════════════════════════════════════════════════════
    // MISSING TRIGGERS
    // ═══════════════════════════════════════════════════════════════

    test('endo without step does NOT emit trepanation', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    // No step defined
                },
            },
        });

        expect(result.emittedChips).not.toContain('trepanation');
    });

    test('endo without canalCount does NOT emit canal chips', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    // No canalCount
                },
            },
        });

        expect(result.emittedChips).not.toContain('kanalaufbereitung_1');
        expect(result.emittedChips).not.toContain('kanalaufbereitung_2');
        expect(result.emittedChips).not.toContain('kanalaufbereitung_3');
        expect(result.emittedChips).not.toContain('kanalaufbereitung_4');
    });

    test('endo with unknown WL method does NOT emit WL chips', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    workingLengthMethod: undefined,
                },
            },
        });

        expect(result.emittedChips).not.toContain('laengenmessung_elek');
        expect(result.emittedChips).not.toContain('laengenmessung_roentgen');
    });

    test('endo without obturated does NOT emit wf chip', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    // obturated not set
                },
            },
        });

        expect(result.emittedChips).not.toContain('wf_kalt');
        expect(result.emittedChips).not.toContain('wf_warm');
        expect(result.emittedChips).not.toContain('wf_einzel');
    });

    test('endo without medication does NOT emit einlage chip', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    // medication not set
                },
            },
        });

        expect(result.emittedChips).not.toContain('einlage_caoh2');
    });

    // ═══════════════════════════════════════════════════════════════
    // EMPTY ARRAYS
    // ═══════════════════════════════════════════════════════════════

    test('empty irrigationSolutions does NOT emit irrigation chips', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    irrigationSolutions: [],
                },
            },
        });

        expect(result.emittedChips).not.toContain('spuelung_naocl');
        expect(result.emittedChips).not.toContain('spuelung_edta');
    });

    // ═══════════════════════════════════════════════════════════════
    // DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    test('chip emission is deterministic 50x', () => {
        const facts = {
            treatmentId: 'endo',
            endo: {
                step: 'obturation',
                kofferdam: true,
                canalCount: 3,
                obturated: true,
            },
        };

        const results: string[] = [];
        for (let i = 0; i < 50; i++) {
            const result = applyMedicalKb({ treatmentId: 'endo', facts });
            results.push(result.emittedChips.sort().join(','));
        }

        expect(new Set(results).size).toBe(1);
    });
});
