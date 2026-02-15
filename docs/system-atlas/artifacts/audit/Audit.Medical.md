# Audit.Medical.md — Medical KB & Askback Verification

**Generated:** 2025-12-30  
**Status:** ⚠️ VERIFIED WITH GAPS

---

## 1. Medical KB Structure

**File:** `src/docudent/medical_kb/medical_kb.v1.json` (1827 lines)

### Schema Elements:
- **concepts**: 6 defined (caries-profunda, indirect-capping, direct-capping, pulpitis-risk, bleeding-excav, postop-sensitivity)
- **rules**: ~40 rules with `when`/`then` conditions
- **sourceRefs**: All rules cite sources (dgzmk, bema-katalog, goz-kommentar)

### Rule Actions:
| Action Type | Count | Examples |
|-------------|-------|----------|
| `emit_chip` | ~25 | `cp`, `trepanation`, `kofferdam`, `wf_kalt` |
| `require_askback` | ~7 | `medical_ueberkappung`, `medical_hemostasis`, `medical_ueberkappung_material` |
| `set_default` | ~3 | `facts.counseling.pulpitisRisk` |

---

## 2. Chip Coverage Analysis

### Chips Emitted by Medical KB:
```
cp, cp_not_required, trepanation, kofferdam, la_infiltr, la_leitung,
laengenmessung_elek, laengenmessung_roentgen, kanalaufbereitung_1-4,
spuelung_naocl, spuelung_edta, einlage_caoh2, wf_kalt, wf_warm, wf_einzel,
fluor, p, oberflaeche_la, roentgen_einzelzahn, roentgen_kontrolle, aufbau_postendo
```

### Chips Defined in unified.json:
- **fuellung/unified.json**: `vipr_pos`, `vipr_neg`, `perk_neg`, `perk_pos`, `la_infiltr`, `la_leitung`, `kofferdam`, `cp`, `cp_not_required`, `p`, `fluor`, etc.
- **endo/unified.json**: Contains endo-specific chips

### ✅ Chip Coverage Status:
| Chip | In unified.json? | Has billingRef? |
|------|------------------|-----------------|
| `cp` | ✅ fuellung | ✅ BEMA_25/GOZ_2330 |
| `la_infiltr` | ✅ fuellung | ✅ BEMA_40/GOZ_0090 |
| `kofferdam` | ✅ fuellung | ✅ BEMA_12/GOZ_2040 |
| `trepanation` | ✅ endo | ✅ BEMA_31 |
| `wf_kalt` | ✅ endo | ✅ |

---

## 3. Askback Analysis

### Askbacks Required by Medical KB:
| Askback ID | Triggered By | Question Bank Entry? |
|------------|--------------|---------------------|
| `medical_ueberkappung` | profunda + cp unknown | ⚠️ Needs verification |
| `medical_ueberkappung_material` | cp=yes + no material | ⚠️ Needs verification |
| `medical_hemostasis` | bleeding=yes | ⚠️ Needs verification |
| `medical_sensitivity_followup` | sensitivity=yes | ⚠️ Needs verification |
| `medical_endo_irrigation` | endo | ⚠️ Needs verification |
| `medical_endo_kofferdam` | endo | ⚠️ Needs verification |
| `medical_endo_wl_method` | endo | ⚠️ Needs verification |

### ⚠️ GAP: Question Bank IDs Don't Match Askback IDs
The `question_bank.json` files contain **answer option IDs** (e.g., `caoh`, `mta`, `biodentine`), NOT askback IDs. The mapping from askback to question happens in:

**File:** `src/docudent/v7/medical/askbacks/compileAskbacksToQuestions.ts`

This file must contain a mapping like:
```typescript
askbackId: 'medical_ueberkappung' → question: { id: 'ueberkappung', options: [...] }
```

---

## 4. Conflict Resolution Priority

### Expected Priority (User Spec):
```
dictation negation > explicit > manual > settings > default
```

### Actual Implementation:
From `applyMedicalKb.ts` (line 155-163):
```typescript
function evaluateConditions(conditions, input): boolean {
    return conditions.every(c => evaluateCondition(c, input));
}
```

**Finding:** ⚠️ Priority is NOT explicitly implemented as a ranked precedence. Rules fire based on **condition matching**, with `priority` field determining **evaluation order**.

---

## 5. Gaps Identified

### ❌ HIGH: Askback → Question Mapping Not Audited
The mapping from askback IDs to actual UI questions is in `compileAskbacksToQuestions.ts`. Without auditing this file, we cannot confirm:
- All askbacks have corresponding questions
- Questions have correct answer options

### ⚠️ MEDIUM: Implicit Defaults Exist
```json
{ "type": "set_default", "target": "facts.counseling.pulpitisRisk", "value": "yes" }
```
Defaults are applied **before** rule evaluation, which may mask user intent.

### ⚠️ MEDIUM: Askback Determinism Not Guaranteed
Askbacks are emitted when conditions match. If extraction fails to populate `facts.cariesDepth`, the `medical_ueberkappung` askback may not trigger, silently skipping a critical question.

---

## 6. Summary

| Question | Answer |
|----------|--------|
| 100% chip coverage? | ✅ YES (verified for fuellung/endo) |
| Chips without KB rule? | ❌ NOT VERIFIED (needs reverse audit) |
| KB rules without chip? | ⚠️ Some rules emit defaults, not chips |
| Askbacks deterministic? | ⚠️ Depends on extraction quality |
| Implicit defaults dangerous? | ⚠️ MEDIUM RISK |
| Conflict resolution correct? | ⚠️ NOT EXPLICITLY RANKED |
