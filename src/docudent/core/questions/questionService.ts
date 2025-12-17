/**
 * Core Question Service — STRICT SSOT IMPLEMENTATION (Ported from V6)
 * 
 * 1. PURE ORCHESTRATOR: No semantics, no hardcoded texts, no heuristics.
 * 2. DATA DRIVEN: All questions come from QuestionBank (JSON).
 * 3. SSOT LOOKUP: Uses chipResolver for active chips, treatmentEngine for candidates.
 * 4. CONDITIONAL: Questions filtered by `when` clause (anyKeywords, requiresAnswers, etc.)
 */

import type { ExtractedData } from '../../contracts/extractionV6';
import type { DynamicQuestion } from '../../contracts/questions';

export type InsuranceType = 'GKV' | 'PKV';
import {
    getTreatmentChips,
    type ChipDefinition,
    getUpsellChips
} from '../billing/knowledgeBase/logic/treatmentEngine';
import { inferChipsFromExtractedData } from '../billing/knowledgeBase/logic/chipResolver';
import { getQuestionDefOrNull, getQuestionsByCategory } from '../billing/knowledgeBase/questions/questionBank';
import { detectEndoStep } from '../billing/knowledgeBase/logic/endoStepDetector';
import type { WhenClause, WhenCondition } from '../billing/knowledgeBase/registry/loaders';
import { getFuellungDefaults } from '../../v7/settings/settingsStore';
import { CANONICAL_CHIP_IDS } from '../../contracts/canonicalIds';

// ═══════════════════════════════════════════════════════════════
// CONDITIONAL QUESTION EVALUATION
// ═══════════════════════════════════════════════════════════════

interface WhenContext {
    extracted: ExtractedData;
    answers: Map<string, unknown>;
    activeChipIds: string[];
    rawDictation?: string;
}

/**
 * Evaluate a single WhenCondition block.
 * All specified conditions within a block are ANDed together.
 */
function evaluateSingleCondition(condition: WhenCondition, ctx: WhenContext): boolean {
    // requiresAnswers: ALL key/value pairs must match in answers OR extracted.mentioned
    if (condition.requiresAnswers) {
        for (const [key, expectedValue] of Object.entries(condition.requiresAnswers)) {
            const answerValue = ctx.answers.get(key);
            const mentionedValue = (ctx.extracted.mentioned as Record<string, unknown>)?.[key];
            const actualValue = answerValue !== undefined ? answerValue : mentionedValue;

            if (actualValue !== expectedValue) {
                return false;
            }
        }
    }

    // anyMentioned: TRUE if ANY listed key exists in extracted.mentioned
    if (condition.anyMentioned && condition.anyMentioned.length > 0) {
        const mentioned = ctx.extracted.mentioned as Record<string, unknown> | undefined;
        const hasMention = condition.anyMentioned.some(key => mentioned?.[key] !== undefined);
        if (!hasMention) {
            return false;
        }
    }

    // anyKeywords: TRUE if rawDictation contains ANY keyword (case-insensitive)
    if (condition.anyKeywords && condition.anyKeywords.length > 0) {
        const dictation = (ctx.rawDictation || ctx.extracted.diagnosis || '').toLowerCase();
        const hasKeyword = condition.anyKeywords.some(kw => dictation.includes(kw.toLowerCase()));
        if (!hasKeyword) {
            return false;
        }
    }

    // anyChipsActive: TRUE if ANY listed chipId is in activeChipIds
    if (condition.anyChipsActive && condition.anyChipsActive.length > 0) {
        const hasChip = condition.anyChipsActive.some(chipId => ctx.activeChipIds.includes(chipId));
        if (!hasChip) {
            return false;
        }
    }

    // noneKeywords: TRUE if rawDictation does NOT contain ANY of these keywords
    if (condition.noneKeywords && condition.noneKeywords.length > 0) {
        const dictation = (ctx.rawDictation || ctx.extracted.diagnosis || '').toLowerCase();
        const hasKeyword = condition.noneKeywords.some(kw => dictation.includes(kw.toLowerCase()));
        if (hasKeyword) {
            return false; // Keyword found = condition fails
        }
    }

    return true;
}

/**
 * Evaluate a full WhenClause.
 * - If anyOf is specified: TRUE if ANY condition block in anyOf matches (OR logic)
 * - Otherwise: evaluate as single condition block
 */
function evaluateWhenCondition(when: WhenClause | undefined, ctx: WhenContext): boolean {
    if (!when) return true; // No condition = always show

    // anyOf: OR logic across condition groups
    if (when.anyOf && when.anyOf.length > 0) {
        const anyMatch = when.anyOf.some(cond => evaluateSingleCondition(cond, ctx));
        if (anyMatch) return true;

        // If anyOf is specified but none match, and no other top-level conditions, return false
        // But if there ARE top-level conditions, continue checking them
        const hasTopLevelConditions =
            when.requiresAnswers || when.anyMentioned || when.anyKeywords || when.anyChipsActive || when.noneKeywords;

        if (!hasTopLevelConditions) {
            return false;
        }
    }

    // noneOf: If this condition matches, HIDE the question (negative matching)
    if (when.noneOf) {
        const noneOfMatches = evaluateSingleCondition(when.noneOf, ctx);
        if (noneOfMatches) {
            return false; // noneOf matched = hide question
        }
    }

    // Evaluate top-level conditions (if any)
    return evaluateSingleCondition(when, ctx);
}


export function generateQuestions(
    extracted: ExtractedData,
    insuranceType: InsuranceType,
    hasMKV: boolean = false,
    treatmentId: string = 'fuellung',  // Treatment type, defaults to fuellung for backward compat
    answers: Map<string, unknown> = new Map(),  // NEW: Answers for dependency checking
    rawDictation: string = ''  // NEW: Raw dictation for keyword matching
): DynamicQuestion[] {
    const questions: DynamicQuestion[] = [];

    // 1. Initial Logic: Infer chips from extracted data to know current state
    const activeChipIds = inferChipsFromExtractedData(
        treatmentId,
        extracted,
        { hasMKV, insuranceType }
    );

    // Build context for when-clause evaluation
    const whenContext: WhenContext = {
        extracted,
        answers,
        activeChipIds,
        rawDictation: rawDictation || (extracted as any).rawDictation || extracted.diagnosis || '',
    };

    // ═══════════════════════════════════════════════════════════════
    // ENDO STEP DETECTION (MVP) — V7 Wiring Point
    // ═══════════════════════════════════════════════════════════════
    if (treatmentId === 'endo') {
        // Check if endo_step is already set (from previous askback answer)
        const currentEndoStep = (extracted.mentioned as any)?.endo_step;

        if (!currentEndoStep) {
            // Detect from rawDictation using keyword matching
            const rawText = (extracted as any).rawDictation || extracted.diagnosis || '';
            const detection = detectEndoStep(rawText);

            if (detection.step === null) {
                // Ambiguous: add askback question
                const def = getQuestionDefOrNull(treatmentId, 'endo_step');
                if (def) {
                    questions.push({
                        id: def.key,
                        category: 'forensic',
                        question: def.prompt,
                        type: def.type,
                        options: def.options.map(o => ({
                            id: o.id,
                            label: o.label,
                            dataValue: o.dataValue
                        })),
                    });
                }
            } else {
                // Set detected step in extracted.mentioned for downstream use
                if (!extracted.mentioned) {
                    (extracted as any).mentioned = {};
                }
                (extracted.mentioned as any).endo_step = detection.step;
            }
        }
    }

    // 2. Identify Gaps -> Generate 'forensic' questions
    // Get forensic questions from the treatment's OWN question bank
    // This is now FULLY data-driven — filtered by `when` clause

    const forensicQuestions = getQuestionsByCategory(treatmentId, 'forensic');

    forensicQuestions.forEach((def) => {
        // Skip endo_step for endo (handled above)
        if (treatmentId === 'endo' && def.key === 'endo_step') return;

        // ═══════════════════════════════════════════════════════════════
        // SETTINGS-BASED SKIP: Check praxis defaults
        // If settings provide a non-'fragen' default, skip the question
        // ═══════════════════════════════════════════════════════════════
        if (treatmentId === 'fuellung') {
            const fuellungDefaults = getFuellungDefaults();

            // Skip isolation question if default is set (not 'fragen')
            if (def.key === 'isolation' && fuellungDefaults.trockenlegung !== 'fragen') {
                return; // Default from praxis settings, don't ask
            }

            // Skip ueberkappung_material if default is set (not 'fragen')
            // Only if ueberkappung=true (checked via answers)
            if (def.key === 'ueberkappung_material' && fuellungDefaults.ueberkappungMaterial !== 'fragen') {
                return; // Default from praxis settings, don't ask
            }
        }

        // Check if already mentioned in extraction (skip if present)
        const isMentioned = (extracted.mentioned as any)?.[def.key] !== undefined;

        // ═══════════════════════════════════════════════════════════════
        // CONDITIONAL FILTERING: Check `when` clause
        // If when-condition not satisfied, skip this question
        // ═══════════════════════════════════════════════════════════════
        const whenCondition = (def as any).when as WhenClause | undefined;
        if (!evaluateWhenCondition(whenCondition, whenContext)) {
            return; // Skip: conditions not met
        }

        if (!isMentioned) {
            questions.push({
                id: def.key,
                category: 'forensic',
                question: def.prompt,
                type: def.type,
                options: def.options?.map((o) => ({
                    id: o.id,
                    label: o.label,
                    dataValue: o.dataValue
                })) || [],
            });
        }
    });

    // 3. Upsell Questions (ONLY if not GKV-only-strict without MKV?)
    // Actually, upsells are valid for GKV too if they agreed to pay.
    // If hasMKV is true, we ask specific MKV questions.

    if (hasMKV) {
        // MKV Vereinbarung & Betrag
        const mkvKeys = ['mkv_vereinbarung', 'mkv_betrag'];
        mkvKeys.forEach(key => {
            const def = getQuestionDefOrNull(treatmentId, key);
            if (def) {
                // Special handling for number type pre-fill
                let defaultValue = undefined;
                if (key === 'mkv_betrag' && extracted.costs) {
                    defaultValue = extracted.costs;
                }

                questions.push({
                    id: def.key,
                    category: 'mkv',
                    question: def.prompt,
                    type: def.type,
                    options: def.options?.map(o => ({
                        id: o.id,
                        label: o.label,
                        dataValue: o.dataValue
                    })) || [],
                    // Number specific
                    min: def.min,
                    max: def.max,
                    step: def.step,
                    unit: def.unit,
                    presets: def.presets,
                    defaultValue: defaultValue
                });
            }
        });

        // ═══════════════════════════════════════════════════════════════
        // FUELLUNG + MKV: Apply technique defaults instead of asking
        // Mehrschicht and Adhäsiv are praxis-standard for MKV fillings
        // ═══════════════════════════════════════════════════════════════
        const FUELLUNG_MKV_DEFAULT_CHIPS = [CANONICAL_CHIP_IDS.MEHRSCHICHT, CANONICAL_CHIP_IDS.ADHAESIV];
        const isFuellungMkv = treatmentId === 'fuellung';

        // Upsell Chips (Mehrschicht, Adhäsiv etc.)
        // We fetch chips with upsellCandidate = true
        const allChips = getTreatmentChips(treatmentId);
        const upsellChips = allChips.filter(c => c.upsellCandidate);

        upsellChips.forEach(chip => {
            // For fuellung+MKV: Skip questions for mehrschicht/adhasiv
            // These are applied as defaults, not asked
            if (isFuellungMkv && FUELLUNG_MKV_DEFAULT_CHIPS.includes(chip.id)) {
                // Don't ask - defaults are applied via activeChipIds extension
                return;
            }

            // Check if already active? If active, maybe don't ask or ask to confirm?
            // Usually we ask to UPSell (add it).
            // If already active (inferred from dictation), we might skip or show as 'answered'.
            // Here we assume we ask if not explicitly mentioned.

            if (!activeChipIds.includes(chip.id)) {
                // Find question definition
                // Priority: chip.questionKey -> chip.id
                const questionKey = chip.questionKey || chip.id;
                const def = getQuestionDefOrNull(treatmentId, questionKey);

                if (def) {
                    questions.push({
                        id: def.key,
                        category: 'upsell',
                        question: def.prompt,
                        type: def.type,
                        options: def.options.map(o => ({
                            id: o.id,
                            label: o.label,
                            dataValue: o.dataValue,
                            chipActivation: o.chipActivation // Important: Pass this through!
                        })),
                        chipId: chip.id,
                        upsellNotes: chip.upsellNotes
                    });
                }
            }
        });
    }

    return questions;
}
