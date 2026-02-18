import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const READINESS_SCRIPT_PATH = join(__dirname, '../../../../scripts/v10/runV10PreanalysisReadinessPack.ts');

describe('gate-v10-preanalysis-readiness-report-contract', () => {
    it('keeps diagnostics, blockers and next-steps sections in readiness report output', () => {
        const source = readFileSync(READINESS_SCRIPT_PATH, 'utf-8');
        expect(source).toContain('diagnostics');
        expect(source).toContain('blockers');
        expect(source).toContain('nextSteps');
        expect(source).toContain('hostedEnvOk');
        expect(source).toContain('hostedEnvIssues');
        expect(source).toContain('## Diagnostics');
        expect(source).toContain('## Blockers');
        expect(source).toContain('## Next Steps');
    });

    it('keeps hosted gate skip semantics when readiness prerequisites are not met', () => {
        const source = readFileSync(READINESS_SCRIPT_PATH, 'utf-8');
        expect(source).toContain('hosted-preanalysis-gate');
        expect(source).toContain('skipped: true');
        expect(source).toContain('readiness prerequisites not met');
        expect(source).toContain('SKIPPED');
        expect(source).toContain('WARN (password auth not ready)');
        expect(source).toContain('WARN (callables not ready)');
    });
});
