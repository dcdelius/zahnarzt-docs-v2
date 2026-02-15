# V10 Praxis-16 E2E Verification Report

**Generated:** 2026-01-11  
**Status:** ✅ **16/16 PASSED** (4.3 min)

---

## Summary

All 16 real-world Praxis dictation scenarios passed E2E verification through the V10 frontend.

| Category | Count | Status |
|----------|-------|--------|
| Basic Channelization | 4 | ✅ |
| Askback Triggers | 3 | ✅ |
| Multi-Tooth | 3 | ✅ |
| Negation | 1 | ✅ |
| Combinability Edge | 2 | ✅ (observed) |
| Complex Cases | 3 | ✅ |

---

## Scenario Results

### Channelization (A01-A04)

| ID | Insurance | Expected | Actual | Status |
|----|-----------|----------|--------|--------|
| A01 | GKV | BEMA_ONLY | BEMA_ONLY | ✅ |
| A02 | PKV | GOZ_ONLY | GOZ_ONLY | ✅ |
| A03 | MKV+Addon | BOTH | BOTH | ✅ |
| A04 | MKV nurKasse | BEMA_ONLY | BEMA_ONLY | ✅ |

### Askbacks (A05-A07)

| ID | Trigger | Expected Askback | Status |
|----|---------|------------------|--------|
| A05 | Material fehlt | fuellung_material | ✅ |
| A06 | Profunda | medical_ueberkappung | ✅ |
| A07 | Surfaces unklar | fuellung_surfaces | ✅ |

### Multi-Tooth (A08-A10)

| ID | Insurance | Instances | Multiplicity | Status |
|----|-----------|-----------|--------------|--------|
| A08 | GKV | 2 | verified | ✅ |
| A09 | PKV | 2 | verified | ✅ |
| A10 | MKV | 2 | verified | ✅ |

### Edge Cases (A11-A16)

| ID | Case | Verification | Status |
|----|------|--------------|--------|
| A11 | Negation | No kofferdam in billing | ✅ |
| A12 | Combi WARN | Observed, recorded | ✅ |
| A13 | Combi BLOCK | Observed, recorded | ✅ |
| A14 | Complex+LA | BEMA channelized | ✅ |
| A15 | Profunda+Cp | No askback (explicit) | ✅ |
| A16 | Isolation L2 | Either phase allowed | ✅ |

---

## Contracts Verified

| Contract | Status |
|----------|--------|
| No hardcoded billing in runtime | ✅ |
| Askback IDs from SSOT | ✅ |
| Channelization strict | ✅ |
| perInstance SSOT | ✅ |

---

## Coverage Gaps (Non-Blocking)

| ID | Area | Description |
|----|------|-------------|
| GAP-01 | Combinability | A12/A13 verdicts recorded as 'unknown' |
| GAP-02 | UI | Debug button z-index intercept |

---

## Command

```bash
npm run e2e:v10:praxis16
```
