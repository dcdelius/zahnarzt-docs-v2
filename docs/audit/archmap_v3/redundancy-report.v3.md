# Redundancy Report v3

**Generated**: 2025-12-26T16:40:00Z

---

## 1. Chip ID Collisions

| Check | Result | Evidence |
|-------|--------|----------|
| Common chips with different billingRef | **0** | gate-m26-no-billing-mismatch |
| Common chips count | 7 | 4 IDENTICAL, 3 BILLING_ONLY |

**Verdict**: ✅ PASS

---

## 2. BillingRef Mismatch

| Common Chip | fuellung | endo | Match |
|-------------|----------|------|-------|
| vipr_pos | null | null | ✅ |
| vipr_neg | null | null | ✅ |
| perk_pos | null | null | ✅ |
| perk_neg | null | null | ✅ |
| kofferdam | BEMA_12/GOZ_2040 | BEMA_12/GOZ_2040 | ✅ |
| la_infiltr | BEMA_40/GOZ_0090 | BEMA_40/GOZ_0090 | ✅ |
| la_leitung | BEMA_41a/GOZ_0100 | BEMA_41a/GOZ_0100 | ✅ |

**Verdict**: ✅ PASS

---

## 3. Text Drift

| Chip | Drift | Approved | Allowlist Entry |
|------|-------|----------|-----------------|
| kofferdam | ⚠️ yes | ✅ | textDriftAllowlist.json |
| la_infiltr | ⚠️ yes | ✅ | textDriftAllowlist.json |
| la_leitung | ⚠️ yes | ✅ | textDriftAllowlist.json |

**Verdict**: ✅ PASS (all drift approved)

---

## 4. Orphan Emit Rules

| Check | Result | Evidence |
|-------|--------|----------|
| emit_chip rules with missing target | **0** | gate-m26-emit-rules-target-valid-chips |
| Total emit_chip rules | 27 | medical_kb.v1.json |

**Verdict**: ✅ PASS

---

## 5. Shadow SSOT Detection

| Check | Found | Status |
|-------|-------|--------|
| Duplicate unified.json | 0 | ✅ |
| Legacy behandlungen/*.json | 7 | ⚠️ exists |
| Legacy paths imported | 2 | ⚠️ |

### Legacy Paths Still Imported

| Asset | Importer | Risk |
|-------|----------|------|
| behandlungen/fuellung.json | billingDatabase.ts:61 | LOW (not V10) |
| medicalAskbackMatrix.v1.json | medicalEngine.ts:19 | LOW (not V10) |

**Verdict**: ⚠️ LEGACY EXISTS but not in V10 path

---

## 6. Hardcoded Billing

| Check | Result | Evidence |
|-------|--------|----------|
| Hardcoded billing in V10/V7 runtime | **0** | gate-billing-no-legacy-imports |
| In tests/goldens only | ✅ | Allowed |

**Verdict**: ✅ PASS

---

## Summary

| Check | Status |
|-------|--------|
| Chip ID Collisions | ✅ |
| BillingRef Mismatch | ✅ |
| Text Drift | ✅ (approved) |
| Orphan Emit Rules | ✅ |
| Shadow SSOT | ⚠️ legacy exists |
| Hardcoded Billing | ✅ |

**Overall**: 🟢 GREEN — V10 SSOT Compliant
