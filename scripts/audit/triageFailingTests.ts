#!/usr/bin/env npx ts-node
/**
 * M77 Audit: Failing Tests Triage
 * Reads vitest.json output and clusters failures by root cause
 */

import * as fs from 'fs';
import * as path from 'path';

const VITEST_JSON = path.join(process.cwd(), 'docs/audit/m77/vitest.json');
const OUTPUT_PATH = path.join(process.cwd(), 'docs/audit/m77/failing-tests.triage.json');

interface VitestResult {
    testResults: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        assertionResults: Array<{
            fullName: string;
            status: string;
            failureMessages?: string[];
        }>;
    }>;
}

interface TriageCluster {
    cluster_id: string;
    hypothesis: string;
    affected_layer: string;
    fix_targets: string[];
    test_files: string[];
    sample_errors: string[];
}

function guessCluster(testFile: string, errors: string[]): { clusterId: string; hypothesis: string; layer: string } {
    const errorText = errors.join(' ').toLowerCase();

    // Pattern matching for common failure types
    if (testFile.includes('no-logic.test')) {
        return {
            clusterId: 'V7_BOUNDARY_VIOLATION',
            hypothesis: 'V7 pipeline contains orchestration logic that should be V10-only',
            layer: 'v7/pipeline',
        };
    }

    if (testFile.includes('reality-integration')) {
        return {
            clusterId: 'CONTRACT_MISMATCH',
            hypothesis: 'Question/output contracts have evolved, test expectations stale',
            layer: 'v7/pipeline',
        };
    }

    if (errorText.includes('import') || errorText.includes('cannot find module')) {
        return {
            clusterId: 'IMPORT_RESOLUTION',
            hypothesis: 'Module resolution or circular import issue',
            layer: 'core',
        };
    }

    if (errorText.includes('undefined') || errorText.includes('null')) {
        return {
            clusterId: 'NULL_SAFETY',
            hypothesis: 'Missing null checks or optional chaining',
            layer: 'runtime',
        };
    }

    if (errorText.includes('timeout') || errorText.includes('async')) {
        return {
            clusterId: 'ASYNC_TIMING',
            hypothesis: 'Async operation timing or missing await',
            layer: 'async',
        };
    }

    if (testFile.includes('gate-')) {
        if (testFile.includes('billing')) {
            return {
                clusterId: 'BILLING_GATE',
                hypothesis: 'Billing logic or combinability rule mismatch',
                layer: 'billing',
            };
        }
        if (testFile.includes('medical')) {
            return {
                clusterId: 'MEDICAL_GATE',
                hypothesis: 'Medical KB rule or askback expectation mismatch',
                layer: 'medical_kb',
            };
        }
        return {
            clusterId: 'GATE_FAILURE',
            hypothesis: 'Gate test expectation needs update',
            layer: 'gates',
        };
    }

    if (testFile.includes('parity')) {
        return {
            clusterId: 'PARITY_DRIFT',
            hypothesis: 'UI vs CLI parity has drifted',
            layer: 'parity',
        };
    }

    return {
        clusterId: 'UNCATEGORIZED',
        hypothesis: 'Needs manual investigation',
        layer: 'unknown',
    };
}

function main() {
    if (!fs.existsSync(VITEST_JSON)) {
        console.error(`[triage] No vitest.json found at ${VITEST_JSON}`);
        console.error('[triage] Run: npx vitest run --reporter=json --outputFile docs/audit/m77/vitest.json');
        process.exit(1);
    }

    const vitestData = JSON.parse(fs.readFileSync(VITEST_JSON, 'utf-8')) as VitestResult;

    // Collect failing tests
    const failingTests: Array<{ file: string; errors: string[] }> = [];

    for (const result of vitestData.testResults || []) {
        if (result.status === 'failed') {
            const errors = result.assertionResults
                ?.filter(a => a.status === 'failed')
                ?.flatMap(a => a.failureMessages || [])
                ?.slice(0, 3) || [];

            failingTests.push({
                file: result.name,
                errors,
            });
        }
    }

    console.log(`[triage] Found ${failingTests.length} failing test files`);

    // Cluster by root cause
    const clusters = new Map<string, TriageCluster>();

    for (const test of failingTests) {
        const { clusterId, hypothesis, layer } = guessCluster(test.file, test.errors);

        if (!clusters.has(clusterId)) {
            clusters.set(clusterId, {
                cluster_id: clusterId,
                hypothesis,
                affected_layer: layer,
                fix_targets: [],
                test_files: [],
                sample_errors: [],
            });
        }

        const cluster = clusters.get(clusterId)!;
        cluster.test_files.push(test.file);

        if (cluster.sample_errors.length < 3) {
            cluster.sample_errors.push(...test.errors.slice(0, 1));
        }
    }

    // Determine fix targets
    for (const cluster of clusters.values()) {
        switch (cluster.cluster_id) {
            case 'V7_BOUNDARY_VIOLATION':
                cluster.fix_targets = ['src/docudent/v7/pipeline/index.ts', 'src/docudent/v7/pipeline/adapters/'];
                break;
            case 'CONTRACT_MISMATCH':
                cluster.fix_targets = ['Update test expectations', 'src/docudent/contracts/'];
                break;
            case 'BILLING_GATE':
                cluster.fix_targets = ['src/docudent/core/billing/', 'src/docudent/v10/billing/'];
                break;
            case 'MEDICAL_GATE':
                cluster.fix_targets = ['src/docudent/medical_kb/'];
                break;
            default:
                cluster.fix_targets = ['Manual investigation required'];
        }
    }

    const output = {
        generated_at: new Date().toISOString(),
        total_failing_files: failingTests.length,
        cluster_count: clusters.size,
        clusters: Array.from(clusters.values()),
        uncovered_files: [],
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`[triage] Written triage to ${OUTPUT_PATH}`);
    console.log(`[triage] Clusters: ${Array.from(clusters.keys()).join(', ')}`);
}

main();
