# V10 → V7 Dependency Inventory

**Date:** 2025-12-30  
**Status:** GP1/6 Analysis Complete

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| **A) Runtime Logic** | 5 imports | 🔴 Must remove |
| **B) UI Components** | 8 re-exports | 🟡 Migrate to shared |
| **C) Types/Contracts** | 2 imports | 🟡 Move to contracts |
| **D) Test-only** | 4 files | ✅ Acceptable |

---

## Category A: Runtime Business Logic (MUST REMOVE)

| File | Dependency | Import | Fix Strategy |
|------|------------|--------|--------------|
| `v10/pipeline/runV10.ts:23` | `v7/medical/types` | `TreatmentFacts` | Move to contracts |
| `v10/pipeline/runV10.ts:26` | `v7/medical/extractionToFacts` | `buildFactsFromExtraction` | Copy to v10/extraction |
| `v10/pipeline/runV10.ts:27` | `v7/medical/facts` | `applyAnswersToFacts` | Copy to v10/facts |
| `v10/pipeline/runV10.ts:36` | `v7/medical/askbacks` | Multiple functions | Copy to v10/askbacks |
| `v10/pipeline/runV10.ts:39` | `v7/output` | `renderFromKbChips` | Copy to v10/render |
| `v10/pipeline/runV10Bundle.ts:19` | `v7/output` | `renderFromKbChips, getChipFromKb` | Same as above |

---

## Category B: UI Components (MIGRATE TO SHARED)

All from `v10/components/index.ts`:

| Line | Component | Fix Strategy |
|------|-----------|--------------|
| 19 | `SoftGradientBackground` | Move to ui/shared |
| 20 | `HeroSculpture` | Move to ui/shared |
| 23 | `QuestionsFlowV2` | Move to ui/shared |
| 24 | `QuestionsFlow` | Move to ui/shared |
| 25 | `OutputFlow` | Move to ui/shared |
| 26 | `MultiOutputRenderer` | Move to ui/shared |
| 27 | `MultiInstancePanel` | Move to ui/shared |
| 30 | `TreatmentInstance` (type) | Move to contracts |
| 31 | `UiStep` (type) | Move to contracts |

---

## Category C: Types/Contracts (MOVE TO CONTRACTS)

| File | Dependency | Import | Fix |
|------|------------|--------|-----|
| `v10/types.ts:9` | `v7/medical/types` | `TreatmentFacts` | Move to contracts |
| `v10/components/index.ts:30-31` | `v7/multitreatment/types` | `TreatmentInstance, UiStep` | Move to contracts |

---

## Category D: Test-Only (ACCEPTABLE)

These gate tests legitimately check V7/V10 boundary:

| File | Purpose |
|------|---------|
| `__tests__/gates/gate-v10-no-runtime-imports-from-v7-pipeline.test.ts` | Enforces boundary |
| `__tests__/gates/gate-v10-ui-debugdrawer-payload.test.ts` | V7 hook analysis |
| `__tests__/gates/gate-v10-ui-edit-clickable.test.ts` | V7 hook analysis |
| `__tests__/gates/gate-v10-ui-run-button.test.ts` | V7 hook analysis |

---

## Current State: What's RIGHT ✅

1. **DocudentV10Page.tsx uses useV10Pipeline** (line 20, 52-80) — NOT useV7Pipeline
2. **useV10Pipeline.ts exists** (v10/hooks/useV10Pipeline.ts) — 394 lines, calls runV10 directly
3. **No useV7Pipeline import in V10 page** — Comments are misleading but code is correct

---

## V7 Entry Points (Still Active)

| Route | File | Status |
|-------|------|--------|
| `/docudent/v7` | `v7/pages/DocudentV7Page.tsx` | Active (uses useV7Pipeline) |
| `/docudent/v8` | `v8/pages/DocudentV8Page.tsx` | Active (uses useV7Pipeline) |
| `/docudent/v10` | `v10/pages/DocudentV10Page.tsx` | Active (uses useV10Pipeline) ✅ |

---

## Problem: Deep V7 Dependencies

Even though V10 page uses V10 hook, the V10 orchestrator `runV10.ts` still imports V7 modules:

```
v10/pages/DocudentV10Page.tsx
  └─> v10/hooks/useV10Pipeline.ts (✅ V10-native)
      └─> v10/pipeline/runV10.ts
          └─> v7/medical/types          🔴
          └─> v7/medical/extractionToFacts 🔴
          └─> v7/medical/facts          🔴
          └─> v7/medical/askbacks       🔴
          └─> v7/output                 🔴
```
