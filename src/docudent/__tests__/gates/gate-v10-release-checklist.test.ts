import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const CHECKLIST_PATH = join(__dirname, '../../../../docs/system-atlas/procedure/v10-release-checklist-2026-02-15.md');

describe('gate-v10-release-checklist', () => {
    it('contains consolidated audit, realistic e2e, and hosted auth gate commands', () => {
        const content = readFileSync(CHECKLIST_PATH, 'utf-8');
        expect(content).toContain('npm run v10:audit:consolidated');
        expect(content).toContain('npm run v10:audit:release');
        expect(content).toContain('doctor:online');
        expect(content).toContain('v10:kb-parity');
        expect(content).toContain('npx playwright test e2e/v10-realistic-praxis-test.e2e.spec.ts --project=chromium');
        expect(content).toContain('12/12 scenarios pass');
        expect(content).toContain('npm run e2e:v10:hosted-auth-gate');
        expect(content).toContain('S1/S4/S11/S12');
        expect(content).toContain('Hosted Auth Gate (real login + real URL) ist grün.');
        expect(content).toContain('fails fast');
    });
});
