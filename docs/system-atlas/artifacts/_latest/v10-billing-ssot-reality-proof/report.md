# V10 Billing SSOT Reality Proof

> Generated: 2026-01-14 | Gate Coverage: 17 tests

## VERDICT: ✅ SSOT/DB-GETRIEBEN

Billing codes are generated **exclusively** from KB chip `billingRef` lookups.

---

## Billing Reality Chain

| Step | File:Line | Evidence |
|------|-----------|----------|
| **UI** | `V10InsuranceSelector.tsx` | User selects GKV/PKV/MKV |
| **Pipeline** | `runV10.ts:351` | `insuranceType` input |
| **Instance** | `runV10.ts:460` | Passed to `processInstance()` |
| **Facts** | `buildFactsFromExtraction.ts:397` | `mehrkostenConfirmed = signalsClear && !nurKasse` |
| **Renderer** | `renderFromKbChips.ts:248-271` | **SSOT**: `chip.billingRef[insuranceType]` |
| **Output** | `runV10.ts:763` | `billingCodes` from perInstance |

## Channelization Matrix

| Insurance | Base | Addon | Condition |
|-----------|------|-------|-----------|
| GKV | BEMA only | ❌ | - |
| PKV | GOZ only | ❌ | - |
| MKV | BEMA (GKV branch) | GOZ (MKV branch) | Only if `mehrkostenConfirmed=true` |

## MKV Branch Selection (Fixed)

```typescript
if (hasMkvBranch && mehrkostenConfirmed) {
    billingCode = chip.billingRef.MKV;  // GOZ
} else if (hasGkvBranch) {
    billingCode = chip.billingRef.GKV;  // BEMA
}
```

**Key invariant**: `nurKasse=true` → `mehrkostenConfirmed=false` → No GOZ codes.

## Gate Test Coverage

| Gate | Tests | Protects |
|------|-------|----------|
| `gate-no-hardcoded-billing` | 2 | No BEMA_/GOZ_ string literals in runtime |
| `gate-billing-channelization` | 8 | GKV→BEMA, PKV→GOZ, MKV→BEMA+GOZ |
| `gate-mkv-base-no-goz` | 3 | LA/Kofferdam use BEMA in MKV |
| `gate-goz-addon-requires-confirmation` | 4 | GOZ only when mehrkostenConfirmed |

---

## Single Constructor Proof

```
grep "billingCodes.push" src/docudent/v10/renderer/renderFromKbChips.ts
```

**Result**: Lines 279-284 — the ONLY place where codes are added.
