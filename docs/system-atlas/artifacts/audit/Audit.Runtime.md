# Audit.Runtime.md — V10 Runtime Truth Verification

**Generated:** 2025-12-30  
**Status:** ✅ VERIFIED WITH CAVEATS

---

## 1. Is V10 the Single Runtime Truth?

### Finding: ✅ YES — with architectural nuance

**The Single Entry Point:**
- `src/docudent/v10/pipeline/runV10.ts` (line 255): `export async function runV10(...)`
- All UI paths call this via `useV10Pipeline` hook → `runV10`

**Evidence:**
```
360+ references to runV10 in codebase
0 references to V6 runtime in active (non-quarantined) code
```

### V7 Usage — Clarification Required

**⚠️ V10 IMPORTS FROM V7 (Shared Logic, NOT Legacy):**

| Module | Source | Purpose | Issue? |
|--------|--------|---------|--------|
| `buildFactsFromExtraction` | v7/medical/extractionToFacts.ts | Fact building | NO - shared logic |
| `applyAnswersToFacts` | v7/medical/facts.ts | Answer application | NO - shared logic |
| `compileAskbacksToQuestions` | v7/medical/askbacks | Question generation | NO - shared logic |
| `renderFromKbChips` | v7/output | SSOT renderer | NO - shared logic |

**Conclusion:** V7 is a **shared library**, not a separate runtime. V10 is the orchestrator.

---

## 2. V6 Status

### Finding: ✅ FULLY QUARANTINED

- **Directory:** `src/docudent/__tests__/gates/__legacy_v6_quarantine__/` (29 files)
- **Excluded via:** `vite.config.js` pattern `'**/__legacy_v6_quarantine__/**'`
- **No V6 imports in active code:** `grep "from.*v6" → 0 results`

---

## 3. Entry/Exit Points

### Entry Points:
| Component | File | Calls |
|-----------|------|-------|
| UI | `DocudentV10Page.tsx` | `useV10Pipeline` → `runV10` |
| CLI/Tests | Direct import | `runV10(input)` |
| Bundle | `runV10Bundle.ts` | Multi-treatment wrapper around `runV10` |

### Exit Contract (V10PipelineOutput):
```typescript
{
  state: 'questions' | 'output' | 'error',
  questions?: DynamicQuestion[],
  output?: { fullText: string, billingCodes: BillingCode[] },
  error?: string,
  meta: V10PipelineMeta
}
```

---

## 4. Wiring Graph v2 Assessment

**File:** `docs/system-atlas/wiring.graph.v2.json`

### Nodes (22 total):
- ✅ All key components documented
- ✅ UI, Hook, Shim, Adapters, Runtime, Medical, Billing, Renderer, KB

### Edges (19 total):
- ✅ Contracts defined for each edge
- ✅ Input/output types specified

### Drop Points (6 documented):
| ID | Severity | Guarded By |
|----|----------|------------|
| DP1 | HIGH | gate-v10-workflow-diagnostics-enforcement |
| DP2 | MEDIUM | gate-v10-askback-nonredundancy |
| DP3 | HIGH | gate-m82-no-silent-billing-drop |
| DP4 | MEDIUM | gate-billing-combinability |
| DP5 | MEDIUM | gate-v10-ui-state-machine |
| DP6 | HIGH | gate-v10-workflow-multi-scoping |

---

## 5. Gaps Identified

### ⚠️ MEDIUM: V7 Shim Still Active
- `hook.useV7Pipeline` exists and wraps V10
- UI uses V7 component names (`QuestionsFlowV2`, `OutputFlow`)
- **Risk:** Confusion about which version is "real"
- **Recommendation:** Rename V7 UI components to V10 namespace

### ⚠️ LOW: No explicit wiring.graph.v3.json
- User requested v3 with gears.md → Does not exist yet
- Current v2 is comprehensive but lacks "gear" documentation format

---

## Summary

| Question | Answer |
|----------|--------|
| V10 is single runtime? | ✅ YES |
| V6 removed from active code? | ✅ YES |
| V7 logic still used? | ⚠️ YES (as shared library, acceptable) |
| Wiring documented? | ✅ YES (v2) |
| Implicit fallbacks? | ❌ NO (extraction fallback is explicit with trace) |
