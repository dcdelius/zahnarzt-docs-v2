/**
 * ExplainRun V10
 *
 * Generates a deterministic "full circle" explanation report for any V10 run.
 * Reports what happened: extraction → facts → rules → chips → billing → text.
 */

import * as crypto from 'crypto';
import type {
    ExplainRunReport,
    ExplainRunOptions,
    ExplainRunResult,
    FactEntry,
    FiredRule,
    AskbackMapping,
    ChipEntry,
    BillingCodeEntry,
    TextBlock,
    CombinabilityResult,
    KbMetaCollection,
    ExtractionSummary,
    InstanceReport,
} from './explainSchema.v1';
import type { V10PipelineInput, V10PipelineOutput } from '../pipeline/runV10';
import type { V10BundleInput, V10BundleOutput } from '../pipeline/runV10Bundle';

// ═══════════════════════════════════════════════════════════════════════════
// STABLE STRINGIFY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deterministic JSON stringify with sorted keys.
 * Excludes time-based fields from hash computation.
 */
function stableStringify(obj: unknown, excludeKeys: Set<string> = new Set()): string {
    return JSON.stringify(obj, (key, value) => {
        // Exclude time-based fields for determinism
        if (excludeKeys.has(key)) {
            return undefined;
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value).sort().reduce((sorted: Record<string, unknown>, k) => {
                sorted[k] = (value as Record<string, unknown>)[k];
                return sorted;
            }, {});
        }
        return value;
    }, 2);
}

/**
 * Compute SHA256 hash of stable JSON.
 * Excludes: generatedAt, checkedAt, stableHash (time-based or self-referential)
 */
function computeStableHash(report: ExplainRunReport): string {
    const excludeKeys = new Set(['generatedAt', 'checkedAt', 'stableHash']);
    const content = stableStringify(report, excludeKeys);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKDOWN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateMarkdown(report: ExplainRunReport): string {
    const lines: string[] = [
        `# ExplainRun Report`,
        '',
        `**Generated**: ${report.generatedAt}`,
        `**Hash**: \`${report.stableHash}\``,
        '',
        '---',
        '',
        '## Input',
        '',
        `| Property | Value |`,
        `|----------|-------|`,
        `| Treatment | ${report.input.treatmentId} |`,
        `| Insurance | ${report.input.insuranceType} |`,
        `| Teeth | ${report.input.teethCount} |`,
        `| Dictation | "${report.input.dictationPreview}..." |`,
        '',
        '## Extraction',
        '',
        `- Engine: ${report.extraction.engine}`,
        `- Tooth: ${report.extraction.tooth || 'N/A'}`,
        `- Surfaces: ${report.extraction.surfaces?.join(', ') || 'N/A'}`,
        '',
        '## Facts',
        '',
        `| Key | Value | Source | Confirmed |`,
        `|-----|-------|--------|-----------|`,
        ...report.facts.map(f => `| ${f.factKey} | ${JSON.stringify(f.value)} | ${f.source} | ${f.confirmed} |`),
        '',
        '## Fired Rules',
        '',
        `| Rule ID | Type | Scope | Outcome |`,
        `|---------|------|-------|---------|`,
        ...report.firedRules.map(r => `| ${r.ruleId} | ${r.ruleType} | ${r.scope} | ${r.outcome} |`),
        '',
        '## Chips',
        '',
        `| Chip ID | Scope | Billing Eligible | Blocked |`,
        `|---------|-------|------------------|---------|`,
        ...report.chips.map(c => `| ${c.chipId} | ${c.scope} | ${c.billingEligible} | ${c.blockedByGuard} |`),
        '',
        '## Billing Codes',
        '',
        `| Code | System | Source Chip | Scope |`,
        `|------|--------|-------------|-------|`,
        ...report.billingCodes.map(b => `| ${b.code} | ${b.codeSystem} | ${b.sourceChipId} | ${b.scope} |`),
        '',
        '## Combinability',
        '',
        `**Verdict**: ${report.combinability.verdict.toUpperCase()}`,
        '',
        ...(report.combinability.conflicts.length > 0 ? [
            '### Conflicts',
            '',
            ...report.combinability.conflicts.map(c => `- ${c.ruleId}: ${c.codesInvolved.join(' + ')} (${c.severity})`),
        ] : ['No conflicts.']),
        ...(report.combinability.warnings && report.combinability.warnings.length > 0 ? [
            '',
            '### Warnings',
            '',
            ...report.combinability.warnings.map(w => `- ${w}`),
        ] : []),
        '',
        '## Text Blocks',
        '',
        ...report.textBlocks.map(t => `### Block ${t.blockIndex}: ${t.sectionKey}\n\n${t.text}\n\nChips: ${t.sourceChipIds.join(', ')}`),
        '',
        '## KB Metadata',
        '',
        `| KB | Version | Hash |`,
        `|----|---------|------|`,
        `| Medical | ${report.kbMeta.medical.version} | ${report.kbMeta.medical.hash.slice(0, 8)} |`,
        `| Treatment | ${report.kbMeta.treatment.version} | ${report.kbMeta.treatment.hash.slice(0, 8)} |`,
        `| Combinability | ${report.kbMeta.combinability.version} | ${report.kbMeta.combinability.hash.slice(0, 8)} |`,
    ];

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT BUILDER FROM OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build ExplainRunReport from V10PipelineOutput.
 */
export function buildExplainReportFromOutput(
    input: V10PipelineInput,
    output: V10PipelineOutput,
): ExplainRunReport {
    const now = new Date().toISOString();

    const parseDetail = (detail: unknown): Record<string, string> => {
        if (typeof detail !== 'string') return {};
        return detail.split(';').reduce((acc, part) => {
            const [key, ...rest] = part.split('=');
            if (!key) return acc;
            acc[key] = rest.join('=');
            return acc;
        }, {} as Record<string, string>);
    };

    // Extract info from trace lines (normalize V7 string format)
    const rawTraceLines = output.meta?.traceLines || [];
    const traceLines = rawTraceLines
        .map((line: any) => {
            if (!line) return undefined;
            if (typeof line === 'string') {
                const idx = line.indexOf(':');
                if (idx === -1) return { key: line, value: '' };
                return { key: line.slice(0, idx), value: line.slice(idx + 1) };
            }
            if (typeof line === 'object' && 'key' in line && 'value' in line) {
                return { key: (line as any).key, value: (line as any).value };
            }
            return undefined;
        })
        .filter(Boolean) as Array<{ key: string; value: unknown }>;
    const extractTrace = traceLines.find(t => t.key === 'extract');
    const kbMedicalTrace = traceLines.find(t => t.key === 'kb_medical');
    const kbTreatmentTrace = traceLines.find(t => t.key === 'kb_treatment');

    // Build extraction summary
    const extractDetail = parseDetail(extractTrace?.value);
    const extraction: ExtractionSummary = {
        engine: extractDetail.engine || output.meta?.extractorEngine || 'unknown',
        treatmentId: input.treatmentId,
        insuranceType: input.insuranceType || 'GKV',
        tooth: extractDetail.tooth,
        surfaces: extractDetail.surfaces ? extractDetail.surfaces.split(',').filter(Boolean) : undefined,
        rawExtractKeys: [],
    };

    // Build facts (aggregate across all instances)
    const facts: FactEntry[] = [];
    const addFactsFromObject = (factObject: Record<string, unknown>, prefix = '') => {
        for (const [key, value] of Object.entries(factObject).sort()) {
            facts.push({
                factKey: `${prefix}${key}`,
                value,
                source: 'dictation', // Default, ideally from provenance
                confirmed: true,
            });
        }
    };

    if (output.trace?.instances?.length) {
        for (const inst of output.trace.instances) {
            const prefix = inst.tooth ? `tooth:${inst.tooth}::` : '';
            if (inst.facts && typeof inst.facts === 'object') {
                addFactsFromObject(inst.facts as Record<string, unknown>, prefix);
            } else if ((inst as any).factsBeforeAnswers && typeof (inst as any).factsBeforeAnswers === 'object') {
                addFactsFromObject((inst as any).factsBeforeAnswers as Record<string, unknown>, prefix);
            }
        }
    } else {
        const factsData = output.meta?.facts as Record<string, unknown> | undefined;
        if (factsData && typeof factsData === 'object') {
            addFactsFromObject(factsData);
        }
    }

    // Build fired rules (from trace)
    const firedRules: FiredRule[] = [];
    const medicalTrace = output.meta?.medicalTrace;
    if (medicalTrace && Array.isArray((medicalTrace as any).ruleHits)) {
        for (const hit of (medicalTrace as any).ruleHits.sort((a: any, b: any) => a.ruleId.localeCompare(b.ruleId))) {
            firedRules.push({
                ruleId: hit.ruleId,
                ruleType: hit.action || 'emit_chip',
                scope: hit.scope || 'session',
                sourceRefs: hit.sourceRefs || [],
                outcome: hit.outcome || 'triggered',
            });
        }
    }

    // Build askbacks (from output meta)
    const askbacks: AskbackMapping[] = [];

    // Build chips (from provenance if available)
    const chips: ChipEntry[] = [];
    if (output.meta?.provenance?.chips?.length) {
        for (const chip of [...output.meta.provenance.chips].sort((a, b) => a.chipId.localeCompare(b.chipId))) {
            chips.push({
                chipId: chip.chipId,
                scope: chip.scope,
                emittedByRule: chip.emittedByRuleId || 'unknown',
                factSources: chip.factSources?.length ? chip.factSources : ['dictation'],
                billingEligible: chip.billingEligible,
                blockedByGuard: false,
            });
        }
    } else {
        const perInstance = output.output?.perInstance || {};
        const chipIds = new Set<string>();
        for (const inst of Object.values(perInstance)) {
            for (const chipId of inst.chips || []) {
                chipIds.add(chipId);
            }
        }
        for (const chipId of Array.from(chipIds).sort()) {
            chips.push({
                chipId,
                scope: 'session',
                emittedByRule: 'unknown',
                factSources: ['dictation'],
                billingEligible: true,
                blockedByGuard: false,
            });
        }
    }

    // Build billing codes
    const billingCodes: BillingCodeEntry[] = [];
    const outputCodes = output.output?.billingCodes || [];
    for (const code of [...outputCodes].sort()) {
        const codeSystem = code.startsWith('BEMA') ? 'BEMA' : code.startsWith('GOZ') ? 'GOZ' : 'GOÄ';
        billingCodes.push({
            code,
            codeSystem,
            sourceChipId: 'unknown', // TODO: link from chip
            billingRefField: input.insuranceType || 'GKV',
            scope: 'session',
        });
    }

    // Build combinability
    const combinability: CombinabilityResult = {
        verdict: output.meta?.combinability?.verdict || 'pass',
        conflicts: (output.meta?.combinability?.conflicts || []).map((c: any) => ({
            ruleId: c.ruleId || 'unknown',
            codesInvolved: c.codesInvolved || c.codes || [],
            scope: 'session',
            severity: c.severity || 'warn',
            reason: c.reason || '',
            sourceRefs: [],
        })),
        warnings: output.meta?.combinability?.warnings || [],
        checkedAt: now,
    };

    // Build text blocks
    const textBlocks: TextBlock[] = [];
    const fullText = output.output?.fullText || '';
    if (fullText) {
        textBlocks.push({
            blockIndex: 0,
            sectionKey: 'main',
            text: fullText,
            sourceChipIds: chips.map(c => c.chipId),
            textLength: 'mittel',
        });
    }

    // Build KB meta
    const kbFromMeta = output.meta?.kb;
    const kbMeta: KbMetaCollection = {
        medical: {
            source: kbFromMeta?.medical?.source || (kbMedicalTrace?.value as any)?.source || 'json',
            version: kbFromMeta?.medical?.version || (kbMedicalTrace?.value as any)?.version || 'v1',
            hash: kbFromMeta?.medical?.hash || (kbMedicalTrace?.value as any)?.hash || 'unknown',
        },
        treatment: {
            source: kbFromMeta?.treatments?.[input.treatmentId]?.source || (kbTreatmentTrace?.value as any)?.source || 'json',
            version: kbFromMeta?.treatments?.[input.treatmentId]?.version || (kbTreatmentTrace?.value as any)?.version || 'v1',
            hash: kbFromMeta?.treatments?.[input.treatmentId]?.hash || (kbTreatmentTrace?.value as any)?.hash || 'unknown',
        },
        combinability: {
            source: kbFromMeta?.combinability?.source || 'json',
            version: kbFromMeta?.combinability?.version || 'v1',
            hash: kbFromMeta?.combinability?.hash || 'unknown',
        },
    };

    const report: ExplainRunReport = {
        version: 'v1',
        generatedAt: now,
        stableHash: '', // Filled below
        input: {
            treatmentId: input.treatmentId,
            insuranceType: input.insuranceType || 'GKV',
            dictationPreview: (input.dictation || '').slice(0, 100),
            teethCount: input.teeth?.length || 1,
        },
        extraction,
        facts,
        firedRules,
        askbacks,
        chips,
        billingCodes,
        combinability,
        textBlocks,
        kbMeta,
        traceLines: traceLines.map(t => ({ key: t.key, value: t.value })),
    };

    // Compute stable hash
    report.stableHash = computeStableHash(report);

    return report;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate ExplainRun report from pipeline input and output.
 */
export function explainRunV10(
    input: V10PipelineInput,
    output: V10PipelineOutput,
    opts?: ExplainRunOptions,
): ExplainRunResult {
    const report = buildExplainReportFromOutput(input, output);

    const result: ExplainRunResult = {
        reportJson: report,
        stableHash: report.stableHash,
    };

    if (opts?.format === 'md' || opts?.format === 'both') {
        result.reportMarkdown = generateMarkdown(report);
    }

    return result;
}

// Re-export types
export type { ExplainRunReport, ExplainRunOptions, ExplainRunResult };
