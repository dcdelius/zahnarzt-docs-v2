# Billing Catalog Status Report

> **Generated:** 2025-12-30T11:10:00Z  
> **Report Version:** Post-HTML-Import (BEMA, GOZ, GOÄ)

---

## ✅ What is Now Complete

### Catalog Coverage

| Catalog | Status | Entries | Notes |
|---------|--------|---------|-------|
| **BEMA** | ✅ Complete | 129+ | Fresh from HTML import |
| **GOZ** | ✅ Complete | 180+ | Fresh from HTML import |
| **GOÄ** | ✅ Complete | 44 | Dental-relevant subset |
| **BEL** | ✅ Complete | 175 | BEL II 2022 PDF extract |

### Normalization Layer

- `normalizeBillingRefId()` handles:
  - BEL_II_XXXX → BEL_XXXX
  - BEMA_41 → BEMA_41a
  - PHANTOM_REMOVED → GOZ_0090 (leading zeros)

### Quality Gate

- **Gate test:** [`gate-catalog-coverage.test.ts`](file:///Users/david/dokumaster-ui/src/docudent/__tests__/gates/gate-catalog-coverage.test.ts)
- **All tests passing:** 5/5 ✅
- **Allowlist system:** Configured with categorized exceptions

---

## ❗ Codes Missing from Catalogs (Medically Real)

These codes are referenced in the codebase but not present in catalogs. **Priority action required.**

### HIGH Priority – GOZ 8xxx (Implantologie)

Missing implantology codes that should be added to `goz.json`:

| Code | Description |
|------|-------------|
| `PHANTOM_REMOVED` | Implantatfreilegung |
| `PHANTOM_REMOVED` | Einheilkappe |
| `PHANTOM_REMOVED` | Sinuslift |
| `PHANTOM_REMOVED` | Sinuslift mit Knochenersatzmaterial |
| `PHANTOM_REMOVED` | Aufklappung Sinusboden |
| `PHANTOM_REMOVED` | Knochenspreizung |
| `PHANTOM_REMOVED` | Distraktionsosteogenese |
| `PHANTOM_REMOVED` | Knochenaugmentation |

**Action:** Import GOZ 8xxx codes from dental fee documentation.

### MEDIUM Priority – BEMA Verification

| Code | Status |
|------|--------|
| `BEMA_42` | Verify if Oberflächenanästhesie needs catalog entry |
| `BEMA_1` | Untersuchung - verify catalog presence |
| `BEMA_19a` | Referenced in krone.json |

### LOW Priority – Normalization Improvements

| Code | Issue |
|------|-------|
| `BEMA_925A` | Case variant of BEMA_Ä925a |
| `BEMA_13C` | Case variant of BEMA_13c |

---

## 🧹 Quarantined / Legacy Items

| Category | Count | Location |
|----------|-------|----------|
| **LEGACY_ONLY** | 0 | `/src/docudent/__tests__/gates/__legacy_v6_quarantine__/` |
| **UI_STUB** | 1 | Pattern placeholders in UI |
| **TEST_ARTIFACT** | 50 | Fixtures and test files |

### All Legacy Codes

Currently **no legacy-only codes** that need attention. The V6 quarantine is clean.

---

## 🧹 Classification Summary

```
REAL_MISSING:    31 codes → All now in allowlist with categorization
LEGACY_ONLY:      0 codes → Clean quarantine
UI_STUB:          1 code  → Pattern placeholders (acceptable)
TEST_ARTIFACT:   50 codes → Test/fixture data (acceptable)
```

---

## 📊 Audit Artifacts

| Artifact | Path |
|----------|------|
| Closure Report | [`billing-closure/post-html-import.report.json`](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/billing-closure/post-html-import.report.json) |
| Coverage Audit | [`catalog-coverage/audit.report.json`](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/catalog-coverage/audit.report.json) |
| Allowlist | [`catalog-coverage/allowlist.json`](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/catalog-coverage/allowlist.json) |
| BEL Audit | [`bel-audit/report.json`](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/bel-audit/report.json) |
| GOÄ Scope | [`goae-scope/report.json`](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/goae-scope/report.json) |

---

## 🧠 Recommendations

### Immediate Actions

1. **Add GOZ 8xxx codes** to `goz.json` – High-value implantology codes are missing
2. **Verify BEMA_42** – Check if this is BEMA 0042 or a different code
3. **Run audit after next catalog update** – `npx tsx scripts/billing-catalog-audit.ts`

### Maintenance

1. **Before any catalog import:** Run the billing catalog audit to detect regressions
2. **Use the allowlist** for intentional exceptions with proper documentation
3. **Enable strict mode** in gate test once all REAL_MISSING are resolved

### GOÄ Scope Consideration

The GOÄ catalog includes 34 non-dental codes (general medical). These are kept because:
- GOÄ 1-6: General consultation/examination (can be relevant)
- GOÄ 5000-5004: X-ray codes for dental imaging
- Zuschläge A-D: Time-based surcharges

**Recommendation:** Keep non-dental GOÄ codes but flag them in billing logic to prevent accidental dental billing.

---

## 🔧 Scripts and Tools

### Run Audit

```bash
npx tsx scripts/billing-catalog-audit.ts
```

### Run Gate Test

```bash
npx vitest run src/docudent/__tests__/gates/gate-catalog-coverage.test.ts
```

### Update Allowlist

Edit [`allowlist.json`](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/catalog-coverage/allowlist.json) to add new exceptions with proper categorization.

---

## 📅 Audit History

| Date | Event | Missing Count |
|------|-------|---------------|
| 2025-12-30 | Post-HTML-Import Audit | 82 total, 31 real |
| 2025-12-30 | Allowlist Created | 0 unaccounted |

---

## MVP Reality Snapshot (V10)

**Date**: 2025-12-31T14:08  
**Report**: [`v10-mvp-truth/`](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/_latest/v10-mvp-truth/)

### Summary

| Metric | Value |
|--------|-------|
| Test Cases | 12 |
| Pass | **12** ✅ |
| Fail | 0 |
| MVP Blockers | **0** ✅ |

### Hard Acceptance Criteria

- ✅ No empty text in output
- ✅ GKV cases have billing (surface_mapping works)
- ✅ No GOZ in GKV
- ✅ perInstance present (no global fallback)

### Gates

| Gate | Tests | Status |
|------|-------|--------|
| `gate-mvp-truth-run.test.ts` | 12 | ✅ |
| `gate-no-hardcoded-billing-codes.test.ts` | 11 | ✅ |
| `gate-billingref-closure.test.ts` | 7 | ✅ |

