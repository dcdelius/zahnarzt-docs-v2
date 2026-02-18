import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGE_JSON_PATH = join(__dirname, '../../../../package.json');
const HOSTED_AUTH_GATE_PATH = join(__dirname, '../../../../scripts/v10/runHostedAuthGate.ts');
const HOSTED_PREANALYSIS_GATE_PATH = join(__dirname, '../../../../scripts/v10/runHostedPreanalysisGate.ts');
const AUTH_DIAG_PATH = join(__dirname, '../../../../scripts/v10/checkFirebaseAuthReadiness.ts');
const CALLABLE_DIAG_PATH = join(__dirname, '../../../../scripts/v10/checkCallableLlmGateways.ts');
const SHARED_ENV_RESOLVER_PATH = join(__dirname, '../../../../scripts/v10/shared/resolveEnv.ts');
const SHARED_HOSTED_ENV_PATH = join(__dirname, '../../../../scripts/v10/shared/hostedEnv.ts');
const READINESS_PACK_PATH = join(__dirname, '../../../../scripts/v10/runV10PreanalysisReadinessPack.ts');

describe('gate-v10-preanalysis-toolchain-scripts', () => {
    it('keeps preanalysis readiness and diagnostics scripts wired in package.json', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        expect(pkg?.scripts?.['v10:auth-diagnostics']).toContain('scripts/v10/checkFirebaseAuthReadiness.ts');
        expect(pkg?.scripts?.['v10:callable-diagnostics']).toContain('scripts/v10/checkCallableLlmGateways.ts');
        expect(pkg?.scripts?.['v10:preanalysis-readiness']).toContain('scripts/v10/runV10PreanalysisReadinessPack.ts');
        expect(pkg?.scripts?.['v10:preanalysis-readiness:strict']).toContain('DOCUDENT_READINESS_STRICT=1');
        expect(pkg?.scripts?.['v10:preanalysis-readiness:strict']).toContain('DOCUDENT_READINESS_REQUIRE_PASSWORD=1');
        expect(pkg?.scripts?.['v10:preanalysis-readiness:strict']).toContain('DOCUDENT_READINESS_REQUIRE_CALLABLES=1');
        expect(pkg?.scripts?.['v10:preanalysis-readiness:full']).toContain('DOCUDENT_READINESS_STRICT=1');
        expect(pkg?.scripts?.['v10:preanalysis-readiness:full']).toContain('DOCUDENT_READINESS_INCLUDE_HOSTED_GATE=1');
        expect(pkg?.scripts?.['e2e:v10:hosted-preanalysis-gate']).toContain('scripts/v10/runHostedPreanalysisGate.ts');
    });

    it('uses shared env resolver/hosted-env helpers to avoid duplicated env parsing in preanalysis toolchain scripts', () => {
        const shared = readFileSync(SHARED_ENV_RESOLVER_PATH, 'utf-8');
        const sharedHostedEnv = readFileSync(SHARED_HOSTED_ENV_PATH, 'utf-8');
        const hostedAuthGate = readFileSync(HOSTED_AUTH_GATE_PATH, 'utf-8');
        const hostedPreanalysisGate = readFileSync(HOSTED_PREANALYSIS_GATE_PATH, 'utf-8');
        const authDiag = readFileSync(AUTH_DIAG_PATH, 'utf-8');
        const callableDiag = readFileSync(CALLABLE_DIAG_PATH, 'utf-8');

        expect(shared).toContain('resolveEnvValue');
        expect(shared).toContain('resolveFirstDefined');
        expect(sharedHostedEnv).toContain('resolveHostedRunEnv');
        expect(sharedHostedEnv).toContain('validateHostedRunEnv');
        expect(hostedAuthGate).toContain("from './shared/hostedEnv'");
        expect(hostedPreanalysisGate).toContain("from './shared/hostedEnv'");
        expect(authDiag).toContain("from './shared/resolveEnv'");
        expect(callableDiag).toContain("from './shared/resolveEnv'");
    });

    it('keeps readiness report wired to passwordAuth and actionable blocker fields', () => {
        const readinessPack = readFileSync(READINESS_PACK_PATH, 'utf-8');
        expect(readinessPack).toContain('passwordAuth');
        expect(readinessPack).toContain('blockers');
        expect(readinessPack).toContain('nextSteps');
        expect(readinessPack).toContain('Hosted login credentials missing');
        expect(readinessPack).toContain('Run npm run e2e:v10:hosted-preanalysis-gate');
        expect(readinessPack).toContain('SKIPPED');
        expect(readinessPack).toContain('readiness prerequisites not met');
    });
});
