import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const V10_PAGE_PATH = join(__dirname, '../../v10/pages/DocudentV10Page.tsx');
const V10_E2E_PATH = join(__dirname, '../../../../e2e/v10-realistic-praxis-test.e2e.spec.ts');

describe('gate-v10-run-surface-observability', () => {
    let pageContent = '';
    let e2eContent = '';

    beforeAll(() => {
        pageContent = readFileSync(V10_PAGE_PATH, 'utf-8');
        e2eContent = readFileSync(V10_E2E_PATH, 'utf-8');
    });

    it('exposes preanalysis panel surface for run progress', () => {
        expect(pageContent).toContain('data-testid="v10-preanalysis-panel"');
    });

    it('exposes run lifecycle marker for deterministic E2E retries', () => {
        expect(pageContent).toContain('data-testid="v10-run-lifecycle"');
        expect(pageContent).toContain('data-run-seq={String(runAttemptSeq)}');
    });

    it('supports keyboard run trigger from dictation input', () => {
        expect(pageContent).toContain('onKeyDown={handleDictationKeyDown}');
        expect(pageContent).toContain("event.key === 'Enter'");
    });

    it('E2E run helper watches preanalysis and lifecycle marker', () => {
        expect(e2eContent).toContain('[data-testid="v10-preanalysis-panel"]');
        expect(e2eContent).toContain('[data-testid="v10-run-lifecycle"]');
    });
});
