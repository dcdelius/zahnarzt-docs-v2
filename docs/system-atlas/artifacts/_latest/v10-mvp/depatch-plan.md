# MVP De-Patching & Consolidation Plan

**Date**: 2025-12-31
**Status**: ✅ V10 is already clean, minor cleanup possible

## 1. Kill List

| File/Path | Reason to Delete | Replacement | Status |
|-----------|------------------|-------------|--------|
| `perTooth` in types.ts | Legacy compat, already deprecated | `perInstance` SSOT | ⚠️ Needs manual confirm |
| `perTooth` derivation in runV10.ts | Backward compat layer | Remove when consumers updated | ⚠️ Needs manual confirm |
| Old `buildPerInstanceOutput` | Already removed | `mapPipelinePerInstance` | ✅ Already deleted |

**Current State**: V10 is already consolidated. Only 5 references to deprecated `perTooth`.

---

## 2. Deprecated Paths

### perTooth (Backward Compatibility)

```typescript
// runV10.ts line 568-577
// @deprecated perTooth - derived from perInstance for backward compat
perTooth: results.map(r => {
    ...
})
```

**Action**: Remove when all consumers use `perInstance` directly.

---

## 3. Consolidation Plan (3 PRs)

### PR 1: Delete Dead/Compat Paths
- Remove `perTooth` from types.ts
- Remove `perTooth` derivation from runV10.ts
- Update any remaining consumers

### PR 2: Strengthen Boundaries
- Add test: "perTooth should not be read anywhere"
- Strengthen gate-v10-no-imports-from-v7 if needed

### PR 3: Atlas Tidy
- Keep only `_latest/` artifacts
- Archive or delete `_history/` older than 30 days
- Max 10 artifacts per category

---

## 4. Single Source of Truth Map

| Domain | SSOT Module | Consumers |
|--------|-------------|-----------|
| **Instance Scoping** | `v10/multitreatment/scoping.ts` | runV10, createV10Session |
| **Facts Building** | `v10/facts/buildFactsFromExtraction.ts` | runV10 |
| **Askback Rules** | `v10/askbacks/registry.ts` | runV10, createV10Session |
| **Chip Emission** | `medical_kb/engine/applyMedicalKb.ts` | runV10 |
| **Text Rendering** | `v10/renderer/renderFromKbChips.ts` | runV10 |
| **Billing Codes** | `v10/renderer/renderFromKbChips.ts` (billingRefs) | runV10 |
| **Per-Instance Output** | `runV10.output.perInstance` | createV10Session, UI |
| **Session State** | `v10/uiController/createV10Session.ts` | UI |
| **Treatment KB** | `v10/kb/treatment/providers/jsonProvider.ts` | runV10 |
| **Settings** | `v10/settings/resolveDefaultsToFacts.ts` | runV10 |

---

## 5. No Deletions Required (Already Clean)

| Path | Status |
|------|--------|
| Duplicate mapping functions | ✅ None found |
| Duplicate question compilers | ✅ None found |
| Old compat paths | ⚠️ Only `perTooth` |
| Helper patches | ✅ None found |

---

## 6. Items Needing Manual Confirm

1. **perTooth removal** - Check if any UI still reads `output.perTooth`
2. **TreatmentKB loading** - ESM/CJS mismatch in jsonProvider.ts
3. **LLM extraction fallback** - OK for now, but needs API key in prod

---

## 7. Atlas Cleanliness

| Check | Status |
|-------|--------|
| _latest/ only contains current | ✅ |
| No orphan artifacts | ✅ |
| No duplicate docs | ✅ |
| wiring.graph.v3.json current | ✅ v3.3.0 |
| gears.md current | ✅ 11 gears |
| contracts.md current | ✅ perInstance SSOT |
