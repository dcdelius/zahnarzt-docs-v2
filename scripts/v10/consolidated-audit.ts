import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type AuditStep = {
    id: string;
    cmd: string;
    args: string[];
};

const steps: AuditStep[] = [
    {
        id: 'v10-gates',
        cmd: 'npm',
        args: ['test', '--', '--run', 'src/docudent/v10/__tests__/gates'],
    },
    {
        id: 'v10-procedure-pipeline',
        cmd: 'npm',
        args: [
            'test',
            '--',
            '--run',
            'src/docudent/v10/__tests__/pipeline/strict-kzv-evidence-wiring.test.ts',
            'src/docudent/v10/__tests__/pipeline/v10.review-fact-provenance.test.ts',
            'src/docudent/v10/__tests__/gates/gate-endo-procedure-migration-unbypassable.test.ts',
        ],
    },
    {
        id: 'v10-multitreatment-determinism',
        cmd: 'npm',
        args: [
            'test',
            '--',
            '--run',
            'src/docudent/v10/__tests__/bundle/runV10Bundle.kb-pinning.test.ts',
            'src/docudent/v10/__tests__/bundle/runV10Bundle.output-hash.test.ts',
            'src/docudent/__tests__/gates/gate-v10-bundle-instance-provenance.test.ts',
            'src/docudent/__tests__/gates/gate-v10-bundle-output-hash.test.ts',
            'src/docudent/v10/__tests__/multitreatment/kb-release-pinning.test.ts',
            'src/docudent/v10/__tests__/gates/gate-multitreatment-deterministic-aggregation.test.ts',
            'src/docudent/v10/__tests__/gates/gate-treatment-pack-onboarding-contract.test.ts',
        ],
    },
    {
        id: 'v10-ui-askback-lanes-and-trace',
        cmd: 'npm',
        args: [
            'test',
            '--',
            '--run',
            'src/docudent/v10/__tests__/components/QuestionsFlowV2.lanes.test.tsx',
            'src/docudent/v10/__tests__/components/MultiOutputRenderer.provenance.test.tsx',
            'src/docudent/__tests__/gates/gate-v10-single-intent-direct-run.test.ts',
            'src/docudent/__tests__/gates/gate-v10-release-checklist.test.ts',
        ],
    },
];

if (process.env.DOCUDENT_AUDIT_INCLUDE_E2E !== '0') {
    steps.push({
        id: 'v10-realistic-e2e',
        cmd: 'npx',
        args: ['playwright', 'test', 'e2e/v10-realistic-praxis-test.e2e.spec.ts', '--project=chromium'],
    });
}

const startedAt = new Date().toISOString();
const results = steps.map((step) => {
    const run = spawnSync(step.cmd, step.args, {
        stdio: 'inherit',
        shell: true,
        env: process.env,
    });
    return {
        id: step.id,
        ok: run.status === 0,
        exitCode: run.status ?? 1,
    };
});

const allPassed = results.every((entry) => entry.ok);
const finishedAt = new Date().toISOString();

const reportDir = resolve('docs/system-atlas/artifacts/_latest/v10-consolidated-audit');
mkdirSync(reportDir, { recursive: true });

const report = {
    startedAt,
    finishedAt,
    allPassed,
    steps: results,
};

writeFileSync(resolve(reportDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const summaryLines = [
    '# V10 Consolidated Audit',
    '',
    `- Started: ${startedAt}`,
    `- Finished: ${finishedAt}`,
    `- Result: ${allPassed ? 'PASS' : 'FAIL'}`,
    '',
    '## Steps',
    ...results.map((entry) => `- ${entry.id}: ${entry.ok ? 'PASS' : `FAIL (exit ${entry.exitCode})`}`),
    '',
];

writeFileSync(resolve(reportDir, 'summary.md'), `${summaryLines.join('\n')}\n`, 'utf8');

if (!allPassed) {
    process.exit(1);
}
