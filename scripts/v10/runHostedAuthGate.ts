import { spawnSync } from 'node:child_process';
import { resolveHostedRunEnv, validateHostedRunEnv } from './shared/hostedEnv';

function fail(message: string): never {
    console.error(`[hosted-auth-gate] ${message}`);
    process.exit(1);
}

const hostedEnv = resolveHostedRunEnv();
const hostedEnvValidation = validateHostedRunEnv(hostedEnv);
if (!hostedEnvValidation.ok) {
    fail(hostedEnvValidation.issues.join(' '));
}
const baseUrl = hostedEnv.baseUrl!.trim();

const grep =
    process.env.HOSTED_GATE_GREP
    || 'S1 - GKV Füllung MOD|S4 - GKV Endo mit Einlage|S11 - GKV Extraktion|S12 - PKV Kronenpräparation mit Confirm-Pfad';

const args = [
    'playwright',
    'test',
    'e2e/v10-realistic-praxis-test.e2e.spec.ts',
    '--project=chromium',
    '--grep',
    grep,
];

console.log(`[hosted-auth-gate] target=${baseUrl}`);
console.log(`[hosted-auth-gate] grep=${grep}`);

const result = spawnSync('npx', args, {
    stdio: 'inherit',
    env: {
        ...process.env,
        PLAYWRIGHT_NO_WEBSERVER: '1',
    },
});

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}
