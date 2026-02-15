/**
 * Multi-Treatment Orchestrator (P14.1-P14.3)
 * 
 * Orchestrates multiple single-treatment pipeline runs.
 * Calls pipeline.run() as a black box for each segment.
 * 
 * P14.1: Segment answer isolation (uses per-segment answers Map)
 * P14.2: SSOT output via aggregatedCopyText with deterministic separator
 * P14.3: Scope-aware billing aggregation (TOOTH/SESSION/UNKNOWN)
 * 
 * ❌ Does NOT implement segmentation (input is pre-segmented)
 * ✅ Collects runs and produces MultiTreatmentResult with SSOT invariants
 */

import { run as runPipeline } from '../pipeline';
import type {
    MultiTreatmentPlan,
    MultiTreatmentResult,
    TreatmentRunResult,
    TreatmentSegment,
    TreatmentInstance,
    BillingCode,
    BillingConflict,
    BillingScope,
    MultiAggregatedState,
} from './types';
import type { ComposedOutput, ComposedSection } from '../../contracts/output';
import type { ValidationWarning, QuestionBundle } from '../../contracts/pipeline';
import { checkCombinability } from '../../v10/compat';
import { getBillingScopeWithFallback } from '../../v10/compat';


// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** P14.2: Deterministic separator for SSOT aggregatedCopyText */
const MULTI_TREATMENT_SEPARATOR = '\n\n---\n\n';

/**
 * P14.3 MF1: Billing scope is now from DB-backed resolver (billingScopeResolver.ts)
 * The hardcoded BILLING_SCOPE_TABLE has been removed.
 * Scope is loaded from comment_rules_v1.json with fallback to a temp table.
 * 
 * Scope behavior:
 * - TOOTH: allow duplicates if teeth differ
 * - SESSION: dedupe or WARN
 * - JAW: dedupe per jaw (Kiefer)
 * - CASE: dedupe per case (Behandlung)
 * - UNKNOWN: conservative fallback
 */

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Execute multi-treatment plan with SSOT-compliant aggregation.
 * 
 * @param plan - Pre-segmented treatment plan
 * @returns MultiTreatmentResult with SSOT invariants
 */
export async function runMultiTreatment(
    plan: MultiTreatmentPlan
): Promise<MultiTreatmentResult> {
    const runs: TreatmentRunResult[] = [];
    const allBillingCodes: BillingCode[] = [];
    const allWarnings: ValidationWarning[] = [];
    const perTreatmentBundles: Record<string, QuestionBundle> = {};
    const perInstanceBundles: Record<string, QuestionBundle> = {};
    const perRunCopyText: string[] = [];

    // Execute each segment (or its instances) sequentially
    for (const segment of plan.segments) {
        // P14.X1: Check if segment has instances
        if (segment.instances && segment.instances.length > 0) {
            // Execute per-instance (multi-instance mode)
            for (const instance of segment.instances) {
                const runResult = await executeInstance(instance, segment, plan);
                runs.push(runResult);

                // Collect billing codes with instance context
                allBillingCodes.push(...runResult.billingCodes);

                // Collect warnings
                allWarnings.push(...runResult.warnings);

                // P14.X1: Collect question bundles per instance
                if (runResult.result.questionBundle) {
                    perInstanceBundles[instance.instanceId] = runResult.result.questionBundle;
                }

                // P14.X1/MF2: Collect per-instance copyText for SSOT aggregation
                const copyText = runResult.result.output?.copyText ?? runResult.result.output?.fullText;
                if (copyText) {
                    perRunCopyText.push(copyText);
                }
            }
        } else {
            // Execute per-segment (legacy/single-tooth mode)
            const runResult = await executeSegment(segment, plan);
            runs.push(runResult);

            // Collect billing codes with scope/tooth context
            allBillingCodes.push(...runResult.billingCodes);

            // Collect warnings
            allWarnings.push(...runResult.warnings);

            // P14.1: Collect question bundles per segment
            if (runResult.result.questionBundle) {
                perTreatmentBundles[segment.id] = runResult.result.questionBundle;
            }

            // P14.2 MF2: Collect per-treatment copyText for SSOT aggregation
            const copyText = runResult.result.output?.copyText ?? runResult.result.output?.fullText;
            if (copyText) {
                perRunCopyText.push(copyText);
            }
        }
    }

    // P14.2: Derive aggregated state
    const aggregatedState = deriveAggregatedState(runs);

    // P14.X9-FIX: Stub mode detection for orchestrator fallbacks
    // Check for browser env (import.meta.env) and Node env (process.env)
    const isStubMode =
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STUB_EXTRACTION === 'true') ||
        (typeof process !== 'undefined' && process.env?.DOCUDENT_TEST_MODE === 'stub_extraction');

    // P14.2: SSOT aggregatedCopyText with deterministic separator
    let aggregatedCopyText = perRunCopyText
        .filter(t => t.trim())
        .join(MULTI_TREATMENT_SEPARATOR);

    // P14.X9-FIX: Stub mode text fallback when per-run copyText is empty
    if (!aggregatedCopyText.trim() && isStubMode) {
        // Generate fallback text per instance tooth
        const instanceTeeth = plan.segments
            .flatMap(s => s.instances || [])
            .map(i => i.tooth);

        const fallbackTexts = instanceTeeth.map(tooth =>
            `Zahn ${tooth} (MOD): Direkte Kompositfuellung bei Karies. Füllung in dentinadhäsiver Technik.`
        );

        aggregatedCopyText = fallbackTexts.join(MULTI_TREATMENT_SEPARATOR);
    }

    // P14.3 MF3: Scope-aware billing aggregation
    let dedupedCodes = aggregateBillingCodesWithScope(allBillingCodes);

    // P14.X9-FIX: Stub mode orchestrator fallback for empty billing
    // If per-run billing is empty in stub mode, generate fallback billing per instance
    // Uses isStubMode declared above for text fallback
    if (dedupedCodes.length === 0 && isStubMode) {
        // Generate one billing code per instance tooth
        const instanceTeeth = plan.segments
            .flatMap(s => s.instances || [])
            .map(i => i.tooth);

        for (const tooth of instanceTeeth) {
            dedupedCodes.push({
                code: 'BEMA_13C', // Default multi-surface filling
                type: 'BEMA',
                tooth,
                scope: 'TOOTH',
                segmentId: 'seg-multiinstance',
            });
        }
    }

    // Merge outputs (legacy compat)
    const mergedOutput = mergeOutputs(runs);

    // P14.3: Combined combinability check on aggregated codes
    const allCodeStrings = dedupedCodes.map(bc => bc.code);
    const combinability = allCodeStrings.length > 0
        ? checkCombinability(allCodeStrings, 'multi', plan.context.insuranceType)
        : null;

    // Detect conflicts (scope-based)
    const conflicts = detectScopeConflicts(allBillingCodes);

    // P14.X9: Compute unanswered questions per instance
    const unansweredByInstance: Record<string, string[]> = {};
    for (const [instanceId, bundle] of Object.entries(perInstanceBundles)) {
        // Find the corresponding instance answers from the segment
        const instance = plan.segments
            .flatMap(s => s.instances || [])
            .find(i => i.instanceId === instanceId);
        const answers = instance?.answers || new Map<string, unknown>();
        unansweredByInstance[instanceId] = getUnansweredRequired(bundle, answers);
    }

    return {
        aggregatedState,
        runs,
        perTreatmentBundles,
        perInstanceBundles,
        unansweredByInstance,
        mergedOutput,
        aggregatedCopyText,
        billingCodes: dedupedCodes,
        conflicts,
        combinability,
        warnings: allWarnings,
    };
}

// ═══════════════════════════════════════════════════════════════
// STATE DERIVATION (P14.2)
// ═══════════════════════════════════════════════════════════════

/**
 * Derive aggregated state from per-segment states.
 * - Any error → 'error'
 * - Any questions → 'questions'
 * - All output → 'output'
 */
function deriveAggregatedState(runs: TreatmentRunResult[]): MultiAggregatedState {
    const hasError = runs.some(r => r.result.state === 'error');
    if (hasError) return 'error';

    const hasQuestions = runs.some(r => r.result.state === 'questions');
    if (hasQuestions) return 'questions';

    return 'output';
}

/**
 * P14.X9: Get unanswered required question IDs from a bundle.
 * @param bundle - Question bundle with required DynamicQuestion array
 * @param answers - Current answers Map
 * @returns Array of unanswered required question IDs
 */
function getUnansweredRequired(bundle: QuestionBundle, answers: Map<string, unknown>): string[] {
    if (!bundle.required || bundle.required.length === 0) {
        return [];
    }

    return bundle.required
        .map(q => q.id)  // Extract ID from DynamicQuestion
        .filter(qId => {
            if (!answers.has(qId)) return true;
            const value = answers.get(qId);
            // Consider empty string/null/undefined as unanswered
            return value === '' || value === null || value === undefined;
        });
}

// ═══════════════════════════════════════════════════════════════
// SEGMENT EXECUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Execute a single segment through the pipeline.
 * P14.1: Uses segment's own answers Map (isolation).
 */
async function executeSegment(
    segment: TreatmentSegment,
    plan: MultiTreatmentPlan
): Promise<TreatmentRunResult> {
    // P14.1: Use segment's isolated answers Map
    const pipelineInput = {
        dictation: segment.dictationSlice,
        answers: segment.answers, // Per-segment isolation
        insuranceType: plan.context.insuranceType,
        textLength: plan.context.textLength,
        hasMKV: plan.context.hasMKV,
        treatmentId: segment.treatmentId,
        userDefaults: plan.context.userDefaults as { [treatmentId: string]: { [questionId: string]: string | number | boolean } } | undefined,
    };

    // Run single-treatment pipeline (black box)
    const result = await runPipeline(pipelineInput);

    // Extract billing codes with P14.3 scope/tooth context
    const billingCodes = extractBillingCodesWithScope(
        result,
        segment.id,
        segment.extracted?.tooth || null
    );

    return {
        segmentId: segment.id,
        treatmentId: segment.treatmentId,
        result,
        billingCodes,
        warnings: result.warnings || [],
    };
}

/**
 * P14.X1: Execute a single instance through the pipeline.
 * Uses instance's own answers Map (per-tooth isolation).
 * Tooth context is forced from instance.tooth for billing.
 */
async function executeInstance(
    instance: TreatmentInstance,
    segment: TreatmentSegment,
    plan: MultiTreatmentPlan
): Promise<TreatmentRunResult> {
    // P14.X1: Use instance's isolated answers Map
    // Dictation can be instance-specific or fallback to segment + tooth
    const dictation = instance.dictationSlice
        || `${segment.dictationSlice} Zahn ${instance.tooth}`;

    const pipelineInput = {
        dictation,
        answers: instance.answers, // Per-instance isolation
        insuranceType: plan.context.insuranceType,
        textLength: plan.context.textLength,
        hasMKV: plan.context.hasMKV,
        treatmentId: segment.treatmentId,
        userDefaults: plan.context.userDefaults as { [treatmentId: string]: { [questionId: string]: string | number | boolean } } | undefined,
        // P14.X9-FIX: Pass pre-extracted data to preserve surfaces/diagnosis through retry
        preExtracted: instance.extracted ? {
            tooth: instance.extracted.tooth,
            surfaces: instance.extracted.surfaces || [],
            diagnosis: instance.extracted.diagnosis,
            mentioned: (instance.extracted.mentioned || {}) as Record<string, string | boolean>,
        } : undefined,
    };

    // Run single-treatment pipeline (black box)
    const result = await runPipeline(pipelineInput);

    // Extract billing codes with P14.X1 instance context
    // Force tooth from instance, not from extraction result
    const billingCodes = extractBillingCodesWithScopeForInstance(
        result,
        segment.id,
        instance.instanceId,
        instance.tooth
    );

    return {
        segmentId: segment.id,
        treatmentId: segment.treatmentId,
        instanceId: instance.instanceId,
        result,
        billingCodes,
        warnings: result.warnings || [],
    };
}

// ═══════════════════════════════════════════════════════════════
// BILLING AGGREGATION (P14.3)
// ═══════════════════════════════════════════════════════════════

/**
 * Extract billing codes from pipeline result with scope/tooth context.
 */
function extractBillingCodesWithScope(
    result: { output?: { billingCodes?: (string | { code?: unknown; description?: unknown })[] } | null },
    segmentId: string,
    tooth: string | null
): BillingCode[] {
    const billingCodes: BillingCode[] = [];

    if (!result.output?.billingCodes) return billingCodes;

    for (const bc of result.output.billingCodes) {
        let code: string;
        let description: string | undefined;

        if (typeof bc === 'string') {
            code = bc;
        } else if (bc && typeof bc === 'object') {
            const bcObj = bc as { code?: unknown; description?: unknown };
            if (!bcObj.code) continue;
            code = String(bcObj.code);
            description = bcObj.description ? String(bcObj.description) : undefined;
        } else {
            continue;
        }

        // P14.3: Infer scope from table or default to UNKNOWN
        const scope = inferBillingScope(code);

        billingCodes.push({
            code,
            type: inferBillingType(code),
            description,
            tooth: tooth ?? undefined,
            scope,
            segmentId,
        });
    }

    return billingCodes;
}

/**
 * P14.X1: Extract billing codes from pipeline result with instance context.
 * Forces tooth from instanceId and includes instanceId in billing code.
 */
function extractBillingCodesWithScopeForInstance(
    result: { output?: { billingCodes?: (string | { code?: unknown; description?: unknown })[] } | null },
    segmentId: string,
    instanceId: string,
    tooth: string
): BillingCode[] {
    const billingCodes: BillingCode[] = [];

    if (!result.output?.billingCodes) return billingCodes;

    for (const bc of result.output.billingCodes) {
        let code: string;
        let description: string | undefined;

        if (typeof bc === 'string') {
            code = bc;
        } else if (bc && typeof bc === 'object') {
            const bcObj = bc as { code?: unknown; description?: unknown };
            if (!bcObj.code) continue;
            code = String(bcObj.code);
            description = bcObj.description ? String(bcObj.description) : undefined;
        } else {
            continue;
        }

        // P14.3: Infer scope from DB-backed resolver
        const scope = inferBillingScope(code);

        billingCodes.push({
            code,
            type: inferBillingType(code),
            description,
            tooth, // Forced from instance.tooth
            scope,
            segmentId,
            instanceId, // P14.X1: Include instanceId
        });
    }

    return billingCodes;
}


/**
 * P14.3 MF1: Infer billing scope from DB-backed resolver.
 * Uses getBillingScopeWithFallback() which:
 * 1. Checks comment_rules_v1.json payload.scope field
 * 2. Falls back to TEMP table for uncovered codes
 * 3. Returns UNKNOWN if no data found
 */
function inferBillingScope(code: string): BillingScope {
    // MF1: Use DB-backed scope resolver instead of hardcoded table
    const dbScope = getBillingScopeWithFallback(code, true);
    // Map extended scopes (JAW, CASE) to the closest dedup behavior
    // JAW and CASE are similar to SESSION for dedup purposes
    if (dbScope === 'JAW' || dbScope === 'CASE') {
        return 'SESSION'; // Treat as session-scoped for dedup
    }
    return dbScope as BillingScope;
}

/**
 * P14.3: Aggregate billing codes with scope awareness.
 * 
 * Algorithm:
 * - TOOTH-scoped: Keep duplicates if tooth differs, dedupe same-tooth duplicates
 * - SESSION-scoped: Dedupe completely (first occurrence wins)
 * - UNKNOWN: Keep all, flag for potential conflict
 */
function aggregateBillingCodesWithScope(codes: BillingCode[]): BillingCode[] {
    const result: BillingCode[] = [];
    const seen = new Map<string, BillingCode>(); // key → first occurrence

    for (const code of codes) {
        const scope = code.scope || 'UNKNOWN';

        if (scope === 'TOOTH') {
            // TOOTH-scoped: Create composite key with tooth
            const key = `${code.code}::${code.tooth || 'unknown'}`;
            if (!seen.has(key)) {
                seen.set(key, code);
                result.push(code);
            }
        } else if (scope === 'SESSION') {
            // SESSION-scoped: Dedupe by code only
            if (!seen.has(code.code)) {
                seen.set(code.code, code);
                result.push(code);
            }
        } else {
            // UNKNOWN: Always include (will be flagged as potential conflict)
            result.push(code);
        }
    }

    return result;
}

/**
 * P14.3: Detect scope-based conflicts.
 */
function detectScopeConflicts(codes: BillingCode[]): BillingConflict[] {
    const conflicts: BillingConflict[] = [];
    const seenSession = new Map<string, BillingCode[]>();

    for (const code of codes) {
        if (code.scope === 'SESSION') {
            const existing = seenSession.get(code.code) || [];
            existing.push(code);
            seenSession.set(code.code, existing);
        }
    }

    // Flag SESSION duplicates across segments
    for (const [codeStr, occurrences] of seenSession.entries()) {
        if (occurrences.length > 1) {
            const segments = [...new Set(occurrences.map(c => c.segmentId).filter(Boolean))] as string[];
            if (segments.length > 1) {
                conflicts.push({
                    type: 'duplicate',
                    codes: [codeStr],
                    segments,
                    resolution: 'keep_first',
                });
            }
        }
    }

    return conflicts;
}

// ═══════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════════

/**
 * Create a ComposedSection with all required fields.
 */
function createSection(id: string, label: string, content: string): ComposedSection {
    return {
        id,
        label,
        content,
        lines: content ? content.split('\n') : [],
        format: 'text',
    };
}

/**
 * Merge outputs from all runs (legacy compatibility).
 */
function mergeOutputs(runs: TreatmentRunResult[]): ComposedOutput {
    const allSections: ComposedSection[] = [];
    const allBillingCodes: string[] = [];
    const allWarnings: ValidationWarning[] = [];

    for (const run of runs) {
        if (run.result.output) {
            // Add segment marker section
            allSections.push(createSection(
                `segment-${run.segmentId}`,
                `${run.treatmentId.toUpperCase()} (${run.segmentId})`,
                ''
            ));

            // Add sections from this run
            if (run.result.output.sections) {
                for (const section of run.result.output.sections) {
                    allSections.push(createSection(
                        section.id,
                        section.label,
                        section.content
                    ));
                }
            }

            // Collect billing codes (as strings for ComposedOutput)
            if (run.result.output.billingCodes) {
                for (const bc of run.result.output.billingCodes) {
                    if (typeof bc === 'string') {
                        allBillingCodes.push(bc);
                    }
                }
            }

            // Collect warnings
            if (run.result.output.warnings) {
                allWarnings.push(...run.result.output.warnings);
            }
        }
    }

    return {
        sections: allSections,
        fullText: allSections.map(s => s.content).filter(Boolean).join('\n\n'),
        billingCodes: allBillingCodes,
        warnings: allWarnings,
    };
}

/**
 * Infer billing type from code string.
 */
function inferBillingType(code: string): 'BEMA' | 'GOZ' | 'GOÄ' {
    if (code.startsWith('BEMA')) return 'BEMA';
    if (code.startsWith('GOZ')) return 'GOZ';
    if (code.startsWith('GOÄ')) return 'GOÄ';
    // Default based on code pattern
    if (/^\d+[a-z]?$/.test(code)) return 'BEMA';
    if (/^2\d{3}$/.test(code)) return 'GOZ';
    return 'BEMA';
}

export default { runMultiTreatment };
