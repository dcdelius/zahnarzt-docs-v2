import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOSTED_AUDIT_SPEC_PATH = join(__dirname, '../../../../e2e/v10-hosted-audit-20.e2e.spec.ts');

describe('gate-v10-hosted-audit-fulltext-protocol', () => {
    it('keeps full output text and qa answer protocol in hosted audit entry model', () => {
        const source = readFileSync(HOSTED_AUDIT_SPEC_PATH, 'utf-8');
        expect(source).toContain('askbackAnswers');
        expect(source).toContain('outputFullText');
        expect(source).toContain('Askbacks (beantwortet)');
        expect(source).toContain('Output fulltext:');
        expect(source).toContain('QA [');
    });

    it('logs selected answers while resolving askbacks', () => {
        const source = readFileSync(HOSTED_AUDIT_SPEC_PATH, 'utf-8');
        expect(source).toContain("source: 'free_text'");
        expect(source).toContain("source: 'option'");
        expect(source).toContain("source: 'fallback'");
        expect(source).toContain('return answerLog');
    });

    it('keeps deterministic free-text answer heuristics for clinical key fields', () => {
        const source = readFileSync(HOSTED_AUDIT_SPEC_PATH, 'utf-8');
        expect(source).toContain('resolveFreeTextAuditAnswer');
        expect(source).toContain("key.includes('working') || key.includes('length')");
        expect(source).toContain("key.includes('canal_count') || key.includes('kanalzahl')");
        expect(source).toContain("key.includes('medication') || key.includes('medik')");
    });
});
