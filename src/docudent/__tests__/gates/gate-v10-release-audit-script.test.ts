import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGE_JSON_PATH = join(__dirname, '../../../../package.json');

describe('gate-v10-release-audit-script', () => {
    it('pins hosted auth gate in release audit script', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const script = pkg?.scripts?.['v10:audit:release'];
        expect(typeof script).toBe('string');
        expect(script).toContain('DOCUDENT_AUDIT_INCLUDE_HOSTED_AUTH=1');
        expect(script).toContain('scripts/v10/consolidated-audit.ts');
    });

    it('keeps dedicated release profile for hosted preanalysis strict gate', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const script = pkg?.scripts?.['v10:audit:release:preanalysis'];
        expect(typeof script).toBe('string');
        expect(script).toContain('DOCUDENT_AUDIT_INCLUDE_PREANALYSIS_READINESS=1');
        expect(script).toContain('DOCUDENT_AUDIT_INCLUDE_HOSTED_PREANALYSIS=1');
        expect(script).toContain('scripts/v10/consolidated-audit.ts');
    });

    it('keeps documentation fidelity as mandatory step in v10 final audit', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const script = pkg?.scripts?.['v10:final-audit'];
        expect(typeof script).toBe('string');
        expect(script).toContain('v10:documentation-fidelity-audit:fliessend20');
    });

    it('pins strict warning mode for the fliessend20 fidelity script', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const script = pkg?.scripts?.['v10:documentation-fidelity-audit:fliessend20'];
        expect(typeof script).toBe('string');
        expect(script).toContain('--strict-warnings');
        expect(script).toContain('--disable-firestore-kb');
    });

    it('keeps llm-required fidelity script variant for online runtime checks', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const script = pkg?.scripts?.['v10:documentation-fidelity-audit:fliessend20:llm'];
        expect(typeof script).toBe('string');
        expect(script).toContain('--strict-warnings');
        expect(script).toContain('--require-llm-extraction');
        expect(script).toContain('--disable-firestore-kb');
    });

    it('keeps dedicated online llm final-audit profile', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const script = pkg?.scripts?.['v10:final-audit:online-llm'];
        expect(typeof script).toBe('string');
        expect(script).toContain('DOCUDENT_REQUIRE_LLM_PATH=1');
        expect(script).toContain('v10:real-dictation-check');
        expect(script).toContain('v10:documentation-fidelity-audit:fliessend20:llm');
    });

    it('keeps online llm practice-check profile', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const script = pkg?.scripts?.['v10:practice-check:online-llm'];
        expect(typeof script).toBe('string');
        expect(script).toContain('DOCUDENT_REQUIRE_LLM_PATH=1');
        expect(script).toContain('doctor:online');
        expect(script).toContain('v10:documentation-fidelity-audit:fliessend20:llm');
        expect(script).toContain('v10:real-dictation-check');
    });

    it('routes e2e:full through practice-check full loop', () => {
        const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const script = pkg?.scripts?.['e2e:full'];
        expect(typeof script).toBe('string');
        expect(script).toContain('v10:practice-check:full');
    });
});
