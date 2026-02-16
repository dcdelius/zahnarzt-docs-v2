import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const FIREBASE_JSON_PATH = join(process.cwd(), 'firebase.json');

describe('gate-firebase-functions-target', () => {
    it('keeps functions deployment target configured for this repository', () => {
        const content = readFileSync(FIREBASE_JSON_PATH, 'utf-8');
        const parsed = JSON.parse(content) as { functions?: { source?: string } };
        expect(parsed.functions?.source).toBe('functions');
    });
});
