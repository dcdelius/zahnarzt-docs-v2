/**
 * M17 Gate: Endo Extraction to Facts Coverage
 *
 * Verifies that common endo dictation terms are correctly mapped to facts.
 * Endo-specific terms should trigger appropriate facts.endo fields.
 */

import { describe, it, expect } from 'vitest';
import { buildEndoFacts, detectEndoDiagnosis, detectEndoStep, detectEndoProcedureDetails } from '../../../v7/medical/extractionToFacts/maps/endo.v1';

describe('Gate M17: Endo Extraction to Facts Coverage', () => {
    describe('Diagnosis Detection', () => {
        const diagnosisCases = [
            { text: 'Pulpitis irreversibilis', expected: 'pulpitis' },
            { text: 'Irreversible Pulpitis Zahn 36', expected: 'pulpitis' },
            { text: 'Nekrose 46', expected: 'necrosis' },
            { text: 'Zahn 16 gangränös', expected: 'necrosis' },
            { text: 'Apikale Parodontitis 26', expected: 'apical_periodontitis' },
            { text: 'Granulom apikal', expected: 'apical_periodontitis' },
            { text: 'periapikale Läsion', expected: 'apical_periodontitis' },
            { text: 'Revisionsbehandlung 36', expected: 'revision' },
            { text: 'Re-Endo notwendig', expected: 'revision' },
            { text: 'Kronenfraktur nach Sturz', expected: 'trauma' },
        ];

        for (const tc of diagnosisCases) {
            it(`detects "${tc.expected}" from: "${tc.text.slice(0, 30)}..."`, () => {
                const result = detectEndoDiagnosis(tc.text);
                expect(result).toBe(tc.expected);
            });
        }
    });

    describe('Procedure Step Detection', () => {
        const stepCases = [
            { text: 'Trepanation durchgeführt', expected: 'trepanation' },
            { text: 'Zugangskavität angelegt', expected: 'trepanation' },
            { text: 'WL bestimmt mit Apexlokator', expected: 'working_length' },
            { text: 'Elektronische Längenmessung', expected: 'working_length' },
            { text: 'Aufbereitung mit ProTaper', expected: 'preparation' },
            { text: 'Maschinelle Aufbereitung bis F2', expected: 'preparation' },
            { text: 'Spülung mit NaOCl 3%', expected: 'irrigation' },
            { text: 'EDTA Spülung', expected: 'irrigation' },
            { text: 'CaOH Einlage', expected: 'medication' },
            { text: 'Medikamentöse Einlage mit Calciumhydroxid', expected: 'medication' },
            { text: 'Wurzelfüllung mit Guttapercha', expected: 'obturation' },
            { text: 'Obturation mit AH Plus Sealer', expected: 'obturation' },
        ];

        for (const tc of stepCases) {
            it(`detects step "${tc.expected}" from: "${tc.text.slice(0, 30)}..."`, () => {
                const result = detectEndoStep(tc.text);
                expect(result).toBe(tc.expected);
            });
        }
    });

    describe('Procedure Details Detection', () => {
        it('detects Kofferdam', () => {
            const result = detectEndoProcedureDetails('Kofferdam angelegt');
            expect(result.kofferdam).toBe(true);
        });

        it('detects NaOCl irrigation', () => {
            const result = detectEndoProcedureDetails('Spülung mit NaOCl 3%');
            expect(result.irrigationWithNaOCl).toBe(true);
        });

        it('detects EDTA irrigation', () => {
            const result = detectEndoProcedureDetails('EDTA Spülung');
            expect(result.irrigationWithEDTA).toBe(true);
        });

        it('detects electronic WL method', () => {
            const result = detectEndoProcedureDetails('Endometrie mit Apexlokator');
            expect(result.workingLengthMethodElectronic).toBe(true);
        });

        it('detects Guttapercha', () => {
            const result = detectEndoProcedureDetails('Guttapercha Stifte');
            expect(result.guttapercha).toBe(true);
        });
    });

    describe('Full Facts Building', () => {
        it('builds endo facts from pulpitis dictation', () => {
            const facts = buildEndoFacts({
                diagnosis: 'Irreversible Pulpitis',
                rawDictation: 'Pulpitis irreversibilis 36, Trepanation durchgeführt, Kofferdam',
            });

            expect(facts.treatmentId).toBe('endo');
            expect(facts.endo?.diagnosis).toBe('pulpitis');
            expect(facts.endo?.step).toBe('trepanation');
            expect(facts.endo?.kofferdam).toBe(true);
        });

        it('builds endo facts from WL dictation', () => {
            const facts = buildEndoFacts({
                diagnosis: 'Nekrose 46',
                rawDictation: 'WL bestimmt mit Apexlokator, Aufbereitung bis F2, NaOCl Spülung',
            });

            expect(facts.treatmentId).toBe('endo');
            expect(facts.endo?.diagnosis).toBe('necrosis');
            expect(facts.endo?.irrigationSolutions).toContain('NaOCl');
        });

        it('builds endo facts from obturation dictation', () => {
            const facts = buildEndoFacts({
                rawDictation: 'Wurzelfüllung 3 Kanäle mit Guttapercha und AH Plus Sealer',
            });

            expect(facts.treatmentId).toBe('endo');
            expect(facts.endo?.step).toBe('obturation');
            expect(facts.endo?.obturated).toBe(true);
        });
    });

    describe('Determinism', () => {
        it('produces same facts for same input (20x)', () => {
            const input = {
                diagnosis: 'Pulpitis',
                rawDictation: 'Trepanation 36, Kofferdam, NaOCl Spülung, CaOH Einlage',
            };

            const baseline = buildEndoFacts(input);

            for (let i = 0; i < 19; i++) {
                const result = buildEndoFacts(input);
                expect(result).toEqual(baseline);
            }
        });
    });
});
