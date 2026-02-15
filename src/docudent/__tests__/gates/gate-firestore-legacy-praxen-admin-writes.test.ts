import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-firestore-legacy-praxen-admin-writes', () => {
    it('requires practice membership/admin claims for legacy Praxen paths', () => {
        const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

        expect(rules).toContain('allow read: if isMemberOfPractice(practiceId);');
        expect(rules).toContain("allow update: if hasPracticeRole(practiceId, 'practice_admin');");
        expect(rules).toContain("allow create, update: if hasPracticeRole(practiceId, 'practice_admin');");
    });

    it('guards missing claims maps with empty object fallback', () => {
        const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

        expect(rules).toContain('request.auth.token.orgs != null ? request.auth.token.orgs : {}');
        expect(rules).toContain('request.auth.token.practices != null ? request.auth.token.practices : {}');
    });
});
