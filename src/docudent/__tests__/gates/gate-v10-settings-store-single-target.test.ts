import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const USE_SETTINGS_PATH = join(ROOT, 'src/docudent/v10/settings/useSettings.ts');

describe('gate-v10-settings-store-single-target', () => {
    it('keeps V10 runtime settings reads/writes on Praxen store only', () => {
        const source = readFileSync(USE_SETTINGS_PATH, 'utf-8');

        expect(source).toContain("doc(db, 'Praxen', practiceId, 'Settings', 'v10')");
        expect(source).toContain("doc(db, 'Praxen', practiceId, 'Benutzer', userId, 'Settings', 'v10')");

        // Guard against accidental dual-store drift while migration is not implemented.
        expect(source).not.toContain("doc(db, 'orgs'");
        expect(source).not.toContain("collection(db, 'orgs'");
        expect(source).not.toContain('settingsOverrides');
    });
});
