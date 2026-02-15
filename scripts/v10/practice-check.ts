/**
 * V10 Practice Check Runner
 * 
 * Runs 8 critical tests for practice readiness:
 * - Insurance: GKV, PKV, MKV (3)
 * - Surfaces: 1fl, 2fl, 3fl, 4fl (4)
 * - MKV nurKasse (1)
 * 
 * Run: npm run v10:practice-check
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { resolveSurfaceBilling, type SurfaceMapping } from '../../src/docudent/v10/billing/surfaceBillingResolver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    mehrkostenConfirmed: boolean;
    expectBema: boolean;
    expectGoz: boolean;
}

const CASES: TestCase[] = [
    // Insurance tests - using resolver directly (no addon logic here)
    { id: 'gkv_basic', insuranceType: 'GKV', surfaces: ['o'], mehrkostenConfirmed: false, expectBema: true, expectGoz: false },
    { id: 'pkv_basic', insuranceType: 'PKV', surfaces: ['o'], mehrkostenConfirmed: false, expectBema: false, expectGoz: true },
    { id: 'mkv_basic', insuranceType: 'MKV', surfaces: ['o'], mehrkostenConfirmed: true, expectBema: true, expectGoz: true },

    // Surface tests (GKV)
    { id: '1fl', insuranceType: 'GKV', surfaces: ['o'], mehrkostenConfirmed: false, expectBema: true, expectGoz: false },
    { id: '2fl', insuranceType: 'GKV', surfaces: ['o', 'd'], mehrkostenConfirmed: false, expectBema: true, expectGoz: false },
    { id: '3fl', insuranceType: 'GKV', surfaces: ['m', 'o', 'd'], mehrkostenConfirmed: false, expectBema: true, expectGoz: false },
    { id: '4fl', insuranceType: 'GKV', surfaces: ['m', 'o', 'd', 'b'], mehrkostenConfirmed: false, expectBema: true, expectGoz: false },

    // MKV nurKasse
    { id: 'mkv_nurKasse', insuranceType: 'MKV', surfaces: ['o'], mehrkostenConfirmed: false, expectBema: true, expectGoz: false },
];

interface Result {
    id: string;
    passed: boolean;
    expected: { bema: boolean; goz: boolean };
    actual: { base: string | null; addon: string | null };
}

const results: Result[] = [];
const startTime = Date.now();

for (const tc of CASES) {
    const resolved = resolveSurfaceBilling(
        SURFACE_MAPPING,
        { surfaces: tc.surfaces },
        tc.insuranceType
    );

    // Base code check
    const baseIsBema = resolved?.billingCode?.startsWith('BEMA_') ?? false;
    const baseIsGoz = resolved?.billingCode?.startsWith('GOZ_') ?? false;

    // For MKV with mehrkostenConfirmed, addon should be GOZ
    const addonIsGoz = tc.mehrkostenConfirmed && (resolved?.addonCode?.startsWith('GOZ_') ?? false);

    // Final expectations
    const hasBema = baseIsBema;
    const hasGoz = baseIsGoz || addonIsGoz;

    const passed = (hasBema === tc.expectBema) && (hasGoz === tc.expectGoz);

    results.push({
        id: tc.id,
        passed,
        expected: { bema: tc.expectBema, goz: tc.expectGoz },
        actual: { base: resolved?.billingCode ?? null, addon: resolved?.addonCode ?? null },
    });
}

const duration = Date.now() - startTime;
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\n🏥 V10 Practice Check: ${passed}/${total} PASSED (${duration}ms)`);

if (failed > 0) {
    console.log(`\n❌ Failed:`);
    for (const r of results.filter(r => !r.passed)) {
        console.log(`  - ${r.id}`);
    }
}

// Write report
const reportDir = path.join(__dirname, '../../docs/system-atlas/artifacts/_latest/v10-practice-check');
fs.mkdirSync(reportDir, { recursive: true });

const report = {
    generated: new Date().toISOString(),
    duration: `${duration}ms`,
    summary: { total, passed, failed },
    results,
};

fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportDir, 'summary.md'), `# V10 Practice Check

**Generated:** ${new Date().toISOString()}

| Metric | Value |
|--------|-------|
| Total | ${total} |
| Passed | ${passed} |
| Failed | ${failed} |
| Duration | ${duration}ms |

${failed > 0 ? `## Failed\n${results.filter(r => !r.passed).map(r => `- ${r.id}`).join('\n')}` : '## ✅ All passed'}
`);

console.log(`\n📄 Report: ${path.join(reportDir, 'report.json')}`);
process.exit(failed > 0 ? 1 : 0);
