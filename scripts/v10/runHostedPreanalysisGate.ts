import { spawnSync } from 'node:child_process';
import { resolveFirstDefined } from './shared/resolveEnv';
import { resolveHostedRunEnv, validateHostedRunEnv } from './shared/hostedEnv';

function fail(message: string): never {
    console.error(`[hosted-preanalysis-gate] ${message}`);
    process.exit(1);
}

function resolveFirebaseApiKey(): string | null {
    return resolveFirstDefined(['FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY']);
}

const hostedEnv = resolveHostedRunEnv();
const hostedEnvValidation = validateHostedRunEnv(hostedEnv);
if (!hostedEnvValidation.ok) {
    fail(hostedEnvValidation.issues.join(' '));
}
const baseUrl = hostedEnv.baseUrl!.trim();

const grep = process.env.HOSTED_PREANALYSIS_GATE_GREP || '';
const args = [
    'playwright',
    'test',
    'e2e/v10-hosted-audit-20.e2e.spec.ts',
    '--project=chromium',
];

if (grep) {
    args.push('--grep', grep);
}

console.log(`[hosted-preanalysis-gate] target=${baseUrl}`);
console.log(`[hosted-preanalysis-gate] strict preanalysis llm=on`);
if (grep) {
    console.log(`[hosted-preanalysis-gate] grep=${grep}`);
}

const skipAuthPreflight = process.env.DOCUDENT_SKIP_AUTH_PREFLIGHT === '1';
if (!skipAuthPreflight) {
    const firebaseApiKey = resolveFirebaseApiKey();
    if (!firebaseApiKey) {
        fail('Firebase API key nicht gefunden (FIREBASE_API_KEY / VITE_FIREBASE_API_KEY / .env). Setze DOCUDENT_SKIP_AUTH_PREFLIGHT=1 zum Ueberspringen.');
    }

    console.log('[hosted-preanalysis-gate] running auth preflight (password requirement)...');
    const preflight = spawnSync('node', ['--import', 'tsx', 'scripts/v10/checkFirebaseAuthReadiness.ts'], {
        stdio: 'inherit',
        env: {
            ...process.env,
            FIREBASE_API_KEY: firebaseApiKey,
            DOCUDENT_AUTH_DIAG_STRICT: '1',
            DOCUDENT_AUTH_DIAG_REQUIRE_PASSWORD: '1',
        },
    });

    if (preflight.status !== 0) {
        fail(`Auth preflight fehlgeschlagen (exit=${preflight.status ?? 1}).`);
    }

    console.log('[hosted-preanalysis-gate] running callable llm gateway preflight...');
    const callablePreflight = spawnSync('node', ['--import', 'tsx', 'scripts/v10/checkCallableLlmGateways.ts'], {
        stdio: 'inherit',
        env: {
            ...process.env,
            FIREBASE_API_KEY: firebaseApiKey,
            DOCUDENT_CALLABLE_DIAG_STRICT: '1',
        },
    });
    if (callablePreflight.status !== 0) {
        fail(`Callable preflight fehlgeschlagen (exit=${callablePreflight.status ?? 1}).`);
    }
}

const result = spawnSync('npx', args, {
    stdio: 'inherit',
    env: {
        ...process.env,
        PLAYWRIGHT_NO_WEBSERVER: '1',
        DOCUDENT_E2E_FORCE_REAL_AUTH: '1',
        DOCUDENT_AUDIT_STRICT_PREANALYSIS_LLM: '1',
    },
});

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}
