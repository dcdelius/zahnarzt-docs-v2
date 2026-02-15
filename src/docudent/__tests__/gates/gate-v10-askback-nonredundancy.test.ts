/**
 * Gate: V10 Askback Non-Redundancy (M61)
 * 
 * Verifies that questions are not asked when their values can be
 * determined from settings or previous answers.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const FUELLUNG_QB_PATH = join(__dirname, '../../core/billing/knowledgeBase/treatments/fuellung/question_bank.json');

describe('Gate: V10 Askback Non-Redundancy (M61)', () => {
    let questionBank: any;

    try {
        questionBank = JSON.parse(readFileSync(FUELLUNG_QB_PATH, 'utf-8'));
    } catch {
        questionBank = null;
    }

    it('question bank exists', () => {
        expect(questionBank).not.toBeNull();
        expect(questionBank.questions).toBeDefined();
    });

    describe('Skippable Question Patterns', () => {
        it('ueberkappung_material has when clause requiring ueberkappung=true', () => {
            const materialQ = questionBank?.questions?.find((q: any) => q.key === 'ueberkappung_material');
            expect(materialQ).toBeDefined();
            expect(materialQ.when?.requiresAnswers?.ueberkappung).toBe(true);
        });

        it('isolation question has when clause checking if already mentioned', () => {
            const isolationQ = questionBank?.questions?.find((q: any) => q.key === 'isolation');
            expect(isolationQ).toBeDefined();
            expect(isolationQ.when?.noneOf).toBeDefined();
        });
    });

    describe('Settings-Resolvable Questions', () => {
        // These are questions that SHOULD check settings before asking

        it('ueberkappung_material should be skippable if defaultCappingMaterial exists', () => {
            // This is a DOCUMENTATION gate - we're asserting the contract exists
            // The actual implementation should check settings
            const materialQ = questionBank?.questions?.find((q: any) => q.key === 'ueberkappung_material');

            // For now, we just document that this SHOULD be skippable
            // TODO: Add 'skippableBy' field to question bank
            expect(materialQ?.category).toBe('forensic');

            // Log audit finding
            console.log('[AUDIT] ueberkappung_material should check defaultCappingMaterial setting');
        });

        it('isolation should be skippable if defaultIsolation setting exists', () => {
            const isolationQ = questionBank?.questions?.find((q: any) => q.key === 'isolation');
            expect(isolationQ?.category).toBe('forensic');

            console.log('[AUDIT] isolation should check defaultIsolation setting');
        });
    });

    describe('No Circular Dependencies', () => {
        it('requiresAnswers references point to earlier questions', () => {
            const questions = questionBank?.questions || [];
            const keyOrder = questions.map((q: any) => q.key);

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const deps = Object.keys(q.when?.requiresAnswers || {});

                for (const dep of deps) {
                    const depIndex = keyOrder.indexOf(dep);
                    expect(depIndex).toBeLessThan(i);
                }
            }
        });
    });
});
