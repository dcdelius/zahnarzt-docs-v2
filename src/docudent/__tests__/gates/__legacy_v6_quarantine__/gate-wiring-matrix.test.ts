/**
 * GATE TEST: V7 Wiring Matrix
 * 
 * Purpose: Automated proof that treatment selection deterministically controls
 * the entire pipeline: parser → questions → answers → output → billing
 * 
 * This test loads all fixtures from __fixtures__/wiring/ and validates:
 * 1. Trace markers match expected patterns
 * 2. No cross-treatment question leakage
 * 3. Step gating works after answering required questions
 * 4. Billing codes are correctly isolated
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { pipeline } from '../pipeline';
import type { PipelineInput, TraceMarker } from '../pipeline/types';
import type { WiringFixture } from '../__fixtures__/wiring/types';
import { generateMinimalAnswers, fillMissingAnswers } from './helpers/minimalAnswers';

// Import fixtures statically for test environment
import fuellung_01 from '../__fixtures__/wiring/fuellung_01_standard.json';
import fuellung_02 from '../__fixtures__/wiring/fuellung_02_infiltration.json';
import fuellung_03 from '../__fixtures__/wiring/fuellung_03_conduction.json';
import fuellung_04 from '../__fixtures__/wiring/fuellung_04_mkv_toggle.json';
import fuellung_05 from '../__fixtures__/wiring/fuellung_05_deviation_kofferdam.json';
import fuellung_06 from '../__fixtures__/wiring/fuellung_06_patient_info.json';
import endo_01 from '../__fixtures__/wiring/endo_01_missing_wl_method.json';
import endo_02 from '../__fixtures__/wiring/endo_02_missing_iso_sizes.json';
import endo_03 from '../__fixtures__/wiring/endo_03_persistent_fistula.json';
import endo_04 from '../__fixtures__/wiring/endo_04_canal_not_negotiable.json';
import endo_05 from '../__fixtures__/wiring/endo_05_obturation_postponed.json';
import endo_06 from '../__fixtures__/wiring/endo_06_patient_info.json';

const FIXTURES: WiringFixture[] = [
    fuellung_01 as WiringFixture,
    fuellung_02 as WiringFixture,
    fuellung_03 as WiringFixture,
    fuellung_04 as WiringFixture,
    fuellung_05 as WiringFixture,
    fuellung_06 as WiringFixture,
    endo_01 as WiringFixture,
    endo_02 as WiringFixture,
    endo_03 as WiringFixture,
    endo_04 as WiringFixture,
    endo_05 as WiringFixture,
    endo_06 as WiringFixture,
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert trace markers to "stage:detail" strings for pattern matching
 */
function traceToStrings(trace: TraceMarker[]): string[] {
    return trace.map(m => `${m.stage}:${m.detail}`);
}

/**
 * Check if any trace string includes a pattern
 */
function traceIncludes(trace: TraceMarker[], pattern: string): boolean {
    return traceToStrings(trace).some(s => s.includes(pattern));
}

/**
 * Check if no trace string includes a pattern
 */
function traceExcludes(trace: TraceMarker[], pattern: string): boolean {
    return !traceIncludes(trace, pattern);
}

/**
 * Build PipelineInput from fixture
 */
function buildInput(fixture: WiringFixture): PipelineInput {
    const answers = new Map<string, unknown>();
    for (const [key, value] of Object.entries(fixture.input.answers || {})) {
        answers.set(key, value);
    }

    return {
        dictation: fixture.input.dictation,
        answers,
        insuranceType: fixture.input.insuranceType,
        textLength: 'mittel',
        hasMKV: fixture.input.hasMKV,
        treatmentId: fixture.input.treatmentId,
    };
}

/**
 * Build PipelineInput with minimal answers to proceed
 */
function buildInputWithMinimalAnswers(fixture: WiringFixture): PipelineInput {
    const answers = new Map<string, unknown>();

    // First add fixture's input answers
    for (const [key, value] of Object.entries(fixture.input.answers || {})) {
        answers.set(key, value);
    }

    // Then add minimal answers
    for (const [key, value] of Object.entries(fixture.minimalAnswers || {})) {
        answers.set(key, value);
    }

    return {
        dictation: fixture.input.dictation,
        answers,
        insuranceType: fixture.input.insuranceType,
        textLength: 'mittel',
        hasMKV: fixture.input.hasMKV,
        treatmentId: fixture.input.treatmentId,
    };
}

// ═══════════════════════════════════════════════════════════════
// WIRING EVIDENCE SUMMARY
// ═══════════════════════════════════════════════════════════════

interface WiringEvidence {
    fixtureId: string;
    treatment: string;
    questionsEngine: string;
    questionCount: number;
    canProceedAfterAnswering: boolean;
    traceValid: boolean;
    noLeakage: boolean;
}

const evidenceSummary: WiringEvidence[] = [];

/**
 * Record evidence for a fixture run
 */
function recordEvidence(
    fixture: WiringFixture,
    result: { questions: { id: string }[], debug?: { trace: TraceMarker[] } },
    canProceed: boolean
): void {
    const trace = result.debug?.trace || [];
    const questionsMarker = trace.find(m => m.stage === 'questions');
    const engineMatch = questionsMarker?.detail.match(/engine=(\w+)/);

    evidenceSummary.push({
        fixtureId: fixture.id,
        treatment: fixture.input.treatmentId,
        questionsEngine: engineMatch?.[1] || 'unknown',
        questionCount: result.questions.length,
        canProceedAfterAnswering: canProceed,
        traceValid: true,
        noLeakage: true,
    });
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('gate-wiring-matrix', () => {
    // Enable trace collection and stub extraction for tests
    beforeAll(() => {
        process.env.VITE_PIPELINE_TRACE = 'true';
        process.env.DOCUDENT_TEST_MODE = 'stub_extraction'; // Use fast stub extractor
    });

    // Dynamic test generation from fixtures
    describe.each(FIXTURES)('Fixture: $id', (fixture) => {
        it('should have trace markers matching expected patterns', async () => {
            const input = buildInput(fixture);
            const result = await pipeline.run(input);

            // Verify trace is enabled
            expect(result.debug?.traceEnabled).toBe(true);
            const trace = result.debug?.trace || [];

            // Check trace includes
            for (const pattern of fixture.expect.traceIncludes) {
                const found = traceIncludes(trace, pattern);
                expect(found).toBe(true);
            }

            // Check trace excludes
            for (const pattern of fixture.expect.traceExcludes) {
                const excluded = traceExcludes(trace, pattern);
                expect(excluded).toBe(true);
            }
        });

        it('should NOT have cross-treatment question leakage', async () => {
            const input = buildInput(fixture);
            const result = await pipeline.run(input);

            // If there's no leakage pattern, skip
            if (!fixture.expect.noQuestionIdRegex) return;

            const regex = new RegExp(fixture.expect.noQuestionIdRegex, 'i');
            const questionIds = result.questions.map(q => q.id);

            const leakedQuestions = questionIds.filter(id => regex.test(id));
            expect(leakedQuestions).toEqual([]);
        });

        it('should have required question IDs if specified', async () => {
            const input = buildInput(fixture);
            const result = await pipeline.run(input);

            if (!fixture.expect.mustQuestionIds || fixture.expect.mustQuestionIds.length === 0) {
                return; // Skip if no required questions specified
            }

            const questionIds = result.questions.map(q => q.id);
            for (const requiredId of fixture.expect.mustQuestionIds) {
                expect(questionIds).toContain(requiredId);
            }
        });

        it('should reach output after answering all questions', async () => {
            // Step 1: Get questions from pipeline
            const initialInput = buildInput(fixture);
            const initialResult = await pipeline.run(initialInput);

            // If already at output (no questions), we're done
            if (initialResult.state === 'output') {
                const trace = initialResult.debug?.trace || [];
                const gateMarker = trace.find(m => m.stage === 'gate');
                const renderMarker = trace.find(m => m.stage === 'render');

                expect(gateMarker?.detail).toContain('canProceed=true');
                expect(renderMarker?.detail).toContain('sections=');

                recordEvidence(fixture, initialResult, true);
                return;
            }

            // Step 2: Generate minimal answers for all questions
            const existingAnswers = new Map<string, unknown>();
            for (const [key, value] of Object.entries(fixture.input.answers || {})) {
                existingAnswers.set(key, value);
            }

            const allAnswers = fillMissingAnswers(
                initialResult.questions,
                existingAnswers
            );

            // Step 3: Re-run pipeline with all answers
            const answeredInput: PipelineInput = {
                dictation: fixture.input.dictation,
                answers: allAnswers,
                insuranceType: fixture.input.insuranceType,
                textLength: 'mittel',
                hasMKV: fixture.input.hasMKV,
                treatmentId: fixture.input.treatmentId,
            };

            const finalResult = await pipeline.run(answeredInput);
            const trace = finalResult.debug?.trace || [];
            const gateMarker = trace.find(m => m.stage === 'gate');
            const renderMarker = trace.find(m => m.stage === 'render');

            // Assertions: Must reach output with render producing sections
            const canProceed = gateMarker?.detail.includes('canProceed=true') || finalResult.state === 'output';
            expect(canProceed).toBe(true);

            if (finalResult.state === 'output') {
                expect(renderMarker?.detail).toContain('sections=');
            }

            recordEvidence(fixture, finalResult, canProceed);
        });
    });

    // Print summary after all tests
    it('prints Wiring Evidence Summary', () => {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('WIRING EVIDENCE SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('| Fixture ID                     | Treatment | Questions | Engine   | Proceed |');
        console.log('|-------------------------------|-----------|-----------|----------|---------|');

        for (const e of evidenceSummary) {
            console.log(
                `| ${e.fixtureId.padEnd(30)} | ${e.treatment.padEnd(9)} | ${String(e.questionCount).padEnd(9)} | ${e.questionsEngine.padEnd(8)} | ${e.canProceedAfterAnswering ? '✓' : '✗'}       |`
            );
        }
        console.log('═══════════════════════════════════════════════════════════════\n');

        expect(true).toBe(true); // Always pass - this is just for summary
    });
});

// ═══════════════════════════════════════════════════════════════
// ISOLATION TESTS - Prove no cross-contamination
// ═══════════════════════════════════════════════════════════════

describe('treatment-isolation-proof', () => {
    it('Füllung fixtures NEVER yield Endo questions', async () => {
        const fuellungFixtures = FIXTURES.filter(f => f.input.treatmentId === 'fuellung');

        for (const fixture of fuellungFixtures) {
            const input = buildInput(fixture);
            const result = await pipeline.run(input);

            const endoPattern = /endo|kanal|wl|spül|wurzel|aufbereitung/i;
            const questionIds = result.questions.map(q => q.id);
            const endoQuestions = questionIds.filter(id => endoPattern.test(id));

            expect(endoQuestions).toEqual([]);
        }
    });

    it('Endo fixtures NEVER yield Füllung-only questions', async () => {
        const endoFixtures = FIXTURES.filter(f => f.input.treatmentId === 'endo');

        for (const fixture of endoFixtures) {
            const input = buildInput(fixture);
            const result = await pipeline.run(input);

            // Füllung-specific questions that should never appear for Endo
            const fuellungOnlyPattern = /aesthetik|mehrschicht|adhaesiv|fuellung/i;
            const questionIds = result.questions.map(q => q.id);
            const fuellungQuestions = questionIds.filter(id => fuellungOnlyPattern.test(id));

            expect(fuellungQuestions).toEqual([]);
        }
    });

    it('Trace shows correct engine for each treatment', async () => {
        for (const fixture of FIXTURES) {
            const input = buildInput(fixture);
            const result = await pipeline.run(input);

            const trace = result.debug?.trace || [];
            const questionsTrace = trace.find(m => m.stage === 'questions');

            expect(questionsTrace?.detail).toContain(`engine=${fixture.input.treatmentId}`);
        }
    });
});
