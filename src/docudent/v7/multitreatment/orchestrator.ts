/**
 * Multi-Treatment Orchestrator
 * 
 * Orchestrates multiple single-treatment pipeline runs.
 * Calls pipeline.run() as a black box for each segment.
 * 
 * ❌ Does NOT implement segmentation (input is pre-segmented)
 * ❌ Does NOT implement billing rules (structural dedupe only)
 * ✅ Collects runs and produces MultiTreatmentResult
 */

import { run as runPipeline } from '../pipeline';
import type {
    MultiTreatmentPlan,
    MultiTreatmentResult,
    TreatmentRunResult,
    TreatmentSegment,
    BillingCode,
    BillingConflict,
} from './types';
import type { ComposedOutput, ComposedSection } from '../../contracts/output';
import type { ValidationWarning } from '../../contracts/warnings';

/**
 * Execute multi-treatment plan.
 * 
 * @param plan - Pre-segmented treatment plan
 * @returns MultiTreatmentResult with all runs and merged output
 */
export async function runMultiTreatment(
    plan: MultiTreatmentPlan
): Promise<MultiTreatmentResult> {
    const runs: TreatmentRunResult[] = [];
    const allBillingCodes: BillingCode[] = [];
    const allWarnings: ValidationWarning[] = [];

    // Execute each segment sequentially
    for (const segment of plan.segments) {
        const runResult = await executeSegment(segment, plan);
        runs.push(runResult);

        // Collect billing codes
        allBillingCodes.push(...runResult.billingCodes);

        // Collect warnings
        allWarnings.push(...runResult.warnings);
    }

    // Deduplicate billing codes (structural dedupe only)
    const dedupedCodes = deduplicateBillingCodes(allBillingCodes);

    // Merge outputs (placeholder merge)
    const mergedOutput = mergeOutputs(runs);

    // Conflicts placeholder (not implemented)
    const conflicts: BillingConflict[] = [];

    return {
        runs,
        mergedOutput,
        billingCodes: dedupedCodes,
        conflicts,
        warnings: allWarnings,
    };
}

/**
 * Execute a single segment through the pipeline.
 */
async function executeSegment(
    segment: TreatmentSegment,
    plan: MultiTreatmentPlan
): Promise<TreatmentRunResult> {
    // Build pipeline input from segment + context
    // Cast userDefaults to expected type
    const pipelineInput = {
        dictation: segment.dictationSlice,
        answers: segment.answers,
        insuranceType: plan.context.insuranceType,
        textLength: plan.context.textLength,
        hasMKV: plan.context.hasMKV,
        treatmentId: segment.treatmentId,
        userDefaults: plan.context.userDefaults as { [treatmentId: string]: { [questionId: string]: string | number | boolean } } | undefined,
    };

    // Run single-treatment pipeline (black box)
    const result = await runPipeline(pipelineInput);

    // Extract billing codes from output
    const billingCodes: BillingCode[] = [];
    if (result.output?.billingCodes) {
        for (const bc of result.output.billingCodes) {
            if (typeof bc === 'string') {
                billingCodes.push(parseBillingCode(bc));
            } else if (bc && typeof bc === 'object') {
                const bcObj = bc as { code?: unknown; description?: unknown };
                if (bcObj.code) {
                    billingCodes.push({
                        code: String(bcObj.code),
                        type: inferBillingType(String(bcObj.code)),
                        description: bcObj.description ? String(bcObj.description) : undefined,
                    });
                }
            }
        }
    }

    return {
        segmentId: segment.id,
        treatmentId: segment.treatmentId,
        result,
        billingCodes,
        warnings: result.warnings || [],
    };
}

/**
 * Deduplicate billing codes by code string.
 */
function deduplicateBillingCodes(codes: BillingCode[]): BillingCode[] {
    const seen = new Set<string>();
    const result: BillingCode[] = [];

    for (const code of codes) {
        if (!seen.has(code.code)) {
            seen.add(code.code);
            result.push(code);
        }
    }

    return result;
}

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
 * Merge outputs from all runs (placeholder implementation).
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
 * Parse billing code string into BillingCode object.
 */
function parseBillingCode(codeStr: string): BillingCode {
    return {
        code: codeStr,
        type: inferBillingType(codeStr),
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
