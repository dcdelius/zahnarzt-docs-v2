/**
 * BEMA-F Truthset Runner
 * 
 * Executes 50 cases from bema-f-regression-suite.json against the renderer.
 * Outputs: report.json + summary.md to Atlas _latest/
 * 
 * Run: npx tsx scripts/runBemaFTruthset.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { resolveSurfaceBilling, type SurfaceMapping } from '../src/docudent/v10/billing/surfaceBillingResolver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load truthset
const truthsetPath = path.join(__dirname, '../src/docudent/__tests__/truthset/bema-f-regression-suite.json');
const truthset = JSON.parse(fs.readFileSync(truthsetPath, 'utf-8'));

// Standard surface mapping from unified.json
const SURFACE_MAPPING: SurfaceMapping = {
    '1': { GKV: 'BEMA_13', PKV: 'GOZ_2060', MKV: 'BEMA_13', MKV_addon: 'GOZ_2060' },
    '2': { GKV: 'BEMA_13b', PKV: 'GOZ_2080', MKV: 'BEMA_13b', MKV_addon: 'GOZ_2080' },
    '3': { GKV: 'BEMA_13c', PKV: 'GOZ_2100', MKV: 'BEMA_13c', MKV_addon: 'GOZ_2100' },
    '4+': { GKV: 'BEMA_13d', PKV: 'GOZ_2120', MKV: 'BEMA_13d', MKV_addon: 'GOZ_2120' },
};

interface TestCase {
    id: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    surfaces: string[];
    expectedBase: string[];
    expectedAddon: string[];
    mehrkostenMentioned?: boolean;
}

interface Result {
    id: string;
    passed: boolean;
    expected: { base: string[]; addon: string[] };
    actual: { base: string | null; addon: string | null };
    error?: string;
}

const results: Result[] = [];

for (const tc of truthset.cases as TestCase[]) {
    try {
        const resolved = resolveSurfaceBilling(
            SURFACE_MAPPING,
            { surfaces: tc.surfaces },
            tc.insuranceType
        );

        if (!resolved) {
            results.push({
                id: tc.id,
                passed: false,
                expected: { base: tc.expectedBase, addon: tc.expectedAddon },
                actual: { base: null, addon: null },
                error: 'Resolution failed',
            });
            continue;
        }

        // For MKV, addon is only included if mehrkostenMentioned
        const expectedAddon = tc.insuranceType === 'MKV' && tc.mehrkostenMentioned
            ? tc.expectedAddon
            : [];

        // Check base - first expected base should match billingCode
        const baseMatch = tc.expectedBase.length > 0 && resolved.billingCode === tc.expectedBase[0];

        // Check addon
        const addonMatch =
            (expectedAddon.length === 0 && !resolved.addonCode) ||
            (expectedAddon.length > 0 && resolved.addonCode === expectedAddon[0]);

        const passed = baseMatch && addonMatch;

        results.push({
            id: tc.id,
            passed,
            expected: { base: tc.expectedBase, addon: expectedAddon },
            actual: { base: resolved.billingCode, addon: resolved.addonCode ?? null },
        });

    } catch (err) {
        results.push({
            id: tc.id,
            passed: false,
            expected: { base: tc.expectedBase, addon: tc.expectedAddon },
            actual: { base: null, addon: null },
            error: String(err),
        });
    }
}

// Summary
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\n BEMA-F Truthset Results: ${passed}/${total} PASSED`);

if (failed > 0) {
    console.log(`\n❌ Failed cases:`);
    for (const r of results.filter(r => !r.passed)) {
        console.log(`  - ${r.id}: expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)}`);
    }
}

// Write report.json
const reportPath = path.join(__dirname, '../docs/system-atlas/artifacts/_latest/bema-f-truthset/report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({
    generated: new Date().toISOString(),
    summary: { total, passed, failed },
    results,
}, null, 2));

// Write summary.md
const summaryPath = path.join(__dirname, '../docs/system-atlas/artifacts/_latest/bema-f-truthset/summary.md');
fs.writeFileSync(summaryPath, `# BEMA-F Truthset Results

**Generated:** ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total | ${total} |
| Passed | ${passed} |
| Failed | ${failed} |
| Pass Rate | ${((passed / total) * 100).toFixed(1)}% |

${failed > 0 ? `## Failed Cases

${results.filter(r => !r.passed).map(r => `- **${r.id}**: expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)}`).join('\n')}` : '## ✅ All cases passed'}
`);

console.log(`\n📄 Report written to: ${reportPath}`);
console.log(`📄 Summary written to: ${summaryPath}`);

process.exit(failed > 0 ? 1 : 0);
