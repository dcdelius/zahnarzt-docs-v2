# Firestore Collections

> Firestore usage mapping with read/write locations.

---

## Firebase Initialization

| Export | File | Line |
|--------|------|------|
| `db` (Firestore) | `src/firebase.js` | L28 |
| `auth` (Auth) | `src/firebase.js` | L27 |
| Config | `src/firebase.js` | L7-14 (from env) |

---

## practiceId Source

| Current State | Evidence |
|---------------|----------|
| **Hardcoded as '1'** | All Firestore calls use `"Praxen", "1", ...` |

**Example:** `src/utils/noteService.ts` L28:
```typescript
const noteRef = doc(db, "Praxen", practiceId, "Notes", noteId);
```

> ⚠️ **TODO:** practiceId should derive from authenticated user context

---

## Collections Used

| Collection Path | Read Locations | Write Locations |
|-----------------|----------------|-----------------|
| `Praxen/1/Vorlagen` | `_legacy/Settings.jsx` L130,L247,L267 | `_legacy/Settings.jsx` L244,L372 |
| `Praxen/1/Dokumentationen` | `_legacy/Dashboard.jsx` L264,L486 | `_legacy/Dashboard.jsx` L478 |
| `Praxen/1/Benutzer` | `_legacy/Settings.jsx` L127,L150 | `_legacy/Settings.jsx` L144 |
| `Praxen/1/Notes` | — | `utils/noteService.ts` L39 |
| `Praxen/1/Konversationen` | `_legacy/MedicalKnowledgeDashboard.jsx` L64 | L278 |
| `Praxen/1/TemplatesV3` | — | `utils/seedTemplate.ts` L74 |

---

**Note:** UI components that wrote `Bausteine` and `EmailVerlauf` were removed in cleanup; legacy usage is tracked in `docs/architecture/PERSISTENCE_AUDIT.json`.

## V7 Firestore Usage

| Writes? | Reason |
|---------|--------|
| **NO** | V7 is a pure client-side renderer |

V7 pipeline (`DocudentV7Page` → `useV7Pipeline` → `pipeline.run`) does not contain any Firestore imports or write operations.

**Persistence Path:** If V7 output needs saving, it would use `noteService.saveNote()` which is exported but the UI caller is not traced.

---

## Active vs Legacy Firestore Usage

| Category | Collections | Status |
|----------|-------------|--------|
| **Active** | Notes, Bausteine | Used by current components |
| **Legacy** | Vorlagen, Dokumentationen, Benutzer | In `_legacy/` (dead) |

---

## NoteData Schema

From `src/utils/noteService.ts` L5-14:

```typescript
interface NoteData {
    templateId: string;
    templateVersion: number;
    rawDictation: string;
    extractedData: ExtractionResult;
    validationIssues: ValidationIssue[];
    finalText: string;
    finalData: Record<string, any>;
    authorId: string;
}
```

**Stored Fields:** `id`, `createdAt`, `status: 'finalized'`, `schemaVersion: 'v3'`
