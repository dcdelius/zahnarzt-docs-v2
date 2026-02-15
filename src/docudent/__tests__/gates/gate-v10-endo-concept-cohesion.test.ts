/**
 * Gate: Endo concept cohesion (single-entry effects)
 *
 * Ensures endo concepts emit chips from one SSOT path (no fragmentation).
 */

import { describe, it, expect } from 'vitest';
import { applyMedicalKb } from '../../medical_kb/engine/applyMedicalKb';

describe('Gate: Endo concept cohesion', () => {
    it('Irrigation NaOCl → spuelung_naocl chip', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    irrigationSolutions: ['NaOCl'],
                },
            },
        });

        expect(result.emittedChips).toContain('spuelung_naocl');
        expect(result.trace.firedConcepts).toContain('concept:endo-irrigation:irrigation_naocl');
    });

    it('WF technique warm → wf_warm chip', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    wfTechnique: 'warm',
                },
            },
        });

        expect(result.emittedChips).toContain('wf_warm');
        expect(result.trace.firedConcepts).toContain('concept:endo-obturation:wf_warm');
    });

    it('Canal count 3 → kanalaufbereitung_3 chip', () => {
        const result = applyMedicalKb({
            treatmentId: 'endo',
            facts: {
                treatmentId: 'endo',
                endo: {
                    canalCount: 3,
                },
            },
        });

        expect(result.emittedChips).toContain('kanalaufbereitung_3');
        expect(result.trace.firedConcepts).toContain('concept:endo-canal-preparation:canal_3');
    });
});
