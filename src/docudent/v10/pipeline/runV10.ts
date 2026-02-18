/**
 * V10 Pipeline Orchestrator — THE SINGLE ENTRY POINT
 *
 * Chains all M6-M9 modules:
 * 1. extractFromDictation (selected via selectExtractor)
 * 2. buildFactsFromExtraction (M7)
 * 3. applyMedicalKb (M6)
 * 4. QuestionServiceV2 (robust questions)
 * 5. renderFromKbChips (M9)
 * 6. combinability check
 *
 * SSOT: Text/Billing from KB only. Medical rules from medical_kb.
 */

import type {
    V10PipelineInput,
    V10PipelineOutput,
    V10PipelineMeta,
    V10PipelineTrace,
    V10InstanceTrace,
    V10ReviewContext,
    V10ClinicalObligationCheck,
} from '../types';
import type { DocMode, DynamicQuestion, QuestionBundle } from '../../contracts/questions';
import type { ExtractedDataV2, Surface } from '../../contracts/extraction';
import { createField, unknownField } from '../../contracts/extraction';
import { buildQuestionsFromAskbacks } from '../askbacks/buildQuestionsFromAskbacks';
import { deriveReasonedAskbackHints, orderAskbacksDeterministically } from '../askbacks/reasonedAskbackHints';
import { presentQuestions } from '../../core/questions/questionPresentationPolicy';
import { applyReasonedExtractionHints } from '../extraction/adapters/reasonedExtractionHints';
import {
    buildDocumentationContextFromExtraction,
    buildLabeledContextNotes,
    collectSharedForensicNotes,
    collectSharedUnresolvedNotes,
    mergeNotesIntoDocumentationContext,
    resolveDocumentationContextMapping,
    syncDocumentationContextToExtraction,
} from '../extraction/context/documentationContext';
import type { DocumentationContextV1 } from '../extraction/context/documentationContext';

// V10: Facts Module (replaces V7 medical)
import type { TreatmentFacts } from '../facts';
import { buildFactsFromExtraction } from '../facts';
import { applyAnswersToFacts } from '../facts';
import { collectDocumentationEvidenceNotes } from '../facts/documentationEvidence';

// M6: Medical Engine
import { applyMedicalKb, stripToothScope, withToothScope } from '../../medical_kb/engine/applyMedicalKb';
import { medicalKbV10 } from '../../medical_kb';

// V10: Askback Compiler (replaces V7 medical/askbacks)

// V10: SSOT Renderer (replaces V7 output)
import { renderFromKbChips } from '../renderer';

// V10 Compatibility Modules
import {
    V10TraceCollector,
    traceInput,
    traceExtract,
    traceQuestions,
    traceGate,
    traceRender,
    traceBillingInputs,
    traceBillingResult,
    traceMedicalSummary,
    traceTestOnly,
    traceMilchzahn,
    traceKbMedical,
    traceKbTreatment,
} from '../trace';
import { selectExtractor, getExpectedEngine } from '../extraction';
import { checkCombinabilityFromKb, type CombinabilityCheckResult } from '../billing/combinability';
import { checkMilchzahnSupport } from '../compat/milchzahn';
import { getTestOnlyOverrides, isTestMode } from '../testOnly';
import { scopeExtractionToInstances } from '../multitreatment/scoping';
import { getPack, hasPack } from '../packs';

// KB Providers (M13)
import { defaultMedicalKbProvider } from '../kb/medical';
import { defaultTreatmentKbProvider } from '../kb/treatment';
import { getCombinabilityMeta } from '../kb/combinability';
import { getActiveKbReleaseId } from '../kb/release';

// M15: Billing Eligibility Guard
import { applyBillingGuard, type ChipWithProvenance } from './billingEligibilityGuard';
import type { FactSource } from '../types';
import type { SourceRef } from '../../medical_kb/schema.v1';

// V10: Output Composer (KZV-style documentation)
import { detectMkvAmount } from '../output/composeDocumentationV10';
import { composeOutput } from '../output/outputComposerV10';
import { getTreatmentChips } from '../../core/billing/knowledgeBase/logic/treatmentEngine';
import { pruefeRegeln } from '../../core/billing/knowledgeBase/logic/regelEngine';
import { buildEndoQuestions, deriveEndoAnswerOverrides } from '../endo/endoQuestionAdapter';
import { validateBillingCodes } from '../../core/billing/knowledgeBase/logic/billingValidation';
import { gateNoUnknownChipEmitters } from '../procedure/gates/gateNoUnknownChipEmitters';
import { gateMissingEventBundles } from '../procedure/gates/gateMissingEventBundles';
import { resolveContractContext } from '../procedure/resolver/resolveContractContext';
import { matchProcedureGraph } from '../procedure/resolver/matchProcedureGraph';
import { getProcedureGraphForTreatment } from '../procedure/registry/treatments';
import type { ProcedureFacts } from '../procedure/types';
import { getBundleMetaMap } from '../procedure/bundleMeta';
import { normalizeAskbackId } from '../procedure/normalizeAskbackId';
import { resolveBillingRefsFromBundleMeta } from '../billing/resolveBillingRefsFromBundleMeta';
import { resolveBillingDetailsFromDb } from '../billing/resolveBillingDetailsFromDb';
import { normalizeBillingRefId } from '../../core/billing/billingRefNormalization';
import { normalizeToothInText, extractToothNumber, isValidFDI } from '../../core/extraction/toothNormalizer';
import { mergeRequiredAskbacks } from '../askbacks/mergeRequiredAskbacks';
import { evaluateClinicalObligations } from '../obligations/clinicalObligations';
import type { SettingsInput } from '../settings/settingsTypes';
import { isFactKnownForAskback, resolveSettings } from '../settings/settingsResolver';
import {
    canonicalizeSettingsInput,
    getPracticeDefaultAnestheticAgentId,
    getUserDefaultAnestheticAgentId,
} from '../settings/medicalDefaults';
import { getMaterialById, getMaterialLabelById } from '../registry/materialCatalog';
import type { ChipOverridesMap, OverridesByInstance } from '../settings/useChipOverrides';
import type { PackUiContractV1 } from '../packs/types';
import { getStandardChipIdsForInstance } from '../settings/chipStandards';

// GP4: Billing Completeness
import { computeBillingCompleteness, type BillingCompletenessResult } from '../billing/billingCompleteness';
import { getBillingDbTreatment } from '../billing/billingDb';
import { refineDocumentationText } from '../llm/textRefiner';
import {
    composeForensicDocumentation,
    isForensicComposerEnabled,
    type ForensicComposeSection,
} from '../llm/forensicComposer';

// ═══════════════════════════════════════════════════════════════
// INSTANCE PROCESSING
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// INSTANCE PROCESSING
// ═══════════════════════════════════════════════════════════════

interface InstanceResult {
    instanceId: string;  // Real instanceId from scoping (e.g., fuellung-36-1)
    teeth: string[];     // Teeth in this instance
    tooth?: string;      // Primary tooth (compat)
    facts: TreatmentFacts;
    askbacksRequired: string[];
    askbacksOptional: string[];
    chips: string[];
    chipEmitters?: Record<string, string>;
    questions: DynamicQuestion[];
    questionBundle?: QuestionBundle;
    trace: V10InstanceTrace;
    hasUnansweredRequired: boolean;
    /** M15: Provenance for askbacks */
    askbackProvenance: Array<{
        askbackId: string;
        ruleId: string;
        sourceRefs: SourceRef[];
    }>;
    /** M15: Provenance for chips */
    chipProvenance: Array<{
        chipId: string;
        ruleId: string;
        sourceRefs: SourceRef[];
    }>;
    /** P3c: Answer provenance (normalized key -> source) */
    answerSources: Map<string, FactSource>;
    /** P3c: Settings-applied fact provenance (normalized key -> source) */
    settingsFactSources: Map<string, FactSource>;
    /** Centralized clinical obligation outcomes for this instance */
    clinicalObligations: V10ClinicalObligationCheck[];
    /** Bundle-level disclosure refs (optional) */
    disclosureIds?: string[];
    /** Bundle-level billable chip IDs (optional) */
    billingChipIds?: string[];
}

function mergeQuestionsById(primary: DynamicQuestion[], additional: DynamicQuestion[]): DynamicQuestion[] {
    if (additional.length === 0) return primary;
    const merged = [...primary];
    const seen = new Set(primary.map(question => question.id));
    const semanticSeen = new Set(
        primary
            .map(question => semanticQuestionKey(question))
            .filter((key): key is string => Boolean(key))
    );
    for (const question of additional) {
        if (!question.id || seen.has(question.id)) continue;
        const semanticKey = semanticQuestionKey(question);
        if (semanticKey && semanticSeen.has(semanticKey)) continue;
        seen.add(question.id);
        if (semanticKey) semanticSeen.add(semanticKey);
        merged.push(question);
    }
    return merged;
}

function dedupeQuestionsBySemanticKey(questions: DynamicQuestion[]): DynamicQuestion[] {
    if (questions.length <= 1) return questions;
    const selected = new Map<string, DynamicQuestion>();

    const score = (question: DynamicQuestion): number => {
        let points = 0;
        if (Array.isArray(question.options) && question.options.length > 0) points += 3;
        if (question.type === 'single' || question.type === 'multi') points += 2;
        if (question.type === 'perCanalTable') points += 4;
        if ((question.id ?? '').startsWith('ENDO_')) points += 1;
        return points;
    };

    for (const question of questions) {
        const key = semanticQuestionKey(question);
        if (!key) {
            selected.set(`id:${question.id}`, question);
            continue;
        }
        const existing = selected.get(key);
        if (!existing || score(question) > score(existing)) {
            selected.set(key, question);
        }
    }

    return Array.from(selected.values());
}

function semanticQuestionKey(question: DynamicQuestion): string | undefined {
    const raw = String(normalizeAskbackId(question.questionKey ?? stripToothScope(question.id ?? ''))).toLowerCase();
    if (!raw) return undefined;
    if (raw.includes('irrigation') || raw.includes('endo_t1_irrigation') || raw.includes('endo_t2_irrigation')) {
        return 'irrigation';
    }
    if (raw.includes('wf_technique') || raw.includes('obturation_technique') || raw.includes('endo_t3_obturation_technique')) {
        return 'wf_technique';
    }
    if (raw.includes('canal_count') || raw.includes('endo_canal_count')) {
        return 'canal_count';
    }
    if (raw.includes('working_length_method') || raw.includes('wl_method')) {
        return 'working_length_method';
    }
    if (raw.includes('working_lengths')) {
        return 'working_lengths';
    }
    return raw;
}

type ReviewFactSourceLabel = NonNullable<V10ReviewContext['instances'][number]['factSources']>[string];

function toReviewFactSource(source: FactSource | undefined): ReviewFactSourceLabel {
    if (source === 'settings') return 'settings';
    if (source === 'user') return 'askback';
    if (source === 'inferred' || source === 'default') return 'manual';
    return 'dictation';
}

function resolveReviewFactSource(
    answerSources: Map<string, FactSource>,
    settingsFactSources: Map<string, FactSource>,
    keys: string[]
): ReviewFactSourceLabel | undefined {
    for (const key of keys) {
        const normalized = normalizeProvenanceKey(key);
        if (!normalized) continue;
        const answerSource = answerSources.get(normalized);
        if (answerSource) {
            return toReviewFactSource(answerSource);
        }
    }
    for (const key of keys) {
        const normalized = normalizeProvenanceKey(key);
        if (!normalized) continue;
        const settingsSource = settingsFactSources.get(normalized);
        if (settingsSource) {
            return toReviewFactSource(settingsSource);
        }
    }
    return undefined;
}

function buildReviewContext(results: InstanceResult[], settings?: SettingsInput): V10ReviewContext {
    const instances = results.map(r => {
        const surfaces = (r.facts.surfaces ?? []).map(s => String(s));
        const diagnosis = (r.facts.endo?.diagnosis ?? null) as string | null;
        const standardChipIds = getStandardChipIdsForInstance({
            settings,
            treatmentId: r.facts.treatmentId,
            tooth: r.tooth,
        });
        const factSources: Record<string, ReviewFactSourceLabel> = {};
        const recordFactSource = (
            field: string,
            sourceKeys: string[],
            isPresent: boolean
        ) => {
            if (!isPresent) return;
            const source = resolveReviewFactSource(r.answerSources, r.settingsFactSources, sourceKeys);
            factSources[field] = source ?? 'dictation';
        };

        recordFactSource('anesthesia', ['anesthesia', 'la_type'], !!(r.facts.anesthesia && r.facts.anesthesia !== 'unknown' && r.facts.anesthesia !== 'none'));
        recordFactSource(
            'kofferdam',
            ['kofferdam', 'isolation', 'kofferdam_used'],
            r.facts.kofferdamUsed === true || r.facts.endo?.kofferdam === true
        );
        recordFactSource('cariesDepth', ['tiefe', 'cavity_depth', 'caries_depth'], !!(r.facts.cariesDepth && r.facts.cariesDepth !== 'unknown'));
        recordFactSource(
            'capping',
            ['ueberkappung', 'capping', 'pulpa_opened'],
            r.facts.pulpaOpened === true
                || r.facts.pulpaOpened === false
                || r.facts.capping?.performed === 'yes'
        );
        recordFactSource(
            'workingLengthMethod',
            ['wl_method', 'working_length_method'],
            !!r.facts.endo?.workingLengthMethod
        );
        recordFactSource(
            'wfTechnique',
            ['wf_technique', 'obturation_technique'],
            !!r.facts.endo?.wfTechnique
        );

        return {
            instanceId: r.instanceId,
            treatmentId: r.facts.treatmentId,
            teeth: r.teeth,
            tooth: r.tooth,
            standardChipIds,
            extractedSummary: {
                tooth: r.tooth ?? null,
                surfaces,
                diagnosis,
            },
            facts: {
                toothRegion: r.facts.toothRegion,
                surfaces: r.facts.surfaces,
                surfaceSource: r.facts.surfaceSource,
                cariesDepth: r.facts.cariesDepth,
                anesthesia: r.facts.anesthesia,
                anesthesiaAmbiguous: r.facts.anesthesiaAmbiguous,
                kofferdamUsed: r.facts.kofferdamUsed ?? r.facts.endo?.kofferdam,
                kofferdamMentioned: r.facts.kofferdamMentioned,
                capping: r.facts.capping,
                pulpaOpened: r.facts.pulpaOpened,
                materialMentioned: r.facts.materialMentioned,
                material: r.facts.material,
                render: r.facts.render,
                insuranceType: r.facts.insuranceType,
                mkvPresent: r.facts.mkvPresent,
                nurKasse: r.facts.nurKasse,
                mehrkostenMentioned: r.facts.mehrkostenMentioned,
                mehrkostenConfirmed: r.facts.mehrkostenConfirmed,
                mkvJustification: r.facts.mkvJustification,
                endo: r.facts.endo,
            },
            factSources: Object.keys(factSources).length > 0 ? factSources : undefined,
        };
    });

    instances.sort((a, b) => a.instanceId.localeCompare(b.instanceId));
    return { instances };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeSettingsFacts<T extends object>(base: T, overrides: Record<string, unknown>): T {
    if (!overrides || Object.keys(overrides).length === 0) {
        return base;
    }
    const merge = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
        const result: Record<string, unknown> = { ...target };
        for (const [key, value] of Object.entries(source)) {
            const current = result[key];
            if (isPlainObject(value)) {
                const currentObj = isPlainObject(current) ? current : {};
                result[key] = merge(currentObj, value);
                continue;
            }
            if (Array.isArray(value)) {
                if (
                    current === undefined
                    || current === null
                    || current === 'unknown'
                    || (Array.isArray(current) && current.length === 0)
                ) {
                    result[key] = value;
                }
                continue;
            }
            if (
                typeof value === 'boolean'
                && value === true
                && typeof current === 'boolean'
                && current === false
                && key.endsWith('Mentioned')
            ) {
                result[key] = value;
                continue;
            }
            if (key === 'mkvPresent' && typeof value === 'boolean') {
                if (current !== true && value === true) {
                    result[key] = value;
                }
                continue;
            }
            if (current === undefined || current === null || current === 'unknown') {
                result[key] = value;
            }
        }
        return result;
    };

    return merge(base as Record<string, unknown>, overrides) as T;
}

function deriveEffectiveInsuranceType(
    base: 'GKV' | 'PKV' | 'MKV',
    facts: TreatmentFacts
): 'GKV' | 'PKV' | 'MKV' {
    // Insurance type is an explicit contract choice (UI toggle), not inferred from dictation.
    // - MKV: may downgrade to GKV when patient explicitly chooses "nur Kasse".
    // - PKV: remains PKV.
    // - GKV: remains GKV (MKV upsell stays as askbacks/contract signals, never auto-upgrades billing mode).
    if (base === 'PKV') return 'PKV';
    if (base === 'MKV') {
        return facts.nurKasse === true ? 'GKV' : 'MKV';
    }
    return 'GKV';
}

function getProcedureGateMode(treatmentId: string): 'warn' | 'block' {
    // Stage-2 migration hardening: Endo is now enforced as non-bypassable procedure path.
    return treatmentId === 'endo' ? 'block' : 'warn';
}

function sanitizeFuellungChipsForInsurance(
    chipIds: string[],
    insuranceType: 'GKV' | 'PKV' | 'MKV',
    facts: TreatmentFacts | undefined
): string[] {
    if (insuranceType === 'PKV') return chipIds;
    const hasActiveMkv = insuranceType === 'MKV' && facts?.nurKasse !== true;
    if (hasActiveMkv) return chipIds;

    // Mehrschicht/Adhäsiv Mehrkosten-narrative must not leak into pure GKV paths.
    const blocked = new Set(['mehrschicht', 'insurance_gkv_mkv']);
    return chipIds.filter(chipId => !blocked.has(chipId));
}

function getMatrixSystemLabel(value: unknown): string | undefined {
    const normalized = String(value ?? '').toLowerCase();
    if (!normalized) return undefined;
    if (normalized === 'sectional' || normalized === 'sektional') return 'Sektional';
    if (normalized === 'tofflemire') return 'Tofflemire';
    if (normalized === 'strip') return 'Strip (Front)';
    if (normalized === 'none') return 'Keine';
    return String(value);
}

function normalizeMaterialToken(value: string): string {
    return value
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

const LA_AGENT_DOC_LABELS: Record<string, string> = {
    'ultracain d s': 'Ultracain D-S, Articain 4% + Adrenalin 1:200.000',
    'ultracain d s forte': 'Ultracain D-S forte, Articain 4% + Adrenalin 1:100.000',
};

function formatLaAgentForDocumentation(value: string | undefined): string {
    const fallback = 'Ultracain D-S';
    const raw = String(value ?? '').trim() || fallback;
    const normalized = normalizeMaterialToken(raw);
    return LA_AGENT_DOC_LABELS[normalized] ?? raw;
}

function detectCatalogMentions(
    dictation: string,
    settingsInput?: SettingsInput
): {
    composite: boolean;
    bulk: boolean;
    flowable: boolean;
    adhesive: boolean;
    etch: boolean;
} {
    if (!dictation) {
        return { composite: false, bulk: false, flowable: false, adhesive: false, etch: false };
    }
    const normalizedDictation = normalizeMaterialToken(dictation);
    const hasToken = (label: string | undefined) => {
        if (!label) return false;
        const token = normalizeMaterialToken(label);
        return token.length > 0 && normalizedDictation.includes(token);
    };
    const defaults = settingsInput?.user?.treatments?.fuellung;
    const composite = hasToken(getMaterialById(defaults?.defaultCompositeMaterialId)?.label);
    const bulk = hasToken(getMaterialById(defaults?.defaultBulkMaterialId)?.label);
    const flowable = hasToken(getMaterialById(defaults?.defaultFlowableMaterialId)?.label);
    const adhesive = hasToken(getMaterialById(defaults?.defaultAdhesiveMaterialId)?.label);
    const etch = hasToken(getMaterialById(defaults?.defaultEtchMaterialId)?.label);
    return { composite, bulk, flowable, adhesive, etch };
}

function processInstance(
    dictation: string,
    treatmentId: string,
    instanceId: string,         // Real instanceId from scoping
    teeth: string[],            // Teeth in this instance
    tooth: string | undefined,  // Primary tooth (compat)
    answers: Map<string, unknown>,
    extracted: Record<string, unknown>,
    isDev: boolean,
    settingsInput?: SettingsInput,  // M62/P3: Settings input (practice + user)
    insuranceType?: 'GKV' | 'PKV' | 'MKV',   // GIGAPROMPT 8: For askback rules
    docMode: DocMode = 'balanced',
    kbReleaseId?: string
): InstanceResult {
    const startTime = Date.now();

    // Step 1: Use pre-extracted data (extraction already done in main orchestrator)
    // Step 2: Build facts from extraction (M7)

    // Step 2: Build facts from extraction (M7)
    const pack = hasPack(treatmentId) ? getPack(treatmentId) : null;
    const buildFacts = pack?.buildFactsFromExtraction ?? buildFactsFromExtraction;
    const applyAnswers = pack?.applyAnswersToFacts ?? applyAnswersToFacts;

    let facts = buildFacts({
        extracted: extracted as any,
        treatmentId,
        instanceScope: tooth ? { tooth } : undefined,
    });

    // GIGAPROMPT 8: Inject insuranceType so askback rules can check facts.insuranceType
    if (insuranceType) {
        (facts as unknown as Record<string, unknown>).insuranceType = insuranceType;
    }
    if (insuranceType === 'MKV') {
        (facts as unknown as Record<string, unknown>).mkvPresent = true;
    }
    if (insuranceType === 'PKV') {
        (facts as unknown as Record<string, unknown>).mehrkostenConfirmed = false;
        (facts as unknown as Record<string, unknown>).mehrkostenMentioned = false;
        (facts as unknown as Record<string, unknown>).nurKasse = false;
        (facts as unknown as Record<string, unknown>).mkvPresent = false;
    }

    // Step 3: Apply scoped answers
    const userSettings = settingsInput?.user as unknown as Record<string, unknown> | undefined;
    const endoQuestionBuild = treatmentId === 'endo'
        ? buildEndoQuestions(dictation, userSettings ?? {})
        : null;

    const scopedUserAnswers = normalizeQuestionAnswers(tooth ? getScopedAnswers(answers, tooth) : answers);
    const scopedAnswers = new Map(scopedUserAnswers);

    // P3: Apply settings defaults as answers (if allowed by policy)
    const packContract = pack?.getUiContract?.();
    const settingsSchema = packContract?.settingsSchema;
    const askbackPolicy = packContract?.askbackPolicy;

    // Settings-aware material mention detection (brand names)
    if (treatmentId === 'fuellung') {
        const mentions = detectCatalogMentions(dictation, settingsInput);
        if ((facts.materialMentioned === 'unknown' || facts.materialMentioned === undefined) && mentions.composite) {
            (facts as Record<string, unknown>).materialMentioned = 'komposit';
            (facts as Record<string, unknown>).material = 'komposit';
        }
        if (mentions.bulk) {
            (facts as Record<string, unknown>).bulkMentioned = true;
        }
        if (mentions.flowable) {
            (facts as Record<string, unknown>).flowableMentioned = true;
        }
        if (mentions.adhesive) {
            (facts as Record<string, unknown>).adhesiveMentioned = true;
            if ((facts as Record<string, unknown>).adhesiveTechnique === undefined) {
                (facts as Record<string, unknown>).adhesiveTechnique = true;
            }
        }
        if (mentions.etch) {
            (facts as Record<string, unknown>).etchMentioned = true;
        }
    }
    const resolvedSettings = resolveSettings({
        settings: settingsInput,
        facts,
        tooth,
        askbackPolicy,
        settingsSchema,
    });

    const answerSources = new Map<string, FactSource>();
    const settingsFactSources = new Map<string, FactSource>();
    const addAnswerSource = (key: string, source: FactSource) => {
        const normalized = normalizeProvenanceKey(key);
        if (!normalized) return;
        if (source === 'user' || !answerSources.has(normalized)) {
            answerSources.set(normalized, source);
        }
    };
    for (const key of scopedUserAnswers.keys()) {
        addAnswerSource(key, 'user');
    }
    for (const [key] of resolvedSettings.answers) {
        addAnswerSource(key, 'settings');
    }
    for (const [factKey, source] of Object.entries(resolvedSettings.factsSource)) {
        settingsFactSources.set(
            normalizeProvenanceKey(factKey),
            source === 'practice' || source === 'user' ? 'settings' : 'default'
        );
    }

    facts = mergeSettingsFacts(facts, resolvedSettings.facts);

    // ═══ PROBE B1: Facts BEFORE answers merge ═══
    const factsBeforeAnswers = { ...facts };

    for (const [key, value] of resolvedSettings.answers) {
        if (!scopedAnswers.has(key)) {
            scopedAnswers.set(key, value);
        }
    }
    if (endoQuestionBuild) {
        const normalizedAnswers = new Map<string, unknown>();
        for (const [key, value] of scopedAnswers.entries()) {
            const normalized = normalizeAskbackId(key);
            if (!normalizedAnswers.has(normalized)) {
                normalizedAnswers.set(normalized, value);
            }
        }

        const seedEndoAlias = (
            normalizedKey: string,
            targets: string[],
            transform?: (value: unknown) => unknown
        ) => {
            const value = normalizedAnswers.get(normalizedKey);
            if (value === undefined) return;
            const finalValue = transform ? transform(value) : value;
            if (finalValue === undefined) return;
            for (const target of targets) {
                if (!scopedAnswers.has(target)) {
                    scopedAnswers.set(target, finalValue);
                }
            }
        };

        seedEndoAlias('wl_method', [
            'ENDO_T1_WORKING_LENGTH_METHOD',
            'ENDO_T2_WORKING_LENGTH_METHOD',
        ]);
        seedEndoAlias('irrigation', [
            'ENDO_T1_IRRIGATION',
            'ENDO_T2_IRRIGATION',
        ]);
        seedEndoAlias('medication', [
            'ENDO_T1_MEDICATION',
            'ENDO_T2_MEDICATION',
        ]);
        seedEndoAlias('wf_technique', ['ENDO_T3_OBTURATION_TECHNIQUE']);
        seedEndoAlias('kofferdam', ['ENDO_RUBBER_DAM']);
        seedEndoAlias('isolation', ['ENDO_RUBBER_DAM'], (value) => {
            const normalized = String(value).toLowerCase();
            if (normalized.includes('kofferdam') || normalized.includes('rubber') || normalized.includes('ja') || normalized.includes('yes') || normalized.includes('true')) {
                return 'Ja';
            }
            if (normalized.includes('nein') || normalized.includes('no') || normalized.includes('false') || normalized.includes('none')) {
                return 'Nein';
            }
            return undefined;
        });

        const overrides = deriveEndoAnswerOverrides(scopedAnswers);
        for (const [key, value] of Object.entries(overrides)) {
            if (!scopedAnswers.has(key)) {
                scopedAnswers.set(key, value);
            }
        }
        for (const key of Object.keys(overrides)) {
            addAnswerSource(key, 'inferred');
        }
    }
    facts = applyAnswers(facts, Object.fromEntries(scopedAnswers));
    if (facts.nurKasse === true) {
        (facts as Record<string, unknown>).mkvPresent = false;
        (facts as Record<string, unknown>).mehrkostenConfirmed = false;
        (facts as Record<string, unknown>).mehrkostenMentioned = false;
    }

    // Render-only labels (derived once from settings + facts)
    const renderLaAgent = formatLaAgentForDocumentation(getMaterialLabelById(
        getUserDefaultAnestheticAgentId(settingsInput?.user)
    ) ?? getMaterialLabelById(
        getPracticeDefaultAnestheticAgentId(settingsInput?.practice)
    ) ?? 'Ultracain D-S');
    const renderFillMaterial = (() => {
        const materialSource = settingsFactSources.get('material');
        const mentioned = (facts as any)?.materialMentioned;
        const isGenericComposite = (value: string | undefined) => {
            if (!value) return false;
            const normalized = normalizeMaterialToken(value);
            return normalized === 'komposit'
                || normalized === 'composite'
                || normalized === 'comp'
                || normalized === 'komp'
                || normalized === 'composite material'
                || normalized === 'komposit material';
        };
        const defaults = settingsInput?.user?.treatments?.fuellung;
        const wantsBulk = (facts as any)?.bulkMentioned === true;
        const wantsFlowable = (facts as any)?.flowableMentioned === true;
        const preferredId = wantsBulk
            ? defaults?.defaultBulkMaterialId
            : wantsFlowable
                ? defaults?.defaultFlowableMaterialId
                : defaults?.defaultCompositeMaterialId
                    ?? defaults?.defaultBulkMaterialId
                    ?? defaults?.defaultFlowableMaterialId;
        const preferredLabel = getMaterialLabelById(preferredId);
        if (
            typeof mentioned === 'string'
            && mentioned.trim()
            && mentioned !== 'unknown'
            && materialSource !== 'settings'
        ) {
            if (isGenericComposite(mentioned) && preferredLabel) {
                return preferredLabel;
            }
            return mentioned.trim();
        }
        const fallback = (facts as any)?.material;
        if (
            typeof fallback === 'string'
            && fallback.trim()
            && fallback !== 'unknown'
            && materialSource !== 'settings'
        ) {
            if (isGenericComposite(fallback) && preferredLabel) {
                return preferredLabel;
            }
            return fallback.trim();
        }
        return preferredLabel ?? 'Komposit';
    })();
    const renderAdhesiveMaterial = getMaterialLabelById(
        settingsInput?.user?.treatments?.fuellung?.defaultAdhesiveMaterialId
    ) ?? 'Adhäsiv';
    const renderEtchMaterial = getMaterialLabelById(
        settingsInput?.user?.treatments?.fuellung?.defaultEtchMaterialId
    ) ?? 'Ätzgel';
    const renderFlowableMaterial = getMaterialLabelById(
        settingsInput?.user?.treatments?.fuellung?.defaultFlowableMaterialId
    ) ?? 'Flowable';
    const renderBulkMaterial = getMaterialLabelById(
        settingsInput?.user?.treatments?.fuellung?.defaultBulkMaterialId
    ) ?? 'Bulk-Fill';
    const renderMatrixSystem = getMatrixSystemLabel(
        settingsInput?.user?.treatments?.fuellung?.defaultMatrixSystem
    ) ?? 'Matrix';
    const renderAufklaerungEnabled = settingsInput?.user?.treatments?.fuellung?.aufklaerungEnabled
        ?? settingsInput?.practice?.treatments?.fuellung?.aufklaerungEnabled;
    (facts as TreatmentFacts).render = {
        laAgent: renderLaAgent,
        fillMaterial: renderFillMaterial,
        adhesiveMaterial: renderAdhesiveMaterial,
        etchMaterial: renderEtchMaterial,
        flowableMaterial: renderFlowableMaterial,
        bulkMaterial: renderBulkMaterial,
        matrixSystem: renderMatrixSystem,
        aufklaerungEnabled: renderAufklaerungEnabled,
    };

    // ═══ PROBE B2: Facts AFTER answers merge ═══
    if (isDev && getNodeProcessEnv()?.DOCUDENT_DEBUG_PROBES === '1') {
        console.debug('[PROBE B] Facts Mapping', {
            instanceId,
            tooth,
            factsBeforeAnswers: {
                surfaces: factsBeforeAnswers.surfaces,
                cariesDepth: factsBeforeAnswers.cariesDepth,
                anesthesia: factsBeforeAnswers.anesthesia,
                capping: factsBeforeAnswers.capping,
            },
            scopedAnswersEntries: Object.fromEntries(scopedAnswers),
            factsAfterAnswers: {
                surfaces: facts.surfaces,
                cariesDepth: facts.cariesDepth,
                anesthesia: facts.anesthesia,
                capping: facts.capping,
                cappingMaterial: facts.capping?.material,
            },
        });
    }

    const effectiveInsuranceType = deriveEffectiveInsuranceType(
        insuranceType as 'GKV' | 'PKV' | 'MKV',
        facts
    );

    (facts as Record<string, unknown>).insuranceType = effectiveInsuranceType;

    // Step 4: Run medical engine (M6)
    const engineResult = applyMedicalKb({
        facts: facts as unknown as Record<string, unknown>,
        treatmentId,
        instanceScope: tooth ? { tooth } : undefined,
        allowChipEmission: false,
        kbOverride: medicalKbV10,
    });

    let procedureRequiredAskbacks: string[] = [];
    let procedureOptionalAskbacks: string[] = [];

    const procedureEmitterMap = new Map<string, string>();
    const procedureDisclosureIds = new Set<string>();
    const procedureBillingChipIds = new Set<string>();
    const procedureFacts: ProcedureFacts = {
        global: { insuranceType: effectiveInsuranceType },
        instances: [
            {
                instanceId,
                tooth,
                facts: facts as unknown as Record<string, unknown>,
            },
        ],
    };
    const procedureGraph = getProcedureGraphForTreatment(treatmentId);
    if (procedureGraph) {
        const contractContext = resolveContractContext({
            facts: procedureFacts,
            settings: settingsInput,
            treatmentId,
            tooth,
            kbReleaseId,
        });
        const bundleMetaMap = getBundleMetaMap(treatmentId);
        const resolveBundleChips = (nodeId: string, node: { emitChips?: string[]; emitChipsFrom?: (facts: Record<string, unknown>, contract: typeof contractContext) => string[] }) => {
            const meta = bundleMetaMap?.get(nodeId);
            const chipsFromMeta: string[] = [];
            if (meta?.chipIds?.length) {
                chipsFromMeta.push(...meta.chipIds);
            }
            if (meta?.textRefIds?.length) {
                chipsFromMeta.push(...meta.textRefIds);
            }
            if (meta?.disclosureIds?.length) {
                for (const disclosureId of meta.disclosureIds) {
                    if (disclosureId) procedureDisclosureIds.add(disclosureId);
                }
            }
            if (meta?.chipsFromContractKey) {
                const value = (contractContext.values as Record<string, unknown> | undefined)?.[meta.chipsFromContractKey];
                if (Array.isArray(value)) {
                    chipsFromMeta.push(...value.filter(Boolean).map(String));
                }
            }
            if (chipsFromMeta.length > 0) {
                return Array.from(new Set(chipsFromMeta));
            }
            const staticChips = node.emitChips ?? [];
            const dynamicChips = node.emitChipsFrom
                ? node.emitChipsFrom(facts as Record<string, unknown>, contractContext)
                : [];
            return [...staticChips, ...dynamicChips];
        };
        const collectBillingRefsFromMeta = (nodeId: string) => {
            const meta = bundleMetaMap?.get(nodeId);
            if (meta?.billingRefIds?.length) {
                for (const id of meta.billingRefIds) {
                    if (id) procedureBillingChipIds.add(id);
                }
            }
            if (meta?.chipsFromContractKey) {
                const value = (contractContext.values as Record<string, unknown> | undefined)?.[meta.chipsFromContractKey];
                if (Array.isArray(value)) {
                    for (const id of value) {
                        if (id) procedureBillingChipIds.add(String(id));
                    }
                }
            }
        };
        const procedureMatch = matchProcedureGraph(
            facts as unknown as Record<string, unknown>,
            contractContext,
            procedureGraph
        );
        procedureRequiredAskbacks = procedureMatch.requiredAskbacks;
        procedureOptionalAskbacks = procedureMatch.optionalAskbacks;
        const nodeMap = new Map(procedureGraph.nodes.map(node => [node.id, node]));
        for (const nodeId of procedureMatch.matchedNodeIds) {
            const node = nodeMap.get(nodeId);
            if (!node) continue;
            collectBillingRefsFromMeta(nodeId);
            for (const chipId of resolveBundleChips(nodeId, node)) {
                if (!chipId) continue;
                const existing = procedureEmitterMap.get(chipId);
                if (!existing) {
                    procedureEmitterMap.set(chipId, `node:${nodeId}`);
                }
            }
        }
        for (const nodeId of procedureMatch.matchedNodeIds) {
            const node = nodeMap.get(nodeId);
            if (!node?.constraints?.length) continue;
            for (const constraint of node.constraints) {
                if (constraint.type === 'forbid_chip') {
                    if (constraint.chipId === 'cp' || constraint.chipId === 'p') continue;
                    if (procedureEmitterMap.has(constraint.chipId)) {
                        procedureEmitterMap.delete(constraint.chipId);
                    }
                }
            }
        }
        if (procedureEmitterMap.has('cp') && procedureEmitterMap.has('p')) {
            const keepDirect = (facts as { pulpaOpened?: boolean } | undefined)?.pulpaOpened === true;
            const removeId = keepDirect ? 'cp' : 'p';
            procedureEmitterMap.delete(removeId);
        }
    }

    const augmentedChips = [...procedureEmitterMap.keys()];

    // Step 4b: Procedure nodes are SSOT for chip emission (no legacy augmentation).
    // GP7: Cp/P chip emission is SSOT via Procedure nodes.

    // Override engineResult.emittedChips with augmented list
    const finalEngineResult = {
        ...engineResult,
        emittedChips: augmentedChips,
    };

    const mergedChipIds = [...finalEngineResult.emittedChips];

    const chipEmitterLookup = new Map<string, string>();
    for (const [chipId, emitter] of procedureEmitterMap.entries()) {
        chipEmitterLookup.set(chipId, emitter);
    }
    const chipProvenance = mergedChipIds.map(chipId => ({
        chipId,
        ruleId: chipEmitterLookup.get(chipId) ?? 'engine:unattributed',
        sourceRefs: [],
    }));

    const clinicalObligationResult = evaluateClinicalObligations({
        treatmentId,
        facts: facts as TreatmentFacts,
        strictKzvMode: settingsInput?.practice?.strictKzvMode === true,
    });

    const reasonedAskbackHints = deriveReasonedAskbackHints(extracted as Record<string, unknown>, facts as TreatmentFacts);

    const requiredAskbacks = mergeRequiredAskbacks(
        engineResult.requiredAskbacks,
        procedureRequiredAskbacks,
        clinicalObligationResult.requiredAskbacks,
        reasonedAskbackHints.required
    );

    const requiredNormalized = new Set(requiredAskbacks.map(a => normalizeAskbackId(a)));
    const optionalAskbacks: string[] = [];
    const optionalSeen = new Set<string>();
    const pushOptional = (id: string) => {
        if (!id) return;
        const normalized = normalizeAskbackId(id);
        if (requiredNormalized.has(normalized)) return;
        if (optionalSeen.has(normalized)) return;
        optionalSeen.add(normalized);
        optionalAskbacks.push(id);
    };
    for (const id of engineResult.optionalAskbacks ?? []) {
        pushOptional(id);
    }
    for (const id of procedureOptionalAskbacks ?? []) {
        pushOptional(id);
    }
    for (const id of reasonedAskbackHints.optional ?? []) {
        pushOptional(id);
    }

    const filterKnownAskbacks = (ids: string[]) =>
        ids.filter(id => !isFactKnownForAskback(id, facts as TreatmentFacts));

    const filteredRequiredAskbacks = orderAskbacksDeterministically(
        filterKnownAskbacks(requiredAskbacks),
        reasonedAskbackHints.priorities
    );
    const filteredOptionalAskbacks = orderAskbacksDeterministically(
        filterKnownAskbacks(optionalAskbacks),
        reasonedAskbackHints.priorities
    );

    const askbackQuestions = buildQuestionsFromAskbacks({
        required: filteredRequiredAskbacks,
        optional: filteredOptionalAskbacks,
    });

    // Step 5: Generate questions (endo uses playbook adapter, others use KB askbacks)
    const allQuestions = dedupeQuestionsBySemanticKey(endoQuestionBuild
        ? mergeQuestionsById(endoQuestionBuild.questions, askbackQuestions)
        : askbackQuestions);

    const settingsAnswerKeys = new Set(resolvedSettings.answers.keys());
    const settingsSkipKeys = new Set(resolvedSettings.skippedAskbacks);
    const normalizedSettingsAnswerKeys = new Set(
        Array.from(settingsAnswerKeys).map(key => normalizeAskbackId(key))
    );
    const normalizedSettingsSkipKeys = new Set(
        Array.from(settingsSkipKeys).map(key => normalizeAskbackId(key))
    );
    const shouldFilterQuestions = settingsAnswerKeys.size > 0 || settingsSkipKeys.size > 0;

    const filteredQuestions = shouldFilterQuestions
        ? allQuestions.filter(q => {
            const baseId = stripToothScope(q.id);
            const questionKey = q.questionKey ?? baseId.replace(/^medical_/, '');
            const variants = [
                q.id,
                baseId,
                questionKey,
                `medical_${questionKey}`,
            ];
            if (variants.some(v => settingsAnswerKeys.has(v) || settingsSkipKeys.has(v))) {
                return false;
            }
            const normalizedKey = normalizeAskbackId(questionKey);
            return !(
                normalizedSettingsAnswerKeys.has(normalizedKey)
                || normalizedSettingsSkipKeys.has(normalizedKey)
            );
        })
        : allQuestions;

    const scopedQuestions = tooth
        ? filteredQuestions.map(q => {
            if (!q.id) return q;
            return q.id.includes('::tooth:')
                ? q
                : { ...q, id: withToothScope(q.id, tooth) };
        })
        : filteredQuestions;

    const ensureAnsweredHardQuestion = (questionId: string, factValue?: string) => {
        if (factValue !== undefined && factValue !== 'unknown') return;
        const baseKey = questionId.replace(/^medical_/, '');
        const variants = [questionId, baseKey];
        if (variants.some(key => scopedAnswers.has(key))) return;
        scopedAnswers.set(questionId, 'unknown');
        scopedAnswers.set(baseKey, 'unknown');
        if (tooth) {
            scopedAnswers.set(withToothScope(questionId, tooth), 'unknown');
            scopedAnswers.set(withToothScope(baseKey, tooth), 'unknown');
        }
    };

    ensureAnsweredHardQuestion('medical_vitality', facts.vitality);
    ensureAnsweredHardQuestion('medical_percussion', facts.percussion);

    const strictnessFilteredQuestions = docMode === 'forensic'
        ? scopedQuestions
        : scopedQuestions.filter(q => !(q.category === 'forensic' && q.medicalSeverity !== 'hard'));

    const effectiveBundle = buildQuestionBundleFromQuestions(strictnessFilteredQuestions, docMode);

    // Check for unanswered required questions
    const normalizedAnswerKeys = new Set(
        Array.from(scopedAnswers.keys()).map(key => normalizeAskbackId(key))
    );
    const hasUnansweredRequired = effectiveBundle.required.some(q => {
        const baseId = stripToothScope(q.id);
        const scopedId = tooth ? withToothScope(baseId, tooth) : baseId;
        const questionKey = q.questionKey ?? baseId.replace(/^medical_/, '');
        const variants = [
            q.id,
            baseId,
            scopedId,
            questionKey,
            `medical_${questionKey}`,
            `forensic_${questionKey}`,
            `rule_${questionKey}`,
            `mkv_${questionKey}`,
            `upsell_${questionKey}`,
        ];

        const isAnswered = variants.some(v => v && scopedAnswers.has(v))
            || normalizedAnswerKeys.has(normalizeAskbackId(questionKey));
        return !isAnswered;
    });

    // Build trace
    const trace: V10InstanceTrace = {
        tooth,
        extractedSummary: {
            tooth: (extracted as any).tooth ?? null,
            surfaces: (extracted as any).surfaces ?? [],
            diagnosis: (extracted as any).diagnosis ?? null,
        },
        facts: {
            treatmentId: facts.treatmentId,
            cariesDepth: facts.cariesDepth,
            capping: facts.capping,
            bleeding: facts.bleeding,
            sensitivity: facts.sensitivity,
        },
        ruleHits: engineResult.trace.firedRules,
        askbacks: {
            required: filteredRequiredAskbacks,
            optional: filteredOptionalAskbacks,
        },
        chips: mergedChipIds,
        renderedChipIds: mergedChipIds,
    };

    const chipEmitters: Record<string, string> = {};
    for (const chipId of mergedChipIds) {
        const emitter = chipEmitterLookup.get(chipId);
        if (emitter) {
            chipEmitters[chipId] = emitter;
        }
    }

    const engineAskbackProvenance = engineResult.trace.requiredAskbacks.map(a => ({
        askbackId: a.id,
        ruleId: a.ruleId,
        sourceRefs: a.sourceRefs,
    }));
    const obligationAskbackProvenance = clinicalObligationResult.checks
        .filter(check => check.outcome === 'not_done')
        .map(check => ({
            askbackId: check.askbackId,
            ruleId: `obligation:${check.obligationId}`,
            sourceRefs: [] as SourceRef[],
        }));
    const askbackProvenance = new Map<string, {
        askbackId: string;
        ruleId: string;
        sourceRefs: SourceRef[];
    }>();
    const mergeSourceRefs = (left: SourceRef[], right: SourceRef[]): SourceRef[] => {
        const merged = [...left];
        const seen = new Set(
            left.map(ref => `${ref.sourceId}|${ref.anchorId}|${ref.note ?? ''}`)
        );
        for (const ref of right) {
            const key = `${ref.sourceId}|${ref.anchorId}|${ref.note ?? ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(ref);
        }
        return merged;
    };
    const reasonedAskbackProvenance = reasonedAskbackHints.provenance.map(entry => ({
        askbackId: entry.askbackId,
        ruleId: entry.ruleId,
        sourceRefs: [] as SourceRef[],
    }));

    for (const entry of [...engineAskbackProvenance, ...obligationAskbackProvenance, ...reasonedAskbackProvenance]) {
        const normalized = normalizeAskbackId(entry.askbackId);
        const existing = askbackProvenance.get(normalized);
        if (!existing) {
            askbackProvenance.set(normalized, entry);
            continue;
        }
        const preferObligationRule =
            entry.ruleId.startsWith('obligation:')
            || existing.ruleId.startsWith('obligation:');
        askbackProvenance.set(normalized, {
            askbackId: existing.askbackId,
            ruleId: preferObligationRule
                ? (entry.ruleId.startsWith('obligation:') ? entry.ruleId : existing.ruleId)
                : existing.ruleId,
            sourceRefs: mergeSourceRefs(existing.sourceRefs, entry.sourceRefs),
        });
    }

    return {
        instanceId,
        teeth,
        tooth,
        facts,
        askbacksRequired: effectiveBundle.required.map(q => q.id),
        askbacksOptional: [
            ...effectiveBundle.optionalVisible.map(q => q.id),
            ...effectiveBundle.optionalHidden.map(q => q.id),
        ],
        chips: mergedChipIds,
        chipEmitters,
        // Tag questions with instanceId for proper binding
        questions: strictnessFilteredQuestions.map(q => ({
            ...q,
            instanceId,  // Tag each question with its instance
        })),
        questionBundle: effectiveBundle,
        trace,
        hasUnansweredRequired,
        // M15 + GAP-33: Provenance from engine + centralized obligations
        askbackProvenance: Array.from(askbackProvenance.values()),
        chipProvenance,
        answerSources,
        settingsFactSources,
        clinicalObligations: clinicalObligationResult.checks.map(check => ({
            ...check,
            instanceId,
            tooth,
        })),
        disclosureIds: Array.from(procedureDisclosureIds),
        billingChipIds: Array.from(procedureBillingChipIds),
    };
}

/**
 * Get answers scoped to a specific tooth.
 */
function getScopedAnswers(answers: Map<string, unknown>, tooth: string): Map<string, unknown> {
    const scoped = new Map<string, unknown>();

    for (const [key, value] of answers) {
        // Check if this answer is for this tooth
        const toothMatch = key.match(/::tooth:(\d+)$/);
        if (toothMatch) {
            if (toothMatch[1] === tooth) {
                // Scoped answer for this tooth
                scoped.set(stripToothScope(key), value);
            }
            // Skip answers for other teeth
        } else {
            // Unscoped answer applies to all
            scoped.set(key, value);
        }
    }

    return scoped;
}

function fieldFromValue<T>(value: T | null | undefined): ReturnType<typeof createField<T>> {
    if (value === null || value === undefined) {
        return unknownField<T>();
    }
    return createField(value, 1.0);
}

function buildExtractedV2(extracted: Record<string, any>): ExtractedDataV2 {
    const rawDictation = (extracted.rawDictation ?? '') as string;
    const normalized = rawDictation;
    const mentioned = extracted.mentioned ?? {};

    const anesthesiaRawValue =
        extracted.anesthesia ??
        extracted.la_type ??
        mentioned.anesthesia?.type ??
        mentioned.anesthesia;
    const anesthesiaRaw = typeof anesthesiaRawValue === 'string' ? anesthesiaRawValue : '';
    const anesthesiaType =
        anesthesiaRaw.includes('leitung') ? 'leitung'
            : anesthesiaRaw.includes('infiltr') ? 'infiltr'
                : anesthesiaRaw.includes('keine') || anesthesiaRaw.includes('none') ? 'keine'
                    : 'unknown';

    const cappingRawValue = mentioned.capping?.type ?? mentioned.capping;
    const cappingRaw = typeof cappingRawValue === 'string' ? cappingRawValue : '';
    const cappingType =
        cappingRaw.includes('cp') || cappingRaw.includes('indirekt') ? 'cp'
            : cappingRaw.includes('p') || cappingRaw.includes('direkt') ? 'p'
                : cappingRaw.includes('none') || cappingRaw.includes('keine') ? 'none'
                    : 'unknown';

    const materialRaw = mentioned.material ?? null;
    const vitalityRaw = mentioned.vitality ?? null;
    const percussionRaw = mentioned.percussion ?? null;

    const tiefeRaw = mentioned.tiefe ?? (
        rawDictation.toLowerCase().includes('profunda') ||
            rawDictation.toLowerCase().includes('pulpanah') ||
            rawDictation.toLowerCase().includes('tief')
            ? 'tief'
            : (rawDictation.toLowerCase().includes('media') || rawDictation.toLowerCase().includes('normal'))
                ? 'normal'
                : 'unknown'
    );

    const keywordFlags = {
        saidDeepCavity: /profunda|pulpanah|tief/i.test(rawDictation),
        saidSuperficial: /superficialis|oberflä|oberflae/i.test(rawDictation),
        saidFracture: /fraktur|abgebroch|ecke fehlt/i.test(rawDictation),
        saidCaries: /karies|caries|media/i.test(rawDictation),
    };

    const surfacesValue = Array.isArray(extracted.surfaces) ? extracted.surfaces : [];

    return {
        tooth: fieldFromValue<string>(extracted.tooth ?? null),
        surfaces: surfacesValue.length > 0 ? fieldFromValue(surfacesValue as Surface[]) : unknownField<Surface[]>(),
        costs: fieldFromValue<number>(typeof extracted.costs === 'number' ? extracted.costs : null),
        mentioned: {
            anesthesia: fieldFromValue({
                present: anesthesiaType !== 'unknown',
                type: anesthesiaType,
            }),
            kofferdam: fieldFromValue<boolean>(typeof mentioned.kofferdam === 'boolean' ? mentioned.kofferdam : null),
            tiefe: fieldFromValue(tiefeRaw as any),
            vitality: fieldFromValue(vitalityRaw as any),
            percussion: fieldFromValue(percussionRaw as any),
            capping: fieldFromValue({
                present: cappingType !== 'unknown' && cappingType !== 'none',
                type: cappingType,
                material: materialRaw ?? 'unknown',
            }),
            material: fieldFromValue(materialRaw as any),
        },
        keywordFlags,
        raw: {
            dictation: rawDictation,
            normalized,
        },
    };
}

function normalizeQuestionAnswers(answers: Map<string, unknown>): Map<string, unknown> {
    const normalized = new Map(answers);
    const prefixes = ['medical_', 'forensic_', 'rule_', 'mkv_', 'upsell_'];

    const stripPrefixes = (key: string): string => {
        for (const prefix of prefixes) {
            if (key.startsWith(prefix)) {
                return key.slice(prefix.length);
            }
        }
        return key;
    };

    for (const [key, value] of answers) {
        for (const prefix of prefixes) {
            if (key.startsWith(prefix)) {
                const baseKey = key.slice(prefix.length);
                if (!normalized.has(baseKey)) {
                    normalized.set(baseKey, value);
                }
            }
        }
    }

    const synonyms: Record<string, string> = {
        vipr: 'vitality',
        perk: 'percussion',
        perkussion: 'percussion',
    };

    for (const [key, value] of Array.from(normalized.entries())) {
        const withoutPrefix = stripPrefixes(key);
        const suffixMatch = withoutPrefix.match(/(::tooth:\d+)$/);
        const suffix = suffixMatch ? suffixMatch[1] : '';
        const base = suffixMatch ? withoutPrefix.slice(0, -suffix.length) : withoutPrefix;
        const target = synonyms[base];
        if (!target) continue;

        const targetKey = `${target}${suffix}`;
        if (!normalized.has(targetKey)) {
            normalized.set(targetKey, value);
        }

        const prefixedTarget = `medical_${target}${suffix}`;
        if (!normalized.has(prefixedTarget)) {
            normalized.set(prefixedTarget, value);
        }
    }

    return normalized;
}

function normalizeProvenanceKey(key: string): string {
    let normalized = stripToothScope(key);
    if (normalized.includes('::')) {
        normalized = normalized.split('::').pop() ?? normalized;
    }
    const prefixMatch = normalized.match(/^(medical|forensic|rule|mkv|upsell)_(.+)$/);
    const base = prefixMatch ? prefixMatch[2] : normalized;
    return base
        .replace(/^fuellung_/, '')
        .replace(/^endo_/, '')
        .replace(/^askback-/, '')
        .replace(/^ab_/, '')
        .replace(/-/g, '_');
}

function inferFactKeysForAskback(askbackId: string): string[] {
    const key = normalizeProvenanceKey(askbackId);
    switch (key) {
        case 'la_type':
            return ['anesthesia', 'la_type'];
        case 'vitality':
            return ['vitality'];
        case 'percussion':
            return ['percussion'];
        case 'isolation':
        case 'kofferdam':
            return ['kofferdamUsed', 'isolationMentioned', 'endo.kofferdam'];
        case 'roentgen_indikation':
        case 'radiology_indication':
            return ['radiology.indication'];
        case 'roentgen_typ':
        case 'radiology_type':
            return ['radiology.type'];
        case 'roentgen_zeitpunkt':
        case 'radiology_timing':
            return ['radiology.timing'];
        case 'roentgen_befund':
        case 'radiology_findings':
            return ['radiology.findings'];
        case 'ueberkappung':
        case 'pulpaschutz':
            return ['capping.performed', 'pulpaOpened'];
        case 'ueberkappung_material':
            return ['capping.material'];
        case 'fissuren_indikation':
            return ['fissurenversiegelung.indication'];
        case 'fissuren_material':
            return ['fissurenversiegelung.material'];
        case 'wl_method':
            return ['endo.workingLengthMethod'];
        case 'wf_technique':
            return ['endo.wfTechnique'];
        case 'irrigation':
            return ['endo.irrigationSolutions'];
        case 'medication':
            return ['endo.medication'];
        case 'canal_count':
            return ['endo.canalCount'];
        case 'layering':
            return ['layeringMentioned'];
        case 'adhesive':
        case 'adhesive_technique':
            return ['adhesiveTechnique'];
        case 'material':
            return ['material', 'materialMentioned'];
        case 'wound_care':
            return ['woundCare'];
        case 'untersuchung_anlass':
            return ['untersuchung.reason'];
        case 'untersuchung_befunde':
            return ['untersuchung.findings'];
        case 'untersuchung_beurteilung':
            return ['untersuchung.assessment'];
        case 'pzr_zahnstein':
            return ['pzr.zahnsteinEntfernung'];
        case 'pzr_fluoridation':
            return ['pzr.fluoridation'];
        case 'parodontologie_phase':
            return ['parodontologie.phase'];
        case 'parodontologie_upt_grad':
            return ['parodontologie.uptGrade'];
        case 'upt_grad':
            return ['upt.grade'];
        case 'upt_intervall':
            return ['upt.interval'];
        case 'krone_art':
            return ['krone.type'];
        case 'krone_eingliederung':
            return ['krone.placement'];
        case 'teilkrone_art':
            return ['teilkrone.type'];
        case 'teilkrone_eingliederung':
            return ['teilkrone.placement'];
        case 'bruecke_typ':
            return ['bruecke.type'];
        case 'bruecke_phase':
            return ['bruecke.phase'];
        case 'trauma_art':
            return ['trauma.art'];
        case 'trauma_schienung':
            return ['trauma.schienung'];
        case 'trauma_kontrolle':
            return ['trauma.kontrolle'];
        case 'implant_phase':
            return ['implant.phase'];
        case 'implant_nachsorge':
            return ['implant.nachsorge'];
        case 'schiene_typ':
            return ['schiene.type'];
        case 'schiene_phase':
            return ['schiene.phase'];
        case 'teilprothese_typ':
            return ['teilprothese.type'];
        case 'teilprothese_phase':
            return ['teilprothese.phase'];
        case 'totalprothese_typ':
            return ['totalprothese.type'];
        case 'totalprothese_phase':
            return ['totalprothese.phase'];
        case 'wsr_zugang':
            return ['wsr.zugang'];
        case 'wsr_lokalisation':
            return ['wsr.lokalisation'];
        case 'mkv_justification':
            return ['mkvJustification'];
        case 'mkv_confirmed':
            return ['mehrkostenConfirmed', 'mehrkostenMentioned', 'nurKasse', 'mkvBetrag'];
        default:
            return key ? [`askback:${key}`] : [];
    }
}

function buildQuestionBundleFromQuestions(questions: DynamicQuestion[], docMode: DocMode): QuestionBundle {
    const required = questions.filter(q => q.medicalSeverity === 'hard');
    const optional = questions.filter(q => q.medicalSeverity !== 'hard');

    const presented = presentQuestions({
        required,
        optional,
        options: { docMode },
    });

    return { ...presented, docMode };
}

function getCombinabilityOverrideAction(results: InstanceResult[]): 'allow' | 'drop_blocked' | undefined {
    for (const result of results) {
        const override = (result.facts as TreatmentFacts | undefined)?.combinabilityOverride;
        if (override?.action) {
            return override.action;
        }
    }
    return undefined;
}

function buildCombinabilityOverrideQuestions(
    conflicts: CombinabilityCheckResult['conflicts']
): DynamicQuestion[] {
    const primary = conflicts[0];
    const reason = primary?.reason ? String(primary.reason) : 'Abrechnungskonflikt';
    const codes = primary?.codesInvolved?.length ? ` (${primary.codesInvolved.join(' + ')})` : '';
    return [
        {
            id: 'rule_combinability_override',
            questionKey: 'combinability_override',
            category: 'rule',
            question: `Es gibt einen Abrechnungskonflikt: ${reason}${codes}. Wie soll fortgefahren werden?`,
            type: 'single',
            options: [
                { id: 'drop_blocked', label: 'Konfliktcodes nicht abrechnen (nur dokumentieren)' },
                { id: 'allow', label: 'Trotz Konflikt abrechnen (manuelle Entscheidung)' },
            ],
            ruleId: primary?.ruleId ?? 'combinability',
            regressRisk: true,
            medicalSeverity: 'hard',
        },
    ];
}

interface ParamControlMapping {
    controlId: string;
    chipIds: string[];
    valueToChipId: Record<string, string>;
}

function getParamControlMappings(contract?: PackUiContractV1): ParamControlMapping[] {
    if (!contract) return [];
    const mappings: ParamControlMapping[] = [];

    for (const control of contract.chipControls ?? []) {
        if (control.mode !== 'param') continue;
        if (!control.chipMapping) continue;
        mappings.push({
            controlId: control.chipId,
            chipIds: Object.values(control.chipMapping),
            valueToChipId: control.chipMapping,
        });
    }

    return mappings;
}

function applyChipOverridesToChips(
    baseChips: string[],
    overrides: ChipOverridesMap | undefined,
    contract?: PackUiContractV1
): { chips: string[]; added: Set<string>; removed: Set<string> } {
    if (!overrides || Object.keys(overrides).length === 0) {
        return { chips: baseChips, added: new Set(), removed: new Set() };
    }

    const baseSet = new Set(baseChips);
    const chipSet = new Set(baseChips);
    const added = new Set<string>();
    const removed = new Set<string>();

    const paramMappings = getParamControlMappings(contract);
    const paramMappingById = new Map(paramMappings.map(m => [m.controlId, m]));
    const paramControlIds = new Set(paramMappings.map(m => m.controlId));

    // Apply param controls first (they map to multiple chips)
    for (const [controlId, override] of Object.entries(overrides)) {
        if (!paramControlIds.has(controlId)) continue;
        if (!override || override.mode === 'auto') continue;
        const mapping = paramMappingById.get(controlId);
        if (!mapping) continue;

        // Turn all mapped chips off first
        for (const chipId of mapping.chipIds) {
            if (chipSet.delete(chipId)) {
                removed.add(chipId);
            }
        }

        if (override.mode === 'on') {
            const value = String(override.value ?? '');
            const selectedChip = mapping.valueToChipId[value];
            if (selectedChip && !chipSet.has(selectedChip)) {
                chipSet.add(selectedChip);
                if (!baseSet.has(selectedChip)) {
                    added.add(selectedChip);
                }
            }
        }
    }

    // Apply direct chip overrides second (most specific)
    for (const [chipId, override] of Object.entries(overrides)) {
        if (paramControlIds.has(chipId)) continue;
        if (!override || override.mode === 'auto') continue;

        if (override.mode === 'on') {
            if (!chipSet.has(chipId)) {
                chipSet.add(chipId);
                if (!baseSet.has(chipId)) {
                    added.add(chipId);
                }
            }
        } else if (override.mode === 'off') {
            if (chipSet.delete(chipId)) {
                removed.add(chipId);
            }
        }
    }

    // Preserve original order, then append new chips deterministically
    const finalChips = baseChips.filter(id => chipSet.has(id));
    const addedList = [...added].filter(id => !finalChips.includes(id)).sort();
    finalChips.push(...addedList);

    return { chips: finalChips, added, removed };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasMeaningfulValue(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

function normalizeHintMentionedValue(value: unknown): unknown {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
        const normalized = value
            .map(item => normalizeHintMentionedValue(item))
            .filter(item => item !== undefined);
        return normalized.length > 0 ? normalized : undefined;
    }
    if (isRecord(value)) return value;
    return undefined;
}

function mergeHintMentioned(
    mentioned: Record<string, unknown>,
    source: Record<string, unknown>,
    appliedKeys: string[]
): void {
    for (const [key, rawValue] of Object.entries(source)) {
        const normalized = normalizeHintMentionedValue(rawValue);
        if (normalized === undefined) continue;
        if (hasMeaningfulValue(mentioned[key])) continue;
        mentioned[key] = normalized;
        appliedKeys.push(`mentioned.${key}`);
    }
}

function mergePreanalysisHintsIntoExtraction(
    extracted: Record<string, unknown>,
    hints: V10PipelineInput['preanalysisHints'] | undefined
): { extracted: Record<string, unknown>; appliedKeys: string[] } {
    if (!hints) return { extracted, appliedKeys: [] };
    const appliedKeys: string[] = [];
    const next = { ...extracted };
    const mentioned = isRecord(next.mentioned) ? { ...next.mentioned as Record<string, unknown> } : {};

    if (isRecord(hints.mentioned)) {
        mergeHintMentioned(mentioned, hints.mentioned, appliedKeys);
    }

    if (isRecord(hints.sharedFacts)) {
        const shared = hints.sharedFacts;
        const documentationContext = buildDocumentationContextFromExtraction(next as Record<string, unknown>);
        const mappedMentioned: Record<string, unknown> = {};
        if (shared.workingLength !== undefined) mappedMentioned.working_length = shared.workingLength;
        if (shared.workingLengthMethod !== undefined) mappedMentioned.wl_method = shared.workingLengthMethod;
        if (shared.wfTechnique !== undefined) mappedMentioned.wf_technique = shared.wfTechnique;
        if (shared.canalCount !== undefined) mappedMentioned.root_canals = shared.canalCount;
        if (shared.irrigationSolutions !== undefined) mappedMentioned.irrigation_solutions = shared.irrigationSolutions;
        if (shared.medication !== undefined) mappedMentioned.endo_medication = shared.medication;
        if (shared.tempClosure !== undefined) mappedMentioned.temp_closure = shared.tempClosure;
        if (shared.step !== undefined) mappedMentioned.endo_step = shared.step;
        if (shared.phase !== undefined) mappedMentioned.endo_phase = shared.phase;
        if (Object.keys(mappedMentioned).length > 0) {
            mergeHintMentioned(mentioned, mappedMentioned, appliedKeys);
        }

        if (!hasMeaningfulValue(next.tooth) && typeof shared.tooth === 'string' && shared.tooth.trim().length > 0) {
            next.tooth = shared.tooth.trim();
            appliedKeys.push('tooth');
        }
        if (!hasMeaningfulValue(next.surfaces) && Array.isArray(shared.surfaces) && shared.surfaces.length > 0) {
            next.surfaces = [...shared.surfaces];
            appliedKeys.push('surfaces');
        }

        const forensicNotes = collectSharedForensicNotes(shared);
        if (mergeNotesIntoDocumentationContext(documentationContext, 'forensicNotes', forensicNotes)) {
            appliedKeys.push('patientenangaben');
        }
        const unresolvedNotes = collectSharedUnresolvedNotes(shared);
        if (mergeNotesIntoDocumentationContext(documentationContext, 'unresolved', unresolvedNotes)) {
            appliedKeys.push('reasoning.unresolved');
        }

        for (const [sharedKey, sharedValue] of Object.entries(shared)) {
            const mapping = resolveDocumentationContextMapping(sharedKey);
            if (!mapping) continue;
            const notes = buildLabeledContextNotes(mapping, sharedValue);
            if (mergeNotesIntoDocumentationContext(documentationContext, mapping.bucket, notes)) {
                appliedKeys.push(mapping.target);
            }
        }
        appliedKeys.push(...syncDocumentationContextToExtraction(next as Record<string, unknown>, documentationContext));
    }

    if (!hasMeaningfulValue(mentioned.endo_step) && typeof hints.step === 'string' && hints.step.trim().length > 0) {
        mentioned.endo_step = hints.step.trim();
        appliedKeys.push('mentioned.endo_step');
    }
    if (!hasMeaningfulValue(mentioned.endo_phase) && typeof hints.phase === 'string' && hints.phase.trim().length > 0) {
        mentioned.endo_phase = hints.phase.trim();
        appliedKeys.push('mentioned.endo_phase');
    }
    if (!hasMeaningfulValue(next.tooth) && typeof hints.tooth === 'string' && hints.tooth.trim().length > 0) {
        next.tooth = hints.tooth.trim();
        appliedKeys.push('tooth');
    }

    if (Object.keys(mentioned).length > 0) {
        next.mentioned = mentioned;
    }

    return { extracted: next, appliedKeys: Array.from(new Set(appliedKeys)) };
}

async function maybeComposeForensicSections(input: {
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
    sections: ForensicComposeSection[];
    context?: {
        instanceCount?: number;
        unresolvedForensicHints?: string[];
        documentationContext?: {
            clinical?: string[];
            patient?: string[];
            administrative?: string[];
            forensicNotes?: string[];
        };
    };
}): Promise<{
    enabled: boolean;
    sections: ForensicComposeSection[];
    applied: boolean;
    error?: string;
}> {
    const enabled = isForensicComposerEnabled();
    if (!enabled) {
        return {
            enabled: false,
            sections: input.sections,
            applied: false,
        };
    }

    try {
        const composed = await composeForensicDocumentation({
            treatmentId: input.treatmentId,
            insuranceType: input.insuranceType,
            textLength: input.textLength,
            sections: input.sections,
            context: input.context,
        });
        if (Array.isArray(composed) && composed.length === input.sections.length) {
            const source = input.sections.map(section => section.content).join('\n\n');
            const target = composed.map(section => section.content).join('\n\n');
            if (target.trim().length > 0 && target !== source) {
                return {
                    enabled,
                    sections: composed,
                    applied: true,
                };
            }
            return {
                enabled,
                sections: input.sections,
                applied: false,
            };
        }
        return {
            enabled,
            sections: input.sections,
            applied: false,
        };
    } catch (error) {
        return {
            enabled,
            sections: input.sections,
            applied: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function maybeRefineFinalOutputText(input: {
    text: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
}): Promise<{ text: string; applied: boolean; error?: string }> {
    try {
        const refined = await refineDocumentationText({
            text: input.text,
            treatmentId: input.treatmentId,
            insuranceType: input.insuranceType,
            textLength: input.textLength,
        });
        if (typeof refined === 'string' && refined.trim().length > 0 && refined !== input.text) {
            return { text: refined, applied: true };
        }
        return { text: input.text, applied: false };
    } catch (error) {
        return {
            text: input.text,
            applied: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

function resolveRequireLlmExtraction(requireFromInput: boolean | undefined): boolean {
    if (requireFromInput === true) return true;
    const env = getNodeProcessEnv();
    const requireFromEnv = env?.DOCUDENT_REQUIRE_LLM_PATH === '1'
        || env?.VITE_V10_REQUIRE_LLM_EXTRACTION === 'true';
    if (requireFromEnv) return true;
    if (isTestMode()) return false;
    // Runtime default is soft-fallback.
    // LLM-hard-require must be explicitly requested by input/env.
    return false;
}

function getNodeProcessEnv(): Record<string, string | undefined> | undefined {
    if (typeof process === 'undefined' || !process.env) return undefined;
    return process.env;
}

function hasAnyOpenAiKeyInNodeEnv(): boolean {
    const env = getNodeProcessEnv();
    if (!env) return false;
    return Boolean(
        env.OPENAI_API_KEY
        || env.VITE_OPENAI_API_KEY
        || env.REACT_APP_OPENAI_API_KEY
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Run the V10 pipeline.
 *
 * This is THE SINGLE ENTRY POINT for all pipeline execution.
 */
export async function runV10(input: V10PipelineInput): Promise<V10PipelineOutput> {
    const startTime = Date.now();
    const env = getNodeProcessEnv();
    const isDev = (env?.NODE_ENV ?? 'development') !== 'production';
    const probeDebugEnabled = isDev && env?.DOCUDENT_DEBUG_PROBES === '1';
    const trace = new V10TraceCollector();
    let milchzahnDocOnly = false;
    let reasonedExtractionMeta: V10PipelineMeta['reasonedExtraction'] | undefined;
    let forensicComposerMeta: V10PipelineMeta['forensicComposer'] | undefined;

    try {
        const {
            dictation,
            treatmentId,
            insuranceType,
            textLength,
            answers: rawAnswers,
            teeth,
            preExtracted,
            preanalysisHints,
            requireLlmExtraction,
            userDefaults,
            chipOverrides,
            testOnly,
            kbReleaseId,
        } = input;
        const requireLlmRuntime = resolveRequireLlmExtraction(requireLlmExtraction);

        const docMode: DocMode =
            textLength === 'kurz' ? 'fast'
                : textLength === 'lang' ? 'forensic'
                    : 'balanced';

        const pack = hasPack(treatmentId) ? getPack(treatmentId) : null;
        const packContract = pack?.getUiContract?.();

        const rawDictation = dictation;
        const normalizedDictation = normalizeToothInText(rawDictation);

        // === TRACE: Input ===
        trace.add('input', traceInput(treatmentId, insuranceType, false));

        // === testOnly overrides ===
        const testOverrides = getTestOnlyOverrides(testOnly);
        if (testOverrides.applied) {
            trace.add('testOnly', traceTestOnly(testOverrides.appliedTypes, testOverrides.skipCombinability));
        }

        const settingsInput = canonicalizeSettingsInput(testOverrides.settings ?? userDefaults);
        const normalizedRequestedRelease = typeof kbReleaseId === 'string' && kbReleaseId.trim().length > 0
            ? kbReleaseId.trim()
            : undefined;
        const normalizedPracticeRelease = typeof settingsInput?.practice?.activeKbReleaseId === 'string'
            && settingsInput.practice.activeKbReleaseId.trim().length > 0
            ? settingsInput.practice.activeKbReleaseId.trim()
            : undefined;
        const resolvedKbReleaseId = normalizedRequestedRelease
            ?? normalizedPracticeRelease
            ?? getActiveKbReleaseId()
            ?? undefined;

        // === TRACE: KB Sources (M13) ===
        const medicalKbMeta = defaultMedicalKbProvider.getMeta(resolvedKbReleaseId);
        const treatmentKb = defaultTreatmentKbProvider.getTreatmentKb(treatmentId, resolvedKbReleaseId);
        const treatmentKbMeta = defaultTreatmentKbProvider.getMeta(treatmentId, resolvedKbReleaseId);

        trace.add('kb_medical', traceKbMedical(
            medicalKbMeta.source,
            medicalKbMeta.version,
            medicalKbMeta.hash
        ));
        if (treatmentKbMeta) {
            trace.add('kb_treatment', traceKbTreatment(
                treatmentKbMeta.source,
                treatmentId,
                treatmentKbMeta.version,
                treatmentKbMeta.hash
            ));
        }

        const procedureGraphForGate = getProcedureGraphForTreatment(treatmentId);
        const procedureGateMode = getProcedureGateMode(treatmentId);
        const bundleGate = gateMissingEventBundles(
            procedureGraphForGate,
            { logger: isDev ? undefined : () => {}, mode: procedureGateMode }
        );
        if (!bundleGate.ok && trace.isEnabled()) {
            trace.add(
                'gate',
                `eventBundlesMissing=${bundleGate.missing.length};graph=${procedureGraphForGate?.id ?? 'none'}`
            );
        }
        if (bundleGate.blocked) {
            throw new Error(
                `[BLOCK] Procedure graph has nodes without event bundles for ${treatmentId}: ${bundleGate.missing.join(', ')}`
            );
        }

        // Normalize answers to Map (with testOnly defaults merged)
        let answers = rawAnswers instanceof Map
            ? rawAnswers
            : new Map(Object.entries(rawAnswers ?? {}));
        if (testOverrides.answers) {
            const merged = new Map(testOverrides.answers);
            for (const [key, value] of answers) {
                merged.set(key, value);
            }
            answers = merged;
        }

        // === Extraction ===
        const extractStart = Date.now();
        const extractor = await selectExtractor(testOverrides.extraction);
        let extracted: Record<string, unknown>;
        if (
            requireLlmRuntime
            && typeof window === 'undefined'
            && !preExtracted
            && !testOverrides.extraction
            && !hasAnyOpenAiKeyInNodeEnv()
        ) {
            throw new Error('LLM extraction required but no OpenAI key configured in runtime env (OPENAI_API_KEY/VITE_OPENAI_API_KEY/REACT_APP_OPENAI_API_KEY).');
        }

        if (preExtracted) {
            extracted = preExtracted;
            trace.add('extract', traceExtract('forced', null, []));
        } else if (testOverrides.extraction) {
            extracted = testOverrides.extraction;
            trace.add('extract', traceExtract('forced', null, []));
        } else {
            const result = await extractor.extract(normalizedDictation, treatmentId);
            extracted = result as Record<string, unknown>;
            const tooth = (extracted as any).tooth ?? null;
            const surfaces = (extracted as any).surfaces ?? [];
            trace.add('extract', traceExtract(extractor.engine, tooth, surfaces));
        }

        // P0 FIX: Always set rawDictation so detectNurKasse can find "nur Kasse" patterns
        extracted.rawDictation = rawDictation;
        (extracted as Record<string, unknown>).normalizedDictation = normalizedDictation;
        const hintMerge = mergePreanalysisHintsIntoExtraction(extracted as Record<string, unknown>, preanalysisHints);
        const reasonedMerge = applyReasonedExtractionHints(hintMerge.extracted as Record<string, unknown>, treatmentId);
        extracted = reasonedMerge.extracted;
        syncDocumentationContextToExtraction(extracted as Record<string, unknown>);
        reasonedExtractionMeta = reasonedMerge.summary ? {
            intentHints: reasonedMerge.summary.intentHints,
            factHints: reasonedMerge.summary.factHints,
            explicitHints: reasonedMerge.summary.explicitHints,
            inferredHints: reasonedMerge.summary.inferredHints,
            forensicNotes: reasonedMerge.summary.forensicNotes,
            unresolved: reasonedMerge.summary.unresolved,
            appliedKeys: reasonedMerge.summary.appliedKeys,
        } : undefined;

        // Backfill tooth if extraction failed or produced invalid FDI
        const extractedTooth = (extracted as Record<string, unknown>).tooth;
        const extractedToothStr = extractedTooth !== undefined && extractedTooth !== null ? String(extractedTooth) : null;
        const extractedToothNum = extractedToothStr ? parseInt(extractedToothStr, 10) : null;
        const isValid = extractedToothNum ? isValidFDI(extractedToothNum) : false;
        if (!isValid) {
            const normalizedTooth = extractToothNumber(normalizedDictation);
            if (normalizedTooth) {
                (extracted as Record<string, unknown>).tooth = normalizedTooth;
            }
        }

        // Trace extraction diagnostics (LLM vs regex fallback)
        const extractionMethod = String((extracted as Record<string, unknown>)._extractionMethod ?? extractor.engine);
        const llmError = String((extracted as Record<string, unknown>)._llmError ?? 'none');
        const reasonedApplied = reasonedExtractionMeta?.appliedKeys.length ?? 0;
        const reasonedHints = (reasonedExtractionMeta?.intentHints ?? 0) + (reasonedExtractionMeta?.factHints ?? 0);
        const reasonedInferred = reasonedExtractionMeta?.inferredHints ?? 0;
        const reasonedUnresolved = reasonedExtractionMeta?.unresolved ?? 0;
        trace.add(
            'extract_detail',
            `method=${extractionMethod};llmError=${llmError};preHints=${hintMerge.appliedKeys.length};reasonedHints=${reasonedHints};reasonedApplied=${reasonedApplied};reasonedInferred=${reasonedInferred};reasonedUnresolved=${reasonedUnresolved}`
        );
        if (requireLlmRuntime && extractionMethod !== 'llm') {
            trace.add('gate', `extraction_method_required=llm;actual=${extractionMethod};llmError=${llmError}`);
            throw new Error(`LLM extraction required but method was '${extractionMethod}' (llmError=${llmError})`);
        }

        trace.recordDuration('extract', Date.now() - extractStart);

        // Determine teeth to process
        const extractedTeeth = (extracted as any).teeth?.length > 0
            ? (extracted as any).teeth
            : (extracted as any).tooth
                ? [(extracted as any).tooth]
                : [];

        const teethToProcess = teeth && teeth.length > 0
            ? teeth
            : extractedTeeth.length > 0
                ? extractedTeeth
                : [undefined];

        // === Milchzahn check ===
        const milchzahnCheck = checkMilchzahnSupport(teethToProcess, treatmentId);
        if (milchzahnCheck.unsupported) {
            trace.add('gate', traceMilchzahn(true, milchzahnCheck.reason));

            const handling = (() => {
                for (const [key, value] of answers.entries()) {
                    if (normalizeAskbackId(key) === 'milchzahn_handling') {
                        return typeof value === 'string' ? value : String(value);
                    }
                }
                return null;
            })();

            if (handling === 'doc_only') {
                milchzahnDocOnly = true;
                trace.add('milchzahn', 'doc_only');
            } else {
                const question: DynamicQuestion = {
                    id: 'medical_milchzahn_handling',
                    category: 'medical',
                    medicalSeverity: 'hard',
                    question: `Milchzahn (${milchzahnCheck.milchzahnTeeth.join(', ')}) erkannt. Wie möchtest du fortfahren?`,
                    type: 'single',
                    options: [
                        {
                            id: 'doc_only',
                            label: 'Milchzahn bestätigen (nur Dokumentation, keine Abrechnung)',
                        },
                        {
                            id: 'retry',
                            label: 'Angabe korrigieren (bitte neu diktieren / Zahnnummer korrigieren)',
                        },
                    ],
                    ruleId: 'compat-milchzahn',
                };

                const bundle = buildQuestionBundleFromQuestions([question], docMode);

                trace.add('questions', traceQuestions(treatmentId, 1, [question.id]));
                trace.add('gate', traceGate(false, [question.id]));
                return {
                    state: 'questions',
                    questions: [question],
                    questionsBundle: bundle,
                    meta: buildMeta([], startTime, treatmentId, trace, extractor.engine, testOverrides.applied, resolvedKbReleaseId, undefined, undefined, undefined, undefined, undefined, reasonedExtractionMeta, forensicComposerMeta),
                    trace: isDev ? buildTrace([]) : undefined,
                };
            }
        }

        // === Process each instance using scoping ===
        // Use scoping module to get real instanceIds
        const scopingResult = scopeExtractionToInstances(normalizedDictation, treatmentId);
        let scopedInstances = scopingResult.instances;

        // Bundle callers provide explicit teeth; in that mode the orchestrator must
        // stay tooth-local and must not pull additional instances from full dictation.
        if (teeth && teeth.length > 0) {
            const requestedTeeth = teeth.filter(Boolean);
            const requestedSet = new Set(requestedTeeth);
            const byTooth = new Map<string, (typeof scopedInstances)[number]>();

            for (const scoped of scopedInstances) {
                for (const scopedTooth of scoped.teeth ?? []) {
                    if (!requestedSet.has(scopedTooth)) continue;
                    if (byTooth.has(scopedTooth)) continue;
                    byTooth.set(scopedTooth, {
                        ...scoped,
                        // Normalize to one tooth per forced instance to preserve
                        // deterministic one-instance execution in bundle mode.
                        teeth: [scopedTooth],
                    });
                }
            }

            scopedInstances = requestedTeeth.map((requestedTooth, index) => {
                const matched = byTooth.get(requestedTooth);
                if (matched) {
                    return {
                        ...matched,
                        instanceId: `${treatmentId}-${requestedTooth}-${index + 1}`,
                        teeth: [requestedTooth],
                    };
                }
                return {
                    instanceId: `${treatmentId}-${requestedTooth}-${index + 1}`,
                    teeth: [requestedTooth],
                    sourceText: normalizedDictation,
                };
            });
        }

        trace.add(
            'scoping',
            `instances=${scopedInstances.length};segments=${scopingResult.segmentCount};globalSegments=${scopingResult.globalSegments.length}`
        );
        let results: InstanceResult[] = [];

        for (const scopedInstance of scopedInstances) {
            const primaryTooth = scopedInstance.teeth[0] !== 'unknown' ? scopedInstance.teeth[0] : undefined;
            const instanceDictationBase = scopedInstance.sourceText ?? normalizedDictation;
            const instanceDictation = scopingResult.globalSegments.length > 0
                ? [instanceDictationBase, ...scopingResult.globalSegments].join(' ')
                : instanceDictationBase;
            const result = processInstance(
                instanceDictation,
                treatmentId,
                scopedInstance.instanceId,   // Real instanceId from scoping
                scopedInstance.teeth,        // Teeth array from scoping
                primaryTooth,                // Primary tooth (compat)
                answers,
                extracted,
                isDev,
                settingsInput,  // M62/P3: Pass practice + user settings
                insuranceType as 'GKV' | 'PKV' | 'MKV',  // GIGAPROMPT 8: For askback rules
                docMode,
                resolvedKbReleaseId
            );
            results.push(result);
        }

        // === Medical Summary Trace ===
        const totalRequired = results.reduce((sum, r) => sum + r.askbacksRequired.length, 0);
        const totalOptional = results.reduce((sum, r) => sum + r.askbacksOptional.length, 0);
        trace.add('medical_summary', traceMedicalSummary(
            totalRequired === 0,
            totalRequired,
            totalOptional,
            results.length
        ));

        // Check if any instance has unanswered required questions
        let hasAnyUnanswered = results.some(r => r.hasUnansweredRequired);
        if (testOverrides.applied && testOverrides.chips && testOverrides.chips.length > 0) {
            hasAnyUnanswered = false;
        }

        if (hasAnyUnanswered) {
            // === Questions state ===
            const allQuestions = results.flatMap(r => r.questions);

            // Dedupe and sort questions deterministically
            const questionMap = new Map<string, DynamicQuestion>();
            for (const q of allQuestions) {
                if (!questionMap.has(q.id)) {
                    questionMap.set(q.id, q);
                }
            }
            const sortedQuestions = Array.from(questionMap.values()).sort((a, b) =>
                a.id.localeCompare(b.id)
            );

            // Split into required/optional (fallback)
            const required = sortedQuestions.filter(q => q.medicalSeverity === 'hard');
            const optional = sortedQuestions.filter(q => q.medicalSeverity !== 'hard');

            const singleBundle = results.length === 1 ? results[0].questionBundle : undefined;

            // Trace questions
            trace.add('questions', traceQuestions(treatmentId, sortedQuestions.length, sortedQuestions.map(q => q.id)));
            trace.add('gate', traceGate(false, required.map(q => q.id)));

            return {
                state: 'questions',
                questions: sortedQuestions,
                questionsBundle: singleBundle ?? buildQuestionBundleFromQuestions(sortedQuestions, docMode),
                review: buildReviewContext(results, settingsInput),
                meta: buildMeta(results, startTime, treatmentId, trace, extractor.engine, testOverrides.applied, resolvedKbReleaseId, undefined, undefined, undefined, undefined, undefined, reasonedExtractionMeta, forensicComposerMeta),
                trace: isDev ? buildTrace(results) : undefined,
            };
        }

        // === All questions answered — render output ===
        trace.add('gate', traceGate(true, []));

        // Apply chip overrides from control center (per instance)
        const overrideAddedChips = new Set<string>();
        const shouldApplyOverrides = !testOverrides.chips && chipOverrides && Object.keys(chipOverrides).length > 0;
        if (shouldApplyOverrides) {
            const billingDb = getBillingDbTreatment(treatmentId);
            const isBillableChip = (chipId: string): boolean => {
                if (!billingDb) return false;
                if ((billingDb.surfaceMappedChips ?? []).includes(chipId)) return true;
                return !!billingDb.billingRefs?.[chipId];
            };

            const overridesByInstance = chipOverrides as OverridesByInstance;
            results = results.map(result => {
                const instanceOverrides = overridesByInstance[result.instanceId];
                if (!instanceOverrides || Object.keys(instanceOverrides).length === 0) {
                    return result;
                }

                const { chips: updatedChips, added, removed } = applyChipOverridesToChips(
                    result.chips,
                    instanceOverrides,
                    packContract
                );

                if (added.size === 0 && removed.size === 0) {
                    return result;
                }

                for (const chipId of added) {
                    overrideAddedChips.add(chipId);
                }

                const updatedEmitters = result.chipEmitters ? { ...result.chipEmitters } : {};
                for (const chipId of removed) {
                    delete updatedEmitters[chipId];
                }
                for (const chipId of added) {
                    updatedEmitters[chipId] = 'manualOverride';
                }

                // Keep billingChipIds in sync: manual overrides are explicit and should affect billing.
                const baseBillingChipIds = result.billingChipIds ?? [];
                const updatedBillingChipIds = baseBillingChipIds.filter(id => !removed.has(id));
                const addedBillable = [...added].filter(isBillableChip).sort();
                for (const chipId of addedBillable) {
                    if (!updatedBillingChipIds.includes(chipId)) {
                        updatedBillingChipIds.push(chipId);
                    }
                }

                return {
                    ...result,
                    chips: updatedChips,
                    chipEmitters: updatedEmitters,
                    billingChipIds: updatedBillingChipIds,
                    trace: {
                        ...result.trace,
                        chips: updatedChips,
                        renderedChipIds: updatedChips,
                    },
                };
            });
        }

        // Get all chips (with testOnly override)
        let allChips = testOverrides.chips ?? results.flatMap(r => r.chips);
        const uniqueChips = [...new Set(allChips)];

        // === M15: Build chip provenance and apply billing guard ===
        // Collect all chip provenance from results
        const allChipProvenance = results.flatMap(r => r.chipProvenance);
        const chipEmitterById = new Map<string, string>();
        for (const result of results) {
            if (!result.chipEmitters) continue;
            for (const [chipId, emitter] of Object.entries(result.chipEmitters)) {
                if (!chipEmitterById.has(chipId)) {
                    chipEmitterById.set(chipId, emitter);
                }
            }
        }

        // Build ChipWithProvenance for each unique chip
        // For now, chips from dictation extraction are 'dictation' source,
        // chips from user answers are 'user' source
        const chipsWithProvenance: ChipWithProvenance[] = uniqueChips.map(chipId => {
            const provenance = allChipProvenance.find(p => p.chipId === chipId);
            const emitter = chipEmitterById.get(chipId);
            const isOverrideAdded = overrideAddedChips.has(chipId) || emitter === 'manualOverride';
            const isStandardChip = emitter === 'node:contract.standard_chips';
            // Determine fact sources - for now, assume 'dictation' if no answer was needed,
            // 'user' if the chip was emitted after user answered a required question.
            // Test-only forced chips should always be billable.
            const hasUnansweredInAnyInstance = testOverrides.chips && testOverrides.chips.length > 0
                ? false
                : results.some(r => r.hasUnansweredRequired);
            const factSources: FactSource[] = isOverrideAdded
                ? ['user']
                : hasUnansweredInAnyInstance
                    ? ['inferred'] // If we got here with unanswered, something's wrong
                    : isStandardChip
                        ? ['settings']
                        : ['dictation', 'user']; // Assume confirmed if all questions answered

            return {
                chipId,
                emittedByRuleId: provenance?.ruleId ?? emitter ?? (isOverrideAdded ? 'override' : 'unknown'),
                factSources,
                scope: 'session' as const,
            };
        });

        // Apply billing guard
        const billingGuardResult = applyBillingGuard(chipsWithProvenance);

        // Trace billing guard
        trace.add('billing_guard', billingGuardResult.traceLine);

        const sessionInsuranceType = deriveEffectiveInsuranceType(
            (insuranceType ?? 'GKV') as 'GKV' | 'PKV' | 'MKV',
            (results[0]?.facts ?? {}) as TreatmentFacts
        );

        // === Billing Inputs Trace ===
        trace.add('billing_inputs', traceBillingInputs(
            treatmentId,
            undefined,
            undefined,
            sessionInsuranceType,
            false,
            (extracted as any).tooth
        ));

        // === Build perInstance (SSOT for multi-treatment) ===
        // Each instance rendered separately via SSOT renderer.
        // NO global renderResult - perInstance is the single source of truth.
        const allowedChipIds = billingGuardResult.allowed.map(c => c.chipId);
        const blockedChipIds = billingGuardResult.blocked.map(c => c.chipId);

        const perInstance: Record<string, {
            instanceId: string;
            teeth: string[];
            text: string;
            billingRefs: string[];
            chips: string[];
            chipEmitters?: Record<string, string>;
        }> = {};
        const debugInstances: Array<{
            instanceId: string;
            tooth?: string;
            cappingPerformed?: string;
            pulpaOpened?: boolean;
            nurKasse?: boolean;
            mkvPresent?: boolean;
            mehrkostenConfirmed?: boolean;
            chips: string[];
            chipEmitters?: Record<string, string>;
        }> = [];

        for (const result of results) {
            const instanceInsuranceType = deriveEffectiveInsuranceType(
                (insuranceType ?? 'GKV') as 'GKV' | 'PKV' | 'MKV',
                (result.facts ?? {}) as TreatmentFacts
            );
            // Render this instance's chips via SSOT renderer
            const instanceChipSource = testOverrides.chips ?? result.chips;
            const instanceAllowedChips = sanitizeFuellungChipsForInsurance(
                instanceChipSource.filter(c => allowedChipIds.includes(c)),
                instanceInsuranceType,
                (result.facts ?? {}) as TreatmentFacts
            );
            if (result.facts?.nurKasse === true) {
                const mkvIndex = instanceAllowedChips.indexOf('insurance_gkv_mkv');
                if (mkvIndex >= 0) {
                    instanceAllowedChips.splice(mkvIndex, 1);
                }
            }
            const instanceEmitters = result.chipEmitters ?? {};
            const filteredEmitters: Record<string, string> = {};
            for (const chipId of instanceAllowedChips) {
                const emitter = instanceEmitters[chipId];
                if (emitter) {
                    filteredEmitters[chipId] = emitter;
                }
            }
            const renderLabels = (result.facts as TreatmentFacts | undefined)?.render;
            const laAgent = formatLaAgentForDocumentation(renderLabels?.laAgent);
            const fillMaterial = renderLabels?.fillMaterial ?? 'Komposit';
            const adhesiveMaterial = renderLabels?.adhesiveMaterial ?? 'Adhäsiv';
            const etchMaterial = renderLabels?.etchMaterial ?? 'Ätzgel';
            const flowableMaterial = renderLabels?.flowableMaterial ?? 'Flowable';
            const bulkMaterial = renderLabels?.bulkMaterial ?? 'Bulk-Fill';
            const matrixSystem = renderLabels?.matrixSystem ?? 'Matrix';
            const mehrkostenConfirmed = (() => {
                if (result.facts?.nurKasse === true) {
                    return false;
                }
                const raw = ((extracted as any).rawDictation || '').toLowerCase();
                const fallbackDetected = raw.includes('mehrkosten') || raw.includes('mkv') || raw.includes('zuzahlung');
                return result.facts?.mehrkostenConfirmed ??
                    result.facts?.mehrkostenMentioned ??
                    fallbackDetected ??
                    false;
            })();
            const billableChipIds = (result.billingChipIds ?? []).filter(id => instanceAllowedChips.includes(id));
            const billingRefsFromBundle = resolveBillingRefsFromBundleMeta({
                treatmentId,
                chipIds: billableChipIds,
                insuranceType: instanceInsuranceType,
                surfaces: result.facts?.surfaces ?? [],
                tooth: result.tooth,
                mehrkostenConfirmed,
            });
            const instanceRendered = renderFromKbChips({
                chips: instanceAllowedChips,
                treatmentId,
                insuranceType: instanceInsuranceType,
                textLength,
                treatmentKb: treatmentKb ?? undefined,
                context: {
                    // === PRAXIS-PERFECT OUTPUT: Full clinical context ===
                    tooth: result.tooth,
                    // Surfaces formatted for display (e.g., "MOD")
                    surfaces: result.facts?.surfaces ?? [],
                    surfacesFormatted: (result.facts?.surfaces ?? []).join('').toUpperCase(),
                    // Diagnosis/depth
                    cariesDepth: result.facts?.cariesDepth ?? 'unknown',
                    depthDisplay: (() => {
                        const d = result.facts?.cariesDepth;
                        if (d === 'profunda') return ' tief (caries profunda)';
                        if (d === 'pulp_near') return ' pulpanah';
                        if (d === 'normal') return ' mittel (caries media)';
                        return '';
                    })(),
                    // Anesthesia
                    anesthesia: result.facts?.anesthesia ?? 'unknown',
                    anesthesiaDisplay: (() => {
                        const a = result.facts?.anesthesia;
                        if (a === 'infiltr') return 'Infiltrationsanästhesie';
                        if (a === 'leitung') return 'Leitungsanästhesie';
                        if (a === 'none') return 'ohne Anästhesie';
                        return '';
                    })(),
                    // Isolation
                    isolation: result.facts?.kofferdamUsed ? 'kofferdam' : (result.facts?.kofferdamMentioned === false ? 'relativ' : 'unknown'),
                    // Capping
                    cappingPerformed: result.facts?.capping?.performed ?? 'unknown',
                    cappingMaterial: result.facts?.capping?.material ?? '',
                    material: (answers.get('medical_ueberkappung_material') as string) ??
                        (result.facts?.capping?.material) ?? 'Ca(OH)₂',
                    // Material for filling
                    fillingMaterial: (result.facts?.materialMentioned ?? result.facts?.material) ?? 'unknown',
                    // Material variables (SSOT renderer)
                    la_agent: laAgent,
                    fill_material: fillMaterial,
                    adhesive_material: adhesiveMaterial,
                    etch_material: etchMaterial,
                    flowable_material: flowableMaterial,
                    bulk_material: bulkMaterial,
                    matrix_system: matrixSystem,
                    // MKV
                    insuranceType: instanceInsuranceType,
                    mkv_justification: result.facts?.mkvJustification ?? '',
                    mehrkostenConfirmed,
                    mkvDisplay: instanceInsuranceType === 'MKV' ? 'Mehrkostenvereinbarung' : '',
                },
            });

            perInstance[result.instanceId] = {
                instanceId: result.instanceId,
                teeth: result.teeth,
                text: instanceRendered.fullText,
                billingRefs: billingRefsFromBundle.map(normalizeBillingRefId),
                chips: instanceAllowedChips,
                chipEmitters: filteredEmitters,
            };
            debugInstances.push({
                instanceId: result.instanceId,
                tooth: result.tooth,
                cappingPerformed: result.facts?.capping?.performed,
                pulpaOpened: result.facts?.pulpaOpened,
                nurKasse: result.facts?.nurKasse,
                mkvPresent: result.facts?.mkvPresent,
                mehrkostenConfirmed: result.facts?.mehrkostenConfirmed,
                chips: instanceAllowedChips,
                chipEmitters: filteredEmitters,
            });
        }

        // === Derive global output from perInstance (SSOT) ===
        // No fallback to any global render - perInstance is the truth
        const perInstanceTexts = Object.values(perInstance).map(p => p.text).filter(t => t.length > 0);
        const initialFullText = perInstanceTexts.length > 1
            ? perInstanceTexts.join(' \n\n')
            : perInstanceTexts[0] ?? '';  // Empty if no text (no fallback!)
        // GEAR 2: Billing Multiplicity - derive from perInstance WITHOUT dedup
        // Multi-tooth cases may have same code multiple times
        const allBillingRefs = Object.values(perInstance)
            .flatMap(p => p.billingRefs)
            .map(normalizeBillingRefId);

        // ═══ PROBE C: After MedicalKB and Renderer ═══
        if (probeDebugEnabled) {
            console.debug('[PROBE C] Post-Render Output', {
                instanceCount: results.length,
                perInstanceSummary: Object.entries(perInstance).map(([id, p]) => ({
                    instanceId: id,
                    teeth: p.teeth,
                    text: p.text.slice(0, 100) + (p.text.length > 100 ? '...' : ''),
                    textLen: p.text.length,
                    chips: p.chips,
                    billingRefs: p.billingRefs,
                })),
                aggregated: {
                    fullTextLen: initialFullText.length,
                    allBillingRefs,
                    billingRefCounts: allBillingRefs.reduce((acc, ref) => {
                        acc[ref] = (acc[ref] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>),
                },
            });

            // ═══ DEV ASSERTIONS ═══
            // Assert: single-tooth dictation should have 1 instance
            if (results.length > 1 && teethToProcess.length === 1) {
                console.warn('[PROBE C ASSERT] Expected 1 instance for single-tooth, got:', results.length);
            }

            // Assert: duplicates in single-tooth case
            const duplicates = allBillingRefs.filter((ref, i, arr) => arr.indexOf(ref) !== i);
            if (duplicates.length > 0 && teethToProcess.length === 1) {
                console.warn('[PROBE C ASSERT] Duplicate billingRefs in single-tooth:', duplicates);
                console.warn('[PROBE C ASSERT] Duplicate source:', Object.entries(perInstance).map(([id, p]) => ({
                    instanceId: id,
                    billingRefs: p.billingRefs,
                })));
            }
        }

        // Trace render (aggregated from perInstance)
        trace.add('render', traceRender([]));

        // === Billing Result Trace (from perInstance) ===
        trace.add('billing_result', traceBillingResult(
            allBillingRefs.length,
            blockedChipIds.length,
            blockedChipIds.length > 0 ? blockedChipIds.join(',') : undefined
        ));

        // === Combinability check (M16: SSOT-based) ===
        let combinabilityResult: CombinabilityCheckResult | undefined;
        if (!testOverrides.skipCombinability) {
            const codesByTooth = (() => {
                const map = new Map<string, string[]>();
                for (const inst of Object.values(perInstance)) {
                    for (const t of inst.teeth ?? []) {
                        const existing = map.get(t) ?? [];
                        existing.push(...(inst.billingRefs ?? []));
                        map.set(t, existing);
                    }
                }
                return map.size > 0 ? map : undefined;
            })();

            combinabilityResult = checkCombinabilityFromKb(
                allBillingRefs,  // Use derived billing from perInstance
                {
                    treatmentId,
                    insuranceType: (sessionInsuranceType === 'PKV' ? 'PKV' : 'GKV'),
                    codesByTooth,
                }
            );

            // Add combinability trace
            trace.add('combinability', combinabilityResult.traceLine);

            if (combinabilityResult.verdict === 'BLOCK') {
                const overrideAction = getCombinabilityOverrideAction(results);
                if (!overrideAction) {
                    const combinabilityQuestions = buildCombinabilityOverrideQuestions(combinabilityResult.conflicts);
                    const bundle = buildQuestionBundleFromQuestions(combinabilityQuestions, docMode);
                    trace.add('questions', traceQuestions(treatmentId, combinabilityQuestions.length, combinabilityQuestions.map(q => q.id)));
                    trace.add('gate', traceGate(false, combinabilityQuestions.map(q => q.id)));
                    return {
                        state: 'questions',
                        questions: combinabilityQuestions,
                        questionsBundle: bundle,
                        review: buildReviewContext(results, settingsInput),
                        meta: buildMeta(
                            results,
                            startTime,
                            treatmentId,
                            trace,
                            extractor.engine,
                            testOverrides.applied,
                            resolvedKbReleaseId,
                            billingGuardResult,
                            combinabilityResult,
                            undefined,
                            undefined,
                            undefined,
                            reasonedExtractionMeta,
                            forensicComposerMeta
                        ),
                        trace: isDev ? buildTrace(results) : undefined,
                    };
                }

                const overrideWarnings = [
                    `Combinability override: ${overrideAction}`,
                ];
                const droppedCodes = overrideAction === 'drop_blocked'
                    ? Array.from(new Set([
                        ...combinabilityResult.droppedCodes,
                        ...combinabilityResult.blockedCodes,
                    ]))
                    : combinabilityResult.droppedCodes;

                combinabilityResult = {
                    ...combinabilityResult,
                    verdict: 'WARN',
                    droppedCodes,
                    warnings: [
                        ...(combinabilityResult.warnings ?? []),
                        ...overrideWarnings,
                    ],
                };
                trace.add('combinability', `override=${overrideAction}`);
            }
        }

        // ═══ V10 COMPOSER: Build KZV-style documentation ═══
        // Detect MKV amount from answers first, then raw dictation
        const mkvAmountFromAnswers = (() => {
            const parseAmountValue = (value: unknown): number | undefined => {
                if (typeof value === 'number' && Number.isFinite(value)) return value;
                if (typeof value === 'string') {
                    const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
                    const parsed = Number.parseFloat(normalized);
                    return Number.isFinite(parsed) ? parsed : undefined;
                }
                return undefined;
            };

            for (const [key, value] of answers.entries()) {
                const normalizedKey = stripToothScope(key).replace(/::tooth:\d+$/, '');
                const lower = normalizedKey.toLowerCase();
                if (
                    lower === 'mkv_betrag' ||
                    lower === 'mkv_amount' ||
                    lower === 'mkvbetrag' ||
                    lower === 'mkvamount' ||
                    lower === 'mkv_mkv_betrag' ||
                    lower === 'mkv_mkv_amount'
                ) {
                    const parsed = parseAmountValue(value);
                    if (parsed !== undefined) return parsed;
                }
            }

            return undefined;
        })();

        const mkvAmount = mkvAmountFromAnswers ?? detectMkvAmount(rawDictation);

        // Enrich perInstance with facts for composer
        const perInstanceWithFacts: Record<string, {
            instanceId: string;
            teeth: string[];
            text: string;
            billingRefs: string[];
            chips: string[];
            chipEmitters?: Record<string, string>;
            facts?: Record<string, unknown>;
        }> = {};

        for (const [id, data] of Object.entries(perInstance)) {
            const result = results.find(r => r.instanceId === id);
            perInstanceWithFacts[id] = {
                ...data,
                facts: result?.facts as unknown as Record<string, unknown>,
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // GP5/GP8: FINAL BILLING FILTER (AFTER COMBINABILITY)
        // ═══════════════════════════════════════════════════════════════
        // This is the step BEFORE text composition. Order is critical:
        //   1. Bundle meta resolves billable chips → billingRefs
        //   2. Combinability checks all codes and drops conflicts
        //   3. THIS FILTER removes droppedCodes from billingCodes
        //   4. THEN composer builds text with filtered codes (GP8 fix)
        //   5. BillingCompleteness tracks origins including dropped codes
        // ═══════════════════════════════════════════════════════════════
        let finalBillingCodes = allBillingRefs;
        let finalPerInstance = perInstance;
        let finalPerInstanceWithFacts: Record<string, {
            instanceId: string;
            teeth: string[];
            text: string;
            billingRefs: string[];
            chips: string[];
            chipEmitters?: Record<string, string>;
            facts?: Record<string, unknown>;
        }> = perInstanceWithFacts;

        if (combinabilityResult && combinabilityResult.droppedCodes.length > 0) {
            const droppedSet = new Set(combinabilityResult.droppedCodes);

            // Filter from aggregated billing codes
            finalBillingCodes = allBillingRefs.filter(code => !droppedSet.has(code));

            // Filter from each perInstance
            finalPerInstance = {};
            finalPerInstanceWithFacts = {};
            for (const [id, data] of Object.entries(perInstance)) {
                const result = results.find(r => r.instanceId === id);
                finalPerInstance[id] = {
                    ...data,
                    billingRefs: data.billingRefs.filter(code => !droppedSet.has(code)),
                };
                // GP8: Also update perInstanceWithFacts for composer
                finalPerInstanceWithFacts[id] = {
                    ...data,
                    billingRefs: data.billingRefs.filter(code => !droppedSet.has(code)),
                    facts: result?.facts as unknown as Record<string, unknown>,
                };
            }

            trace.add('combinability', `auto_dropped=${combinabilityResult.droppedCodes.join(',')}`);
        }

        if (milchzahnDocOnly) {
            finalBillingCodes = [];
            const cleared: typeof finalPerInstance = {};
            const clearedWithFacts: typeof finalPerInstanceWithFacts = {};
            for (const [id, data] of Object.entries(finalPerInstance)) {
                cleared[id] = { ...data, billingRefs: [] };
            }
            for (const [id, data] of Object.entries(finalPerInstanceWithFacts)) {
                clearedWithFacts[id] = { ...data, billingRefs: [] };
            }
            finalPerInstance = cleared;
            finalPerInstanceWithFacts = clearedWithFacts;
            trace.add('milchzahn', 'billing_disabled');
        }

        // ═══════════════════════════════════════════════════════════════
        // GP8: Compose AFTER filtering so text matches final billing
        // ═══════════════════════════════════════════════════════════════
        // This ensures droppedCodes are NOT mentioned in output.fullText
        // or in the Abrechnung section.
        const treatmentChips = getTreatmentChips(treatmentId);

        const aggregatedSections: Array<{ id: string; label: string; content: string }> = [];
        const sectionBuckets = new Map<string, { id: string; label: string; contents: string[] }>();
        const extractionDocumentationContext = buildDocumentationContextFromExtraction(extracted as Record<string, unknown>);
        const composerContextByInstance = new Map<string, DocumentationContextV1>();
        const aggregatedComposerContext: DocumentationContextV1 = {
            version: extractionDocumentationContext.version,
            clinical: [...extractionDocumentationContext.clinical],
            patient: [...extractionDocumentationContext.patient],
            administrative: [...extractionDocumentationContext.administrative],
            forensicNotes: [...extractionDocumentationContext.forensicNotes],
            unresolved: [...extractionDocumentationContext.unresolved],
        };
        const unresolvedForensicHints = extractionDocumentationContext.unresolved;
        let zusatzinfosInjected = false;

        for (const [instanceId, instance] of Object.entries(finalPerInstanceWithFacts)) {
            const facts = (instance.facts ?? {}) as TreatmentFacts;
            const instanceComposerContext = buildDocumentationContextFromExtraction({
                documentationContext: (facts as Record<string, unknown>).documentationContext,
            });
            const evidenceNotes = collectDocumentationEvidenceNotes(facts);
            mergeNotesIntoDocumentationContext(instanceComposerContext, 'clinical', evidenceNotes.clinical);
            mergeNotesIntoDocumentationContext(instanceComposerContext, 'patient', evidenceNotes.patient);
            mergeNotesIntoDocumentationContext(instanceComposerContext, 'administrative', evidenceNotes.administrative);
            composerContextByInstance.set(instanceId, instanceComposerContext);
            mergeNotesIntoDocumentationContext(aggregatedComposerContext, 'clinical', instanceComposerContext.clinical);
            mergeNotesIntoDocumentationContext(aggregatedComposerContext, 'patient', instanceComposerContext.patient);
            mergeNotesIntoDocumentationContext(aggregatedComposerContext, 'administrative', instanceComposerContext.administrative);
            mergeNotesIntoDocumentationContext(aggregatedComposerContext, 'forensicNotes', instanceComposerContext.forensicNotes);
            mergeNotesIntoDocumentationContext(aggregatedComposerContext, 'unresolved', instanceComposerContext.unresolved);
        }

        for (const [instanceId, instance] of Object.entries(finalPerInstanceWithFacts)) {
            const facts = (instance.facts ?? {}) as TreatmentFacts;
            const instanceInsuranceType = deriveEffectiveInsuranceType(
                (insuranceType ?? 'GKV') as 'GKV' | 'PKV' | 'MKV',
                facts
            );
            const insuranceForComposer = instanceInsuranceType === 'MKV'
                ? 'GKV'
                : (instanceInsuranceType as 'GKV' | 'PKV');
            const surfaces = (facts.surfaces as string[] | undefined) ?? [];
            const flaechen = surfaces.length > 0 ? surfaces.join('').toUpperCase() : undefined;
            const cariesDepth = facts.cariesDepth as string | undefined;
            const diagnose = cariesDepth === 'profunda'
                ? 'Caries profunda'
                : cariesDepth === 'pulp_near'
                    ? 'pulpanah'
                    : cariesDepth === 'normal'
                        ? 'Caries media'
                        : undefined;

            const vitality = facts.vitality === 'pos' ? '+' : facts.vitality === 'neg' ? '-' : undefined;
            const percussion = facts.percussion === 'pos' ? '+' : facts.percussion === 'neg' ? '-' : undefined;

            const tiefe = diagnose
                ? undefined
                : cariesDepth === 'profunda' || cariesDepth === 'pulp_near'
                    ? 'tief'
                    : cariesDepth === 'normal'
                        ? 'mittel'
                        : undefined;

            const tooth = instance.teeth?.[0] ?? (facts.tooth as string | undefined) ?? undefined;

            const instanceResult = results.find(r => r.instanceId === instanceId);
            const renderLabels = facts.render ?? {};

            const materialDisplay = (() => {
                const raw = String(facts.materialMentioned ?? facts.material ?? '').trim();
                if (raw && raw !== 'unknown') {
                    const normalized = raw.toLowerCase();
                    if (renderLabels.fillMaterial && (normalized === 'komposit' || normalized === 'composite')) {
                        return renderLabels.fillMaterial;
                    }
                    return raw;
                }
                return renderLabels.fillMaterial ?? '';
            })();
            const adhesiveDisplay = renderLabels.adhesiveMaterial ?? 'Adhäsiv';
            const etchDisplay = renderLabels.etchMaterial ?? 'Ätzgel';
            const flowableDisplay = renderLabels.flowableMaterial ?? 'Flowable';
            const bulkDisplay = renderLabels.bulkMaterial ?? 'Bulk-Fill';
            const matrixDisplay = renderLabels.matrixSystem ?? 'Matrix';
            const laAgent = formatLaAgentForDocumentation(renderLabels.laAgent);

            const globalClinicalInfos = aggregatedComposerContext.clinical;
            const globalPatientInfos = Array.from(new Set([
                ...aggregatedComposerContext.patient,
                ...aggregatedComposerContext.forensicNotes,
            ]));
            const globalLegacyInfos = aggregatedComposerContext.administrative;
            const klinischeZusatzinfos = (!zusatzinfosInjected && globalClinicalInfos.length > 0)
                ? globalClinicalInfos
                : undefined;
            const patientenangaben = (!zusatzinfosInjected && globalPatientInfos.length > 0)
                ? globalPatientInfos
                : undefined;
            const zusatzinfos = (!zusatzinfosInjected && globalLegacyInfos.length > 0)
                ? globalLegacyInfos
                : undefined;
            if ((klinischeZusatzinfos?.length ?? 0) > 0 || (patientenangaben?.length ?? 0) > 0 || (zusatzinfos?.length ?? 0) > 0) {
                zusatzinfosInjected = true;
            }

            const extractedData = {
                tooth,
                zahn: tooth,
                flaechen,
                diagnose,
                tiefe,
                vitality,
                percussion,
                material: materialDisplay,
                fill_material: materialDisplay,
                adhesive_material: adhesiveDisplay,
                etch_material: etchDisplay,
                flowable_material: flowableDisplay,
                bulk_material: bulkDisplay,
                matrix_system: matrixDisplay,
                la_agent: laAgent,
                anesthesia: String(facts.anesthesia ?? ''),
                insuranceType,
                mkv_justification: facts.mkvJustification ?? '',
                mkv_betrag: facts.mkvBetrag ?? undefined,
                capping: {
                    performed: facts.capping?.performed ?? 'unknown',
                    material: facts.capping?.material ?? undefined,
                },
                radiology: facts.radiology ? {
                    indication: facts.radiology.indication,
                    type: facts.radiology.type,
                    timing: facts.radiology.timing,
                    findings: facts.radiology.findings,
                } : undefined,
                klinischeZusatzinfos,
                patientenangaben,
                zusatzinfos,
                endo: facts.endo ? {
                    workingLengthMethod: facts.endo.workingLengthMethod,
                    workingLengthsText: (facts.endo as Record<string, unknown>).workingLengthsText,
                    canalCount: facts.endo.canalCount,
                    irrigationSolutions: facts.endo.irrigationSolutions,
                    medication: facts.endo.medication,
                    wfTechnique: facts.endo.wfTechnique,
                } : undefined,
            };

            const mkvSignal = instanceInsuranceType === 'MKV'
                && Boolean(facts.mehrkostenConfirmed || facts.mehrkostenMentioned);
            const hasMKV = mkvSignal && !facts.nurKasse;
            const chipEmitterGate = gateNoUnknownChipEmitters(
                instance.chips.map(id => ({ id, emitter: instance.chipEmitters?.[id] })),
                { mode: getProcedureGateMode(treatmentId) }
            );
            trace.addStructured('procedure-gate', 'gateNoUnknownChipEmitters', {
                instanceId,
                result: chipEmitterGate,
            });
            if (chipEmitterGate.blocked) {
                throw new Error(
                    `[BLOCK] Unknown chip emitter(s) for ${treatmentId}/${instanceId}: ${chipEmitterGate.trace.unknownEmitters.map(chip => chip.id).join(', ')}`
                );
            }
            const engineResult = {
                billingCodes: instance.billingRefs,
                billingDetails: resolveBillingDetailsFromDb(instance.billingRefs),
                warnings: [],
                optimierungen: [],
                textLines: [],
            };

            const activeChipDefs = treatmentChips.filter(c => instance.chips.includes(c.id));
            const composed = composeOutput(
                treatmentId,
                engineResult,
                activeChipDefs,
                extractedData as Record<string, unknown>,
                insuranceForComposer,
                {
                    textLength,
                    hasMKV,
                    mkvBetrag: mkvAmount,
                    cappingMaterial: (facts.capping?.material ?? undefined) as string | undefined,
                    aufklaerungEnabled: renderLabels.aufklaerungEnabled ?? true,
                    nurKasse: Boolean(facts.nurKasse),
                    disclosureIds: instance.disclosureIds,
                }
            );

            const sections = composed.sections.filter(section => section.id !== 'header');
            for (const section of sections) {
                const existing = sectionBuckets.get(section.id);
                if (!existing) {
                    sectionBuckets.set(section.id, {
                        id: section.id,
                        label: section.label,
                        contents: [section.content],
                    });
                } else {
                    existing.contents.push(section.content);
                }
            }
        }

        for (const bucket of sectionBuckets.values()) {
            const uniqueParagraphs: string[] = [];
            const seenParagraphs = new Set<string>();
            for (const entry of bucket.contents) {
                const normalized = String(entry ?? '').trim();
                if (!normalized) continue;
                const paragraphs = normalized
                    .split(/\n{2,}/)
                    .map(paragraph => paragraph.trim())
                    .filter(Boolean);
                for (const paragraph of paragraphs) {
                    if (seenParagraphs.has(paragraph)) continue;
                    seenParagraphs.add(paragraph);
                    uniqueParagraphs.push(paragraph);
                }
            }
            aggregatedSections.push({
                id: bucket.id,
                label: bucket.label,
                content: uniqueParagraphs.join('\n\n'),
            });
        }

        const finalSections = aggregatedSections;
        const fullTextSections = finalSections.filter(section => section.id !== 'abrechnung');

        const forensicComposition = await maybeComposeForensicSections({
            treatmentId,
            insuranceType: sessionInsuranceType,
            textLength,
            sections: fullTextSections.map(section => ({
                id: section.id,
                label: section.label,
                content: section.content,
            })),
            context: {
                instanceCount: results.length,
                unresolvedForensicHints,
                documentationContext: {
                    clinical: extractionDocumentationContext.clinical,
                    patient: extractionDocumentationContext.patient,
                    administrative: extractionDocumentationContext.administrative,
                    forensicNotes: extractionDocumentationContext.forensicNotes,
                },
            },
        });
        forensicComposerMeta = {
            enabled: forensicComposition.enabled,
            applied: forensicComposition.applied,
            sectionCount: forensicComposition.sections.length,
            error: forensicComposition.error,
        };
        if (forensicComposition.applied) {
            trace.add('render', 'forensic_composer=applied');
        } else if (forensicComposition.error) {
            trace.add('render', `forensic_composer=error:${forensicComposition.error}`);
        } else if (forensicComposition.enabled) {
            trace.add('render', 'forensic_composer=skipped');
        } else {
            trace.add('render', 'forensic_composer=disabled');
        }

        // M64: do NOT prepend "Zahn X" here — this was reverted in M64
        let finalFullText = forensicComposition.sections
            .map(section => `[${section.label}]\n${section.content}`)
            .join('\n\n');
        const refinement = await maybeRefineFinalOutputText({
            text: finalFullText,
            treatmentId,
            insuranceType: sessionInsuranceType,
            textLength,
        });
        finalFullText = refinement.text;
        if (refinement.applied) {
            trace.add('render', 'text_refiner=applied');
        } else if (refinement.error) {
            trace.add('render', `text_refiner=error:${refinement.error}`);
        } else {
            trace.add('render', 'text_refiner=skipped');
        }

        const regelPruefungen = pruefeRegeln({
            codes: finalBillingCodes,
            dokumentation: finalFullText,
            zahnNummer: Number(results[0]?.tooth ?? results[0]?.teeth?.[0] ?? undefined),
            insuranceType: sessionInsuranceType === 'MKV'
                ? 'GKV'
                : (sessionInsuranceType as 'GKV' | 'PKV'),
        });

        // === GP4: Compute Billing Completeness ===
        let billingCompletenessResult = computeBillingCompleteness(
            finalPerInstance,
            sessionInsuranceType,
            finalBillingCodes,
            combinabilityResult ? {
                droppedCodes: combinabilityResult.droppedCodes,
                conflicts: combinabilityResult.conflicts.map(c => ({
                    ruleId: c.ruleId,
                    codesInvolved: c.codesInvolved,
                })),
            } : undefined,
            treatmentKb ?? undefined,
            getBillingDbTreatment(treatmentId)
        );

        const billingValidationResult = validateBillingCodes(finalBillingCodes);

        if (probeDebugEnabled) {
            console.debug('[GP4] Billing Completeness:', billingCompletenessResult.isComplete ? 'COMPLETE' : 'INCOMPLETE', billingCompletenessResult);
            console.debug('[Billing Validation] Conflicts:', billingValidationResult.konflikte.length);
        }

        if (milchzahnDocOnly) {
            billingCompletenessResult = { isComplete: true, missing: [], origins: [] };
        }

        return {
            state: 'output',
            review: buildReviewContext(results, settingsInput),
            output: {
                fullText: finalFullText,
                billingCodes: finalBillingCodes,  // Filtered billing codes
                perInstance: finalPerInstance,    // Filtered perInstance
                sections: finalSections as Array<{
                    id: 'dokumentation' | 'abrechnung' | 'mkv' | 'hinweise';
                    label: string;
                    content: string;
                }>,
            },
            meta: buildMeta(
                results,
                startTime,
                treatmentId,
                trace,
                extractor.engine,
                testOverrides.applied,
                resolvedKbReleaseId,
                billingGuardResult,
                combinabilityResult,
                billingCompletenessResult,
                regelPruefungen,
                billingValidationResult,
                reasonedExtractionMeta,
                forensicComposerMeta,
                { instances: debugInstances }
            ),
            trace: isDev ? buildTrace(results) : undefined,
        };
    } catch (error) {
        return {
            state: 'error',
            error: error instanceof Error ? error.message : String(error),
            meta: {
                engineUsed: 'v10',
                instanceCount: 0,
                multiInstance: false,
                durations: { total: Date.now() - startTime },
                traceLines: trace.toV7Lines(),
            },
        };
    }
}

function buildMeta(
    results: InstanceResult[],
    startTime: number,
    treatmentId: string,
    trace?: V10TraceCollector,
    extractorEngine?: 'stub' | 'llm' | 'forced',
    testOnlyApplied?: boolean,
    kbReleaseId?: string,
    billingGuardResult?: { allowed: ChipWithProvenance[]; blocked: ChipWithProvenance[] },
    combinabilityResult?: CombinabilityCheckResult,
    billingCompletenessResult?: BillingCompletenessResult,
    regelPruefungen?: ReturnType<typeof pruefeRegeln>,
    billingValidationResult?: ReturnType<typeof validateBillingCodes>,
    reasonedExtraction?: V10PipelineMeta['reasonedExtraction'],
    forensicComposer?: V10PipelineMeta['forensicComposer'],
    debug?: V10PipelineMeta['debug']
): V10PipelineMeta {
    // Get KB metadata
    const medicalMeta = defaultMedicalKbProvider.getMeta(kbReleaseId);
    const treatmentMeta = defaultTreatmentKbProvider.getMeta(treatmentId, kbReleaseId);
    const combinabilityMeta = getCombinabilityMeta();

    // M15: Build provenance metadata
    const provenance = results.length > 0 ? {
        askbacks: results.flatMap(r => r.askbackProvenance.map(a => ({
            askbackId: a.askbackId,
            ruleId: a.ruleId,
            sourceRefs: a.sourceRefs,
            scope: r.tooth ? 'tooth' as const : 'session' as const,
            toothScope: r.tooth,
            triggeredByFacts: inferFactKeysForAskback(a.askbackId),
        }))),
        chips: results.flatMap(r => {
            const scope = r.tooth ? 'tooth' as const : 'session' as const;
            const toothScope = r.tooth;
            const sourceSet = new Set<FactSource>([
                ...r.answerSources.values(),
                ...r.settingsFactSources.values(),
            ]);
            if (sourceSet.size === 0) {
                sourceSet.add('dictation');
            }
            const factSources = Array.from(sourceSet);
            return r.chipProvenance.map(c => ({
                chipId: c.chipId,
                emittedByRuleId: c.ruleId,
                factSources,
                sourceRefs: c.sourceRefs,
                scope,
                toothScope,
                billingEligible: billingGuardResult
                    ? billingGuardResult.allowed.some(a => a.chipId === c.chipId)
                    : true,
            }));
        }),
        factSources: results.flatMap(r => {
            const scope = r.tooth ? 'tooth' as const : 'session' as const;
            const toothScope = r.tooth;
            const answerEntries = Array.from(r.answerSources.entries()).map(([key, source]) => ({
                key,
                source,
                origin: 'answer' as const,
                scope,
                toothScope,
            }));
            const settingsEntries = Array.from(r.settingsFactSources.entries()).map(([key, source]) => ({
                key,
                source,
                origin: 'settings' as const,
                scope,
                toothScope,
            }));
            return [...answerEntries, ...settingsEntries];
        }),
        billingGuard: billingGuardResult ? {
            allowed: billingGuardResult.allowed.length,
            blocked: billingGuardResult.blocked.length,
            blockedChipIds: billingGuardResult.blocked.map(b => b.chipId).sort(),
        } : undefined,
    } : undefined;

    const clinicalObligationChecks = results.flatMap(result => result.clinicalObligations ?? []);
    const clinicalObligations = clinicalObligationChecks.length > 0
        ? {
            checks: clinicalObligationChecks,
            summary: {
                done: clinicalObligationChecks.filter(check => check.outcome === 'done').length,
                notDone: clinicalObligationChecks.filter(check => check.outcome === 'not_done').length,
                deferredNextVisit: clinicalObligationChecks.filter(check => check.outcome === 'deferred_next_visit').length,
            },
        }
        : undefined;

    return {
        engineUsed: 'v10',
        instanceCount: results.length,
        multiInstance: results.length > 1 || results.some(r => r.tooth !== undefined),
        durations: {
            total: Date.now() - startTime,
        },
        traceLines: trace?.toV7Lines(),
        extractorEngine,
        testOnlyApplied,
        kbReleaseId: kbReleaseId ?? getActiveKbReleaseId() ?? undefined,
        kb: {
            medical: medicalMeta ? {
                version: medicalMeta.version,
                hash: medicalMeta.hash,
                source: medicalMeta.source,
            } : undefined,
            treatments: treatmentMeta ? {
                [treatmentId]: {
                    version: treatmentMeta.version,
                    hash: treatmentMeta.hash,
                    source: treatmentMeta.source,
                },
            } : undefined,
            combinability: combinabilityMeta ? {
                version: combinabilityMeta.version,
                hash: combinabilityMeta.hash,
                source: 'json',
            } : undefined,
        },
        provenance,
        clinicalObligations,
        combinability: combinabilityResult ? {
            verdict: combinabilityResult.verdict,
            conflicts: combinabilityResult.conflicts.map(c => ({
                ruleId: c.ruleId,
                codesInvolved: c.codesInvolved,
                reason: c.reason,
            })),
            blockedCodes: combinabilityResult.blockedCodes,
            kbVersion: combinabilityResult.kbVersion,
            droppedCodes: combinabilityResult.droppedCodes,
            warnings: combinabilityResult.warnings,
        } : undefined,
        // GP4: Billing completeness
        billingCompleteness: billingCompletenessResult ? {
            isComplete: billingCompletenessResult.isComplete,
            missing: billingCompletenessResult.missing,
            origins: billingCompletenessResult.origins,
        } : undefined,
        billingValidation: billingValidationResult,
        regelPruefungen: regelPruefungen && regelPruefungen.length > 0 ? regelPruefungen : undefined,
        reasonedExtraction,
        forensicComposer,
        debug,
    };
}

function buildTrace(results: InstanceResult[]): V10PipelineTrace {
    return {
        instances: results.map(r => r.trace),
        allRuleHits: [...new Set(results.flatMap(r => r.trace.ruleHits))],
        allChips: [...new Set(results.flatMap(r => r.chips))],
        finalBillingCodes: [],
    };
}
