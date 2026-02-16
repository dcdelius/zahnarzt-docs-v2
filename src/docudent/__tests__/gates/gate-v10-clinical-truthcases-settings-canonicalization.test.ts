import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const TRUTHCASES_V4_PATH = join(ROOT, 'src/docudent/v10/qa/clinicalTruthcases.v4.ts');

describe('gate-v10-clinical-truthcases-settings-canonicalization', () => {
    it('canonicalizes v4 truthcase settings payloads before export', () => {
        const source = readFileSync(TRUTHCASES_V4_PATH, 'utf-8');

        expect(source).toContain('canonicalizeSettingsInput');
        expect(source).toContain('settings: canonicalizeSettingsInput(truthcase.settings)');
    });
});
