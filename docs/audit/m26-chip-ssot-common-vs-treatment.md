# M26 Chip SSOT Audit - Common vs Treatment-Specific

## Executive Summary

✅ **Controlled Drift Compliant**

All common chips have **identical billingRefs**. Text drift exists for 3 chips but is explicitly approved with documented reasons. All emit rules target valid chips.

---

## Audit Results

| Metric | Value | Status |
|--------|-------|--------|
| Total chips | 34 | — |
| Common chips | 7 | — |
| Billing mismatches | 0 | ✅ |
| Text drift chips | 3 | ✅ (all approved) |
| Orphan emit rules | 0 | ✅ |

---

## Chip Classification

### COMMON_IDENTICAL (4 chips)
Same chipId, identical definitions across all treatments.

| ChipId | Treatments | BillingRef |
|--------|------------|------------|
| `perk_neg` | fuellung, endo | null |
| `perk_pos` | fuellung, endo | null |
| `vipr_neg` | fuellung, endo | null |
| `vipr_pos` | fuellung, endo | null |

### COMMON_BILLING_ONLY (3 chips)
Same chipId, identical billing, approved text drift.

| ChipId | BillingRef GKV | BillingRef PKV | Drift Reason |
|--------|----------------|----------------|--------------|
| `kofferdam` | BEMA_12 | GOZ_2040 | Fuellung: detailed (clamp, visibility). Endo: concise (sterility). |
| `la_infiltr` | BEMA_40 | GOZ_0090 | Fuellung: includes concentration. Endo: shorter. |
| `la_leitung` | BEMA_41a | GOZ_0100 | Fuellung: includes timing. Endo: shorter. |

### TREATMENT_SPECIFIC (27 chips)

**Fuellung (10 chips):**
`cp`, `cp_not_required`, `exkavation`, `finishing`, `fluor`, `komposit_basic`, `mehrschicht`, `oberflaeche_la`, `p`, `rel_trocken`

**Endo (17 chips):**
`aufbau_postendo`, `einlage_caoh2`, `kanalaufbereitung_1-4`, `laengenmessung_elek`, `laengenmessung_roentgen`, `provisorischer_verschluss`, `roentgen_einzelzahn`, `roentgen_kontrolle`, `spuelung_edta`, `spuelung_naocl`, `trepanation`, `wf_einzel`, `wf_kalt`, `wf_warm`

---

## Billing Shared Groups

These are chips that **legitimately share** billing codes (not duplicates):

| Billing Code | Chips | Reason |
|--------------|-------|--------|
| BEMA_Ä925a / GOZ_5000 | roentgen_einzelzahn, laengenmessung_roentgen, roentgen_kontrolle | Same X-ray code, different clinical purposes |
| BEMA_32 / GOZ_2410 | kanalaufbereitung_1/2/3/4 | Per-canal billing, different canal counts |
| BEMA_34 / GOZ_2440 | wf_kalt, wf_warm, wf_einzel | Per-canal filling, different techniques |

---

## Emit Rules Validation

| Treatment | Emit Rules | Chips Targeted |
|-----------|------------|----------------|
| fuellung | 6 | fluor, kofferdam, la_infiltr, la_leitung, oberflaeche_la, p |
| endo | 19 | 19 endo-specific chips |

All 27 emit rules target chips that exist in their respective treatment KBs. ✅

---

## Gates Created

| Gate | Purpose | Status |
|------|---------|--------|
| `gate-m26-no-billing-mismatch` | BillingRef must match for same chipId | ✅ Pass |
| `gate-m26-emit-rules-target-valid-chips` | Emit rules must target existing chips | ✅ Pass |
| `gate-m26-text-drift-explicit` | Text drift requires explicit approval | ✅ Pass |
| `gate-m26-common-chip-classification` | Chip classification snapshot | ✅ Pass |

---

## Architecture Decision

### Current Approach: Option B (Controlled Drift) ✅

```
treatments/*/unified.json  ← Each treatment has full chip def
                          ← Text drift allowed with gate-protected allowlist
                          ← Billing MUST always match (hard rule)
```

### Future Option: Option A (Strict SSOT)

```
treatments/_shared/common_chips.v1.json  ← SSOT for common chips
treatments/fuellung/unified.json        ← imports + extends
treatments/endo/unified.json            ← imports + extends
```

> [!IMPORTANT]
> **Recommendation**: Stay with Option B for now.
> Current text drift is cosmetic (billing identical) and well-documented.
> Migrate to Option A only if drift becomes problematic or more treatments are added.

---

## Verification Commands

```bash
# Run all M26 gates
npx vitest run src/docudent/__tests__/gates/gate-m26*.test.ts --reporter=verbose

# Verify no regression on M18-M25
npx vitest run src/docudent/__tests__/gates/gate-m18*.test.ts \
  src/docudent/__tests__/gates/gate-m25*.test.ts --reporter=dot
```

---

## Definition of Done

- [x] All 4 M26 gates pass (12 tests)
- [x] No billing mismatches (hard fail enforced)
- [x] All text drift is explicitly approved
- [x] All emit rules target valid chips
- [x] Chip classification documented
- [x] Architecture decision documented (Option B)
- [ ] M18-M25 gates still pass (verification pending)
- [x] No UI changes
