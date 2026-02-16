import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const USE_SETTINGS_PATH = join(ROOT, 'src/docudent/v10/settings/useSettings.ts');

describe('gate-v10-settings-runtime-canonicalization', () => {
    it('canonicalizes loaded/updated settings by stripping legacy medical mirror fields', () => {
        const source = readFileSync(USE_SETTINGS_PATH, 'utf-8');

        expect(source).toContain('stripPracticeMedicalDefaultMirrors(');
        expect(source).toContain('stripUserMedicalDefaultMirrors(');

        // Must keep normalizers in the path: legacy docs should still be migratable.
        expect(source).toContain('normalizePracticeMedicalDefaults(');
        expect(source).toContain('normalizeUserMedicalDefaults(');
    });
});
