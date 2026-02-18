import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOSTED_AUDIT_SPEC_PATH = join(__dirname, '../../../../e2e/v10-hosted-audit-20.e2e.spec.ts');

describe('gate-v10-hosted-audit-json-report', () => {
    it('keeps structured json report artifact for hosted audit 20', () => {
        const source = readFileSync(HOSTED_AUDIT_SPEC_PATH, 'utf-8');
        expect(source).toContain("docs/system-atlas/artifacts/_latest/v10-hosted-audit-20");
        expect(source).toContain('report.json');
        expect(source).toContain('report.latest.json');
        expect(source).toContain('isFullSuite');
        expect(source).toContain('report.partial.');
        expect(source).toContain('summary: {');
        expect(source).toContain('preanalysis: {');
        expect(source).toContain('cases: auditEntries');
    });
});
