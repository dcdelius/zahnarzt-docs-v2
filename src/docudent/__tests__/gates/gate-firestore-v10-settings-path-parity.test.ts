import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-firestore-v10-settings-path-parity', () => {
    it('defines legacy user settings nested path used by V10 useSettings', () => {
        const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

        expect(rules).toContain('match /Benutzer/{userId} {');
        expect(rules).toContain('match /Settings/{settingId} {');
    });

    it('restricts legacy user settings writes to practice_admin or own uid', () => {
        const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

        expect(rules).toContain("allow create, update: if hasPracticeRole(practiceId, 'practice_admin') ||");
        expect(rules).toContain('(isMemberOfPractice(practiceId) && request.auth.uid == userId);');
    });
});
