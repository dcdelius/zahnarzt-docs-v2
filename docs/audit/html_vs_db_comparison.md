# HTML vs DB Comparison Report

**Date**: 2025-12-23  
**Status**: Audit Complete

---

## Overview

| Metric | HTML Truth Set | Billing DB/KB |
|--------|----------------|---------------|
| **Total Codes** | 221 | BEMA: 3522 lines, GOZ: 1211 lines |
| **Exclusion Rules** | 1 (extracted) | 15 (combinability_kb) |
| **Max Count Rules** | 16 | N/A (not yet modeled) |

---

## 1. Coverage Analysis

### HTML Truth Set Sources

| System | Codes | Source |
|--------|-------|--------|
| ANALOG | 72 | commentIndex_analog.json |
| BEL | 65 | commentIndex.json |
| BEMA | 49 | commentIndex_bema.json |
| GOZ | 35 | commentIndex_goz.json |

### Gaps Identified

| Gap Type | Count | Notes |
|----------|-------|-------|
| Extracted but not in KB | 0 | All extracted codes exist in catalogs |
| In catalog but no HTML source | Many | Expected — catalogs have full list, HTML sources are commentary |

---

## 2. Combinability / Exclusions

### Current State

| Source | Exclusion Rules |
|--------|-----------------|
| `combinability_kb.v1.json` | 15 rules with sourceRefs |
| HTML Truth Set | 1 code with extracted exclusions |

### Gap Analysis

The HTML truth set extraction captures "nicht neben" text but does not fully parse into structured exclusion pairs. The existing `commentIndex*.json` files contain the raw evidence in `softRules` and `sections`.

**Evidence in commentIndex.json:**

```json
{
  "type": "contraHint",
  "match": "nicht neben",
  "evidenceSnippet": "Die L-Nr. 011 5 nicht neben der L-Nr. 012 5 abrechenbar"
}
```

### Recommendations

1. **Enhance truth set generator** to extract structured exclusion pairs
2. **Create mapping** between extracted pairs and `combinability_kb` rules
3. **Mark as dbOnly** rules that come from other sources (KZV, legal references)

---

## 3. Count/Scope Rules

### Extracted from HTML

| Code | Max Count | Scope |
|------|-----------|-------|
| BEL_0010 | 1 | Unterkieferprotrusionsschiene |
| BEL_0130 | 1 | Kiefer |
| BEL_1050 | 1 | Fall |
| BEL_8060 | 1 | Kiefer |
| BEMA_01 | 1 | Sitzung |
| BEMA_03 | 1 | Sitzung |
| BEMA_100 | 1 | Fall |
| + 9 more | ... | ... |

### Gap

These frequency rules are NOT modeled in `combinability_kb.v1.json`. They exist only as:

- `typ: "haeufigkeit"` rules (2-3 examples)
- NOT comprehensive

**Recommendation**: Extend combinability KB with frequency rules from truth set.

---

## 4. SourceRefs Quality

### Combinability KB

| Metric | Value |
|--------|-------|
| Rules with sourceRefs | 15/15 (100%) |
| Unique anchors | 15 |

### Gap

HTML truth set codes have `rawFiles` but no structured anchor IDs. Need to:

1. Generate stable anchor IDs from file paths
2. Map to `sources.v1.yaml` entries

---

## 5. Summary

| Area | Status | Action |
|------|--------|--------|
| Catalog Coverage | ✅ OK | No action |
| Exclusion Rules | ⚠️ Gap | Extract structured pairs |
| Frequency Rules | ⚠️ Gap | Model 16+ rules in KB |
| SourceRefs | ✅ OK | All rules have anchors |

---

## Next Steps

1. **Enhance `generateHtmlTruthSet.ts`** to extract structured exclusion pairs
2. **Add `typ: "haeufigkeit"` rules** to combinability KB for extracted maxCount rules
3. **Run gates** to ensure no drift
