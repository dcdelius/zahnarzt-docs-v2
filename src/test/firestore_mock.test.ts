import { beforeEach, describe, expect, it } from 'vitest';
import { saveNoteInternal } from '../utils/noteServiceCore';
import { ExtractionResult, ValidationIssue } from '../types/templateV3';

const mockDb = { type: 'mock_db' };
let setDocCalls: any[] = [];

const mockSetDoc = async (ref: any, payload: any) => {
    setDocCalls.push([ref, payload]);
};

const mockDoc = (_db: any, col: string, pid: string, sub: string, id: string) => ({
    path: `${col}/${pid}/${sub}/${id}`
});

describe('saveNoteInternal (mocked Firestore)', () => {
    beforeEach(() => {
        setDocCalls = [];
    });

    it('persists the correct payload shape', async () => {
        const noteData = {
            templateId: 'test_tmpl',
            templateVersion: 1,
            rawDictation: 'Test Dictation',
            extractedData: {
                data: { tooth: '16' },
                meta: { confidenceByField: { tooth: 0.9 }, evidenceByField: { tooth: '16' }, warnings: [] },
                model: 'gpt-4o'
            } as ExtractionResult,
            validationIssues: [] as ValidationIssue[],
            finalText: 'Final Report',
            finalData: { tooth: '16' },
            authorId: 'user_1'
        };

        await saveNoteInternal('practice_1', noteData, {
            setDoc: mockSetDoc as any,
            doc: mockDoc as any,
            db: mockDb
        });

        expect(setDocCalls).toHaveLength(1);

        const [docRef, payload] = setDocCalls[0];
        expect(docRef.path).toContain('Praxen/practice_1/Notes/');
        expect(payload.id).toBeTruthy();
        expect(payload.rawDictation).toBe('Test Dictation');
        expect(payload.templateId).toBe('test_tmpl');
        expect(payload.extractedData.data.tooth).toBe('16');
        expect(payload.extractedData.meta.confidenceByField.tooth).toBe(0.9);
        expect(Array.isArray(payload.validationIssues)).toBe(true);
        expect(payload.finalText).toBe('Final Report');
        expect(payload.createdAt).toBeTruthy();
        expect(payload.schemaVersion).toBe('v3');
    });
});
