import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveHostedRunEnv, validateHostedRunEnv } from './shared/hostedEnv';

type JsonStepResult = {
    id: string;
    ok: boolean;
    exitCode: number;
    payload: unknown;
};

type CommandStepResult = {
    id: string;
    ok: boolean;
    exitCode: number;
    skipped?: boolean;
    reason?: string;
};

type ReadinessReport = {
    startedAt: string;
    finishedAt: string;
    strict: boolean;
    requirements: {
        password: boolean;
        callables: boolean;
    };
    summary: {
        hostedEnvOk: boolean;
        authPasswordOk: boolean;
        callablesOk: boolean;
        readyForHostedPreanalysis: boolean;
    };
    diagnostics: {
        hostedEnvIssues: string[];
        authPasswordMessage: string;
        callableAuthMessage: string;
        callableFailures: string[];
    };
    blockers: string[];
    nextSteps: string[];
    steps: Array<JsonStepResult | CommandStepResult>;
};

const ARTIFACT_DIR = resolve('docs/system-atlas/artifacts/_latest/v10-preanalysis-readiness');

function parseJsonFromStdout(stdout: string): unknown {
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end < start) return null;
    const candidate = trimmed.slice(start, end + 1);
    try {
        return JSON.parse(candidate);
    } catch {
        return null;
    }
}

function runJsonStep(id: string, scriptPath: string, env: Record<string, string>): JsonStepResult {
    const child = spawnSync('node', ['--import', 'tsx', scriptPath], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
            ...process.env,
            ...env,
        },
    });

    const payload = parseJsonFromStdout(`${child.stdout ?? ''}\n${child.stderr ?? ''}`);
    return {
        id,
        ok: child.status === 0,
        exitCode: child.status ?? 1,
        payload,
    };
}

function runCommandStep(id: string, cmd: string, args: string[], env: Record<string, string>): CommandStepResult {
    const child = spawnSync(cmd, args, {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: {
            ...process.env,
            ...env,
        },
    });
    return {
        id,
        ok: child.status === 0,
        exitCode: child.status ?? 1,
    };
}

function resolveBoolean(name: string): boolean {
    return process.env[name] === '1';
}

function extractAuthPasswordOk(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') return false;
    const passwordAuth = (payload as any).passwordAuth;
    return Boolean(passwordAuth?.ok);
}

function extractCallablesOk(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') return false;
    const callables = (payload as any).callables;
    if (!Array.isArray(callables) || callables.length === 0) return false;
    return callables.every((entry: any) => entry?.ok === true);
}

function extractAuthPasswordMessage(payload: unknown): string {
    if (!payload || typeof payload !== 'object') return 'unknown';
    const message = (payload as any)?.passwordAuth?.message;
    return typeof message === 'string' && message.trim().length > 0 ? message.trim() : 'unknown';
}

function extractCallableAuthMessage(payload: unknown): string {
    if (!payload || typeof payload !== 'object') return 'unknown';
    const message = (payload as any)?.auth?.message;
    return typeof message === 'string' && message.trim().length > 0 ? message.trim() : 'unknown';
}

function extractCallableFailures(payload: unknown): string[] {
    if (!payload || typeof payload !== 'object') return [];
    const callables = (payload as any)?.callables;
    if (!Array.isArray(callables)) return [];
    const failures: string[] = [];
    for (const entry of callables) {
        if (entry?.ok === true) continue;
        const name = typeof entry?.name === 'string' ? entry.name : 'unknown-callable';
        const message = typeof entry?.message === 'string' ? entry.message : 'unknown';
        failures.push(`${name}: ${message}`);
    }
    return failures;
}

function writeArtifacts(report: ReadinessReport) {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    writeFileSync(resolve(ARTIFACT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const summaryLines = [
        '# V10 Preanalysis Readiness',
        '',
        `- Started: ${report.startedAt}`,
        `- Finished: ${report.finishedAt}`,
        `- Strict: ${String(report.strict)}`,
        `- Require password auth: ${String(report.requirements.password)}`,
        `- Require callable health: ${String(report.requirements.callables)}`,
        `- Hosted env ok: ${String(report.summary.hostedEnvOk)}`,
        `- Auth password ok: ${String(report.summary.authPasswordOk)}`,
        `- Callables ok: ${String(report.summary.callablesOk)}`,
        `- Ready for hosted preanalysis gate: ${String(report.summary.readyForHostedPreanalysis)}`,
        '',
        '## Diagnostics',
        ...(report.diagnostics.hostedEnvIssues.length > 0
            ? report.diagnostics.hostedEnvIssues.map(item => `- Hosted env issue: ${item}`)
            : ['- Hosted env issue: none']),
        `- Auth password message: ${report.diagnostics.authPasswordMessage}`,
        `- Callable auth message: ${report.diagnostics.callableAuthMessage}`,
        ...report.diagnostics.callableFailures.map(item => `- Callable failure: ${item}`),
        '',
        '## Blockers',
        ...(report.blockers.length > 0 ? report.blockers.map(item => `- ${item}`) : ['- none']),
        '',
        '## Next Steps',
        ...(report.nextSteps.length > 0 ? report.nextSteps.map(item => `- ${item}`) : ['- none']),
        '',
        '## Steps',
        ...report.steps.map(step => {
            const commandStep = step as CommandStepResult;
            if (commandStep.skipped) {
                return `- ${step.id}: SKIPPED (${commandStep.reason ?? 'prerequisites not met'})`;
            }
            if (step.id === 'auth-diagnostics' && !report.summary.authPasswordOk) {
                return `- ${step.id}: WARN (password auth not ready)`;
            }
            if (step.id === 'callable-diagnostics' && !report.summary.callablesOk) {
                return `- ${step.id}: WARN (callables not ready)`;
            }
            return `- ${step.id}: ${step.ok ? 'PASS' : `FAIL (exit ${step.exitCode})`}`;
        }),
        '',
    ];

    writeFileSync(resolve(ARTIFACT_DIR, 'summary.md'), `${summaryLines.join('\n')}\n`, 'utf8');
}

function main() {
    const startedAt = new Date().toISOString();
    const strict = resolveBoolean('DOCUDENT_READINESS_STRICT');
    const requirePassword = resolveBoolean('DOCUDENT_READINESS_REQUIRE_PASSWORD');
    const requireCallables = resolveBoolean('DOCUDENT_READINESS_REQUIRE_CALLABLES');
    const includeHostedGate = resolveBoolean('DOCUDENT_READINESS_INCLUDE_HOSTED_GATE');
    const hostedEnvValidation = validateHostedRunEnv(resolveHostedRunEnv());

    const authStep = runJsonStep(
        'auth-diagnostics',
        'scripts/v10/checkFirebaseAuthReadiness.ts',
        {
            DOCUDENT_AUTH_DIAG_STRICT: strict ? '1' : '0',
            DOCUDENT_AUTH_DIAG_REQUIRE_PASSWORD: requirePassword ? '1' : '0',
            DOCUDENT_AUTH_DIAG_REQUIRE_ANON: '0',
        }
    );

    const callableStep = runJsonStep(
        'callable-diagnostics',
        'scripts/v10/checkCallableLlmGateways.ts',
        {
            DOCUDENT_CALLABLE_DIAG_STRICT: strict && requireCallables ? '1' : '0',
        }
    );

    const hostedEnvOk = hostedEnvValidation.ok;
    const authPasswordOk = extractAuthPasswordOk(authStep.payload);
    const callablesOk = extractCallablesOk(callableStep.payload);
    const readyForHostedPreanalysis = hostedEnvOk && authPasswordOk && callablesOk;
    const authPasswordMessage = extractAuthPasswordMessage(authStep.payload);
    const callableAuthMessage = extractCallableAuthMessage(callableStep.payload);
    const callableFailures = extractCallableFailures(callableStep.payload);

    const steps: Array<JsonStepResult | CommandStepResult> = [authStep, callableStep];

    if (includeHostedGate) {
        if (readyForHostedPreanalysis) {
            const hostedGateStep = runCommandStep(
                'hosted-preanalysis-gate',
                'npm',
                ['run', 'e2e:v10:hosted-preanalysis-gate'],
                {}
            );
            steps.push(hostedGateStep);
        } else {
            steps.push({
                id: 'hosted-preanalysis-gate',
                ok: false,
                exitCode: 0,
                skipped: true,
                reason: 'readiness prerequisites not met',
            });
        }
    }

    const blockers: string[] = [];
    const nextSteps: string[] = [];

    if (!hostedEnvOk) {
        for (const issue of hostedEnvValidation.issues) {
            blockers.push(`Hosted env issue: ${issue}`);
        }
        nextSteps.push('Set hosted env vars (PLAYWRIGHT_BASE_URL, E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD).');
    }

    if (!authPasswordOk) {
        if (authPasswordMessage === 'credentials missing') {
            blockers.push('Hosted login credentials missing (E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD).');
            nextSteps.push('Set E2E credentials in shell or .env.e2e.local.');
        } else {
            blockers.push(`Password auth unavailable: ${authPasswordMessage}`);
            nextSteps.push('Validate hosted login credentials with npm run v10:auth-diagnostics.');
        }
    }

    if (!callablesOk) {
        if (callableAuthMessage !== 'unknown') {
            blockers.push(`Callable auth unavailable: ${callableAuthMessage}`);
        } else {
            blockers.push('Callable gateways not healthy.');
        }
        if (callableFailures.length > 0) {
            for (const failure of callableFailures) {
                blockers.push(`Callable failure: ${failure}`);
            }
        }
        nextSteps.push('Run npm run v10:callable-diagnostics with valid hosted credentials.');
    }

    if (authPasswordOk && callablesOk) {
        nextSteps.push('Run npm run e2e:v10:hosted-preanalysis-gate.');
    }

    const finishedAt = new Date().toISOString();
    const report: ReadinessReport = {
        startedAt,
        finishedAt,
        strict,
        requirements: {
            password: requirePassword,
            callables: requireCallables,
        },
        summary: {
            hostedEnvOk,
            authPasswordOk,
            callablesOk,
            readyForHostedPreanalysis,
        },
        diagnostics: {
            hostedEnvIssues: hostedEnvValidation.issues,
            authPasswordMessage,
            callableAuthMessage,
            callableFailures,
        },
        blockers,
        nextSteps,
        steps,
    };

    writeArtifacts(report);
    console.log(`[v10:preanalysis-readiness] report: ${resolve(ARTIFACT_DIR, 'report.json')}`);

    const requiredChecksOk = (!requirePassword || authPasswordOk) && (!requireCallables || callablesOk);
    const stepsOk = steps.every(step => step.ok);
    if (strict && (!requiredChecksOk || !stepsOk)) {
        process.exit(1);
    }
}

main();
