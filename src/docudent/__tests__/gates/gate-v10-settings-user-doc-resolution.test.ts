import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-v10-settings-user-doc-resolution', () => {
    it('resolves non-admin user settings writes via auth uid fallback', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/settings/useSettings.ts'),
            'utf8'
        );

        expect(source).toContain('function resolveUserSettingsDocId(selectedUserId: string | null, canEditPractice: boolean): string | null');
        expect(source).toContain('return auth.currentUser?.uid ?? selectedUserId;');
    });

    it('uses resolved user settings doc id for Firestore user settings paths', () => {
        const source = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/settings/useSettings.ts'),
            'utf8'
        );

        expect(source).toContain("const userSettingsDocId = resolveUserSettingsDocId(activeUserId, canEditPractice);");
        expect(source).toContain("doc(db, 'Praxen', practiceId, 'Benutzer', userSettingsDocId, 'Settings', 'v10')");
    });
});
