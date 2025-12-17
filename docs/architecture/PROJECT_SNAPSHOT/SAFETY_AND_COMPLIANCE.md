# Safety and Compliance

> Copyright strategy, gate tests, and compliance rules.

---

## Copyright Strategy

### The Problem

German dental commentaries (Ziller,  The "Wissing" Kommentare) are **copyrighted**. If Docudent exports or displays this text directly, it constitutes copyright infringement.

### The Solution

1. **Comment cards are backend-only** — Never imported in UI code
2. **Thin indexes only** — `commentIndex_analog_thin.json` contains IDs, not text
3. **Export guards** — Strip forbidden keys before any export
4. **Gate tests** — Automated CI checks prevent leaks

---

## Forbidden Data in Exports

These fields must **NEVER** appear in UI bundles or export payloads:

| Field | Reason |
|-------|--------|
| `sections` | Full commentary text |
| `evidenceSnippet` | Quoted commentary |
| `kommentar` | Raw commentary |
| `topSnippets` | Extracted quotes |
| `raw HTML` | Scraped content |

---

## Gate Tests Overview

| Gate | File | Purpose |
|------|------|---------|
| **Golden Dictations** | `gate-e2e-golden-dictations.test.ts` | 12 test cases across GKV/PKV/ZE/Analog |
| **No Commentary Leak** | `gate-no-comment-index-in-ui.test.ts` | Scans UI for forbidden imports |
| **Build Smoke** | `gate-build-smoke.test.ts` | Static scan for large JSON imports |

### Gate: No Commentary Leak

```typescript
const FORBIDDEN_IMPORTS = [
    'commentIndex_bema.json',
    'commentIndex_goz.json',
    'commentIndex_analog.json',
    'comment_cards.json',
];
```

**Scanned Directories:**
- `src/docudent/v5/pages`
- `src/docudent/v5/components`
- `src/docudent/v5/hooks`
- `src/pages`
- `src/components`

### Gate: Build Smoke

Fails if:
- Any UI file imports `commentIndex_*.json` (except thin index)
- Any page component imports from `/secondary/`
- Vite config missing `blockLargeJsonImports` plugin

---

## Allowed vs Forbidden

| Allowed | Forbidden |
|---------|-----------|
| `commentIndex_analog_thin.json` | `commentIndex_analog.json` |
| `commentCardStore.ts` (backend) | Direct import in UI |
| Code IDs and labels | Full commentary text |
| User-written justifications | Scraped evidence snippets |

---

## Analog Export Guard

When exporting analog billing data:

```typescript
// SAFE: Only export these fields
interface AnalogExportItem {
    analogCode: string;           // ✅ OK
    justificationText: string;    // ✅ User-written
    comparisonCode?: string;      // ✅ GOZ reference
    status: 'complete' | ...;     // ✅ Metadata
}

// FORBIDDEN: Never export these
interface FORBIDDEN {
    sections: never;              // ❌ Copyright
    evidenceSnippet: never;       // ❌ Copyright
    kommentar: never;             // ❌ Copyright
}
```

**File:** `analogExportGuard.ts`

---

## Running the Gates

```bash
# All gates (recommended before deploy)
npm test -- --run gate-e2e-golden-dictations
npm test -- --run gate-no-comment-index-in-ui
npm test -- --run gate-build-smoke

# Expected output
# ✓ gate-e2e-golden-dictations.test.ts (28 tests)
# ✓ gate-no-comment-index-in-ui.test.ts (5 tests)
# ✓ gate-build-smoke.test.ts (5 tests)
```

---

## Compliance Checklist

Before any release:

- [ ] All gate tests pass
- [ ] No `commentIndex_*.json` in UI imports
- [ ] Export payloads checked with `assertNoCommentaryLeak()`
- [ ] Analog justifications are user-written, not auto-filled
- [ ] No raw HTML or scraped content in output

---

## Firestore Security

| Collection | Contains PII? | Access Rule |
|------------|---------------|-------------|
| `Praxen/1/Notes` | Yes (patient data) | Practice-only |
| `Praxen/1/Benutzer` | Yes (user info) | Admin-only |
| `Praxen/1/Bausteine` | No | Practice-wide |

> ⚠️ **Note:** practiceId is currently hardcoded as `'1'`. Multi-tenant support pending.
