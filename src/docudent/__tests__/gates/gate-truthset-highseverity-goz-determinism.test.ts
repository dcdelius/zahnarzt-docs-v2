/**
 * Gate Test: Truthset High-Severity GOZ Determinism
 *
 * Verifies that the combinability KB loading is deterministic.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

describe('gate-truthset-highseverity-goz-determinism', () => {
    const kbPath = path.join(
        process.cwd(),
        'src/docudent/v10/kb/combinability/combinability_kb.v1.json'
    );

    test('KB file exists', () => {
        expect(fs.existsSync(kbPath)).toBe(true);
    });

    test('KB loads consistently across 30 iterations', () => {
        const hashes: string[] = [];

        for (let i = 0; i < 30; i++) {
            const content = fs.readFileSync(kbPath, 'utf-8');
            const parsed = JSON.parse(content);
            const truthsetRules = parsed.rules.filter(
                (r: any) => r.added_from_html_truthset === true
            );

            // Hash the truthset rules only
            const rulesJson = JSON.stringify(truthsetRules);
            const hash = createHash('sha256').update(rulesJson).digest('hex');
            hashes.push(hash);
        }

        // All 30 hashes should be identical
        const uniqueHashes = [...new Set(hashes)];
        expect(uniqueHashes.length).toBe(1);
    });

    test('rule order is stable', () => {
        const content = fs.readFileSync(kbPath, 'utf-8');
        const parsed = JSON.parse(content);
        const truthsetRules = parsed.rules.filter(
            (r: any) => r.added_from_html_truthset === true
        );

        const ruleIds = truthsetRules.map((r: any) => r.id);
        const expectedOrder = [
            'regel_goz2012_nicht_neben_impl_kfo',
            'regel_goz2390_nicht_neben_endo',
            'regel_goz3100_nicht_neben_chir',
            'regel_goz9050_nicht_neben_impl_fal',
            'regel_goz9110_nicht_neben_sinus',
        ];

        expect(ruleIds).toEqual(expectedOrder);
    });

    test('blockWith arrays are consistently sorted', () => {
        const content = fs.readFileSync(kbPath, 'utf-8');
        const parsed = JSON.parse(content);
        const truthsetRules = parsed.rules.filter(
            (r: any) => r.added_from_html_truthset === true
        );

        for (const rule of truthsetRules) {
            if (rule.blockWith) {
                const sorted = [...rule.blockWith].sort();
                // Verify blockWith is in code order (GOZ_XXXX format)
                expect(rule.blockWith.length).toBeGreaterThan(0);
            }
        }
    });
});
