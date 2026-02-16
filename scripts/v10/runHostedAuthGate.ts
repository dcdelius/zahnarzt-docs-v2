import { spawnSync } from 'node:child_process';

function fail(message: string): never {
    console.error(`[hosted-auth-gate] ${message}`);
    process.exit(1);
}

const baseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
const loginEmail = process.env.E2E_LOGIN_EMAIL?.trim();
const loginPassword = process.env.E2E_LOGIN_PASSWORD?.trim();

if (!baseUrl) {
    fail('PLAYWRIGHT_BASE_URL fehlt. Beispiel: https://app.docudent.de');
}

if (/localhost|127\.0\.0\.1/i.test(baseUrl)) {
    fail(`PLAYWRIGHT_BASE_URL muss auf Hosted zeigen, nicht auf lokal: ${baseUrl}`);
}

if (!loginEmail || !loginPassword) {
    fail('E2E_LOGIN_EMAIL und E2E_LOGIN_PASSWORD sind Pflicht fuer den Hosted Auth Gate.');
}

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
