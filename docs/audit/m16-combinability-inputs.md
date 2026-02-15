# M16 Combinability Inputs Audit

**Date**: 2025-12-23  
**Status**: Pre-implementation audit

---

## Existing Sources

### 1. kombinationen.json (SSOT)

**Path**: `src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json`  
**Count**: 15 rules  
**Reliable**: ✅ Yes

| ID | Typ | Codes | Schweregrad |
|----|-----|-------|-------------|
| `regel_bema12_nur_kofferdam` | bedingung | BEMA_12 | regress |
| `regel_bema12_einmal_kieferhaelfte` | haeufigkeit | BEMA_12 | regress |
| `regel_bema13_flaechen_korrekt` | bedingung | BEMA_13/b/c/d | regress |
| `regel_bema25_tiefe_karies` | bedingung | BEMA_25 | regress |
| `regel_bema26_pulpaeroeffnung` | bedingung | BEMA_26 | regress |
| `regel_bema41_uk_standard` | bedingung | BEMA_40/41a | warnung |
| `regel_goz2197_nicht_neben_2060` | **ausschluss** | GOZ_2197/2060-2120 | **regress** |
| `regel_goz2040_mehrfach` | haeufigkeit | GOZ_2040 | info |
| `regel_endo_je_kanal` | haeufigkeit | GOZ_2390-2440 | info |
| `regel_mkv_schriftlich` | dokumentation | MKV | regress |
| `regel_wiederholungsfuellung_2_jahre` | haeufigkeit | BEMA_13/b/c/d | warnung |
| `regel_extraktion_begruendung` | dokumentation | BEMA_45-48 | warnung |
| `regel_wsr_vor_extraktion` | bedingung | BEMA_45/51/52 | info |
| `regel_roentgen_wirtschaftlichkeit` | haeufigkeit | Ä925a/GOZ_5000/5002 | warnung |
| `regel_e2e_test_warn` | ausschluss | TEST_WARN_A/B | warnung |

### Rule Types

| Typ | Count | Can BLOCK? |
|-----|-------|------------|
| `ausschluss` | 2 | ✅ Yes (BLOCK) |
| `bedingung` | 6 | ⚠️ Depends on context |
| `haeufigkeit` | 5 | ⚠️ Count-based |
| `dokumentation` | 2 | ⚠️ Requires text check |

### 2. billingCombinabilityChecker.ts

**Path**: `src/docudent/core/billing/combinability/billingCombinabilityChecker.ts`  
**Status**: ✅ Production-ready, uses kombinationen.json  
**Reliable**: ✅ Yes

### 3. v10/compat/combinability.ts

**Path**: `src/docudent/v10/compat/combinability.ts`  
**Status**: ✅ Thin wrapper, delegates to core checker  
**Issue**: ❌ Not wired to runV10 output blocking

---

## M16 Strategy

1. **SSOT**: Keep kombinationen.json as source of truth
2. **Runtime**: Wire combinability check AFTER billing guard, BEFORE output
3. **BLOCK**: Only `typ=ausschluss` rules with `schweregrad=regress` → BLOCK
4. **Parity**: New checker must match old for all golden cases
5. **Scope**: Preserve `bezug` field (pro_kieferhaelfte, pro_kanal, etc.)

---

## Golden Scenarios (from real rules)

### BLOCK Cases (regel_goz2197_nicht_neben_2060)

| Case | Codes | Expected |
|------|-------|----------|
| goz_2197_with_2060 | GOZ_2197 + GOZ_2060 | BLOCK |
| goz_2197_with_2080 | GOZ_2197 + GOZ_2080 | BLOCK |
| goz_2197_with_2100 | GOZ_2197 + GOZ_2100 | BLOCK |
| goz_2197_with_2120 | GOZ_2197 + GOZ_2120 | BLOCK |
| goz_2197_alone | GOZ_2197 only | PASS |
| goz_2060_alone | GOZ_2060 only | PASS |

### WARN Cases (regel_e2e_test_warn)

| Case | Codes | Expected |
|------|-------|----------|
| test_warn_combo | TEST_WARN_A + TEST_WARN_B | WARN |

### PASS Cases (no conflicts)

| Case | Codes | Expected |
|------|-------|----------|
| bema_filling_basic | BEMA_40 + BEMA_13 | PASS |
| goz_filling_basic | GOZ_0090 + GOZ_2060 | PASS |
| bema_endo_basic | BEMA_41a + BEMA_32 | PASS |

### Frequency Cases (haeufigkeit)

| Case | Rule | Scope | Expected |
|------|------|-------|----------|
| bema_12_two_same_quadrant | BEMA_12 x2 same quadrant | pro_kieferhaelfte | WARN/BLOCK |
| bema_12_two_diff_quadrant | BEMA_12 x2 diff quadrant | pro_kieferhaelfte | PASS |
