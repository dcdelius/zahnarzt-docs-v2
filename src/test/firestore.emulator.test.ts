import { describe, expect, it } from 'vitest';
import { saveNote } from '../utils/noteService';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const shouldSkip = !process.env.FIRESTORE_EMULATOR_HOST;

describe('Firestore emulator smoke test', () => {
    it.skipIf(shouldSkip)('saves a note via emulator connection', async () => {
        const app = initializeApp({ projectId: 'demo-project', apiKey: 'demo-key' });
        const db = getFirestore(app);
        connectFirestoreEmulator(db, 'localhost', 8080);

        const noteData = {
            templateId: 'emulator_test',
            templateVersion: 1,
            rawDictation: 'Emulator Test',
            extractedData: { data: {}, meta: { confidenceByField: {}, evidenceByField: {}, warnings: [] }, model: 'test' } as any,
            validationIssues: [],
            finalText: 'Emulator Final',
            finalData: {},
            authorId: 'emulator_user'
        };

        const noteId = await saveNote('practice_emulator', noteData);
        expect(noteId).toBeTruthy();
    }, 15000);
});
