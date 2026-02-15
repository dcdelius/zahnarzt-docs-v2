/**
 * V10 Multi-Treatment Scenario Runner (Headless + deterministic)
 *
 * One dictation -> planFromDictation() -> runV10Bundle() -> validate:
 * - billing codes (including MKV two-channel addon codes)
 * - output text snippets
 * - session combinability verdict
 *
 * This runner is designed to "lock in" Endo + Fuellung + Extraction in a single session.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { SettingsInput } from '../../src/docudent/v10/settings/settingsTypes';
import type { V10BundleInput, V10ScopedBillingCode, V10TreatmentSegmentInput } from '../../src/docudent/v10/types';
import { planFromDictation } from '../../src/docudent/v10/multitreatment/planFromDictation';
import { runV10Bundle } from '../../src/docudent/v10/multitreatment/runV10Bundle';
import { buildSessionBillingSummary, runSessionCombinability } from '../../src/docudent/v10/billing/sessionCombinability';
import type { DynamicQuestion, QuestionOption } from '../../src/docudent/contracts/questions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MultiScenarioFile = {
    _meta?: Record<string, unknown>;
    cases: MultiScenario[];
};

type MultiScenario = {
    id: string;
    title: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength?: 'kurz' | 'mittel' | 'lang';
    dictation: string;
    settings?: SettingsInput;
    // Answers are global (scoped with ::tooth:XX when needed).
    answers?: Record<string, unknown>;
    expected: {
        mustIncludeCodes: string[];
        mustNotIncludePrefixes: string[];
        allowAliases: Record<string, string[]>;
        combinabilityMustNotBe?: string[];
        textMustInclude?: string[];
        minSegments?: number;
        mustIncludeTreatmentIds?: string[];
    };
};

type CaseResult = {
    id: string;
    title: string;
    status: 'PASS' | 'FAIL';
    treatmentIds: string[];
    billingCodes: string[];
    combinability: { result: string; reasons: string[] };
    failures: string[];
};

function codeMatches(code: string, expected: string, aliases: Record<string, string[]>): boolean {
    if (code === expected) return true;
    const aliasList = aliases[expected] || [];
    return aliasList.includes(code);
}

function hasCode(codes: string[], expected: string, aliases: Record<string, string[]>): boolean {
    return codes.some(c => codeMatches(c, expected, aliases) || codeMatches(expected, c, aliases));
}

function hasForbiddenPrefix(codes: string[], prefixes: string[]): string[] {
    const forbidden: string[] = [];
    for (const code of codes) {
        for (const prefix of prefixes) {
            if (code.startsWith(prefix)) forbidden.push(code);
        }
    }
    return forbidden;
}

function coerceAnswersMap(value: Record<string, unknown> | Map<string, unknown> | undefined): Map<string, unknown> {
    if (!value) return new Map();
    if (value instanceof Map) return new Map(value);
    return new Map(Object.entries(value));
}

function deriveToothFromInstanceId(instanceId?: string): string | undefined {
    if (!instanceId) return undefined;
    // Common patterns:
    // - "tooth:26" (planFromDictation instances)
    // - "fuellung-26-1" / "endo-36-1" (scoping.ts instances)
    const byPrefix = instanceId.match(/tooth:(\d+)/);
    if (byPrefix) return byPrefix[1];
    const byDash = instanceId.match(/-(\d+)-\d+$/) ?? instanceId.match(/-(\d+)-/);
    return byDash ? byDash[1] : undefined;
}

function pickOptionValue(first?: QuestionOption): unknown {
    if (!first) return undefined;
    if (first.dataValue !== undefined) return first.dataValue;
    if (first.label !== undefined) return first.label;
    return first.id;
}

function autoAnswer(q: DynamicQuestion): unknown {
    const first = q.options?.[0];
    const firstValue = pickOptionValue(first);

    if (q.type === 'multi') return firstValue !== undefined ? [firstValue] : [];
    if (q.type === 'number') return q.defaultValue ?? q.presets?.[0] ?? q.min ?? 0;
    if (q.type === 'text') return '';
    return firstValue ?? 'unknown';
}

async function runMultiScenario(scenario: MultiScenario): Promise<CaseResult> {
    const failures: string[] = [];

    const segments: V10TreatmentSegmentInput[] = planFromDictation({
        dictation: scenario.dictation,
        insuranceType: scenario.insuranceType,
        textLength: scenario.textLength ?? 'mittel',
    });

    const treatmentIds = segments.map(s => String(s.treatmentId));
    if (scenario.expected.minSegments !== undefined && segments.length < scenario.expected.minSegments) {
        failures.push(`Expected at least ${scenario.expected.minSegments} segments, got ${segments.length}`);
    }
    if (scenario.expected.mustIncludeTreatmentIds?.length) {
        for (const t of scenario.expected.mustIncludeTreatmentIds) {
            if (!treatmentIds.includes(t)) failures.push(`Expected treatmentId in plan: ${t}, got: ${treatmentIds.join(', ')}`);
        }
    }

    const bundle: V10BundleInput = {
        dictation: scenario.dictation,
        segments,
        globalAnswers: coerceAnswersMap(scenario.answers),
    };

    // Answer loop (deterministic): scenario answers win; missing answers are auto-filled deterministically.
    let result = await runV10Bundle(bundle, { settings: scenario.settings });
    let iterations = 0;
    const answers = coerceAnswersMap(scenario.answers);

    while (result.state === 'questions' && (result.questions?.length ?? 0) > 0 && iterations < 10) {
        iterations++;
        let changed = false;

        for (const q of result.questions ?? []) {
            const tooth = deriveToothFromInstanceId(q.instanceId);
            const baseKey = q.id;
            const scopedKey = (!baseKey.includes('::tooth:') && tooth) ? `${baseKey}::tooth:${tooth}` : baseKey;

            const answer =
                answers.get(scopedKey)
                ?? answers.get(baseKey)
                ?? answers.get(q.questionKey ?? '')
                ?? (q.questionKey && tooth ? answers.get(`${q.questionKey}::tooth:${tooth}`) : undefined);

            const resolved = answer ?? autoAnswer(q);
            if (!answers.has(scopedKey)) {
                answers.set(scopedKey, resolved);
                changed = true;
            }
        }

        if (!changed) break;

        bundle.globalAnswers = answers;
        result = await runV10Bundle(bundle, { settings: scenario.settings });
    }

    if (result.state !== 'output' || !result.output) {
        failures.push(`Bundle did not reach output state (state=${result.state}${result.error ? `, error=${result.error}` : ''})`);
        return {
            id: scenario.id,
            title: scenario.title,
            status: 'FAIL',
            treatmentIds,
            billingCodes: [],
            combinability: { result: 'unknown', reasons: [] },
            failures,
        };
    }

    const billingCodes = (result.output.billingCodes as V10ScopedBillingCode[]).map(c => c.code);

    for (const code of scenario.expected.mustIncludeCodes) {
        if (!hasCode(billingCodes, code, scenario.expected.allowAliases)) {
            failures.push(`Missing expected code: ${code}, actual: ${billingCodes.join(', ')}`);
        }
    }

    const forbidden = hasForbiddenPrefix(billingCodes, scenario.expected.mustNotIncludePrefixes);
    if (forbidden.length > 0) {
        failures.push(`Forbidden codes found: ${forbidden.join(', ')}`);
    }

    if (scenario.expected.textMustInclude?.length) {
        const text = result.output.fullText ?? '';
        for (const snippet of scenario.expected.textMustInclude) {
            if (!text.includes(snippet)) failures.push(`Expected text to include: ${snippet}`);
        }
    }

    // Session combinability (across segments)
    const scopedCodes = result.output.billingCodes as V10ScopedBillingCode[];
    const summary = buildSessionBillingSummary(scopedCodes, segments);
    const combinability = runSessionCombinability(summary);
    if (scenario.expected.combinabilityMustNotBe?.length) {
        for (const forbiddenResult of scenario.expected.combinabilityMustNotBe) {
            if (String(combinability.result).toUpperCase().includes(forbiddenResult)) {
                failures.push(`Combinability forbidden: got ${combinability.result}`);
            }
        }
    }

    return {
        id: scenario.id,
        title: scenario.title,
        status: failures.length === 0 ? 'PASS' : 'FAIL',
        treatmentIds,
        billingCodes,
        combinability: { result: combinability.result, reasons: combinability.reasons ?? [] },
        failures,
    };
}

async function main() {
    const args = process.argv.slice(2);
    const idx = args.indexOf('--file');
    const file = idx !== -1 ? args[idx + 1] : 'scenarios.v10.multitreatment.json';
    const scenariosPath = path.resolve(__dirname, file);
    const scenariosData = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8')) as MultiScenarioFile;
    const scenarios = scenariosData.cases ?? [];

    const results: CaseResult[] = [];
    for (const scenario of scenarios) {
        // eslint-disable-next-line no-console
        console.log(`Running multi case ${scenario.id}: ${scenario.title}...`);
        const r = await runMultiScenario(scenario);
        results.push(r);
        // eslint-disable-next-line no-console
        console.log(`  → ${r.status}${r.failures.length ? ` (${r.failures.length} failures)` : ''}`);
    }

    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.length - pass;

    const report = {
        runId: new Date().toISOString(),
        total: results.length,
        pass,
        fail,
        cases: results,
    };

    const outDir = path.resolve(process.cwd(), 'docs/system-atlas/artifacts/_latest/v10-multitreatment-scenario-run');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

    const summaryLines = [
        '# V10 Multi-Treatment Scenario Run Summary',
        '',
        `**Run ID:** ${report.runId}`,
        `**Total:** ${report.total} | **Pass:** ${report.pass} | **Fail:** ${report.fail}`,
        '',
        '## Results',
        '',
        '| ID | Treatments | Codes (first 6) | Combinability | Status |',
        '|----|-----------|----------------|--------------|--------|',
    ];

    for (const r of results) {
        const codes = r.billingCodes.slice(0, 6).join(', ') + (r.billingCodes.length > 6 ? '...' : '');
        summaryLines.push(`| ${r.id} | ${r.treatmentIds.join(' + ')} | ${codes} | ${r.combinability.result} | ${r.status} |`);
    }

    if (fail > 0) {
        summaryLines.push('', '## Failures', '');
        for (const r of results.filter(x => x.status === 'FAIL')) {
            summaryLines.push(`### Case ${r.id}: ${r.title}`);
            for (const f of r.failures) summaryLines.push(`- ${f}`);
            summaryLines.push('');
        }
    }

    fs.writeFileSync(path.join(outDir, 'summary.md'), summaryLines.join('\n'));

    if (fail > 0) {
        // eslint-disable-next-line no-console
        console.error('❌ HARD FAIL - Multi-treatment scenarios failed');
        process.exit(1);
    }
}

main().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
