import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveNoteInternal } from '../utils/noteServiceCore';
import { ExtractionResult, ValidationIssue } from '../types/templateV3';

describe("noteServiceCore (Unit)", () => {

    let mockSetDoc: any;
    let mockDoc: any;
    let mockDb: any;

    beforeEach(() => {
        mockSetDoc = vi.fn().mockResolvedValue(undefined);
        mockDoc = vi.fn((db, col, pid, sub, id) => ({ path: `${col}/${pid}/${sub}/${id}` }));
        mockDb = { type: "mock_db" };
    });

    it("should save note with correct path and payload", async () => {
        const noteData = {
            templateId: "test_tmpl",
            templateVersion: 1,
            rawDictation: "Test Dictation",
            extractedData: {
                data: { tooth: "16" },
                meta: { confidenceByField: { tooth: 0.9 }, evidenceByField: { tooth: "16" }, warnings: [] },
                model: "gpt-4o"
            } as ExtractionResult,
            validationIssues: [] as ValidationIssue[],
            finalText: "Final Report",
            finalData: { tooth: "16" },
            authorId: "user_1"
        };

        const mockGenerateId = () => "FIXED_ID_123";
        const mockGetTimestamp = () => "2025-01-01T12:00:00.000Z";

        await saveNoteInternal("practice_1", noteData, {
            setDoc: mockSetDoc,
            doc: mockDoc,
            db: mockDb,
            generateId: mockGenerateId,
            getTimestamp: mockGetTimestamp
        });

        expect(mockSetDoc).toHaveBeenCalledTimes(1);

        const [docRef, payload] = mockSetDoc.mock.calls[0];

        expect(docRef.path).toBe("Praxen/practice_1/Notes/FIXED_ID_123");
        expect(payload.id).toBe("FIXED_ID_123");
        expect(payload.createdAt).toBe("2025-01-01T12:00:00.000Z");
        expect(payload.rawDictation).toBe("Test Dictation");
        expect(payload.schemaVersion).toBe("v3");
    });
});
