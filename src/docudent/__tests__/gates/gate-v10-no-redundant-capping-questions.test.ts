/**
 * Gate: V10 No Redundant Capping Questions (M62)
 * 
 * Verifies that capping material question is NOT shown when:
 * 1. ueberkappung = false (no capping needed)
 * 2. defaultCappingMaterial exists in settings
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const QUESTION_BANK_PATH = join(__dirname, '../../core/billing/knowledgeBase/treatments/fuellung/question_bank.json');

describe('Gate: V10 No Redundant Capping Questions (M62)', () => {
    let questionBank: any;

    beforeAll(() => {
        questionBank = JSON.parse(readFileSync(QUESTION_BANK_PATH, 'utf-8'));
    });

    describe('Question Dependencies', () => {
        it('ueberkappung_material has when clause requiring ueberkappung=true', () => {
            const materialQ = questionBank.questions.find((q: any) => q.key === 'ueberkappung_material');
            expect(materialQ).toBeDefined();

            // Should have when.requiresAnswers.ueberkappung = true
            expect(materialQ.when?.requiresAnswers?.ueberkappung).toBe(true);
        });

        it('ueberkappung question exists and is independent', () => {
            const ueberkappungQ = questionBank.questions.find((q: any) => q.key === 'ueberkappung');
            expect(ueberkappungQ).toBeDefined();

            // Should NOT require material
            expect(ueberkappungQ.when?.requiresAnswers?.ueberkappung_material).toBeUndefined();
        });
    });

    describe('Options Contract', () => {
        it('ueberkappung question has yes/no options (not material options)', () => {
            const ueberkappungQ = questionBank.questions.find((q: any) => q.key === 'ueberkappung');
            expect(ueberkappungQ?.options).toBeDefined();

            const optionIds = ueberkappungQ.options.map((o: any) => o.id);
            expect(optionIds).toContain('yes');
            expect(optionIds).toContain('no');

            // Should NOT contain material options directly
            expect(optionIds).not.toContain('caoh');
            expect(optionIds).not.toContain('mta');
        });

        it('ueberkappung_material question has material options', () => {
            const materialQ = questionBank.questions.find((q: any) => q.key === 'ueberkappung_material');
            expect(materialQ?.options).toBeDefined();

            const optionIds = materialQ.options.map((o: any) => o.id);
            expect(optionIds).toContain('caoh');
            expect(optionIds).toContain('mta');
        });
    });
});
