import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(relPath: string): string {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('gate-v10-settings-save-persists', () => {
    it('save action re-commits current practice and user snapshots', () => {
        const source = read('src/docudent/v10/pages/SettingsPageV10.tsx');

        expect(source).toContain('updatePracticeSettings(practiceSettings);');
        expect(source).toContain('updateUserSettings(userSettings);');
    });
});
