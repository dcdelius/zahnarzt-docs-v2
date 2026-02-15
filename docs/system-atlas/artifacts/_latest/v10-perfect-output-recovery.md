# V10 Perfect Output Recovery - Evidence Report

**Date**: 2026-01-12  
**Status**: ✅ FIXED (233 tests pass)

---

## Task 1: Legacy Evidence Table

| File | Key Functions | Call Chain |
|------|---------------|------------|
| [outputComposer.ts](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/logic/outputComposer.ts#L715-L800) | `composeOutput`, `loadTemplate` | chips → sectionsLoop → fullText |
| [fillingTextRenderer.ts](file:///Users/david/dokumaster-ui/src/docudent/core/filling/fillingTextRenderer.ts#L55-L100) | `renderFillingNote` | tooth+surfaces+LA+Cp → lines → text |
| [unified.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json#L497-L543) | `mehrschicht` chip | `billingRef.MKV: GOZ_2197` |

---

## Task 2: Legacy Golden Output Snapshot

**Input**: MKV + "Zahn 27 mod mit Anästhesie, tief, mit CP, 120€"

| Aspect | Legacy Behavior | Evidence |
|--------|-----------------|----------|
| chips | `mehrschicht` when MKV + amount | unified.json:497-543 |
| billingRefs | BEMA base + GOZ addon | chip.billingRef channelization |
| sections | [Dokumentation], [Abrechnung], [MKV], [Hinweise] | outputComposer sectionsLoop |

---

## Task 3: V10 Reality Snapshot (AFTER FIX)

**Captured from Golden Snapshot Test**:

```
Dictation: Zahn 27 mod mit Anästhesie, tief, mit CP, 120€
Insurance: MKV

[1] STATE: output

[2] PER-INSTANCE:
  Instance: fuellung-27-1
    Teeth: ["27"]
    BillingRefs: ["BEMA_13c","BEMA_25","BEMA_40","GOZ_2100"]
    Chips: ["fuellung_grundleistung","cp","la_infiltr","mehrschicht"]

[3] PHANTOM TOOTH CHECK:
  All teeth: ["27"]
  Phantom 12 from "120€": ✅ NO
  Phantom 20 from "120€": ✅ NO

[4] BILLING CODES:
  ["BEMA_13c","BEMA_25","BEMA_40","GOZ_2100"]
  Has BEMA (base): ✅ YES
  Has GOZ (addon): ✅ YES

[5] SECTIONS:
  [dokumentation] Zahn 27 (MOD): Füllungstherapie...Cp mit Ca(OH)₂...
  [abrechnung] Kassenleistung (BEMA) + Mehrkostenleistung (GOZ)
  [mkv] Mehrkostenvereinbarung nach § 28 Abs. 2 SGB V, 120 €
  [hinweise] Nach Lokalanästhesie...
```

---

## Task 4: Delta Root Cause Table

| Symptom | Root Cause | Fix Location |
|---------|------------|--------------|
| No GOZ addon for MKV + "120€" | `detectMehrkostenMentioned` only checked keywords (komposit/adhäsiv), not amount patterns | [buildFactsFromExtraction.ts:193-198](file:///Users/david/dokumaster-ui/src/docudent/v10/facts/buildFactsFromExtraction.ts#L193-L198) |
| Phantom tooth from "120€" | Was fixed earlier: scoping masks price patterns | [scoping.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/multitreatment/scoping.ts) |

---

## Task 5: Implementation (Minimal Fix)

### Fix Applied

**File**: `buildFactsFromExtraction.ts`  
**Lines**: 193-198 (added)

```diff
+    // MKV Amount Pattern: if an explicit amount is mentioned (e.g., "120€", "50 Euro"),
+    // this implies a Mehrkostenvereinbarung was discussed → confirm MKV addon
+    const amountPattern = /\d+\s*(?:€|euro|eur)\b/i;
+    if (amountPattern.test(extracted.rawDictation ?? '')) return true;
+
+    // Also check extracted costs field
+    if (extracted.costs != null && extracted.costs > 0) return true;
```

### MKV Confirmation Trigger Matrix

| Trigger | Signal | Result |
|---------|--------|--------|
| Keyword "komposit" | `detectMehrkostenMentioned` | ✅ `mehrkostenConfirmed=true` |
| Keyword "adhäsiv" | `detectMehrkostenMentioned` | ✅ `mehrkostenConfirmed=true` |
| Amount "120€" | `amountPattern` match | ✅ `mehrkostenConfirmed=true` |
| extracted.costs > 0 | costs field | ✅ `mehrkostenConfirmed=true` |
| "nur Kasse" | `detectNurKasse` | ❌ suppresses addon |

---

## Task 6: Tests

### Test Files

| File | Tests | Status |
|------|-------|--------|
| [v10.golden-snapshot.test.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__tests__/pipeline/v10.golden-snapshot.test.ts) | 3 | ✅ PASS |
| [v10.mkv-addon-billing.test.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__tests__/pipeline/v10.mkv-addon-billing.test.ts) | 5 | ✅ PASS |
| [scoping.phantom-teeth.test.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__tests__/multitreatment/scoping.phantom-teeth.test.ts) | 11 | ✅ PASS |
| [gate-no-hardcoded-billing.test.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__tests__/gates/gate-no-hardcoded-billing.test.ts) | 2 | ✅ PASS |
| Full V10 Suite | 233 | ✅ PASS |

### Verification Commands

```bash
# Full suite
npm test -- --run src/docudent/v10/__tests__
# 233 tests pass

# Golden snapshot
npm test -- --run src/docudent/v10/__tests__/pipeline/v10.golden-snapshot.test.ts

# MKV addon
npm test -- --run src/docudent/v10/__tests__/pipeline/v10.mkv-addon-billing.test.ts
```

---

## Summary

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No phantom tooth from "120€" | ✅ | maskedText shows "PRICE", teeth=["27"] |
| MKV section contains amount | ✅ | section content includes "120 €" |
| GOZ addon for MKV + amount | ✅ | billingRefs includes GOZ_2100 |
| BEMA base billing | ✅ | BEMA_13c, BEMA_25, BEMA_40 |
| nurKasse suppresses addon | ✅ | test passes, no GOZ |
| GKV never GOZ | ✅ | test passes |
| No hardcoded billing | ✅ | gate test passes |
