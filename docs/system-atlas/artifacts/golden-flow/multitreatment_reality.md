# G113 — Multi-Treatment Reality Check

**Purpose:** Document actual state of multi-treatment support — honest, not pretty

---

## Test Case: 2-Tooth Filling

**Dictation:**
```
"An Zahn 36 okklusal eine Kompositfüllung adhäsiv, 
an Zahn 14 distal eine kleine Füllung. 
Lokalanästhesie durchgeführt."
```

**Expected:**
- Tooth 36: adhesive filling, LA Leitung
- Tooth 14: simple filling, LA Infiltration
- Separate askbacks per tooth (if applicable)
- Separate chips per tooth

---

## Current Implementation Analysis

### How Multi-Instance Works

```typescript
// useV10Pipeline.ts:241-262
const createInstancesAndRun = async (instances) => {
    const results = await Promise.all(instances.map(async (inst) => {
        return runV10({
            treatmentId: current.treatmentId,
            dictation: inst.dictationSlice,
            answers: current.instanceAnswers[inst.instanceId] || new Map(),
        });
    }));
};
```

**Status:** ✅ Separate runV10 call per tooth

---

## Scoping Analysis

### ⚠️ Askback Scoping

| Aspect | Expected | Actual | Status |
|--------|----------|--------|--------|
| Askback per tooth | Yes | ⚠️ Mixed | Needs work |
| Answer key scoping | `medical_X::tooth:36` | ✅ Implemented | OK |
| UI shows tooth context | Yes | ⚠️ Generic text | Needs work |

**Code:** `getScopedAnswers()` in runV10.ts handles scoping.

### ⚠️ Chip Scoping

| Aspect | Expected | Actual | Status |
|--------|----------|--------|--------|
| Chips per instance | Yes | ✅ Separate arrays | OK |
| Combined output | Both teeth | ✅ Works | OK |
| Per-tooth output | Separated | ⚠️ Not exposed | Needs work |

### ⚠️ Output Scoping

| Aspect | Expected | Actual | Status |
|--------|----------|--------|--------|
| Per-tooth text | Labeled | ⚠️ Combined | Needs work |
| Per-tooth billing | Separated | ✅ Available but hidden | OK |
| Multi-output UI | Shows both | ✅ MultiOutputRenderer | OK |

---

## Issues Identified (NOT TO FIX NOW)

### Issue 1: QuestionsFlowV2 doesn't show tooth context
```
Current: "Wurde Adhäsivtechnik angewendet?"
Expected: "Zahn 36: Wurde Adhäsivtechnik angewendet?"
```
**Severity:** MEDIUM
**Fix:** Pass tooth context to QuestionsFlowV2

### Issue 2: Instance answers keyed by instanceId
```
instanceAnswers: {
    "tooth:36": Map(...),
    "tooth:14": Map(...)
}
```
**Status:** ✅ Already correct

### Issue 3: Output not clearly per-tooth
```
Current: Combined text blob
Expected: 
  Zahn 36: ...
  Zahn 14: ...
```
**Severity:** LOW (MultiOutputRenderer has this)
**Fix:** Use perTooth output format

---

## What Works

1. ✅ Separate pipeline runs per tooth
2. ✅ Answer scoping with `::tooth:XX` suffix
3. ✅ Chips collected per instance
4. ✅ MultiOutputRenderer shows per-tooth breakdown

## What Needs Work

1. ⚠️ QuestionsFlowV2 should show tooth context
2. ⚠️ Main output should show per-tooth breakdown
3. ⚠️ Askback questions should indicate which tooth

---

## Recommendation

**Don't fix now.** Multi-treatment is functional enough for single-dictation multi-tooth cases. Polish after core flow is proven.
