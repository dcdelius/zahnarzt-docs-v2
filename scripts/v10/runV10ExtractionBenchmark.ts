import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import { extractFromDictation } from '../../src/docudent/core/extraction/extractionService';
import { detectTreatmentIntents } from '../../src/docudent/v10/preanalysis/detectTreatmentIntents';

type Scenario = {
    id: string;
    label: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    dictation: string;
    expectedTooth?: string;
    maxIntentCount?: number;
    contextMarkers?: string[];
};

type ScenarioFile = {
    _meta?: {
        description?: string;
        version?: string;
        created?: string;
    };
    cases: Scenario[];
};

type ExtractionMeta = {
    method: 'llm' | 'regex' | 'stub' | 'unknown';
    llmError: string;
};

type CaseResult = {
    id: string;
    label: string;
    treatmentId: string;
    expectedTooth?: string;
    extraction: ExtractionMeta;
    preanalysisSource: 'llm' | 'fallback' | 'error';
    preanalysisIntentCount: number;
    historicalGuardApplicable: boolean;
    preanalysisTreatments: string[];
    extractionReasonedTreatments: string[];
    treatmentDetected: boolean;
    toothDetected: boolean;
    contextMarkers: string[];
    contextMarkersFound: string[];
    contextMarkersMissing: string[];
    issues: string[];
};

type BenchmarkReport = {
    generatedAt: string;
    file: string;
    requireLlmExtraction: boolean;
    totals: {
        cases: number;
        llmExtractionOk: number;
        treatmentDetected: number;
        toothDetected: number;
        contextCases: number;
        contextCasesFullyPreserved: number;
        historicalGuardCases: number;
        historicalGuardPassed: number;
        issueFreeCases: number;
    };
    rates: {
        llmExtractionOk: number;
        treatmentDetected: number;
        toothDetected: number;
        contextCasesFullyPreserved: number;
        historicalGuardPassed: number;
        issueFreeCases: number;
    };
    defectTaxonomy: Record<string, number>;
    results: CaseResult[];
};

const DEFAULT_FILE = 'scripts/v10/scenarios.v10.extraction-benchmark.longprosa20.json';
const DEFAULT_OUT_DIR = '__reports__/llm-extraction-benchmark';

function parseArgs(argv: string[]): { file: string; outDir: string; requireLlmExtraction: boolean } {
    let file = DEFAULT_FILE;
    let outDir = DEFAULT_OUT_DIR;
    let requireLlmExtraction = process.env.DOCUDENT_REQUIRE_LLM_PATH !== '0';

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--file') {
            const next = argv[index + 1];
            if (next) {
                file = next;
                index += 1;
            }
            continue;
        }
        if (arg === '--out-dir') {
            const next = argv[index + 1];
            if (next) {
                outDir = next;
                index += 1;
            }
            continue;
        }
        if (arg === '--require-llm-extraction') {
            requireLlmExtraction = true;
            continue;
        }
        if (arg === '--allow-fallback') {
            requireLlmExtraction = false;
            continue;
        }
    }

    return { file, outDir, requireLlmExtraction };
}

function readEnv(name: string): string | null {
    const value = process.env[name];
    if (!value) return null;
    const trimmed = value.replace(/^['"]|['"]$/g, '').trim();
    return trimmed.length > 0 ? trimmed : null;
}

function ensureServerOpenAiKey(): void {
    const openAi = readEnv('OPENAI_API_KEY');
    if (openAi) return;
    const vite = readEnv('VITE_OPENAI_API_KEY');
    if (!vite) return;
    process.env.OPENAI_API_KEY = vite;
    // eslint-disable-next-line no-console
    console.warn('[extraction-benchmark] OPENAI_API_KEY missing; using VITE_OPENAI_API_KEY for this run.');
}

function normalizeForMatch(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/\s+/g, ' ')
        .trim();
}

const CONTEXT_STOPWORDS = new Set([
    'der', 'die', 'das', 'den', 'dem', 'des',
    'und', 'oder', 'mit', 'ohne', 'von', 'auf', 'in', 'an', 'zu', 'zur', 'zum',
    'seit', 'nach', 'bei', 'im', 'am', 'ist', 'sind', 'war', 'wurde', 'wird',
    'ein', 'eine', 'einer', 'eines', 'einem', 'einen',
    'als', 'dass', 'auch', 'nur', 'noch', 'weiter',
]);

function tokenizeForMarker(value: string): string[] {
    return normalizeForMatch(value)
        .split(/[^a-z0-9]+/g)
        .map(token => token.trim())
        .filter(token => token.length >= 3 && !CONTEXT_STOPWORDS.has(token));
}

function markerMatchesContext(marker: string, contextTexts: string[]): boolean {
    const normalizedMarker = normalizeForMatch(marker);
    if (!normalizedMarker) return true;
    if (contextTexts.some(text => text.includes(normalizedMarker))) return true;

    const markerTokens = tokenizeForMarker(marker);
    if (markerTokens.length === 0) return true;
    for (const contextText of contextTexts) {
        const matchedCount = markerTokens.filter(token => contextText.includes(token)).length;
        if (matchedCount === markerTokens.length) return true;
        if (markerTokens.length >= 2 && matchedCount / markerTokens.length >= 0.7) return true;
    }
    return false;
}

function toExtractionMeta(value: unknown): ExtractionMeta {
    const source = value as Record<string, unknown>;
    const methodRaw = String(source?._extractionMethod ?? 'unknown').toLowerCase();
    const method = methodRaw === 'llm' || methodRaw === 'regex' || methodRaw === 'stub'
        ? methodRaw
        : 'unknown';
    const llmError = String(source?._llmError ?? 'none');
    return { method, llmError };
}

function normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
    }
    return [];
}

function flattenObjectToStrings(value: unknown): string[] {
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    const entries = Object.entries(value as Record<string, unknown>);
    const lines: string[] = [];
    for (const [key, entry] of entries) {
        if (entry === undefined || entry === null) continue;
        if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
            lines.push(`${key}: ${String(entry).trim()}`);
            continue;
        }
        if (Array.isArray(entry)) {
            for (const item of entry) {
                const text = String(item).trim();
                if (text) lines.push(`${key}: ${text}`);
            }
            continue;
        }
        if (typeof entry === 'object') {
            for (const nested of flattenObjectToStrings(entry)) {
                lines.push(`${key}: ${nested}`);
            }
        }
    }
    return lines;
}

function collectContextTexts(extracted: Record<string, unknown>, preanalysisBundle: unknown): string[] {
    const texts: string[] = [];

    texts.push(...normalizeStringArray(extracted.klinischeZusatzinfos));
    texts.push(...normalizeStringArray(extracted.patientenangaben));
    texts.push(...normalizeStringArray(extracted.zusatzinfos));
    if (extracted.documentationContext && typeof extracted.documentationContext === 'object') {
        const documentationContext = extracted.documentationContext as Record<string, unknown>;
        texts.push(...normalizeStringArray(documentationContext.clinical));
        texts.push(...normalizeStringArray(documentationContext.patient));
        texts.push(...normalizeStringArray(documentationContext.administrative));
        texts.push(...normalizeStringArray(documentationContext.forensicNotes));
        for (const unresolvedHint of normalizeStringArray(documentationContext.unresolved)) {
            texts.push(`unresolved: ${unresolvedHint}`);
        }
    }

    const reasoning = extracted.reasoning as Record<string, unknown> | undefined;
    if (reasoning) {
        texts.push(...normalizeStringArray(reasoning.forensicNotes));
        for (const hint of normalizeStringArray(reasoning.unresolved)) {
            texts.push(`unresolved: ${hint}`);
        }
        const factHints = Array.isArray(reasoning.factHints) ? reasoning.factHints : [];
        for (const hint of factHints) {
            if (hint && typeof hint === 'object') {
                const h = hint as Record<string, unknown>;
                const key = String(h.key ?? '').trim();
                const value = h.value;
                if (key && value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        for (const entry of value) {
                            const text = String(entry).trim();
                            if (text) texts.push(`${key}: ${text}`);
                        }
                    } else {
                        const text = String(value).trim();
                        if (text) texts.push(`${key}: ${text}`);
                    }
                }
            }
        }
    }

    if (preanalysisBundle && typeof preanalysisBundle === 'object') {
        const bundle = preanalysisBundle as Record<string, unknown>;
        const intents = Array.isArray(bundle.intents) ? bundle.intents : [];
        for (const intent of intents) {
            if (!intent || typeof intent !== 'object') continue;
            const sharedFacts = (intent as Record<string, unknown>).sharedFacts;
            texts.push(...flattenObjectToStrings(sharedFacts));
        }
    }

    return Array.from(new Set(texts.map(item => item.trim()).filter(Boolean)));
}

function formatRate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 1;
    return Number((numerator / denominator).toFixed(4));
}

function timestampCompact(value: Date): string {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    const ss = String(value.getSeconds()).padStart(2, '0');
    return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function toMarkdown(report: BenchmarkReport): string {
    const lines: string[] = [];
    lines.push('# V10 Extraction Benchmark Report');
    lines.push('');
    lines.push(`- Generated: ${report.generatedAt}`);
    lines.push(`- Source file: \`${report.file}\``);
    lines.push(`- Require LLM extraction: ${report.requireLlmExtraction ? 'yes' : 'no'}`);
    lines.push('');
    lines.push('## Summary');
    lines.push(`- Cases: ${report.totals.cases}`);
    lines.push(`- LLM extraction OK: ${report.totals.llmExtractionOk}/${report.totals.cases} (${(report.rates.llmExtractionOk * 100).toFixed(1)}%)`);
    lines.push(`- Treatment detected: ${report.totals.treatmentDetected}/${report.totals.cases} (${(report.rates.treatmentDetected * 100).toFixed(1)}%)`);
    lines.push(`- Tooth detected: ${report.totals.toothDetected}/${report.totals.cases} (${(report.rates.toothDetected * 100).toFixed(1)}%)`);
    lines.push(`- Context preserved (context cases): ${report.totals.contextCasesFullyPreserved}/${report.totals.contextCases} (${(report.rates.contextCasesFullyPreserved * 100).toFixed(1)}%)`);
    lines.push(`- Historical over-promotion guard: ${report.totals.historicalGuardPassed}/${report.totals.historicalGuardCases} (${(report.rates.historicalGuardPassed * 100).toFixed(1)}%)`);
    lines.push(`- Issue-free cases: ${report.totals.issueFreeCases}/${report.totals.cases} (${(report.rates.issueFreeCases * 100).toFixed(1)}%)`);
    lines.push('');
    lines.push('## Defect Taxonomy');
    if (Object.keys(report.defectTaxonomy).length === 0) {
        lines.push('- none');
    } else {
        const sorted = Object.entries(report.defectTaxonomy).sort((a, b) => b[1] - a[1]);
        for (const [kind, count] of sorted) {
            lines.push(`- ${kind}: ${count}`);
        }
    }
    lines.push('');
    lines.push('## Case Findings');
    for (const item of report.results) {
        lines.push(`### ${item.id} - ${item.label}`);
        lines.push(`- Treatment: expected=${item.treatmentId}, detected=${item.treatmentDetected ? 'yes' : 'no'}`);
        lines.push(`- Tooth: expected=${item.expectedTooth ?? 'n/a'}, detected=${item.toothDetected ? 'yes' : 'no'}`);
        lines.push(`- Extraction runtime: ${item.extraction.method} (llmError=${item.extraction.llmError})`);
        lines.push(`- Preanalysis: source=${item.preanalysisSource}, intents=${item.preanalysisIntentCount}`);
        lines.push(`- Context markers found: ${item.contextMarkersFound.length}/${item.contextMarkers.length}`);
        if (item.issues.length > 0) {
            lines.push('- Issues:');
            for (const issue of item.issues) {
                lines.push(`  - ${issue}`);
            }
        } else {
            lines.push('- Issues: none');
        }
        lines.push('');
    }
    return `${lines.join('\n')}\n`;
}

async function runCase(scenario: Scenario, requireLlmExtraction: boolean): Promise<CaseResult> {
    const issues: string[] = [];

    let preanalysisSource: 'llm' | 'fallback' | 'error' = 'error';
    let preanalysisIntentCount = 0;
    let preanalysisTreatments: string[] = [];
    let preanalysisBundle: unknown = undefined;
    try {
        const pre = await detectTreatmentIntents(scenario.dictation);
        preanalysisSource = pre.source;
        preanalysisBundle = pre.bundle;
        preanalysisIntentCount = pre.bundle.intents.length;
        preanalysisTreatments = Array.from(new Set(pre.bundle.intents.map(intent => intent.treatmentId)));
    } catch (error) {
        issues.push(`preanalysis_error:${error instanceof Error ? error.message : String(error)}`);
    }

    let extracted: Record<string, unknown> = {};
    try {
        extracted = await extractFromDictation(scenario.dictation) as unknown as Record<string, unknown>;
    } catch (error) {
        issues.push(`extraction_error:${error instanceof Error ? error.message : String(error)}`);
    }

    const extractionMeta = toExtractionMeta(extracted);
    if (requireLlmExtraction && extractionMeta.method !== 'llm') {
        issues.push(`extraction_not_llm:${extractionMeta.method}`);
    }
    if (requireLlmExtraction && extractionMeta.llmError !== 'none') {
        issues.push(`extraction_llm_error:${extractionMeta.llmError}`);
    }

    const reasoning = extracted.reasoning as Record<string, unknown> | undefined;
    const reasoningIntentHints = Array.isArray(reasoning?.intentHints) ? reasoning?.intentHints : [];
    const extractionReasonedTreatments = Array.from(new Set(
        reasoningIntentHints
            .filter(item => item && typeof item === 'object')
            .map(item => String((item as Record<string, unknown>).treatmentId ?? '').trim())
            .filter(Boolean)
    ));

    const treatmentDetected = preanalysisTreatments.includes(scenario.treatmentId)
        || extractionReasonedTreatments.includes(scenario.treatmentId);
    if (!treatmentDetected) {
        issues.push(`treatment_miss:${scenario.treatmentId}`);
    }

    const expectedTooth = scenario.expectedTooth?.trim();
    const extractionTeeth = normalizeStringArray(extracted.teeth);
    const extractionTooth = typeof extracted.tooth === 'string' ? extracted.tooth.trim() : '';
    const preanalysisTeeth = preanalysisBundle && typeof preanalysisBundle === 'object'
        ? Array.from(new Set(
            ((preanalysisBundle as Record<string, unknown>).intents as Array<Record<string, unknown>> | undefined ?? [])
                .map(intent => String(intent.tooth ?? '').trim())
                .filter(Boolean)
        ))
        : [];
    const toothDetected = !expectedTooth
        ? true
        : extractionTooth === expectedTooth
            || extractionTeeth.includes(expectedTooth)
            || preanalysisTeeth.includes(expectedTooth);
    if (expectedTooth && !toothDetected) {
        issues.push(`tooth_miss:${expectedTooth}`);
    }

    if (typeof scenario.maxIntentCount === 'number' && preanalysisIntentCount > scenario.maxIntentCount) {
        issues.push(`historical_overpromotion:intents=${preanalysisIntentCount}>${scenario.maxIntentCount}`);
    }

    const contextMarkers = (scenario.contextMarkers ?? []).map(item => item.trim()).filter(Boolean);
    const contextTexts = collectContextTexts(extracted, preanalysisBundle).map(normalizeForMatch);
    const contextMarkersFound: string[] = [];
    const contextMarkersMissing: string[] = [];
    for (const marker of contextMarkers) {
        const found = markerMatchesContext(marker, contextTexts);
        if (found) {
            contextMarkersFound.push(marker);
        } else {
            contextMarkersMissing.push(marker);
            issues.push(`context_loss:${marker}`);
        }
    }

    return {
        id: scenario.id,
        label: scenario.label,
        treatmentId: scenario.treatmentId,
        expectedTooth,
        extraction: extractionMeta,
        preanalysisSource,
        preanalysisIntentCount,
        historicalGuardApplicable: typeof scenario.maxIntentCount === 'number',
        preanalysisTreatments,
        extractionReasonedTreatments,
        treatmentDetected,
        toothDetected,
        contextMarkers,
        contextMarkersFound,
        contextMarkersMissing,
        issues,
    };
}

function buildReport(file: string, requireLlmExtraction: boolean, results: CaseResult[]): BenchmarkReport {
    const totals = {
        cases: results.length,
        llmExtractionOk: results.filter(item => item.extraction.method === 'llm' && item.extraction.llmError === 'none').length,
        treatmentDetected: results.filter(item => item.treatmentDetected).length,
        toothDetected: results.filter(item => item.toothDetected).length,
        contextCases: results.filter(item => item.contextMarkers.length > 0).length,
        contextCasesFullyPreserved: results.filter(
            item => item.contextMarkers.length > 0 && item.contextMarkersMissing.length === 0
        ).length,
        historicalGuardCases: results.filter(item => item.historicalGuardApplicable).length,
        historicalGuardPassed: results.filter(
            item => item.historicalGuardApplicable && !item.issues.some(issue => issue.startsWith('historical_overpromotion:'))
        ).length,
        issueFreeCases: results.filter(item => item.issues.length === 0).length,
    };

    const defectTaxonomy: Record<string, number> = {};
    for (const item of results) {
        for (const issue of item.issues) {
            const kind = issue.split(':')[0] || 'unknown_issue';
            defectTaxonomy[kind] = (defectTaxonomy[kind] ?? 0) + 1;
        }
    }

    const rates = {
        llmExtractionOk: formatRate(totals.llmExtractionOk, totals.cases),
        treatmentDetected: formatRate(totals.treatmentDetected, totals.cases),
        toothDetected: formatRate(totals.toothDetected, totals.cases),
        contextCasesFullyPreserved: formatRate(totals.contextCasesFullyPreserved, totals.contextCases),
        historicalGuardPassed: formatRate(totals.historicalGuardPassed, totals.historicalGuardCases),
        issueFreeCases: formatRate(totals.issueFreeCases, totals.cases),
    };

    return {
        generatedAt: new Date().toISOString(),
        file,
        requireLlmExtraction,
        totals,
        rates,
        defectTaxonomy,
        results,
    };
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2));
    ensureServerOpenAiKey();

    const filePath = path.resolve(process.cwd(), options.file);
    const outDir = path.resolve(process.cwd(), options.outDir);
    fs.mkdirSync(outDir, { recursive: true });

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ScenarioFile;
    const scenarios = Array.isArray(parsed.cases) ? parsed.cases : [];
    if (scenarios.length === 0) {
        throw new Error(`No cases found in ${filePath}`);
    }

    const results: CaseResult[] = [];
    for (const scenario of scenarios) {
        // eslint-disable-next-line no-console
        console.log(`[extraction-benchmark] ${scenario.id} ...`);
        const result = await runCase(scenario, options.requireLlmExtraction);
        results.push(result);
    }

    const report = buildReport(options.file, options.requireLlmExtraction, results);
    const stamp = timestampCompact(new Date());
    const jsonPath = path.join(outDir, `benchmark-${stamp}.json`);
    const mdPath = path.join(outDir, `summary-${stamp}.md`);
    const latestJsonPath = path.join(outDir, 'latest.json');
    const latestMdPath = path.join(outDir, 'latest.md');

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(mdPath, toMarkdown(report), 'utf8');
    fs.writeFileSync(latestJsonPath, JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(latestMdPath, toMarkdown(report), 'utf8');

    // eslint-disable-next-line no-console
    console.log(`[extraction-benchmark] wrote ${jsonPath}`);
    // eslint-disable-next-line no-console
    console.log(`[extraction-benchmark] wrote ${mdPath}`);
    // eslint-disable-next-line no-console
    console.log(`[extraction-benchmark] issue-free cases: ${report.totals.issueFreeCases}/${report.totals.cases}`);
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[extraction-benchmark] failed:', error);
    process.exitCode = 1;
});
