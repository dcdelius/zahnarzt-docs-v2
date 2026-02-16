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
});
