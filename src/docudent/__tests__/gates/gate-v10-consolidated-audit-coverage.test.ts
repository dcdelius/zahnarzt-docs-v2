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
    });

    it('enforces hosted auth env preflight before adding hosted gate', () => {
        const content = readFileSync(AUDIT_SCRIPT_PATH, 'utf-8');
        expect(content).toContain('function assertHostedAuthEnv');
        expect(content).toContain("if (process.env.DOCUDENT_AUDIT_INCLUDE_HOSTED_AUTH === '1')");
        expect(content).toContain('assertHostedAuthEnv()');
    });
});
