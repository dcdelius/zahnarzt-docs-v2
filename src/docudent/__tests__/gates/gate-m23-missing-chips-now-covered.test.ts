/**
 * Gate Test: M23 Missing Chips Now Covered
 *
 * Validates that formerly-allowlisted chips emit correctly from facts.
 */

import { describe, test, expect } from 'vitest';
import { applyMedicalKb } from '../../medical_kb/engine/applyMedicalKb';

describe('gate-m23-missing-chips-now-covered', () => {
    // ═══════════════════════════════════════════════════════════════
    // LA CHIPS
    // ═══════════════════════════════════════════════════════════════

    test('anesthesiaType=leitung emits la_leitung', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    anesthesiaType: 'leitung',
                },
            },
        });

        expect(result.emittedChips).toContain('la_leitung');
    });

    test('anesthesiaType=infiltration emits la_infiltr', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    anesthesiaType: 'infiltration',
                },
            },
        });

        expect(result.emittedChips).toContain('la_infiltr');
    });

    // ═══════════════════════════════════════════════════════════════
    // WF TECHNIQUE CHIPS
    // ═══════════════════════════════════════════════════════════════

    test('wfTechnique=warm emits wf_warm', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'obturation',
                    wfTechnique: 'warm',
                },
            },
        });

        expect(result.emittedChips).toContain('wf_warm');
    });

    test('wfTechnique=einzel emits wf_einzel', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'obturation',
                    wfTechnique: 'einzel',
                },
            },
        });

        expect(result.emittedChips).toContain('wf_einzel');
    });

    test('obturated=true still emits wf_kalt (default)', () => {
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

    // ═══════════════════════════════════════════════════════════════
    // DIAGNOSTIC X-RAY
    // ═══════════════════════════════════════════════════════════════

    test('diagnosticXray=true emits roentgen_einzelzahn', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'trepanation',
                    diagnosticXray: true,
                },
            },
        });

        expect(result.emittedChips).toContain('roentgen_einzelzahn');
    });

    // ═══════════════════════════════════════════════════════════════
    // POST-ENDO BUILDUP
    // ═══════════════════════════════════════════════════════════════

    test('postEndoAufbau=true emits aufbau_postendo', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    step: 'obturation',
                    postEndoAufbau: true,
                },
            },
        });

        expect(result.emittedChips).toContain('aufbau_postendo');
    });

    // ═══════════════════════════════════════════════════════════════
    // DETERMINISM
    // ═══════════════════════════════════════════════════════════════

    test('M23 chip emission is deterministic 50x', () => {
        const facts = {
            treatmentId: 'endo',
            endo: {
                step: 'obturation',
                anesthesiaType: 'leitung',
                wfTechnique: 'warm',
                diagnosticXray: true,
                postEndoAufbau: true,
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
