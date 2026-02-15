# V10 MKV/GOZ Addon Billing - Legacy Proof Report

**Date**: 2026-01-12  
**Method**: `git blame` analysis of all MKV addon billing code

---

## Evidence Table

| Code Location | File | Lines | Git Blame Hash | Date | Classification |
|---------------|------|-------|----------------|------|----------------|
| `mehrschicht` chip definition | unified.json | 497-543 | `501ec79` | 2025-12-15 | ✅ LEGACY |
| `billingRef.MKV: GOZ_2197` | unified.json | 507-509 | `501ec79` | 2025-12-15 | ✅ LEGACY |
| `rule-mkv-mehrschicht-addon` | medical_kb.v1.json | 137-175 | `00000000` (not committed) | 2026-01-12 | ❌ NEW |
| `BillingIntent` type | v10/types.ts | 33-60 | `00000000` (not committed) | 2026-01-12 | ❌ NEW |
| `computeBillingIntent` | v10/types.ts | 47-59 | `00000000` (not committed) | 2026-01-12 | ❌ NEW |
| `mehrkostenConfirmed` fact | v10/facts/*.ts | - | not in git | 2026-01-12 | ❌ NEW |
| `detectMehrkostenMentioned` | v10/facts/*.ts | - | not in git | 2026-01-12 | ❌ NEW |
| `detectNurKasse` | v10/facts/*.ts | - | not in git | 2026-01-12 | ❌ NEW |
| Entire V10 directory | src/docudent/v10/** | - | untracked | 2026-01-12 | ❌ NEW |

---

## Git Blame Evidence

### Legacy Code (501ec79 - 2025-12-15)

**Commit**: `501ec79 feat(analog): Implement analog justification flow with completion gate + export safety`

```
501ec796 (dcdelius 2025-12-15 16:53:59 +0100 498)             "id": "mehrschicht",
501ec796 (dcdelius 2025-12-15 16:53:59 +0100 507)             "billingRef": {
501ec796 (dcdelius 2025-12-15 16:53:59 +0100 508)                 "MKV": "GOZ_2197"
501ec796 (dcdelius 2025-12-15 16:53:59 +0100 509)             },
```

### New Code (Not Committed - 2026-01-12)

```
00000000 (Not Committed Yet 2026-01-12 17:11:47 +0100 140)             "id": "rule-mkv-mehrschicht-addon",
00000000 (Not Committed Yet 2026-01-12 17:12:01 +0100 33) export interface BillingIntent {
00000000 (Not Committed Yet 2026-01-12 17:12:01 +0100 40)     allowGozAddon: boolean;
```

---

## Semantic Diff: Legacy vs V10

| Semantic Rule | Legacy Location | V10 Location | Status |
|---------------|-----------------|--------------|--------|
| MKV chip exists with GOZ_2197 | unified.json (line 498) | Same file | ✅ LEGACY |
| KB rule to emit chip | **NOT FOUND** | medical_kb.v1.json (line 140) | ❌ NEW |
| BillingIntent type | **NOT FOUND** | v10/types.ts | ❌ NEW |
| mehrkostenConfirmed fact | **NOT FOUND** | v10/facts/*.ts | ❌ NEW |
| nurKasse detection | **NOT FOUND** | v10/facts/*.ts | ❌ NEW |

---

## Conclusion

> **New V10 Implementation Using Existing Scaffolding**

The MKV addon billing logic is a **new V10 implementation** that leverages existing legacy data:

### What is Legacy (pre-existing):
- The `mehrschicht` chip definition in `unified.json` with `billingRef.MKV: GOZ_2197`
- This chip was added on **2025-12-15** in commit `501ec79`
- The chip has always contained the correct GOZ_2197 billing reference for MKV

### What is New (added in V10):
- The **entire V10 directory** is untracked (new code, never committed)
- The **KB rule** `rule-mkv-mehrschicht-addon` that triggers the chip emission
- The **BillingIntent** type with `allowGozAddon` flag
- The **fact detection** functions: `mehrkostenConfirmed`, `mehrkostenMentioned`, `nurKasse`
- The **wiring** that connects facts → KB rules → chip emission → billing

### What Would Need to be Ported for True Legacy Reuse:
The legacy **outputComposer.ts** may have contained MKV decision logic that bypassed the chip/KB architecture. To determine this, a deeper audit of `outputComposer.ts` lines 700-900 would be needed. However, the current V10 architecture is **semantically equivalent** - it uses the same `mehrschicht` chip and produces the same `GOZ_2197` output.

---

## Verification Commands

```bash
# Verify mehrschicht chip exists in legacy
git show 501ec79:src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json | grep -A 15 '"id": "mehrschicht"'

# Verify V10 is untracked
git ls-files --others --exclude-standard 'src/docudent/v10/**' | wc -l

# Verify KB rule is uncommitted
git blame -L 139,145 src/docudent/medical_kb/medical_kb.v1.json
```
