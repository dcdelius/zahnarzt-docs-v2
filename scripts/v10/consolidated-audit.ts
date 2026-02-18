import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveHostedRunEnv, validateHostedRunEnv } from './shared/hostedEnv';

type AuditStep = {
    id: string;
    cmd: string;
    args: string[];
    env?: Record<string, string>;
};

const requireLlmExtractionInAudit = process.env.DOCUDENT_AUDIT_REQUIRE_LLM_EXTRACTION === '1';

function assertHostedAuthEnv(featureFlag: 'DOCUDENT_AUDIT_INCLUDE_HOSTED_AUTH' | 'DOCUDENT_AUDIT_INCLUDE_HOSTED_PREANALYSIS'): void {
    const validation = validateHostedRunEnv(resolveHostedRunEnv());
    if (!validation.ok) {
        for (const issue of validation.issues) {
            console.error(`[v10:audit:consolidated] ${featureFlag}=1 ${issue}`);
        }
        process.exit(1);
    }
}

const steps: AuditStep[] = [
    {
        id: 'v10-online-deps',
        cmd: 'npm',
        args: ['run', 'doctor:online', '--', '--verbose'],
    },
    {
        id: 'v10-kb-parity',
        cmd: 'npm',
        args: ['run', 'v10:kb-parity'],
    },
    {
        id: 'v10-gates',
        cmd: 'npm',
        args: ['test', '--', '--run', 'src/docudent/v10/__tests__/gates'],
    },
    {
        id: 'v10-documentation-fidelity',
        cmd: 'npm',
        args: [
            'run',
            'v10:documentation-fidelity-audit',
            '--',
            '--file',
            'scripts/v10/scenarios.v10.realworld.fliessend20.json',
            '--strict-warnings',
            '--disable-firestore-kb',
            ...(requireLlmExtractionInAudit ? ['--require-llm-extraction'] : []),
        ],
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

if (process.env.DOCUDENT_AUDIT_INCLUDE_PREANALYSIS_READINESS === '1') {
    steps.push({
        id: 'v10-preanalysis-readiness',
        cmd: 'npm',
        args: ['run', 'v10:preanalysis-readiness'],
        env: {
            DOCUDENT_READINESS_STRICT: '1',
            DOCUDENT_READINESS_REQUIRE_PASSWORD: '1',
            DOCUDENT_READINESS_REQUIRE_CALLABLES: '1',
            DOCUDENT_READINESS_INCLUDE_HOSTED_GATE: '0',
        },
    });
}

if (process.env.DOCUDENT_AUDIT_INCLUDE_HOSTED_AUTH === '1') {
    assertHostedAuthEnv('DOCUDENT_AUDIT_INCLUDE_HOSTED_AUTH');
    steps.push({
        id: 'v10-hosted-auth-gate',
        cmd: 'npm',
        args: ['run', 'e2e:v10:hosted-auth-gate'],
    });
}

if (process.env.DOCUDENT_AUDIT_INCLUDE_HOSTED_PREANALYSIS === '1') {
    assertHostedAuthEnv('DOCUDENT_AUDIT_INCLUDE_HOSTED_PREANALYSIS');
    steps.push({
        id: 'v10-hosted-preanalysis-gate',
        cmd: 'npm',
        args: ['run', 'e2e:v10:hosted-preanalysis-gate'],
    });
}

const startedAt = new Date().toISOString();
const results = steps.map((step) => {
    const run = spawnSync(step.cmd, step.args, {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            ...(step.env ?? {}),
        },
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
