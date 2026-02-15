/**
 * Gate Test: M22 Endo Core Chips Emitted From Facts
 *
 * Validates that medical KB rules emit correct chips based on endo facts.
 */

import { describe, test, expect } from 'vitest';
import { applyMedicalKb } from '../../medical_kb/engine/applyMedicalKb';

describe('gate-m22-endo-core-chips-emitted-from-facts', () => {
    // ═══════════════════════════════════════════════════════════════
    // TREPANATION EMISSION
    // ═══════════════════════════════════════════════════════════════

    test('trepanation step emits trepanation chip', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                },
            },
        });

        expect(result.emittedChips).toContain('trepanation');
    });

    test('preparation step also emits trepanation chip (implied)', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'preparation',
                },
            },
        });

        expect(result.emittedChips).toContain('trepanation');
    });

    // ═══════════════════════════════════════════════════════════════
    // KOFFERDAM EMISSION  
    // ═══════════════════════════════════════════════════════════════

    test('kofferdam true emits kofferdam chip', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    kofferdam: true,
                },
            },
        });

        expect(result.emittedChips).toContain('kofferdam');
    });

    test('kofferdam false does NOT emit chip', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    kofferdam: false,
                },
            },
        });

        expect(result.emittedChips).not.toContain('kofferdam');
    });

    // ═══════════════════════════════════════════════════════════════
    // CANAL COUNT EMISSION
    // ═══════════════════════════════════════════════════════════════

    test('canalCount 1 emits kanalaufbereitung_1', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    canalCount: 1,
                },
            },
        });

        expect(result.emittedChips).toContain('kanalaufbereitung_1');
    });

    test('canalCount 3 emits kanalaufbereitung_3', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    canalCount: 3,
                },
            },
        });

        expect(result.emittedChips).toContain('kanalaufbereitung_3');
    });

    test('canalCount 4 emits kanalaufbereitung_4', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    canalCount: 4,
                },
            },
        });

        expect(result.emittedChips).toContain('kanalaufbereitung_4');
    });

    // ═══════════════════════════════════════════════════════════════
    // WORKING LENGTH EMISSION
    // ═══════════════════════════════════════════════════════════════

    test('electronic WL emits laengenmessung_elek', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    workingLengthMethod: 'electronic',
                },
            },
        });

        expect(result.emittedChips).toContain('laengenmessung_elek');
    });

    test('xray WL emits laengenmessung_roentgen', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    workingLengthMethod: 'xray',
                },
            },
        });

        expect(result.emittedChips).toContain('laengenmessung_roentgen');
    });

    // ═══════════════════════════════════════════════════════════════
    // IRRIGATION EMISSION
    // ═══════════════════════════════════════════════════════════════

    test('NaOCl irrigation emits spuelung_naocl', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    irrigationSolutions: ['NaOCl'],
                },
            },
        });

        expect(result.emittedChips).toContain('spuelung_naocl');
    });

    test('EDTA irrigation emits spuelung_edta', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    irrigationSolutions: ['EDTA'],
                },
            },
        });

        expect(result.emittedChips).toContain('spuelung_edta');
    });

    test('both NaOCl and EDTA emit both chips', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    irrigationSolutions: ['NaOCl', 'EDTA'],
                },
            },
        });

        expect(result.emittedChips).toContain('spuelung_naocl');
        expect(result.emittedChips).toContain('spuelung_edta');
    });

    // ═══════════════════════════════════════════════════════════════
    // MEDICATION EMISSION
    // ═══════════════════════════════════════════════════════════════

    test('Ca(OH)2 medication emits einlage_caoh2', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    medication: 'Ca(OH)2',
                },
            },
        });

        expect(result.emittedChips).toContain('einlage_caoh2');
    });

    // ═══════════════════════════════════════════════════════════════
    // OBTURATION EMISSION
    // ═══════════════════════════════════════════════════════════════

    test('obturated true emits wf_kalt (default)', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'obturation',
                    obturated: true,
                },
            },
        });

        expect(result.emittedChips).toContain('wf_kalt');
    });

    test('obturation step emits roentgen_kontrolle', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'obturation',
                },
            },
        });

        expect(result.emittedChips).toContain('roentgen_kontrolle');
    });

    // ═══════════════════════════════════════════════════════════════
    // FULL WORKFLOW
    // ═══════════════════════════════════════════════════════════════

    test('full endo workflow emits multiple chips', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'obturation',
                    kofferdam: true,
                    canalCount: 3,
                    workingLengthMethod: 'electronic',
                    irrigationSolutions: ['NaOCl', 'EDTA'],
                    medication: 'Ca(OH)2',
                    obturated: true,
                },
            },
        });

        // Should emit all relevant chips
        expect(result.emittedChips).toContain('trepanation');
        expect(result.emittedChips).toContain('kofferdam');
        expect(result.emittedChips).toContain('kanalaufbereitung_3');
        expect(result.emittedChips).toContain('laengenmessung_elek');
        expect(result.emittedChips).toContain('spuelung_naocl');
        expect(result.emittedChips).toContain('spuelung_edta');
        expect(result.emittedChips).toContain('einlage_caoh2');
        expect(result.emittedChips).toContain('wf_kalt');
        expect(result.emittedChips).toContain('roentgen_kontrolle');
    });
});
