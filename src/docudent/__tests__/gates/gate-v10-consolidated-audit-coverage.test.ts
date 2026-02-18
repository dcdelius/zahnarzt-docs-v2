import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const AUDIT_SCRIPT_PATH = join(__dirname, '../../../../scripts/v10/consolidated-audit.ts');

describe('gate-v10-consolidated-audit-coverage', () => {
    it('keeps online dependency and KB parity checks in consolidated audit', () => {
        const content = readFileSync(AUDIT_SCRIPT_PATH, 'utf-8');
        expect(content).toContain("id: 'v10-online-deps'");
        expect(content).toContain("args: ['run', 'doctor:online', '--', '--verbose']");
        expect(content).toContain("id: 'v10-kb-parity'");
        expect(content).toContain("args: ['run', 'v10:kb-parity']");
        expect(content).toContain("id: 'v10-documentation-fidelity'");
        expect(content).toContain("'v10:documentation-fidelity-audit'");
        expect(content).toContain('scenarios.v10.realworld.fliessend20.json');
        expect(content).toContain("'--strict-warnings'");
        expect(content).toContain("'--disable-firestore-kb'");
        expect(content).toContain('DOCUDENT_AUDIT_REQUIRE_LLM_EXTRACTION');
        expect(content).toContain("'--require-llm-extraction'");
    });

    it('enforces hosted auth env preflight before adding hosted gate', () => {
        const content = readFileSync(AUDIT_SCRIPT_PATH, 'utf-8');
        expect(content).toContain("from './shared/hostedEnv'");
        expect(content).toContain('function assertHostedAuthEnv');
        expect(content).toContain('validateHostedRunEnv(resolveHostedRunEnv())');
        expect(content).toContain("if (process.env.DOCUDENT_AUDIT_INCLUDE_HOSTED_AUTH === '1')");
        expect(content).toContain("assertHostedAuthEnv('DOCUDENT_AUDIT_INCLUDE_HOSTED_AUTH')");
    });

    it('supports hosted preanalysis gate and readiness pre-check in consolidated audit', () => {
        const content = readFileSync(AUDIT_SCRIPT_PATH, 'utf-8');
        expect(content).toContain("if (process.env.DOCUDENT_AUDIT_INCLUDE_PREANALYSIS_READINESS === '1')");
        expect(content).toContain("id: 'v10-preanalysis-readiness'");
        expect(content).toContain("args: ['run', 'v10:preanalysis-readiness']");
        expect(content).toContain("if (process.env.DOCUDENT_AUDIT_INCLUDE_HOSTED_PREANALYSIS === '1')");
        expect(content).toContain("assertHostedAuthEnv('DOCUDENT_AUDIT_INCLUDE_HOSTED_PREANALYSIS')");
        expect(content).toContain("id: 'v10-hosted-preanalysis-gate'");
        expect(content).toContain("args: ['run', 'e2e:v10:hosted-preanalysis-gate']");
    });
});
