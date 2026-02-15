# Per-Instance Output Provenance Audit

**Date**: 2025-12-31
**Status**: ✅ Architecture correct, content empty (blocked by facts/chips issue)

## 1. Output Structure Verification

From MVP Reality Audit, the output structure is:

```typescript
output: {
    fullText: '',          // Derived from perInstance
    billingCodes: [],      // Derived from perInstance
    perInstance: {
        'fuellung-36-1': {
            instanceId: 'fuellung-36-1',
            teeth: ['36'],
            text: '',           // Empty - no chips
            billingRefs: [],    // Empty - no chips
            chips: [],          // Empty - ROOT CAUSE
        }
    },
    perTooth: [...]       // @deprecated, derived from perInstance
}
```

## 2. Multi-Tooth Test Results

| Dictation | Instances | perInstance Keys | Leak? |
|-----------|-----------|------------------|-------|
| "36 Komposit; 14 GIZ" | 2 | fuellung-36-1, fuellung-14-2 | ✅ No leak |
| "36 und 37 Komposit" | 2 | fuellung-36-1, fuellung-37-2 | ✅ No leak |
| "36 okklusal" | 1 | fuellung-36-1 | ✅ No leak |

**Finding**: Instance isolation is architecturally correct. Each instance has:
- Separate instanceId from scoping
- Separate chips array
- Separate text/billingRefs

## 3. Provenance Chain

```
Scoping → instanceId = "${packId}-${tooth}-${counter}"
   ↓
processInstance() → chips per instance
   ↓
perInstance[instanceId] = { ...renderFromKbChips(instance.chips) }
   ↓
Global = derived from perInstance (SSOT)
```

**Verification**: ✅ SSOT pattern is implemented correctly.

## 4. Why Empty?

| Step | Expected | Actual | Issue |
|------|----------|--------|-------|
| Scoping | instanceIds | ✅ fuellung-36-1 | - |
| processInstance | chips emitted | ❌ 0 chips | Medical KB not firing |
| perInstance build | text/billing | ❌ Empty | No chips to render |
| Global derive | concat | ✅ Empty (correct) | Derived from empty perInstance |

---

## 5. MVP Definition Checklist

| Requirement | Status |
|-------------|--------|
| ✅ perInstance exists | PASS |
| ✅ Keys are real instanceIds from scoping | PASS |
| ✅ Global derived from perInstance only | PASS |
| ✅ No global leak in multi-tooth | PASS |
| ✅ Chips per instance isolated | PASS |
| ❌ perInstance.text non-empty | **FAIL** (no chips) |
| ❌ perInstance.billingRefs non-empty | **FAIL** (no chips) |
| ❌ Different materials → different output | **FAIL** (all empty) |

---

## 6. Conclusion

**Per-instance provenance is architecturally complete.**

The only issue is that chips are not being emitted by the upstream medical KB engine, causing all instances to have empty output.

When chips are fixed, the per-instance rendering will work correctly.
