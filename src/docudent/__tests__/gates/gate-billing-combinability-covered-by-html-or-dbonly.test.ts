/**
 * Gate: Billing Combinability Covered by HTML or Marked DB-Only
 *
 * Ensures all BLOCK-level combinability rules either have HTML source
 * evidence or are explicitly marked as dbOnly.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadCombinabilityKb } from '../../v10/kb/combinability';

describe('Gate: Billing Combinability Covered by HTML or DB-Only', () => {
    const kb = loadCombinabilityKb();

    const truthSetPath = path.join(
        process.cwd(),
        'docs/audit/html_truthset.v1.json'
    );

    // Whitelist of rules that are intentionally DB-only (not from HTML)
    const DB_ONLY_RULES = [
        'regel_bema12_nur_kofferdam',      // Internal clinic policy
        'regel_bema12_einmal_kieferhaelfte', // Frequency rule
        'regel_f_code_nur_fuellung',        // Treatment-specific
        'regel_bema25_nur_caries_profunda', // Medical indication
        'regel_bema26_nur_punktfoermig',    // Medical indication
        'regel_la_uk_nur_leitung',          // Anatomical rule
        'e2e_test_block_rule',              // Test fixture
    ];

    it('all BLOCK rules have sourceRefs or are in DB_ONLY whitelist', () => {
        const blockRules = kb.rules.filter(r => r.schweregrad === 'regress');
        const uncovered: string[] = [];

        for (const rule of blockRules) {
            const hasSource = rule.sourceRefs && rule.sourceRefs.length > 0;
            const isDbOnly = DB_ONLY_RULES.includes(rule.id);

            if (!hasSource && !isDbOnly) {
                uncovered.push(rule.id);
            }
        }

        expect(
            uncovered,
            `Rules without HTML source or dbOnly marking: ${uncovered.join(', ')}`
        ).toHaveLength(0);
    });

    it('critical rules have sourceRefs', () => {
        const criticalRuleIds = [
            'regel_goz2197_nicht_neben_2060_2120',
            'regel_goz2040_nicht_neben_2060_2080',
        ];

        for (const ruleId of criticalRuleIds) {
            const rule = kb.rules.find(r => r.id === ruleId);
            if (rule) {
                expect(
                    rule.sourceRefs && rule.sourceRefs.length > 0,
                    `Critical rule ${ruleId} must have sourceRefs`
                ).toBe(true);
            }
        }
    });

    it('DB_ONLY whitelist is documented', () => {
        // Ensure we don't silently add too many DB-only rules
        expect(DB_ONLY_RULES.length).toBeLessThanOrEqual(15);
    });
});
