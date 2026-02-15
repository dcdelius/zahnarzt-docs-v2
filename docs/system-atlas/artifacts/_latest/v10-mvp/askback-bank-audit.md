# Askback Bank Audit

**Date**: 2025-12-31
**Status**: ✅ Well-structured, minor improvements possible

## 1. Askback Files Inventory

| File | Pack | Rules | Status |
|------|------|-------|--------|
| `v10/askbacks/common.askbacks.ts` | common | 2 | ✅ Shared |
| `v10/askbacks/fuellung.askbacks.ts` | fuellung | 4 | ✅ Pack-specific |
| `v10/askbacks/registry.ts` | - | - | ✅ Central registry |

**Total Rules**: 6

---

## 2. Rule Inventory

| packId | ruleId | Level | factDeps | primaryFact | chipDelta add | chipDelta remove |
|--------|--------|-------|----------|-------------|---------------|------------------|
| common | common.isolation | L1 | [isolation] | isolation | isolation_kofferdam, isolation_relativ | - |
| common | common.anesthesia | L3 | [anesthesia] | anesthesia | anesthesia_local | - |
| fuellung | fuellung.capping | L1 | [cariesDepth, capping] | capping | capping_direkt, capping_indirekt | - |
| fuellung | fuellung.adhesive | L1 | [adhesive, material] | adhesive | adhesive_technique | - |
| fuellung | fuellung.layering | L2 | [layering, material, insuranceType] | layering | layering_technique | - |
| fuellung | fuellung.material | L1 | [material] | material | material_komposit, material_giz, material_amalgam | - |

---

## 3. Pack-Scoping Analysis

### ✅ Properly Namespaced
All rule IDs follow `<packId>.<ruleName>` convention:
- `common.isolation`, `common.anesthesia`
- `fuellung.capping`, `fuellung.adhesive`, `fuellung.layering`, `fuellung.material`

### ✅ No Duplicates
No overlapping rule IDs across packs.

### ✅ Multi-Treatment Ready
Registry merges `common` rules with pack-specific rules via `getAskbackRules(packId)`:
```typescript
const ASKBACK_RULES = new Map([
    ['common', commonAskbacks],
    ['fuellung', fuellungAskbacks],
]);
```

---

## 4. Level Consistency

| Level | Count | Purpose | Rules |
|-------|-------|---------|-------|
| L1 | 4 | Blocking - required for therapy/billing | isolation, capping, adhesive, material |
| L2 | 1 | Recommended - quality/compliance | layering |
| L3 | 1 | Optional - nice-to-have | anesthesia |

**Assessment**: ✅ Levels are correctly assigned.

---

## 5. Deduplication Analysis

### `deduplicateQuestions()`
- Removes questions if underlying fact is already answered
- Works per `factKey` in `answeredFacts` set

### Settings→Facts
- Prevents redundant questions when settings provide defaults
- **BUT**: No base chips are emitted, so even with answered questions, output is empty

---

## 6. Critical Finding (from MVP Reality Audit)

**Askback rules only add chips on specific answers.** There are **no base chips** that always emit for a fuellung treatment. This means:
- If no L1 questions trigger → no askback answers → no chips emitted
- Standard dictation with all facts known → 0 chips → empty output

### Missing: Base Chip Emission

Need rules like:
```typescript
// Always emit for fuellung
{ id: 'fuellung.base', when: () => true, chipDelta: () => [{ add: 'fuellung_grundleistung' }] }
```

---

## 7. Recommendations

### Keep
- Pack-scoping structure ✅
- L1/L2/L3 level system ✅
- Registry with Map ✅

### Add
1. **Base chips** for each treatment type (not askback-dependent)
2. **material → chip** mapping that always fires when material is known

### Consider
- Merge common.isolation into fuellung if only used there
- Add `endo.askbacks.ts` for endo treatment

---

## 8. Risks for MVP

| Risk | Severity | Mitigation |
|------|----------|------------|
| No base chips emitted | 🔴 Critical | Add always-fire rules in medical KB |
| ChipDelta only adds, never removes | 🟡 Medium | Add remove support if needed |
| settings.suppresses_askbacks not verified | 🟡 Medium | Run tests to confirm |

---

## 9. Next Steps (max 5)

1. 🔴 **Add base chip rules** in `medical_kb/engine` that emit `fuellung_grundleistung` etc.
2. 🟡 **Test chipDelta flow** end-to-end with trace logging
3. 🟡 **Add endo.askbacks.ts** for endo treatment pack
4. 🟢 **Verify deduplication** works with settings defaults
5. 🟢 **Add validateRuleNamespacing()** call in test gate
