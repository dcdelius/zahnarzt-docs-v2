#!/usr/bin/env npx tsx
/**
 * V10 MVP Check Runner
 * 
 * One command to rule them all - runs all V10 MVP verification steps.
 * Fails fast on first error with clear message.
 * 
 * Usage: npm run v10:mvp-check
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const ARTIFACT_DIR = 'docs/system-atlas/artifacts/_latest/v10-mvp';

interface CheckResult {
    step: string;
    status: 'PASS' | 'FAIL';
    durationMs: number;
    output?: string;
    error?: string;
}

const results: CheckResult[] = [];
let allPassed = true;

function runCheck(name: string, command: string): CheckResult {
    const start = Date.now();
    console.log(`\n🔍 ${name}...`);

    try {
        const output = execSync(command, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: process.cwd(),
        });

        const duration = Date.now() - start;
        console.log(`   ✅ PASS (${duration}ms)`);

        return {
            step: name,
            status: 'PASS',
            durationMs: duration,
            output: output.slice(-500), // Last 500 chars
        };
    } catch (err: any) {
        const duration = Date.now() - start;
        const error = err.stderr || err.message || String(err);
        console.log(`   ❌ FAIL (${duration}ms)`);
        console.log(`   → ${error.slice(0, 200)}`);
        allPassed = false;

        return {
            step: name,
            status: 'FAIL',
            durationMs: duration,
            error: error.slice(0, 1000),
        };
    }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('       V10 MVP CHECK RUNNER');
console.log('═══════════════════════════════════════════════════');

// Step 1: Build
results.push(runCheck('Build', 'npm run build'));
if (!allPassed) {
    console.log('\n⛔ Build failed. Stopping.');
    process.exit(1);
}

// Step 2: V10 UI Contract Tests
results.push(runCheck('V10 UI Tests', 'npx vitest run v10/__tests__/ui'));
if (!allPassed) {
    console.log('\n⛔ UI tests failed. Stopping.');
    process.exit(1);
}

// Step 3: Boundary Gate
results.push(runCheck('V10/V7 Gate', 'npx vitest run gate-v10-no-imports-from-v7'));
if (!allPassed) {
    console.log('\n⛔ Boundary gate failed. Stopping.');
    process.exit(1);
}

// Step 4: Atlas Refresh
results.push(runCheck('Atlas Refresh', 'npm run atlas:refresh'));
if (!allPassed) {
    console.log('\n⛔ Atlas refresh failed. Stopping.');
    process.exit(1);
}

// Step 5: Atlas Check
results.push(runCheck('Atlas Check', 'npm run atlas:check'));
if (!allPassed) {
    console.log('\n⛔ Atlas check failed. Stopping.');
    process.exit(1);
}

// Calculate totals
const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;

console.log('\n═══════════════════════════════════════════════════');
console.log(`       RESULTS: ${passCount}/${results.length} PASS`);
console.log(`       TOTAL TIME: ${(totalDuration / 1000).toFixed(2)}s`);
console.log('═══════════════════════════════════════════════════');

// Write report.json
const report = {
    timestamp: new Date().toISOString(),
    verdict: allPassed ? 'PASS' : 'FAIL',
    results,
    summary: {
        total: results.length,
        passed: passCount,
        failed: failCount,
        durationMs: totalDuration,
    },
};

const reportPath = join(ARTIFACT_DIR, 'mvp-check.report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Report: ${reportPath}`);

// Write summary.md
const summaryMd = `# V10 MVP Check Summary

**Date**: ${new Date().toISOString().split('T')[0]}
**Verdict**: ${allPassed ? '✅ PASS' : '❌ FAIL'}
**Duration**: ${(totalDuration / 1000).toFixed(2)}s

## Results

| Step | Status | Duration |
|------|--------|----------|
${results.map(r => `| ${r.step} | ${r.status === 'PASS' ? '✅' : '❌'} | ${r.durationMs}ms |`).join('\n')}

## Commands Run
1. \`npm run build\`
2. \`npx vitest run v10/__tests__/ui\`
3. \`npx vitest run gate-v10-no-imports-from-v7\`
4. \`npm run atlas:refresh\`
5. \`npm run atlas:check\`
`;

const summaryPath = join(ARTIFACT_DIR, 'mvp-check.summary.md');
writeFileSync(summaryPath, summaryMd);
console.log(`📄 Summary: ${summaryPath}`);

if (allPassed) {
    console.log('\n✅ V10 MVP CHECK PASSED\n');
    process.exit(0);
} else {
    console.log('\n❌ V10 MVP CHECK FAILED\n');
    process.exit(1);
}
