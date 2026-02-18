import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('gate-v10-preanalysis-e2e-fallback-decoupled', () => {
    it('does not bind preanalysis fallback to generic E2E auth bypass handshake', () => {
        const file = join(process.cwd(), 'src/docudent/v10/pages/DocudentV10Page.tsx');
        const source = readFileSync(file, 'utf8');

        expect(source).toContain('__DOCUDENT_E2E_FORCE_PREANALYSIS_FALLBACK');
        expect(
            /forceFallbackForE2E[\s\S]*__DOCUDENT_E2E_BYPASS_AUTH/m.test(source)
        ).toBe(false);
    });
});
