# External Truth Set Audit Report

**Date**: 2025-12-23  
**Status**: Complete

---

## Summary

| Metric | Value |
|--------|-------|
| Truth Set Entries | 18 |
| BLOCK Claims | 9 (2-code exclusions) |
| ALLOW Claims | 0 |
| Claim Types | COMBINABILITY_BLOCK, REQUIRES, MAXCOUNT, SCOPE |

---

## Coverage by Area

| Area | Entries | Key Codes |
|------|---------|-----------|
| GOZ 2197 Cluster | 2 | GOZ_2197, GOZ_2060-2120 |
| GOZ 2040 Kofferdam | 1 | GOZ_2040, GOZ_2060-2080 |
| BEMA Cp/P | 3 | BEMA_25, BEMA_26, BEMA_12 |
| BEMA Endo | 1 | BEMA_32-35 |
| GOZ Endo | 1 | GOZ_2360-2410 |
| LA/Anästhesie | 2 | BEMA_40, BEMA_41a |
| Court Cases | 2 | GOZ_2197 (BVerwG, LG Stuttgart) |
| Frequency Rules | 2 | BEMA_01, BEMA_Ä925 |
| Füllung Scope | 3 | BEMA_13, GOZ_2060-2120 |
| MKV/PKV | 1 | GOZ_2197 |

---

## KB Coverage Analysis

### BLOCK Claims - Verified in KB

| Claim | KB Rule Exists? |
|-------|-----------------|
| GOZ_2197 not beside GOZ_2060 | ✅ Yes (regel_goz2197_nicht_neben_2060_2120) |
| GOZ_2197 not beside GOZ_2080 | ✅ Yes |
| GOZ_2197 not beside GOZ_2100 | ✅ Yes |
| GOZ_2197 not beside GOZ_2120 | ✅ Yes |

### BLOCK Claims - Missing in KB

| Claim | Notes |
|-------|-------|
| GOZ_2040 not beside GOZ_2060 | Need to add rule for Kofferdam/Filling exclusion |
| GOZ_2040 not beside GOZ_2080 | Need to add rule |
| BEMA_40 not beside BEMA_41a | Need to add LA exclusion rule |

---

## Skipped Claims

| Claim | Reason |
|-------|--------|
| BEMA_13 frequency | Not a 2-code exclusion, frequency rule |
| All UNKNOWN scope | Skipped as noted in test |

Skip rate: **0%** of 2-code BLOCK claims (well under 5% threshold)

---

## Gate Results

| Gate | Tests | Status |
|------|-------|--------|
| gate-truthset-external-has-sources | 9 | ✅ PASS |
| gate-truthset-no-contradiction-with-combinability-kb | 10 | ✅ PASS (with warnings) |
| gate-truthset-determinism | 4 | ✅ PASS |

---

## SSOT Cleanup Summary

| Action | File | Result |
|--------|------|--------|
| Fixed import | definition.ts | ✅ Now uses treatments/fuellung/unified.json |
| Deleted | behandlungen/endo_unified.json | ✅ Removed |
| Deleted | behandlungen/fuellung_unified.json | ✅ Removed |

---

## Recommendations

1. **Add missing KB rules** for GOZ_2040 and BEMA_40/41a exclusions
2. **Add ALLOW claims** to truth set for allowed combinations
3. **Extend frequency rules** in combinability KB
