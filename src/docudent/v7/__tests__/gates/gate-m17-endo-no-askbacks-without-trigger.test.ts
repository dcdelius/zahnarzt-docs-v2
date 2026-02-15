/**
 * M17 Gate: Endo No Askbacks Without Trigger
 *
 * Verifies that endo does not generate "vibe" askbacks without proper triggers.
 * Askbacks must come from KB rules, not from guessing.
 */

import { describe, it, expect } from 'vitest';
import { applyMedicalKb } from '../../../medical_kb/engine/applyMedicalKb';
import { buildEndoFacts } from '../../../v7/medical/extractionToFacts/maps/endo.v1';

describe('Gate M17: Endo No Askbacks Without Trigger', () => {
    describe('No spurious askbacks', () => {
        it('empty endo dictation → no required askbacks', () => {
            const facts = buildEndoFacts({
                rawDictation: '',
            });

            const result = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'endo',
            });

            // Should not have Füllung-specific askbacks
            expect(result.requiredAskbacks).not.toContain('medical_ueberkappung');
            expect(result.requiredAskbacks).not.toContain('medical_hemostasis');
            expect(result.requiredAskbacks).not.toContain('medical_sensitivity_followup');
        });

        it('endo diagnosis → no Füllung askbacks', () => {
            const facts = buildEndoFacts({
                diagnosis: 'Pulpitis irreversibilis',
                rawDictation: 'Zahn 36 Pulpitis',
            });

            const result = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'endo',
            });

            // Füllung-specific askbacks should NOT appear
            expect(result.requiredAskbacks).not.toContain('medical_ueberkappung');
        });

        it('endo trepanation → stable, no random askbacks', () => {
            const facts = buildEndoFacts({
                rawDictation: 'Trepanation 46, Nekrose, Kofferdam angelegt',
            });

            const result1 = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'endo',
            });

            // Run again to ensure stability
            const result2 = applyMedicalKb({
                facts: facts as unknown as Record<string, unknown>,
                treatmentId: 'endo',
            });

            expect(result1.requiredAskbacks).toEqual(result2.requiredAskbacks);
        });
    });

    describe('Askback determinism', () => {
        const endoDictations = [
            'Pulpitis 36, Trepanation',
            'Nekrose 46, WL bestimmt',
            'Revisionsbehandlung 16',
            'Wurzelfüllung 26 mit Guttapercha',
        ];

        for (const dictation of endoDictations) {
            it(`deterministic for: "${dictation.slice(0, 30)}..."`, () => {
                const facts = buildEndoFacts({ rawDictation: dictation });

                const baseline = applyMedicalKb({
                    facts: facts as unknown as Record<string, unknown>,
                    treatmentId: 'endo',
                });

                // Run 10 times
                for (let i = 0; i < 9; i++) {
                    const result = applyMedicalKb({
                        facts: facts as unknown as Record<string, unknown>,
                        treatmentId: 'endo',
                    });

                    expect(result.requiredAskbacks.sort()).toEqual(baseline.requiredAskbacks.sort());
                }
            });
        }
    });
});
