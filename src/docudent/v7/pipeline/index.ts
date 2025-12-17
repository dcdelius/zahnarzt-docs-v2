/**
 * V7 Pipeline — SINGLE ENTRY POINT
 * 
 * This is the ONLY way to interact with the backend.
 * 
 * ❌ NO chip inference
 * ❌ NO rule evaluation  
 * ❌ NO price calculation
 * ❌ NO defaults
 * ❌ NO text assembly
 * ❌ NO chipId switches
 * 
 * ✅ ONLY orchestration of backend modules
 * ✅ Answer normalization (V7 → V6 compatibility)
 */

import type { PipelineInput, PipelineResult, ComposedOutput } from './types';

// Backend imports — SSOT
import { extractFromDictation } from '../../v6/services/extractionService';
import { generateQuestions } from '../../v6/services/questionService';
import { generateFinalOutput } from '../../v6/services/outputService';

// V7 Canonical Layer
import { normalizeAnswers, hasUnmappedAnswers, logUnmappedAnswers } from './normalizeAnswers';
import { checkPlaceholders, trace } from './trace';
import { applyUserDefaults } from './applyUserDefaults';
import {
    STAGE_PIPELINE_INPUT,
    STAGE_EXTRACTED,
    STAGE_QUESTIONS,
    STAGE_NORMALIZED_ANSWERS,
    STAGE_OUTPUT_INPUT,
    STAGE_OUTPUT_RESULT,
} from './traceStages';

// ═══════════════════════════════════════════════════════════════
// PIPELINE.RUN — THE ONLY ENTRY POINT
// ═══════════════════════════════════════════════════════════════

/**
 * Execute the full pipeline.
 * 
 * This function is a PURE ORCHESTRATOR:
 * - It calls backend modules in sequence
 * - It does NOT contain any business logic
 * - It does NOT make decisions
 * - It does NOT interpret data
 * 
 * @param input - User input (dictation, answers, settings)
 * @returns PipelineResult - What the UI should render
 */
export async function run(input: PipelineInput): Promise<PipelineResult> {
    const {
        dictation,
        answers: rawAnswers,
        insuranceType,
        textLength,
        hasMKV = false,
        treatmentId = 'fuellung',
        userDefaults
    } = input;

    // Debug logging helper (V7_DEBUG)
    const debug = (checkpoint: string, data: Record<string, unknown>) => {
        if (typeof window !== 'undefined' && localStorage.getItem('V7_DEBUG') === 'true') {
            console.debug(`[V7 Pipeline] ${checkpoint}:`, data);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // TRACE A: Pipeline Input
    // ═══════════════════════════════════════════════════════════════
    trace(STAGE_PIPELINE_INPUT, {
        dictation: dictation,
        insuranceType,
        hasMKV,
        textLength,
        answers: Object.fromEntries(rawAnswers)
    });

    // ─── STEP 1: Extract from dictation ────────────────────────
    // Backend decides what was said. UI does not interpret.
    // In test mode (DOCUDENT_TEST_MODE=stub_extraction), use fast stub extractor.

    let extracted;
    try {
        // Check for test mode - use stub extractor for fast, deterministic tests
        // Uses VITE_ prefix for browser compatibility (Vite exposes these to client)
        const isStubMode =
            import.meta.env.VITE_STUB_EXTRACTION === 'true' ||
            (typeof process !== 'undefined' && process.env?.DOCUDENT_TEST_MODE === 'stub_extraction');

        if (isStubMode) {
            const { stubExtractFromDictation } = await import('./__test__/stubExtractor');
            extracted = stubExtractFromDictation(dictation, treatmentId);
        } else {
            extracted = await extractFromDictation(dictation);
        }
    } catch (error) {
        // DEV-only: Log detailed error context for debugging module import failures
        if (import.meta.env.DEV) {
            const { logExtractionError } = await import('../../../utils/devErrorCapture');
            logExtractionError(error);
        }
        return {
            state: 'error',
            questions: [],
            output: null,
            warnings: [],
            error: `Extraction failed: ${String(error)}`
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // TRACE B: Extracted Data
    // ═══════════════════════════════════════════════════════════════
    trace(STAGE_EXTRACTED, {
        tooth: extracted.tooth,
        surfaces: extracted.surfaces,
        diagnosis: extracted.diagnosis,
        costs: extracted.costs,
        mentioned: extracted.mentioned,
        gaps: extracted.gaps
    });

    // DEBUG CHECKPOINT 1: Extracted summary
    debug('CHECKPOINT 1 - Extracted', {
        tooth: extracted.tooth,
        surfaces: extracted.surfaces,
        diagnosis: extracted.diagnosis,
        costs: extracted.costs,
        gaps: extracted.gaps
    });

    // ─── STEP 2: Generate questions ────────────────────────────
    // Backend decides what to ask. UI does not filter.

    const questions = generateQuestions(extracted, insuranceType, hasMKV, treatmentId);

    // ═══════════════════════════════════════════════════════════════
    // TRACE C: Questions Generated
    // ═══════════════════════════════════════════════════════════════
    trace(STAGE_QUESTIONS, {
        count: questions.length,
        ids: questions.map(q => q.id),
        categories: questions.map(q => q.category)
    });

    // DEBUG CHECKPOINT 2: Questions generated
    debug('CHECKPOINT 2 - Questions', {
        questionIds: questions.map(q => q.id),
        count: questions.length
    });

    // ─── STEP 2.5: Apply user defaults ─────────────────────────
    // Pre-fill answers with user preferences for unanswered questions

    const defaultsResult = applyUserDefaults({
        treatmentId,
        extracted,
        questions,
        answers: rawAnswers,
        userDefaults
    });
    const answers = defaultsResult.answers;

    // Debug metadata for defaults (DEV only)
    const _defaultsDebug = {
        appliedDefaults: defaultsResult.appliedDefaults,
        defaultsMap: defaultsResult.defaultsMap,
        answersSource: defaultsResult.answersSource
    };

    // ─── STEP 3: Check if we need answers ──────────────────────
    // Backend decides when questions are complete. UI does not skip.

    const unansweredQuestions = questions.filter(q => !answers.has(q.id));

    if (unansweredQuestions.length > 0) {
        return {
            state: 'questions',
            questions,
            output: null,
            warnings: [],
            extracted: {
                tooth: extracted.tooth,
                surfaces: extracted.surfaces,
                diagnosis: extracted.diagnosis
            }
        };
    }

    // ─── STEP 3.5: Normalize answers (V7 → V6 compatibility) ───
    // Translate semantic IDs to canonical IDs for V6 services

    const normResult = normalizeAnswers(treatmentId, answers);
    const { canonicalAnswers, unmappedQuestions, unmappedOptions } = normResult;

    // ═══════════════════════════════════════════════════════════════
    // TRACE D: Normalized Answers
    // ═══════════════════════════════════════════════════════════════
    trace(STAGE_NORMALIZED_ANSWERS, {
        canonicalAnswers: Object.fromEntries(canonicalAnswers),
        unmapped: {
            questions: unmappedQuestions,
            options: unmappedOptions
        }
    });

    // DEBUG CHECKPOINT 3: Mapped answers
    debug('CHECKPOINT 3 - Answer Mapping', {
        rawAnswers: Object.fromEntries(answers),
        canonicalAnswers: Object.fromEntries(canonicalAnswers),
        unmappedCount: unmappedQuestions.length + unmappedOptions.length
    });

    if (hasUnmappedAnswers(normResult)) {
        logUnmappedAnswers(normResult);
    }

    // ═══════════════════════════════════════════════════════════════
    // TRACE E: Output Input (what goes to V6)
    // ═══════════════════════════════════════════════════════════════
    trace(STAGE_OUTPUT_INPUT, {
        extracted: extracted,
        answers: Object.fromEntries(answers),
        insuranceType,
        hasMKV,
        mkvBetrag: answers.get('mkv_betrag')
    });

    // ─── STEP 4: Generate final output ─────────────────────────
    // Backend decides what to output. UI does not modify.

    let output: ComposedOutput;
    try {
        output = await generateFinalOutput({
            extracted,
            answers: answers as Map<string, any>,
            insuranceType,
            textLength,
            hasMKV,
            mkvBetrag: answers.get('mkv_betrag') as number | undefined,
            treatmentId
        });
    } catch (error) {
        return {
            state: 'error',
            questions: [],
            output: null,
            warnings: [],
            error: `Output generation failed: ${String(error)}`
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // TRACE F: Output Result
    // ═══════════════════════════════════════════════════════════════
    const allText = output.sections?.map(s => s.content || '').join(' ') || '';
    const placeholderCheck = checkPlaceholders(allText);

    trace(STAGE_OUTPUT_RESULT, {
        sectionCount: output.sections?.length || 0,
        billingCodeCount: output.billingCodes?.length || 0,
        warningCount: output.warnings?.length || 0,
        sections: output.sections?.map(s => ({ id: s.id, label: s.label })) || [],
        warnings: output.warnings?.map(w => ({ id: w.id, title: w.title })) || [],
        hasPlaceholders: placeholderCheck.hasPlaceholders
    });

    // DEBUG CHECKPOINT 4: Output summary
    debug('CHECKPOINT 4 - Output', {
        sectionCount: output.sections?.length || 0,
        warningCount: output.warnings?.length || 0,
        hasPlaceholders: placeholderCheck.hasPlaceholders,
        placeholders: placeholderCheck.found
    });

    // ─── RETURN FINAL RESULT ───────────────────────────────────
    // UI renders this VERBATIM. No modifications allowed.
    // Backend already outputs ValidationWarning[] - NO CONVERSION NEEDED.

    return {
        state: 'output',
        questions: [],
        output,
        warnings: output.warnings || [],
        extracted: {
            tooth: extracted.tooth,
            surfaces: extracted.surfaces,
            diagnosis: extracted.diagnosis
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════

export const pipeline = { run };
export default pipeline;

