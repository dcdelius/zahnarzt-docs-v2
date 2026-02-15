/**
 * Field Validation Tests — Canonical Code Enforcement
 *
 * ═══════════════════════════════════════════════════════════════
 * Tests that validation rejects label strings and invalid codes.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { validateNormalizedFields, warnIfOptionsLookLikeLabels } from '../fieldValidation';
import { safeNormalizeAnswersToFields } from '../answerNormalization';
import type { EngineQuestion, NormalizedFields } from '../../../contracts/questionEngineTypes';

describe('Field Validation', () => {
    const mockQuestions: EngineQuestion[] = [
        {
            id: 'TEST_Q1',
            title: 'Test',
            prompt: 'Test',
            severity: 'required',
            answerType: 'select',
            options: ['PAIN', 'FISTULA_EXSUDATE'],
            fieldsWritten: ['deviationReason'],
            order: 1,
        },
    ];

    // ═══════════════════════════════════════════════════════════════
    // VALID CODE TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('Valid Codes', () => {
        it('accepts valid canonical codes', () => {
            const fields: NormalizedFields = {
                deviationReason: 'PAIN',
                fistulaStatus: 'PRESENT',
                irrigationSolutions: ['NAOCL', 'EDTA'],
            };

            const result = validateNormalizedFields(mockQuestions, fields);

            expect(result.ok).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.sanitized).toEqual(fields);
        });

        it('accepts empty arrays', () => {
            const fields: NormalizedFields = {
                canalsAffected: [],
            };

            const result = validateNormalizedFields(mockQuestions, fields);

            expect(result.ok).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // INVALID LABEL STRING TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('Invalid Label Strings', () => {
        it('rejects German label string for deviationReason', () => {
            const fields: NormalizedFields = {
                deviationReason: 'Fistel / Exsudat',  // This is a LABEL, not a CODE!
            };

            const result = validateNormalizedFields(mockQuestions, fields);

            expect(result.ok).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain("Invalid label-string for deviationReason: 'Fistel / Exsudat'");
            expect(result.sanitized.deviationReason).toBeUndefined();
        });

        it('rejects German label string for fistulaStatus', () => {
            const fields: NormalizedFields = {
                fistulaStatus: 'Fistelgang vorhanden',
            };

            const result = validateNormalizedFields(mockQuestions, fields);

            expect(result.ok).toBe(false);
            expect(result.errors[0]).toContain("Invalid label-string");
        });

        it('rejects German label string in irrigation array', () => {
            const fields: NormalizedFields = {
                irrigationSolutions: ['NaOCl', 'EDTA'],  // 'NaOCl' is label, should be 'NAOCL'
            };

            const result = validateNormalizedFields(mockQuestions, fields);

            expect(result.ok).toBe(false);
            expect(result.errors[0]).toContain("Invalid code for irrigationSolutions: 'NaOCl'");
            // Only EDTA should be in sanitized
            expect(result.sanitized.irrigationSolutions).toEqual(['EDTA']);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // INVALID CODE TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('Invalid Codes', () => {
        it('rejects unknown code', () => {
            const fields: NormalizedFields = {
                deviationReason: 'UNKNOWN_CODE',
            };

            const result = validateNormalizedFields(mockQuestions, fields);

            expect(result.ok).toBe(false);
            expect(result.errors[0]).toContain("Invalid code for deviationReason");
        });

        it('rejects invalid ISO file size', () => {
            const fields: NormalizedFields = {
                masterFileByCanal: {
                    MB: { iso: 12 },  // 12 is not a valid ISO
                },
            };

            const result = validateNormalizedFields(mockQuestions, fields);

            expect(result.ok).toBe(false);
            expect(result.errors[0]).toContain("Invalid ISO for MB: 12");
        });

        it('rejects invalid taper', () => {
            const fields: NormalizedFields = {
                masterFileByCanal: {
                    MB: { iso: 25, taper: '0.03' },  // 0.03 is not valid
                },
            };

            const result = validateNormalizedFields(mockQuestions, fields);

            expect(result.ok).toBe(false);
            expect(result.errors[0]).toContain("Invalid taper for MB: 0.03");
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SAFE NORMALIZATION TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('Safe Normalization', () => {
        const questions: EngineQuestion[] = [
            {
                id: 'ENDO_T2_DEVIATION_REASON',
                title: 'Test',
                prompt: 'Test',
                severity: 'required',
                answerType: 'select',
                options: ['PAIN', 'FISTULA_EXSUDATE'],
                fieldsWritten: ['deviationReason'],
                order: 1,
            },
            {
                id: 'ENDO_T2_IRRIGATION',
                title: 'Test',
                prompt: 'Test',
                severity: 'required',
                answerType: 'multiSelect',
                options: ['NAOCL', 'EDTA'],
                fieldsWritten: ['irrigationSolutions'],
                order: 2,
            },
        ];

        it('returns errors for invalid label strings', () => {
            const answersById = {
                'ENDO_T2_DEVIATION_REASON': 'Persistierende Beschwerden',  // LABEL
            };

            const { fields, errors } = safeNormalizeAnswersToFields(questions, answersById);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0]).toContain('Invalid label-string');
            // Sanitized should NOT have the invalid field
            expect(fields.deviationReason).toBeUndefined();
        });

        it('passes valid codes through', () => {
            const answersById = {
                'ENDO_T2_DEVIATION_REASON': 'PAIN',  // Valid code
                'ENDO_T2_IRRIGATION': ['NAOCL', 'EDTA'],
            };

            const { fields, errors } = safeNormalizeAnswersToFields(questions, answersById);

            expect(errors).toHaveLength(0);
            expect(fields.deviationReason).toBe('PAIN');
            expect(fields.irrigationSolutions).toEqual(['NAOCL', 'EDTA']);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // DEV WARNING TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('Dev Warnings', () => {
        it('warns if options look like labels', () => {
            const badQuestions: EngineQuestion[] = [
                {
                    id: 'BAD_Q',
                    title: 'Test',
                    prompt: 'Test',
                    severity: 'required',
                    answerType: 'select',
                    options: ['Fistel / Exsudat', 'Persistierende Beschwerden'],  // LABELS!
                    fieldsWritten: ['test'],
                    order: 1,
                },
            ];

            const warnings = warnIfOptionsLookLikeLabels(badQuestions);

            expect(warnings.length).toBe(2);
            expect(warnings[0]).toContain('looks like a label');
        });

        it('does not warn for valid codes', () => {
            const goodQuestions: EngineQuestion[] = [
                {
                    id: 'GOOD_Q',
                    title: 'Test',
                    prompt: 'Test',
                    severity: 'required',
                    answerType: 'select',
                    options: ['PAIN', 'FISTULA_EXSUDATE'],
                    fieldsWritten: ['test'],
                    order: 1,
                },
            ];

            const warnings = warnIfOptionsLookLikeLabels(goodQuestions);

            expect(warnings).toHaveLength(0);
        });
    });
});
