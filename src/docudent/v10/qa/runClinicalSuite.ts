/**
 * M14: Clinical QA Suite — Review Harness
 *
 * Dev/test utility that runs clinical scenarios and produces
 * human-readable reports for manual review.
 *
 * Usage:
 *   import { runClinicalSuite } from './runClinicalSuite';
 *   const report = await runClinicalSuite(scenarios);
 *   console.log(formatClinicalReport(report));
 */

import { runV10 } from '../public';
import type { V10PipelineInput, V10PipelineOutput } from '../types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ClinicalScenario {
    /** Unique scenario ID */
    id: string;
    /** Description of what this scenario tests */
    description?: string;
    /** Treatment type */
    treatmentId: string;
    /** Insurance type */
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    /** Text length */
    textLength: 'kurz' | 'mittel' | 'lang';
    /** Dictation text */
    dictation: string;
    /** Optional teeth for multi-instance */
    teeth?: string[];
    /** Optional pre-filled answers */
    answers?: Record<string, unknown>;

    // === Expected outcomes (for assertions) ===
    /** Expected required askback IDs (if questions state) */
    expectedAskbacks?: string[];
    /** Expected chips after answering (if output state) */
    expectedChips?: string[];
    /** Expected billing codes to be present */
    expectedBillingPresent?: string[];
    /** Expected billing codes to be absent */
    expectedBillingAbsent?: string[];
    /** Expected text snippets to be present */
    expectedTextPresent?: string[];
    /** Expected text snippets to be absent */
    expectedTextAbsent?: string[];
}

export interface ClinicalScenarioResult {
    scenario: ClinicalScenario;
    /** Pipeline output */
    output: V10PipelineOutput;
    /** Time taken in ms */
    durationMs: number;
    /** Extracted summary */
    extraction?: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
    };
    /** Facts summary */
    facts?: Record<string, unknown>;
    /** Askbacks with metadata */
    askbacks?: {
        required: string[];
        optional: string[];
    };
    /** Emitted chips */
    chips?: string[];
    /** Billing codes */
    billingCodes?: string[];
    /** Rendered text (truncated to 300 chars) */
    renderedTextPreview?: string;
    /** KB metadata */
    kb?: {
        medicalHash?: string;
        treatmentHash?: string;
    };
    /** Key trace lines */
    keyTraceLines?: string[];

    // === Assertion results ===
    assertions: {
        passed: boolean;
        failures: string[];
    };
}

export interface ClinicalSuiteReport {
    /** Total scenarios run */
    totalScenarios: number;
    /** Scenarios that passed all assertions */
    passedCount: number;
    /** Scenarios that failed assertions */
    failedCount: number;
    /** Total duration in ms */
    totalDurationMs: number;
    /** Individual results */
    results: ClinicalScenarioResult[];
    /** Summary of failures by category */
    failureSummary: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════

/**
 * Run a suite of clinical scenarios and collect results.
 */
export async function runClinicalSuite(
    scenarios: ClinicalScenario[]
): Promise<ClinicalSuiteReport> {
    const results: ClinicalScenarioResult[] = [];
    const startTime = Date.now();

    // Sort scenarios by ID for deterministic ordering
    const sortedScenarios = [...scenarios].sort((a, b) => a.id.localeCompare(b.id));

    for (const scenario of sortedScenarios) {
        const result = await runScenario(scenario);
        results.push(result);
    }

    // Compute summary
    const passedCount = results.filter(r => r.assertions.passed).length;
    const failedCount = results.filter(r => !r.assertions.passed).length;

    // Categorize failures
    const failureSummary: Record<string, number> = {};
    for (const result of results) {
        for (const failure of result.assertions.failures) {
            const category = categorizeFailure(failure);
            failureSummary[category] = (failureSummary[category] ?? 0) + 1;
        }
    }

    return {
        totalScenarios: scenarios.length,
        passedCount,
        failedCount,
        totalDurationMs: Date.now() - startTime,
        results,
        failureSummary,
    };
}

async function runScenario(scenario: ClinicalScenario): Promise<ClinicalScenarioResult> {
    const startTime = Date.now();

    const input: V10PipelineInput = {
        dictation: scenario.dictation,
        treatmentId: scenario.treatmentId,
        insuranceType: scenario.insuranceType,
        textLength: scenario.textLength,
        teeth: scenario.teeth,
        answers: scenario.answers ? new Map(Object.entries(scenario.answers)) : undefined,
    };

    const output = await runV10(input);
    const durationMs = Date.now() - startTime;

    // Extract info from output/trace
    const extraction = output.trace?.instances?.[0]?.extractedSummary;
    const facts = output.trace?.instances?.[0]?.facts as Record<string, unknown> | undefined;
    const askbacks = output.trace?.instances?.[0]?.askbacks;
    const chips = output.trace?.allChips ?? [];
    const billingCodes = output.output?.billingCodes ?? [];
    const renderedTextPreview = output.output?.fullText?.slice(0, 300);

    // KB metadata
    const kb = output.meta.kb ? {
        medicalHash: output.meta.kb.medical?.hash,
        treatmentHash: output.meta.kb.treatments?.[scenario.treatmentId]?.hash,
    } : undefined;

    // Key trace lines (filter to important ones)
    const keyTraceLines = (output.meta.traceLines ?? []).filter(line =>
        line.startsWith('kb_medical:') ||
        line.startsWith('kb_treatment:') ||
        line.startsWith('gate:') ||
        line.startsWith('medical_summary:')
    );

    // Run assertions
    const assertions = runAssertions(scenario, output, chips, billingCodes, renderedTextPreview);

    return {
        scenario,
        output,
        durationMs,
        extraction,
        facts,
        askbacks,
        chips,
        billingCodes,
        renderedTextPreview,
        kb,
        keyTraceLines,
        assertions,
    };
}

// ═══════════════════════════════════════════════════════════════
// ASSERTIONS
// ═══════════════════════════════════════════════════════════════

function runAssertions(
    scenario: ClinicalScenario,
    output: V10PipelineOutput,
    chips: string[],
    billingCodes: string[],
    renderedText?: string
): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    // Check expected askbacks (only if questions state)
    if (scenario.expectedAskbacks && scenario.expectedAskbacks.length > 0) {
        if (output.state === 'questions') {
            const questionIds = output.questions?.map(q => q.id) ?? [];
            for (const expected of scenario.expectedAskbacks) {
                // Check if any question ID contains the expected askback
                const found = questionIds.some(id =>
                    id.includes(expected) || id === expected
                );
                if (!found) {
                    failures.push(`missing_askback:${expected}`);
                }
            }
        } else {
            failures.push(`expected_questions_state_but_got:${output.state}`);
        }
    }

    // Check expected chips (only if output state)
    if (scenario.expectedChips && scenario.expectedChips.length > 0) {
        if (output.state === 'output') {
            for (const expected of scenario.expectedChips) {
                if (!chips.includes(expected)) {
                    failures.push(`missing_chip:${expected}`);
                }
            }
        }
    }

    // Check billing presence
    if (scenario.expectedBillingPresent) {
        for (const expected of scenario.expectedBillingPresent) {
            if (!billingCodes.includes(expected)) {
                failures.push(`missing_billing:${expected}`);
            }
        }
    }

    // Check billing absence
    if (scenario.expectedBillingAbsent) {
        for (const unexpected of scenario.expectedBillingAbsent) {
            if (billingCodes.includes(unexpected)) {
                failures.push(`unexpected_billing:${unexpected}`);
            }
        }
    }

    // Check text presence
    if (scenario.expectedTextPresent && renderedText) {
        for (const expected of scenario.expectedTextPresent) {
            if (!renderedText.toLowerCase().includes(expected.toLowerCase())) {
                failures.push(`missing_text:${expected}`);
            }
        }
    }

    // Check text absence
    if (scenario.expectedTextAbsent && renderedText) {
        for (const unexpected of scenario.expectedTextAbsent) {
            if (renderedText.toLowerCase().includes(unexpected.toLowerCase())) {
                failures.push(`unexpected_text:${unexpected}`);
            }
        }
    }

    return {
        passed: failures.length === 0,
        failures,
    };
}

function categorizeFailure(failure: string): string {
    if (failure.startsWith('missing_askback:')) return 'missing_askbacks';
    if (failure.startsWith('missing_chip:')) return 'missing_chips';
    if (failure.startsWith('missing_billing:')) return 'missing_billing';
    if (failure.startsWith('unexpected_billing:')) return 'unexpected_billing';
    if (failure.startsWith('missing_text:')) return 'missing_text';
    if (failure.startsWith('unexpected_text:')) return 'unexpected_text';
    if (failure.startsWith('expected_questions_state')) return 'wrong_state';
    return 'other';
}

// ═══════════════════════════════════════════════════════════════
// FORMATTER
// ═══════════════════════════════════════════════════════════════

/**
 * Format a clinical report as human-readable text.
 */
export function formatClinicalReport(report: ClinicalSuiteReport): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                    CLINICAL QA SUITE REPORT');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Total Scenarios: ${report.totalScenarios}`);
    lines.push(`Passed: ${report.passedCount}`);
    lines.push(`Failed: ${report.failedCount}`);
    lines.push(`Duration: ${report.totalDurationMs}ms`);
    lines.push('');

    if (Object.keys(report.failureSummary).length > 0) {
        lines.push('Failure Summary:');
        for (const [category, count] of Object.entries(report.failureSummary).sort()) {
            lines.push(`  ${category}: ${count}`);
        }
        lines.push('');
    }

    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                       INDIVIDUAL RESULTS');
    lines.push('───────────────────────────────────────────────────────────────');

    for (const result of report.results) {
        lines.push('');
        lines.push(`[${result.assertions.passed ? '✓' : '✗'}] ${result.scenario.id}`);
        if (result.scenario.description) {
            lines.push(`    ${result.scenario.description}`);
        }
        lines.push(`    Treatment: ${result.scenario.treatmentId} | Insurance: ${result.scenario.insuranceType}`);
        lines.push(`    State: ${result.output.state} | Duration: ${result.durationMs}ms`);

        if (result.extraction) {
            lines.push(`    Extraction: tooth=${result.extraction.tooth ?? 'none'}, surfaces=[${result.extraction.surfaces.join(',')}]`);
        }

        if (result.askbacks && (result.askbacks.required.length > 0 || result.askbacks.optional.length > 0)) {
            lines.push(`    Askbacks: required=[${result.askbacks.required.join(',')}], optional=[${result.askbacks.optional.slice(0, 3).join(',')}${result.askbacks.optional.length > 3 ? '...' : ''}]`);
        }

        if (result.chips && result.chips.length > 0) {
            lines.push(`    Chips: [${result.chips.slice(0, 5).join(',')}${result.chips.length > 5 ? '...' : ''}]`);
        }

        if (result.billingCodes && result.billingCodes.length > 0) {
            lines.push(`    Billing: [${result.billingCodes.join(',')}]`);
        }

        if (result.renderedTextPreview) {
            const preview = result.renderedTextPreview.replace(/\n/g, ' ').slice(0, 100);
            lines.push(`    Text: "${preview}${result.renderedTextPreview.length > 100 ? '...' : ''}"`);
        }

        if (result.kb) {
            lines.push(`    KB: medical=${result.kb.medicalHash?.slice(0, 8)}... treatment=${result.kb.treatmentHash?.slice(0, 8)}...`);
        }

        if (!result.assertions.passed) {
            lines.push(`    FAILURES: ${result.assertions.failures.join(', ')}`);
        }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// M18: PACK INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Run clinical suite using scenarios from treatment packs.
 *
 * @param packIds - Optional list of pack IDs to run. If not provided, runs all packs.
 * @returns Clinical suite report
 */
export async function runClinicalSuiteFromPacks(
    packIds?: string[]
): Promise<ClinicalSuiteReport> {
    // Dynamic import to avoid circular dependencies
    const { listPacks, getPack, hasPack } = await import('../packs');

    const packsToRun = packIds
        ? packIds.filter(hasPack).map(id => getPack(id))
        : listPacks();

    const scenarios = packsToRun.flatMap(pack => pack.getGoldenClinicalScenarios());

    return runClinicalSuite(scenarios);
}
