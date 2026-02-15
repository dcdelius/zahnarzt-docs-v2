import { ExtractionResult, ValidationIssue } from '../types/templateV3';

export interface NoteData {
    templateId: string;
    templateVersion: number;
    rawDictation: string;
    extractedData: ExtractionResult;
    validationIssues: ValidationIssue[];
    finalText: string;
    finalData: Record<string, any>;
    authorId: string; // e.g. "user_123"
}

// Pure logic, no side-effect imports
export const saveNoteInternal = async (
    practiceId: string,
    note: NoteData,
    dependencies: {
        setDoc: any,
        doc: any,
        db: any,
        generateId?: () => string,
        getTimestamp?: () => string
    }
) => {
    const { setDoc, doc, db } = dependencies;

    const defaultGenerateId = () => {
        const c: any = globalThis.crypto;
        if (c?.randomUUID) return c.randomUUID();
        return `NOTE_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    };

    const generateId = dependencies.generateId ?? defaultGenerateId;
    const getTimestamp = dependencies.getTimestamp ?? (() => new Date().toISOString());

    const noteId = generateId();
    const noteRef = doc(db, "Praxen", practiceId, "Notes", noteId);

    const payload = {
        id: noteId,
        ...note,
        createdAt: getTimestamp(),
        // Prepare for serverTimestamp in future (e.g. createdAtServer: serverTimestamp())
        status: 'finalized',
        schemaVersion: 'v3'
    };

    try {
        await setDoc(noteRef, payload);
        return noteId;
    } catch (error) {
        // No console.error here to keep it pure, caller handles error or we rethrow
        throw error;
    }
};
