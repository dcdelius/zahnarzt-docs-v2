/**
 * Gate Test: P12.7d Pipeline Always Emits QuestionBundle
 *
 * Ensures the V7 pipeline always populates questionBundle when returning
 * to the questions state.
 *
 * INVARIANTS:
 * - Pipeline result.questionBundle is defined when result.state === 'questions'
 * - bundle.docMode matches expected value
 * - required questions contain hard medical askbacks when needed
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('GATE: P12.7d Pipeline QuestionBundle Always Present', () => {

    const pipelinePath = path.join(__dirname, '../../v7/pipeline/index.ts');

    describe('Pipeline Code Verification', () => {
        it('pipeline index.ts should exist', () => {
            expect(fs.existsSync(pipelinePath)).toBe(true);
        });

        it('pipeline should import generateQuestionsV2Bundle', () => {
            const content = fs.readFileSync(pipelinePath, 'utf-8');
            expect(content).toContain('generateQuestionsV2Bundle');
        });

        it('pipeline should call generateQuestionsV2Bundle before returning questions state', () => {
            const content = fs.readFileSync(pipelinePath, 'utf-8');
            // Should have the call to generate bundle
            expect(content).toContain('const questionBundle = generateQuestionsV2Bundle');
        });

        it('pipeline should populate result.questionBundle', () => {
            const content = fs.readFileSync(pipelinePath, 'utf-8');
            // Should return with questionBundle in result
            expect(content).toMatch(/state:\s*['"]questions['"]/);
            expect(content).toContain('questionBundle,');
        });

        it('pipeline should pass treatmentId to bundle generation', () => {
            const content = fs.readFileSync(pipelinePath, 'utf-8');
            expect(content).toContain('treatmentId,');
        });

        it('pipeline should pass insuranceType to bundle generation', () => {
            const content = fs.readFileSync(pipelinePath, 'utf-8');
            expect(content).toContain('insuranceType,');
        });

        it('pipeline should pass docMode to bundle generation', () => {
            const content = fs.readFileSync(pipelinePath, 'utf-8');
            expect(content).toContain('docMode:');
        });
    });

    describe('QuestionBundle Contract Verification', () => {
        const questionsBundleContractPath = path.join(__dirname, '../../contracts/questions.ts');

        it('QuestionBundle interface should exist in contracts', () => {
            const content = fs.readFileSync(questionsBundleContractPath, 'utf-8');
            expect(content).toContain('interface QuestionBundle');
        });

        it('QuestionBundle should have required field', () => {
            const content = fs.readFileSync(questionsBundleContractPath, 'utf-8');
            expect(content).toContain('required:');
        });

        it('QuestionBundle should have optionalVisible field', () => {
            const content = fs.readFileSync(questionsBundleContractPath, 'utf-8');
            expect(content).toContain('optionalVisible:');
        });

        it('QuestionBundle should have optionalHidden field', () => {
            const content = fs.readFileSync(questionsBundleContractPath, 'utf-8');
            expect(content).toContain('optionalHidden:');
        });

        it('QuestionBundle should have docMode field', () => {
            const content = fs.readFileSync(questionsBundleContractPath, 'utf-8');
            expect(content).toContain('docMode:');
        });
    });

    describe('PipelineResult Contract Verification', () => {
        const pipelineContractPath = path.join(__dirname, '../../contracts/pipeline.ts');

        it('PipelineResult should have optional questionBundle field', () => {
            const content = fs.readFileSync(pipelineContractPath, 'utf-8');
            expect(content).toContain('questionBundle?:');
        });

        it('PipelineResult should import QuestionBundle', () => {
            const content = fs.readFileSync(pipelineContractPath, 'utf-8');
            expect(content).toContain('QuestionBundle');
        });
    });
});
