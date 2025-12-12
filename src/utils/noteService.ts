import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
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

// Internal function for testing
export const saveNoteInternal = async (
    practiceId: string,
    note: NoteData,
    dependencies: {
        setDoc: typeof setDoc,
        doc: typeof doc,
        db: any
    }
) => {
    const { setDoc, doc, db } = dependencies;
    const noteId = `NOTE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const noteRef = doc(db, "Praxen", practiceId, "Notes", noteId);

    const payload = {
        id: noteId,
        ...note,
        createdAt: new Date().toISOString(),
        status: 'finalized',
        schemaVersion: 'v3'
    };

    try {
        await setDoc(noteRef, payload);
        console.log(`✅ Note saved: ${noteId}`);
        return noteId;
    } catch (error) {
        console.error("❌ Error saving note:", error);
        throw error;
    }
};

export const saveNote = async (practiceId: string, note: NoteData) => {
    return saveNoteInternal(practiceId, note, { setDoc, doc, db });
};
