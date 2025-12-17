/**
 * V6 Output Service — PURE PASSTHROUGH
 * 
 * This service MUST NOT contain any fachliche Logik:
 * - NO chip inference
 * - NO defaults
 * - NO answer→chip mapping
 * - NO switch-cases for chip IDs
 * 
 * It ONLY orchestrates Engine calls:
 * 1. translateAnswers() - SINGLE TRANSLATION at top
 * 2. resolveActiveChipIds() - from chipResolver (receives translated answers)
 * 3. processChipsToBilling() - from treatmentEngine
 * 4. mergeFacts() - creates SSOT for warnings
 * 5. composeOutput() - from outputComposer
 */

import type {
    ExtractedData,
    InsuranceType,
    TextLength
} from '../hooks/useDocudentV6';

// Engine imports - SINGLE SOURCE OF TRUTH
import {
    processChipsToBilling,
    getTreatmentChips,
    type ChipDefinition
} from '../../core/billing/knowledgeBase/logic/treatmentEngine';

// Chip Resolver - SSOT for chip selection
import {
    resolveActiveChipIds
} from '../../core/billing/knowledgeBase/logic/chipResolver';

// Answer Translator - SINGLE TRANSLATION POINT
import {
    translateAnswers
} from '../../core/billing/knowledgeBase/logic/answerIdTranslator';

// MergedFacts - SSOT for warnings and header facts
import {
    mergeFacts,
    type MergedFacts
} from './mergeFacts';

// Answer Effectiveness - DEV-only dead answer detection
import {
    computeAnswerEffects,
    assertNoDeadAnswers
} from './answerEffectiveness';

// Output Composer - SSOT for output generation
import {
    composeOutput,
    type ComposedOutput,
    type ComposedSection,
    type ComposeOptions
} from '../../core/billing/knowledgeBase/logic/outputComposer';

// Endo Step Detector - for endo treatment step injection
import { detectEndoStep } from '../../core/billing/knowledgeBase/logic/endoStepDetector';


// Re-export types for UI
export type { ComposedOutput, ComposedSection, MergedFacts };

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface GenerateOutputParams {
    extracted: ExtractedData;
    answers: Map<string, any>; // Allow number/boolean answers
    insuranceType: InsuranceType;
    textLength: TextLength;
    hasMKV?: boolean;
    mkvBetrag?: number;
    treatmentId?: string;  // Treatment type: 'fuellung' | 'endo' | 'krone' | 'extraktion'
}

export interface GenerateOutputResult extends ComposedOutput {
    _debug?: {
        translatedAnswers: Record<string, unknown>;
        activeChipIds: string[];
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION — PURE PASSTHROUGH (NO LOGIC)
// ═══════════════════════════════════════════════════════════════

export async function generateFinalOutput(params: GenerateOutputParams): Promise<GenerateOutputResult> {
    const { extracted, answers, insuranceType, textLength, hasMKV = false, mkvBetrag } = params;

    console.log('[V6 Output] PASSTHROUGH MODE: Using chipResolver + Engine + Composer');
    console.log('[V6 Output] Input:', {
        extracted,
        answers: Object.fromEntries(answers),
        insuranceType,
        textLength,
        hasMKV
    });

    const treatmentId = params.treatmentId ?? 'fuellung'; // Default to fuellung for backward compat

    // ═══════════════════════════════════════════════════════════════
    // STEP A: TRANSLATE SEMANTIC IDs → CANONICAL IDs (SINGLE POINT)
    // This MUST happen before anything else touches answers.
    // ═══════════════════════════════════════════════════════════════
    const translatedAnswers = translateAnswers(treatmentId, answers);
    console.log('[V6 Output] STEP A - Translated answers:', Object.fromEntries(translatedAnswers));

    // ═══════════════════════════════════════════════════════════════
    // STEP B: Resolve active chips via SSOT chipResolver
    // Pass TRANSLATED answers — chipResolver will skip its own translation
    // ═══════════════════════════════════════════════════════════════
    const activeChipIds = resolveActiveChipIds(
        treatmentId,
        extracted,
        translatedAnswers as Map<string, string>,
        { hasMKV, insuranceType }
    );
    console.log('[V6 Output] STEP B - Resolved chip IDs:', activeChipIds);

    // ═══════════════════════════════════════════════════════════════
    // STEP C: Get full chip definitions and process billing
    // ═══════════════════════════════════════════════════════════════
    const allChips = getTreatmentChips(treatmentId);
    const activeChips: ChipDefinition[] = allChips.filter(c => activeChipIds.includes(c.id));

    const engineResult = processChipsToBilling(
        treatmentId,
        activeChipIds,
        insuranceType,
        hasMKV,
        {
            tooth: extracted.tooth || undefined,
            surfaces: extracted.surfaces || [],
            diagnosis: extracted.diagnosis || undefined
        },
        textLength
    );
    console.log('[V6 Output] STEP C - Engine result:', engineResult);

    // ═══════════════════════════════════════════════════════════════
    // STEP D: Create MergedFacts — SSOT for warnings and header facts
    // Uses BOTH translated (for canonical values) and raw (for MKV values)
    // ═══════════════════════════════════════════════════════════════
    const mergedFacts = mergeFacts(extracted, translatedAnswers, answers, insuranceType);
    console.log('[V6 Output] STEP D - MergedFacts:', {
        tooth: mergedFacts.tooth,
        surfaces: mergedFacts.surfaces,
        hasMKV: mergedFacts.hasMKV,
        mkvBetrag: mergedFacts.mkvBetrag,
        cappingMaterial: mergedFacts.cappingMaterial
    });

    // ═══════════════════════════════════════════════════════════════
    // ENDO STEP ENRICHMENT (MVP) — For endo treatment output
    // Priority: 1) answer from user, 2) extracted.mentioned, 3) detect from diagnosis
    // ═══════════════════════════════════════════════════════════════
    if (treatmentId === 'endo') {
        let endoStep = answers.get('endo_step') ||
            (extracted.mentioned as any)?.endo_step;

        // If not set by answer or extraction, detect from rawDictation
        if (!endoStep) {
            const rawText = (extracted as any).rawDictation || extracted.diagnosis || '';
            if (rawText) {
                const detection = detectEndoStep(rawText);
                if (detection.step) {
                    endoStep = detection.step;
                }
            }
        }

        // Inject into mergedFacts for outputComposer
        if (endoStep) {
            (mergedFacts as any).mentioned = (mergedFacts as any).mentioned || {};
            (mergedFacts as any).mentioned.endo_step = endoStep;
            console.log('[V6 Output] Endo step enriched:', endoStep);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP E: Compose output via SSOT outputComposer
    // Uses mergedFacts for warnings, header facts, and placeholder substitution
    // ═══════════════════════════════════════════════════════════════
    const composeOptions: ComposeOptions = {
        textLength,
        hasMKV: mergedFacts.hasMKV,
        mkvBetrag: mergedFacts.mkvBetrag ?? undefined,
        cappingMaterial: mergedFacts.cappingMaterial ?? undefined
    };

    const composedOutput = composeOutput(
        treatmentId,
        engineResult,
        activeChips,
        mergedFacts,
        insuranceType,
        composeOptions
    );

    console.log('[V6 Output] STEP E - Composed output:', {
        sectionCount: composedOutput.sections.length,
        billingCodeCount: composedOutput.billingCodes.length,
        warningCount: composedOutput.warnings.length
    });

    // ═══════════════════════════════════════════════════════════════
    // DEV ONLY: Dead Answer Gate
    // Ensures every answered question has an observable effect
    // ═══════════════════════════════════════════════════════════════
    if (shouldRunDevChecks()) {
        try {
            // Compute baseline WITHOUT answers (for comparison)
            const emptyAnswers = new Map<string, unknown>();
            const translatedEmpty = translateAnswers(treatmentId, emptyAnswers);
            const chipsEmpty = resolveActiveChipIds(
                treatmentId,
                extracted,
                translatedEmpty as Map<string, string>,
                { hasMKV: false, insuranceType }
            );

            const engineEmpty = processChipsToBilling(
                treatmentId,
                chipsEmpty,
                insuranceType,
                false,
                { tooth: extracted.tooth || undefined, surfaces: extracted.surfaces || [], diagnosis: extracted.diagnosis || undefined },
                textLength
            );

            const factsEmpty = mergeFacts(extracted, translatedEmpty, emptyAnswers, insuranceType);
            const composedEmpty = composeOutput(
                treatmentId,
                engineEmpty,
                allChips.filter(c => chipsEmpty.includes(c.id)),
                factsEmpty,
                insuranceType,
                { textLength, hasMKV: false }
            );

            // Compute effects
            const effects = computeAnswerEffects({
                beforeChips: chipsEmpty,
                afterChips: activeChipIds,
                beforeWarnings: composedEmpty.warnings,
                afterWarnings: composedOutput.warnings,
                beforeText: composedEmpty.fullText,
                afterText: composedOutput.fullText,
            });

            // Assert no dead answers
            const answeredQuestionIds = Array.from(answers.keys());
            if (answeredQuestionIds.length > 0) {
                assertNoDeadAnswers({
                    answeredQuestionIds,
                    effects,
                    unmappedQuestions: [],
                });
            }

            console.debug('[V6 Output] DEV-GATE: Answer effects:', effects);
        } catch (err) {
            console.error('[V6 Output] DEV-GATE: Dead answer check failed:', err);
            throw err; // Re-throw in DEV to fail fast
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Build result — _debug only in DEV
    // ═══════════════════════════════════════════════════════════════
    const result: GenerateOutputResult = { ...composedOutput };

    if (shouldIncludeDebug()) {
        result._debug = {
            translatedAnswers: Object.fromEntries(translatedAnswers),
            activeChipIds,
        };
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// DEV HELPERS (can be overridden in tests via globalThis)
// ═══════════════════════════════════════════════════════════════

declare global {
    // eslint-disable-next-line no-var
    var __FORCE_DEBUG__: boolean | undefined;
    // eslint-disable-next-line no-var
    var __SKIP_DEV_CHECKS__: boolean | undefined;
}

function shouldIncludeDebug(): boolean {
    if (typeof globalThis.__FORCE_DEBUG__ === 'boolean') {
        return globalThis.__FORCE_DEBUG__;
    }
    return import.meta.env?.DEV ?? false;
}

function shouldRunDevChecks(): boolean {
    if (globalThis.__SKIP_DEV_CHECKS__) {
        return false;
    }
    return import.meta.env?.DEV ?? false;
}
