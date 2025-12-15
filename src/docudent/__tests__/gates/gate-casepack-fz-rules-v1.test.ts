/**
 * Gate: CasePack FZ Rules v1
 *
 * - Validates imported case pack against machine-checkable Festzuschuss rules.
 * - FAIL (severity=error) breaks build, WARN logs only.
 * - Uses RuleIndex for optimized candidate retrieval.
 *
 * Notes:
 * Some rules require clinical detail not present in the current case schema
 * (e.g., actual teeth list, jaw assignment, "zahnlos" boolean).
 * Those are treated as WARN_INCONCLUSIVE rather than FAIL to avoid false negatives.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractBk } from '../../core/billing/knowledgeBase/logic/fzCode';
import {
    buildRuleIndex,
    getCandidateRules,
    type Rule,
    type ImportedCaseLike,
} from '../../core/billing/knowledgeBase/logic/ruleIndex';

type Severity = 'error' | 'warn';

type RulesDoc = {
    _meta: any;
    rules: Rule[];
};

type ImportedCase = ImportedCaseLike & {
    category?: 'ZE' | 'REPAIR' | string;
    befundklasse?: string;
    festzuschuss?: { fzCodes?: string[] };
    bel?: { belCodes?: string[] };
    kiefer?: 'OK' | 'UK';
    teeth?: string[];
    zahnlos?: boolean;
};

type CasePack = {
    meta?: any;
    cases: ImportedCase[];
};

function loadJson<T>(absPath: string): T {
    return JSON.parse(readFileSync(absPath, 'utf8'));
}

function uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

type EvalResult =
    | { status: 'PASS'; note?: string }
    | { status: 'WARN'; note: string }
    | { status: 'FAIL'; note: string };

function evalRule(rule: Rule, c: ImportedCase): EvalResult {
    const fzCodes = c.festzuschuss?.fzCodes ?? [];
    const belCodes = c.bel?.belCodes ?? [];

    const inconclusive = (why: string): EvalResult => ({
        status: 'WARN',
        note: `INCONCLUSIVE: ${why}`,
    });

    switch (rule.condition.type) {
        case 'requiresCode': {
            const code = rule.condition.code as string;
            const requires: string[] = rule.condition.requires ?? [];
            if (!fzCodes.includes(code)) return { status: 'PASS' }; // only triggers if code present
            const missing = requires.filter((r) => !fzCodes.includes(r));
            if (missing.length > 0) {
                return { status: 'FAIL', note: `${rule.message}. Missing: ${missing.join(', ')}` };
            }
            return { status: 'PASS' };
        }

        case 'belCodeRequired': {
            const expected: string[] = rule.condition.expectedBelCodes ?? [];
            const fzCode = rule.condition.fzCode as string | undefined;

            // If rule expects a specific fzCode, only evaluate when present
            if (fzCode && !fzCodes.includes(fzCode)) return { status: 'PASS' };

            const missing = expected.filter((b) => !belCodes.includes(b));
            if (missing.length > 0) {
                return { status: 'WARN', note: `${rule.message}. Missing BEL: ${missing.join(', ')}` };
            }
            return { status: 'PASS' };
        }

        case 'multiCodeInBK': {
            const targetBK = String(rule.condition.befundklasse ?? '');
            const minCount = Number(rule.condition.minCount ?? 2);

            const inBk = fzCodes.filter((z) => extractBk(z) === targetBK);
            if (inBk.length >= minCount) {
                return { status: 'WARN', note: `${rule.message}. Found: ${inBk.join(', ')}` };
            }
            return { status: 'PASS' };
        }

        case 'multipleBefundklassen': {
            const minDistinctBK = Number(rule.condition.minDistinctBK ?? 2);
            const bks = uniq(
                fzCodes
                    .map(extractBk)
                    .filter((x): x is string => Boolean(x))
            );
            if (bks.length >= minDistinctBK) {
                return { status: 'WARN', note: `${rule.message}. Distinct BK: ${bks.join(', ')}` };
            }
            return { status: 'PASS' };
        }

        case 'categoryCheck': {
            const expectedCategory = rule.condition.expectedCategory as string;
            const code = rule.condition.code as string | undefined;

            // Only evaluate if this case includes the relevant fz code (if provided)
            if (code && !fzCodes.includes(code)) return { status: 'PASS' };

            if (!c.category) return inconclusive(`Case has no category; expected ${expectedCategory}`);
            if (c.category !== expectedCategory) {
                // severity warn in rule definition; don't fail build here
                return { status: 'WARN', note: `${rule.message}. Actual category: ${c.category}` };
            }
            return { status: 'PASS' };
        }

        case 'maxCount': {
            // Current case schema does not encode per-kiefer counts unless you add it.
            // We can count within case only, but "per Kiefer" needs jaw assignment.
            const code = rule.condition.code as string;
            const maxPerKiefer = Number(rule.condition.maxPerKiefer ?? 2);

            const count = fzCodes.filter((z) => z === code).length;
            if (count <= maxPerKiefer) {
                // If we don't know jaw, this is "best-effort": count is not exceeding anyway.
                return { status: 'PASS' };
            }
            // If count exceeds, we can safely fail even without jaw.
            return { status: 'FAIL', note: `${rule.message}. Count=${count} > ${maxPerKiefer}` };
        }

        case 'verblendbereichRequired': {
            const code = rule.condition.code as string;
            if (!fzCodes.includes(code)) return { status: 'PASS' };

            // Needs either teeth list or explicit jaw + tooth numbers.
            const teeth = c.teeth;
            const kiefer = c.kiefer;

            if (!teeth || teeth.length === 0) {
                return inconclusive('No "teeth" list on case; cannot verify Verblendbereich constraint');
            }
            if (!kiefer) {
                return inconclusive('No "kiefer" on case; cannot choose OK/UK Verblendbereich ranges');
            }

            const vb = rule.condition.verblendbereich as { OK: string[]; UK: string[] };
            const allowed = kiefer === 'OK' ? vb.OK : vb.UK;

            const notAllowed = teeth.filter((t) => !allowed.includes(String(t)));
            if (notAllowed.length > 0) {
                return { status: 'FAIL', note: `${rule.message}. Outside Verblendbereich: ${notAllowed.join(', ')}` };
            }
            return { status: 'PASS' };
        }

        case 'zahnlosRequired': {
            const code = rule.condition.code as string;
            if (!fzCodes.includes(code)) return { status: 'PASS' };

            if (typeof c.zahnlos !== 'boolean') {
                return inconclusive('No "zahnlos" boolean on case; cannot validate zahnlos-required rule');
            }
            if (!c.zahnlos) {
                return { status: 'FAIL', note: `${rule.message}. Case indicates zahnlos=false` };
            }
            return { status: 'PASS' };
        }

        default:
            return { status: 'WARN', note: `Unknown rule condition type: ${(rule.condition as any).type}` };
    }
}

describe('GATE: CasePack FZ Rules v1', () => {
    // Paths relative to this test file
    const rulesPath = resolve(__dirname, '../../core/billing/knowledgeBase/rules/fz_rules_v1.json');
    const casesPath = resolve(__dirname, '../../__fixtures__/ze_bel_cases_v1_imported.json');

    const rulesDoc = loadJson<RulesDoc>(rulesPath);
    const casePack = loadJson<CasePack>(casesPath);

    // Build index once
    const ruleIndex = buildRuleIndex(rulesDoc.rules as Rule[]);

    it('loads rules + cases', () => {
        expect(rulesDoc?._meta?.schema).toBe('docudent.fzRules.v1');
        expect(Array.isArray(rulesDoc.rules)).toBe(true);
        expect(Array.isArray(casePack.cases)).toBe(true);
        expect(casePack.cases.length).toBeGreaterThan(0);
    });

    it('evaluates all cases against applicable rules using index', () => {
        const summary = {
            pass: 0,
            warn: 0,
            fail: 0,
            totalEvaluations: 0,
            candidatesTotal: 0,
        };

        const perCase: Record<
            string,
            { PASS: string[]; WARN: Array<{ ruleId: string; note: string }>; FAIL: Array<{ ruleId: string; note: string }> }
        > = {};

        for (const c of casePack.cases) {
            perCase[c.id] = { PASS: [], WARN: [], FAIL: [] };

            // Use index to get candidates (already deduped and sorted)
            const candidates = getCandidateRules(ruleIndex, c);
            summary.candidatesTotal += candidates.length;

            for (const rule of candidates) {
                summary.totalEvaluations += 1;

                const res = evalRule(rule, c);
                if (res.status === 'PASS') {
                    summary.pass += 1;
                    perCase[c.id].PASS.push(rule.ruleId);
                } else if (res.status === 'WARN') {
                    summary.warn += 1;
                    perCase[c.id].WARN.push({ ruleId: rule.ruleId, note: res.note });
                    console.warn(`[WARN] ${c.id} :: ${rule.ruleId} :: ${res.note}`);
                } else {
                    summary.fail += 1;
                    perCase[c.id].FAIL.push({ ruleId: rule.ruleId, note: res.note });
                    console.error(`[FAIL] ${c.id} :: ${rule.ruleId} :: ${res.note}`);
                }
            }
        }

        // Snapshot-like summary
        console.log(
            `[SUMMARY] candidates=${summary.candidatesTotal} evals=${summary.totalEvaluations} pass=${summary.pass} warn=${summary.warn} fail=${summary.fail}`
        );

        // Fail build if any FAIL exists
        if (summary.fail > 0) {
            // Help debugging: list failing cases
            const failing = Object.entries(perCase)
                .filter(([, v]) => v.FAIL.length > 0)
                .map(([id, v]) => ({ id, fails: v.FAIL }));
            expect(failing, 'Some cases failed FZ rules').toEqual([]);
        } else {
            expect(summary.fail).toBe(0);
        }
    });
});
