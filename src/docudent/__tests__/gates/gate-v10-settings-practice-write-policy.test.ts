import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-v10-settings-practice-write-policy', () => {
    it('blocks practice writes for non-admin roles when firestore settings are enabled', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/settings/useSettings.ts'),
            'utf8'
        );

        expect(source).toContain('const canEditPractice = !isFirestoreSettingsEnabled() || isPracticeAdminRole(params?.actorRole);');
        expect(source).toContain('if (!canEditPractice) {');
        expect(source).toContain('Practice settings update blocked: missing practice admin role');
    });

    it('persists and hydrates practice lock policy fields', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/settings/useSettings.ts'),
            'utf8'
        );

        expect(source).toContain('lockUserOverrides: settings.lockUserOverrides');
        expect(source).toContain('lockUserOverrides: data.lockUserOverrides');
    });
});
