import { describe, expect, it } from 'vitest';

import baselineRules from '@/docudent/core/billing/knowledgeBase/regeln/kombinationen.json';
import { hasBillingCatalogEntry } from '@/docudent/v10/billing/billingCatalog';
import { loadCombinabilityKb } from '@/docudent/v10/kb/combinability';
import { normalizeBillingRefId } from '@/docudent/core/billing/billingRefNormalization';

type BaseRule = {
    id: string;
    typ?: string;
    schweregrad?: string;
    betrifft?: string[];
    regel?: { operator?: string };
};

function sortedUnique(values: string[] | undefined): string[] {
    return Array.from(new Set(values ?? [])).sort((a, b) => a.localeCompare(b));
}

describe('Gate: combinability source sync', () => {
    const runtimeKb = loadCombinabilityKb();
    const baseById = new Map<string, BaseRule>(
        (baselineRules as BaseRule[]).map(rule => [rule.id, rule])
    );

    it('runtime KB provenance points to kombinatonen source', () => {
        expect(runtimeKb._meta.sourceFile.toLowerCase()).toContain('kombinationen.json');
    });

    it('all baseline combinability rules are present and semantically aligned', () => {
        const runtimeById = new Map(runtimeKb.rules.map(rule => [rule.id, rule]));
        const drift: Array<{ id: string; field: string; expected: unknown; actual: unknown }> = [];

        for (const [id, baseRule] of baseById.entries()) {
            const runtimeRule = runtimeById.get(id);
            if (!runtimeRule) {
                drift.push({ id, field: 'exists', expected: true, actual: false });
                continue;
            }

            const checks: Array<[string, unknown, unknown]> = [
                ['typ', baseRule.typ, runtimeRule.typ],
                ['schweregrad', baseRule.schweregrad, runtimeRule.schweregrad],
                ['operator', baseRule.regel?.operator, runtimeRule.regel?.operator],
            ];

            for (const [field, expected, actual] of checks) {
                if (expected !== actual) {
                    drift.push({ id, field, expected, actual });
                }
            }

            const expectedCodes = sortedUnique(baseRule.betrifft);
            const actualCodes = sortedUnique(runtimeRule.betrifft);
            if (JSON.stringify(expectedCodes) !== JSON.stringify(actualCodes)) {
                drift.push({
                    id,
                    field: 'betrifft',
                    expected: expectedCodes,
                    actual: actualCodes,
                });
            }
        }

        expect(drift).toEqual([]);
    });

    it('runtime KB contains no test-only rules or non-catalog code refs', () => {
        const violations: Array<{ id: string; code?: string; reason: string }> = [];

        for (const rule of runtimeKb.rules) {
            if (rule.id.toLowerCase().includes('e2e_test')) {
                violations.push({ id: rule.id, reason: 'test_only_rule_id' });
            }

            const allCodes = [...(rule.betrifft || []), ...(rule.blockWith || [])];
            for (const rawCode of allCodes) {
                if (rawCode === 'MKV') continue;
                if (/^TEST_/i.test(rawCode)) {
                    violations.push({ id: rule.id, code: rawCode, reason: 'test_only_code' });
                    continue;
                }

                const code = normalizeBillingRefId(rawCode);
                if (!hasBillingCatalogEntry(code)) {
                    violations.push({ id: rule.id, code, reason: 'unknown_catalog_code' });
                }
            }
        }

        expect(violations).toEqual([]);
    });
});
