/**
 * Core Question Service V2 — PURE ORCHESTRATOR (Ported from V6)
 *
 * RULES:
 * 1. NO hardcoded texts, options, or emojis in TS
 * 2. NO FIELD_QUESTION_MAP
 * 3. NO price logic, no BEMA/GOZ
 * 4. ALL question semantics come from QuestionBank (JSON)
 * 5. Uses Engine/ChipResolver for what to ask, QuestionBank for how to ask
 *
 * SSOT FLOW:
 * Rules → RequiredFields → QuestionBank → DynamicQuestion[]
 */

import type { DynamicQuestion, QuestionOption } from '../../contracts/questions';
import type { ExtractedDataV2, Field } from '../../contracts/extraction';
import {
    getQuestionDef,
    getQuestionDefOrNull,
    getQuestionsByCategory,
    getAllQuestionKeys,
    type QuestionDefinition
} from '../billing/knowledgeBase/questions/questionBank';
import { getTreatmentChips } from '../billing/knowledgeBase/logic/treatmentEngine';
import { inferChipsFromExtractedData } from '../billing/knowledgeBase/logic/chipResolver';
import { getRequiredFieldsFromRules } from '../billing/knowledgeBase/logic/ruleQuestionTrigger';
import { deriveDiagnosis } from '../billing/knowledgeBase/logic/diagnosisDerivation';
import { getEndoDefaults, type EndoDefaults } from '../../v7/settings/settingsStore';
import { processMedical } from '../medical/medicalEngine';
import type { MedicalResult, MedicalAskback } from '../../contracts/medical';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';

export interface QuestionContext {
    treatmentId: string;
    insuranceType: InsuranceType;
    hasMKV: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Convert QuestionDefinition -> DynamicQuestion
// ═══════════════════════════════════════════════════════════════

function definitionToQuestion(
    def: QuestionDefinition,
    category: DynamicQuestion['category'],
    idPrefix: string
): DynamicQuestion {
    const options: QuestionOption[] = (def.options || []).map(o => ({
        id: o.id,
        label: o.label,
        dataValue: o.dataValue,
    }));

    return {
        id: `${idPrefix}_${def.key}`,
        questionKey: def.key,
        category,
        question: def.prompt,
        type: def.type,
        options,
        dataField: def.dataField,
        // Number-specific
        min: def.min,
        max: def.max,
        step: def.step,
        unit: def.unit,
        presets: def.presets
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Check if field is missing in extracted data
// ═══════════════════════════════════════════════════════════════

function isFieldMissing(extracted: ExtractedDataV2, fieldPath: string): boolean {
    const parts = fieldPath.split('.');
    let current: unknown = extracted;

    for (const part of parts) {
        if (current === null || current === undefined) return true;
        if (typeof current !== 'object') return true;
        current = (current as Record<string, unknown>)[part];
    }

    // Check if it's a Field<T> with null value or needsConfirmation
    if (current && typeof current === 'object' && 'value' in current) {
        const field = current as Field<unknown>;
        return field.value === null || field.needsConfirmation;
    }

    return current === null || current === undefined;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Check if question should be skipped based on settingsSkip
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a question should be skipped because settings already define the value.
 * 
 * Reads settingsSkip config from the question definition (JSON SSOT).
 * If settings.{settingsPath} !== skipIfNot, the question is skipped.
 */
function shouldSkipForSettings(def: QuestionDefinition): boolean {
    if (!def.settingsSkip) {
        return false; // No settingsSkip config = don't skip
    }

    try {
        const { settingsPath, skipIfNot } = def.settingsSkip;
        const endoDefaults = getEndoDefaults();

        // Parse settingsPath (e.g., 'endo.defaults.spuelprotokoll')
        const parts = settingsPath.split('.');
        let value: unknown = endoDefaults;

        // Skip 'endo.defaults.' prefix since getEndoDefaults returns just the defaults
        const keyParts = parts.slice(2); // ['spuelprotokoll']

        for (const part of keyParts) {
            if (value === null || value === undefined) return false;
            value = (value as Record<string, unknown>)[part];
        }

        // Skip if value !== skipIfNot
        return value !== skipIfNot;
    } catch {
        // In Node.js test environment, settings may not be available
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Convert ExtractedDataV2 to legacy format
// ═══════════════════════════════════════════════════════════════

function convertToLegacyExtracted(v2: ExtractedDataV2): Record<string, unknown> {
    // Derive diagnosis from keyword flags (SSOT: Engine derives, Extraction extracts)
    const derivedDiagnosis = v2.keywordFlags
        ? deriveDiagnosis(v2.keywordFlags).label
        : null;

    return {
        tooth: v2.tooth?.value ?? null,
        surfaces: v2.surfaces?.value ?? [],
        diagnosis: derivedDiagnosis,  // Derived, not extracted
        costs: v2.costs?.value ?? null,
        mentioned: {
            vitality: v2.mentioned?.vitality?.value,
            percussion: v2.mentioned?.percussion?.value,
            kofferdam: v2.mentioned?.kofferdam?.value,
            tiefe: v2.mentioned?.tiefe?.value,
            anesthesia: v2.mentioned?.anesthesia?.value,
            capping: v2.mentioned?.capping?.value,
            material: v2.mentioned?.material?.value
        },
        gaps: []
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN: Generate Questions (Pure Orchestrator)
// ═══════════════════════════════════════════════════════════════

/**
 * generateQuestionsV2 - Pure orchestrator
 *
 * Pipeline:
 * A. Get active chips from extracted data (via ChipResolver)
 * B. Get rule-triggered questions (SSOT: Rules → Field → Question)
 * C. Fallback: category-based forensic questions (backwards compat)
 * D. Get MKV-specific questions (if MKV context)
 * E. Get upsell questions (if MKV or PKV)
 * F. Sort by category priority
 */
export function generateQuestionsV2(
    extracted: ExtractedDataV2,
    context: QuestionContext
): DynamicQuestion[] {
    const { treatmentId, insuranceType, hasMKV } = context;
    const questions: DynamicQuestion[] = [];
    const addedKeys = new Set<string>();

    console.log('[QuestionService V2] Generating questions for:', { treatmentId, insuranceType, hasMKV });

    // ═══════════════════════════════════════════════════════════════
    // STEP 0: MEDICAL LAYER — Determine required askbacks FIRST
    // ═══════════════════════════════════════════════════════════════

    const medicalResult = processMedical(treatmentId, extracted);
    console.log('[QuestionService V2] Medical result:', {
        minimalDatasetMet: medicalResult.minimalDatasetMet,
        hardAskbacks: medicalResult.hardAskbacks.length,
        softAskbacks: medicalResult.softAskbacks.length,
        findings: medicalResult.findings.length
    });

    // Add hard askbacks as medical questions (highest priority)
    for (const askback of medicalResult.hardAskbacks) {
        // P1: Extract question key from fully-namespaced questionId (e.g., 'fuellung.vitality' → 'vitality')
        const questionKey = askback.questionId.split('.').slice(1).join('.') || askback.questionId;
        const def = getQuestionDefOrNull(treatmentId, questionKey);
        if (def && !addedKeys.has(questionKey)) {
            const question = definitionToQuestion(def, 'medical', 'medical');
            question.ruleId = askback.id; // Use askback ID for tracing
            question.regressRisk = true;  // Hard askbacks are always regress risk
            questions.push(question);
            addedKeys.add(questionKey);
        }
    }

    // If minimal dataset NOT met, only return hard askbacks (no upsell, no optional)
    if (!medicalResult.minimalDatasetMet) {
        console.log('[QuestionService V2] Minimal dataset not met, returning only hard askbacks');
        return questions;
    }

    // Add soft askbacks (lower priority than hard, but before upsell)
    for (const askback of medicalResult.softAskbacks) {
        // P1: Extract question key from fully-namespaced questionId
        const questionKey = askback.questionId.split('.').slice(1).join('.') || askback.questionId;
        const def = getQuestionDefOrNull(treatmentId, questionKey);
        if (def && !addedKeys.has(questionKey)) {
            const question = definitionToQuestion(def, 'medical', 'medical_soft');
            question.ruleId = askback.id;
            questions.push(question);
            addedKeys.add(questionKey);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP A: Infer active chips from extracted data
    // ═══════════════════════════════════════════════════════════════

    let activeChipIds: string[] = [];
    try {
        const legacyExtracted = convertToLegacyExtracted(extracted);
        activeChipIds = inferChipsFromExtractedData(treatmentId, legacyExtracted, { hasMKV, insuranceType });
    } catch (e) {
        console.warn('[QuestionService V2] ChipResolver failed:', e);
    }

    console.log('[QuestionService V2] Active chips:', activeChipIds);

    // ═══════════════════════════════════════════════════════════════
    // STEP B: Rule-triggered questions (SSOT: Rules → Field → Question)
    // ═══════════════════════════════════════════════════════════════

    const requiredFields = getRequiredFieldsFromRules(
        treatmentId,
        activeChipIds,
        extracted,
        insuranceType,
        hasMKV
    );

    for (const required of requiredFields) {
        const def = getQuestionDefOrNull(treatmentId, required.questionKey);
        if (def && !addedKeys.has(def.key)) {
            const question = definitionToQuestion(def, 'rule', 'rule');
            // Add rule metadata
            question.ruleId = required.ruleId;
            question.riskLevel = required.riskLevel;
            question.regressRisk = required.regressRisk;
            questions.push(question);
            addedKeys.add(def.key);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP C: Fallback - Category-based forensic questions
    // (for backwards compatibility, until all have rules)
    // ═══════════════════════════════════════════════════════════════

    const forensicDefs = getQuestionsByCategory(treatmentId, 'forensic');

    for (const def of forensicDefs) {
        // STEP C.1: Settings-based skip (reads settingsSkip from question def)
        if (shouldSkipForSettings(def)) {
            console.log(`[QuestionService V2] Skipping ${def.key} (settings-based)`);
            continue;
        }

        // STEP C.2: Only ask if field is missing
        if (def.dataField && isFieldMissing(extracted, def.dataField)) {
            if (!addedKeys.has(def.key)) {
                questions.push(definitionToQuestion(def, 'forensic', 'forensic'));
                addedKeys.add(def.key);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP D: MKV-specific questions
    // ═══════════════════════════════════════════════════════════════

    if (hasMKV) {
        // Simple rule: if MKV is present/mentioned, ask for amount (betrag).
        if (treatmentId === 'fuellung') {
            const mkvAmount = getQuestionDefOrNull(treatmentId, 'mkv_betrag');
            if (mkvAmount && !addedKeys.has(mkvAmount.key)) {
                const question = definitionToQuestion(mkvAmount, 'mkv', 'mkv');
                if (mkvAmount.key === 'mkv_betrag' && extracted.costs?.value !== null) {
                    question.defaultValue = extracted.costs.value;
                }
                questions.push(question);
                addedKeys.add(mkvAmount.key);
            }
        } else {
        const mkvDefs = getQuestionsByCategory(treatmentId, 'mkv');

        for (const def of mkvDefs) {
            if (!addedKeys.has(def.key)) {
                const question = definitionToQuestion(def, 'mkv', 'mkv');

                // Pre-fill mkv_betrag if costs were extracted
                if (def.key === 'mkv_betrag' && extracted.costs?.value !== null) {
                    question.defaultValue = extracted.costs.value;
                }

                questions.push(question);
                addedKeys.add(def.key);
            }
        }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP E: Upsell questions (if MKV or PKV)
    // ═══════════════════════════════════════════════════════════════

    if (hasMKV || insuranceType === 'PKV') {
        // V10 Matrix (Atlas): For fuellung, suppress upsell questions in MKV context.
        if (!(treatmentId === 'fuellung' && hasMKV)) {
            const allChips = getTreatmentChips(treatmentId);
            const upsellChips = allChips.filter(c => c.upsellCandidate && !activeChipIds.includes(c.id));

            for (const chip of upsellChips) {
                const questionKey = chip.questionKey || chip.id;
                const def = getQuestionDefOrNull(treatmentId, questionKey);

                if (def && !addedKeys.has(def.key)) {
                    questions.push(definitionToQuestion(def, 'upsell', 'upsell'));
                    addedKeys.add(def.key);
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP F: Sort by category priority
    // ═══════════════════════════════════════════════════════════════

    const categoryOrder: Record<DynamicQuestion['category'], number> = {
        medical: 0,   // Medical askbacks first (highest priority)
        rule: 1,      // Rule-triggered second
        forensic: 2,  // Forensic third
        mkv: 3,
        upsell: 4
    };

    questions.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

    console.log('[QuestionService V2] Generated questions:', questions.map(q => q.id));

    return questions;
}

// ═══════════════════════════════════════════════════════════════
// P11.2: QUESTION BUNDLE API — Returns QuestionBundle for UI
// ═══════════════════════════════════════════════════════════════

import type { QuestionBundle, DocMode } from '../../contracts/questions';
import {
    presentQuestions,
    getPresentationCounts,
    type PresentationOptions
} from './questionPresentationPolicy';

export interface QuestionBundleContext extends QuestionContext {
    docMode?: DocMode;
    softAskbacksMaxVisible?: number;
}

/**
 * P11.2: Generate questions and return as QuestionBundle with presentation grouping.
 *
 * Uses MEDICAL layer for necessity decisions, then applies presentation policy
 * for UI grouping (required/optional visible/hidden).
 *
 * @param extracted - Extracted data from dictation
 * @param context - Question generation context including docMode
 * @returns QuestionBundle with progressive disclosure grouping
 */
export function generateQuestionsV2Bundle(
    extracted: ExtractedDataV2,
    context: QuestionBundleContext
): QuestionBundle {
    const { treatmentId, insuranceType, hasMKV, docMode = 'balanced' } = context;

    // Step 1: Generate all questions (flat list)
    const allQuestions = generateQuestionsV2(extracted, { treatmentId, insuranceType, hasMKV });

    // Step 2: Split by medical severity
    const required: DynamicQuestion[] = [];
    const optional: DynamicQuestion[] = [];

    // Get medical result to know which questions are hard/soft
    const medicalResult = processMedical(treatmentId, extracted);
    const hardQuestionIds = new Set(medicalResult.hardAskbacks.map(a => a.questionId));
    const softQuestionIds = new Set(medicalResult.softAskbacks.map(a => a.questionId));

    for (const q of allQuestions) {
        // MKV questions are always required when present
        if (q.category === 'mkv') {
            required.push(q);
            continue;
        }
        // P12.A: FIX - Use questionKey ONLY for medical matching
        // q.id may be internal (e.g., 'medical_vitality') and WON'T match medical questionIds
        const questionKey = q.questionKey;

        // If medical category but missing questionKey, this is a data integrity issue
        if (q.category === 'medical' && !questionKey) {
            console.error(`[QuestionService V2] INVARIANT VIOLATION: Medical question ${q.id} lacks questionKey`);
            // Force into required as safety measure (regress risk)
            q.medicalSeverity = 'hard';
            q.regressRisk = true;
            required.push(q);
            continue;
        }

        // Construct fully qualified questionId for lookup (only if questionKey exists)
        if (questionKey) {
            const fullyQualifiedId = `${treatmentId}.${questionKey}`;

            if (hardQuestionIds.has(fullyQualifiedId) || q.medicalSeverity === 'hard') {
                q.medicalSeverity = 'hard';
                required.push(q);
            } else if (softQuestionIds.has(fullyQualifiedId) || q.medicalSeverity === 'soft') {
                q.medicalSeverity = 'soft';
                optional.push(q);
            } else {
                // Non-medical questions go to optional
                optional.push(q);
            }
        } else {
            // Non-medical question without questionKey → optional
            optional.push(q);
        }
    }

    // Step 3: Apply presentation policy
    const presentationOptions: PresentationOptions = {
        docMode,
        softAskbacksMaxVisible: context.softAskbacksMaxVisible
    };

    const presented = presentQuestions({
        required,
        optional,
        options: presentationOptions
    });

    // Step 4: Log presentation counts (PII-safe)
    const counts = getPresentationCounts(presented, docMode);
    console.log('[QuestionService V2] Bundle:', counts);

    return {
        required: presented.required,
        optionalVisible: presented.optionalVisible,
        optionalHidden: presented.optionalHidden,
        optionalTotal: presented.optionalTotal,
        docMode
    };
}

// Re-export for tests
export { getAllQuestionKeys, getQuestionDef };
