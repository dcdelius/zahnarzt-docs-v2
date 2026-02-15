import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { planFromDictation } from '../../multitreatment/planFromDictation';
import { runV10Bundle } from '../../multitreatment/runV10Bundle';
import type { V10ScopedBillingCode } from '../../types';
import { buildSessionBillingSummary, runSessionCombinability } from '../../billing/sessionCombinability';
import type { DynamicQuestion, QuestionOption } from '../../../contracts/questions';

type ScenarioFile = {
    cases: Array<{
        id: string;
        title: string;
        insuranceType: 'GKV' | 'PKV' | 'MKV';
        textLength?: 'kurz' | 'mittel' | 'lang';
        dictation: string;
        answers?: Record<string, unknown>;
        expected: {
            mustIncludeCodes: string[];
            mustNotIncludePrefixes: string[];
            allowAliases: Record<string, string[]>;
            combinabilityMustNotBe?: string[];
            minSegments?: number;
            mustIncludeTreatmentIds?: string[];
        };
    }>;
};

function hasCode(codes: string[], expected: string, aliases: Record<string, string[]>): boolean {
    if (codes.includes(expected)) return true;
    const aliasList = aliases[expected] || [];
    return codes.some(c => aliasList.includes(c));
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

function coerceAnswersMap(value: Record<string, unknown> | undefined): Map<string, unknown> {
    return new Map(Object.entries(value ?? {}));
}

function deriveToothFromInstanceId(instanceId?: string): string | undefined {
    if (!instanceId) return undefined;
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

async function runScenarioCase(s: ScenarioFile['cases'][number]) {
    const segments = planFromDictation({
        dictation: s.dictation,
        insuranceType: s.insuranceType,
        textLength: s.textLength ?? 'mittel',
    });

    if (s.expected.minSegments !== undefined) {
        expect(segments.length).toBeGreaterThanOrEqual(s.expected.minSegments);
    }
    if (s.expected.mustIncludeTreatmentIds?.length) {
        const ids = segments.map(seg => String(seg.treatmentId));
        for (const t of s.expected.mustIncludeTreatmentIds) {
            expect(ids).toContain(t);
        }
    }

    const bundle = {
        dictation: s.dictation,
        segments,
        globalAnswers: coerceAnswersMap(s.answers),
    };

    const answers = coerceAnswersMap(s.answers);
    let result = await runV10Bundle(bundle, {});
    let iterations = 0;

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
        result = await runV10Bundle(bundle, {});
    }

    expect(result.state, result.state === 'error' ? (result.error ?? 'unknown error') : undefined).toBe('output');
    expect(result.output?.billingCodes).toBeTruthy();

    const billingCodes = (result.output!.billingCodes as V10ScopedBillingCode[]).map(c => c.code);

    for (const code of s.expected.mustIncludeCodes) {
        expect(
            hasCode(billingCodes, code, s.expected.allowAliases),
            `Missing expected code ${code} (got: ${billingCodes.join(', ')})`
        ).toBe(true);
    }

    const forbidden = hasForbiddenPrefix(billingCodes, s.expected.mustNotIncludePrefixes);
    expect(forbidden, `Forbidden codes found: ${forbidden.join(', ')}`).toHaveLength(0);

    const summary = buildSessionBillingSummary(result.output!.billingCodes as V10ScopedBillingCode[], segments);
    const combi = runSessionCombinability(summary);
    for (const forbiddenResult of s.expected.combinabilityMustNotBe ?? []) {
        expect(String(combi.result).toUpperCase()).not.toContain(forbiddenResult);
    }
}

describe('V10 Multi-Treatment Scenario Suite', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scenariosPath = path.resolve(__dirname, '../../../../../scripts/v10/scenarios.v10.multitreatment.json');
    const scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8')) as ScenarioFile;

    for (const s of scenarios.cases) {
        it(`[${s.id}] ${s.title}`, async () => {
            await runScenarioCase(s);
        }, 60_000);
    }
});
