import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const RUN_V10_PATH = join(ROOT, 'src/docudent/v10/pipeline/runV10.ts');

describe('gate-v10-settings-pipeline-canonicalization', () => {
    it('canonicalizes incoming settings at pipeline entry', () => {
        const source = readFileSync(RUN_V10_PATH, 'utf-8');

        expect(source).toContain('canonicalizeSettingsInput(');
        expect(source).toContain('const settingsInput = canonicalizeSettingsInput(testOverrides.settings ?? userDefaults);');

        // Prevent reverting to local ad-hoc wrapper that bypasses shared normalization.
        expect(source).not.toContain('const normalizeSettingsInput = (raw: unknown): SettingsInput | undefined =>');
    });
});
