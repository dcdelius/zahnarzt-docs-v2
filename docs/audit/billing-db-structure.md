# Billing DB Structure — Hard Audit Report

**Date**: 2025-12-23 21:17  
**Status**: COMPLETE

---

## A) Single Import Found: **JA**

### Exakte Fundstelle

| File | Line | Import Statement |
|------|------|------------------|
| `src/docudent/core/behandlungen/konservierend/fuellung/definition.ts` | 11 | `import fuellungData from '../../../billing/knowledgeBase/behandlungen/fuellung_unified.json';` |

### Sekundäre Referenzen (Tests/Docs — nicht runtime-kritisch)

| File | Line | Type |
|------|------|------|
| `src/docudent/__tests__/gates/gate5-import-paths.test.ts` | 28 | Test import |
| `src/docudent/FUELLUNG_PIPELINE_AUDIT.json` | 8, 146, 162... | Audit doc refs |
| `src/docudent/HARDCODED_AUDIT.json` | 26, 27, 155... | Audit doc refs |

---

## B) Replacement Target (SSOT)

### Korrekter SSOT-Pfad

```
src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json
```

### Warum korrekt?

1. **V7/V10 Runtime nutzt bereits diesen Pfad:**
   - `v10/kb/treatment/providers/jsonProvider.ts:27` → `treatments/fuellung/unified.json`
   - `v7/output/renderFromKbChips.ts:119` → `treatments/fuellung/unified.json`
   - `core/billing/knowledgeBase/registry/loaders.ts:138` → `treatments/fuellung/unified.json`

2. **Gleicher Inhalt:** Beide Dateien haben 610 Zeilen (identisch)

3. **Konvention:** `treatments/{treatmentId}/unified.json` ist das etablierte Pattern

### Erforderliche Änderung

```diff
// src/docudent/core/behandlungen/konservierend/fuellung/definition.ts:11
- import fuellungData from '../../../billing/knowledgeBase/behandlungen/fuellung_unified.json';
+ import fuellungData from '../../../billing/knowledgeBase/treatments/fuellung/unified.json';
```

---

## C) Other Duplicates / Shadow SSOT

| Pfad | Lines | Status | Imports | Action |
|------|-------|--------|---------|--------|
| `behandlungen/fuellung_unified.json` | 610 | DUPLICATE | 1 (definition.ts) | **DEPRECATE → DELETE** |
| `behandlungen/endo_unified.json` | 329 | DUPLICATE | 0 | **SAFE_TO_DELETE** |
| `bema_knowledge_base.json` | 3.4MB | UNKNOWN | 0 | **NEEDS_REVIEW** |

### Verifizierung endo_unified.json

```bash
grep_search "endo_unified" → 0 runtime imports (nur HARDCODED_AUDIT.json refs)
```

---

## D) Legacy Runtime Violations

### V7

| File | Line | Import | Type |
|------|------|--------|------|
| `v7/pipeline/__test__/stubExtractor.ts` | 12 | `from '../../../core/services/extractionService'` | **TYPE-ONLY** ✅ |
| `v7/__tests__/gates/gate-no-patient-fields-in-output.test.ts` | 16 | `core/services/dictationSanitizer` | **TEST** ✅ |
| `v7/pipeline/__tests__/reality-integration.test.ts` | 36 | `core/services/questionService` | **TEST** ✅ |

**Verdict:** Keine Runtime-Violations. Alle Imports in `__test__` oder `__tests__`.

### V10

| File | Line | Import | Type |
|------|------|--------|------|
| `v10/extraction/selectExtractor.ts` | 12 | `from '../../core/services/extractionService'` | **TYPE-ONLY** ✅ |

**Verdict:** Type-import only — keine Runtime-Violation.

### Zusammenfassung

```
V6/_legacy Imports in v7/v10 runtime: NONE
core/services Imports in v7/v10 runtime: TYPE-ONLY (acceptable)
```

---

## E) Safe Actions

### SAFE_TO_DELETE

| Pfad | Reason |
|------|--------|
| `src/docudent/core/billing/knowledgeBase/behandlungen/endo_unified.json` | 0 imports |

### SAFE_TO_DELETE (after migration)

| Pfad | Depends On |
|------|------------|
| `src/docudent/core/billing/knowledgeBase/behandlungen/fuellung_unified.json` | Fix `definition.ts` first |

### MOVE_TO_ARCHIVE

| Pfad | Count |
|------|-------|
| `src/docudent/Analogleistungen/*.html` | 104 files |

### NEEDS_REVIEW

| Pfad | Size | Notes |
|------|------|-------|
| `src/docudent/core/billing/knowledgeBase/bema_knowledge_base.json` | 3.4MB | Large file, 0 imports |
| `src/docudent/FUELLUNG_PIPELINE_AUDIT.json` | - | Audit doc, refs old paths |
| `src/docudent/HARDCODED_AUDIT.json` | - | Audit doc, refs old paths |

---

## F) Plan of Attack (5 Schritte)

### Schritt 1: Delete endo_unified.json (0 imports)

```bash
rm src/docudent/core/billing/knowledgeBase/behandlungen/endo_unified.json
```

### Schritt 2: Fix definition.ts import

```diff
// src/docudent/core/behandlungen/konservierend/fuellung/definition.ts:11
- import fuellungData from '../../../billing/knowledgeBase/behandlungen/fuellung_unified.json';
+ import fuellungData from '../../../billing/knowledgeBase/treatments/fuellung/unified.json';
```

### Schritt 3: Delete fuellung_unified.json (after Step 2)

```bash
rm src/docudent/core/billing/knowledgeBase/behandlungen/fuellung_unified.json
```

### Schritt 4: Archive HTML snapshots

```bash
mkdir -p __archive__/Analogleistungen
mv src/docudent/Analogleistungen/*.html __archive__/Analogleistungen/
```

### Schritt 5: Make gate strict

```typescript
// gate-billing-no-duplicate-ssot.test.ts
- expect(unifiedFiles.length, msg).toBeLessThanOrEqual(2);
+ expect(unifiedFiles.length, msg).toBe(0);
```

---

## Appendix: All Affected Paths

### Runtime-kritisch

- `src/docudent/core/behandlungen/konservierend/fuellung/definition.ts` ← **MUSS GEÄNDERT WERDEN**

### SSOT (korrekt)

- `src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json`
- `src/docudent/core/billing/knowledgeBase/treatments/endo/unified.json`
- `src/docudent/core/billing/knowledgeBase/treatments/*/unified.json`

### Duplicates (löschen)

- `src/docudent/core/billing/knowledgeBase/behandlungen/fuellung_unified.json`
- `src/docudent/core/billing/knowledgeBase/behandlungen/endo_unified.json`

### Archive (verschieben)

- `src/docudent/Analogleistungen/*.html` (104 files)

### Review (unklar)

- `src/docudent/core/billing/knowledgeBase/bema_knowledge_base.json` (3.4MB)
