import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const CHECKLIST_PATH = join(__dirname, '../../../../docs/system-atlas/procedure/v10-release-checklist-2026-02-15.md');

describe('gate-v10-release-checklist', () => {
    it('contains consolidated audit and realistic e2e commands', () => {
        const content = readFileSync(CHECKLIST_PATH, 'utf-8');
        expect(content).toContain('npm run v10:audit:consolidated');
        expect(content).toContain('npx playwright test e2e/v10-realistic-praxis-test.e2e.spec.ts --project=chromium');
        expect(content).toContain('10/10 scenarios pass');
    });
});
