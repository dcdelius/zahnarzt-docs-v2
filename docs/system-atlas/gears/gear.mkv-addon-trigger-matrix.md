# MKV Addon Trigger Matrix — Single Source of Truth

**Version**: 1.0  
**Status**: Production  
**Purpose**: Define exactly when GOZ addon billing is triggered for MKV patients.

---

## Overview

MKV (Mehrkostenvereinbarung) = GKV base + GOZ addon when patient agrees to pay for enhanced services.

---

## Trigger Matrix

| Insurance | Dictation Signal | Trigger | Result |
|-----------|-----------------|---------|--------|
| GKV | - | - | BEMA only, never GOZ |
| PKV | - | - | GOZ only, never BEMA |
| MKV | "nur Kasse" | `detectNurKasse()=true` | BEMA only, NO addon |
| MKV | "120€" / amount | `detectMkvAmount()>0` | BEMA + GOZ addon ✅ |
| MKV | "Komposit" keyword | `detectMehrkostenMentioned()=true` | BEMA + GOZ addon (F‑Code) ✅ |
| MKV | "Adhäsiv" keyword | `detectMehrkostenMentioned()=true` + `adhesiveTechnique=true` | BEMA + GOZ addon + GOZ_2197 ✅ |
| MKV | "Mehrschicht" keyword | `detectMehrkostenMentioned()=true` + `layeringMentioned=yes` | BEMA + GOZ addon + GOZ_2197 ✅ |
| MKV | No signal | Ambiguous | Ask user |

---

## Detection Functions

### detectMehrkostenMentioned()

**Location**: [buildFactsFromExtraction.ts:177-202](file:///Users/david/dokumaster-ui/src/docudent/v10/facts/buildFactsFromExtraction.ts#L177-L202)

**Positive triggers**:
- Keywords: `mehrkosten`, `komposit`, `adhäsiv`, `adhesiv`, `mehrschicht`, `schichttechnik`
- Amount pattern: `\d+\s*(?:€|euro|eur)\b`
- extracted.costs > 0

### detectNurKasse()

**Location**: [buildFactsFromExtraction.ts:207-225](file:///Users/david/dokumaster-ui/src/docudent/v10/facts/buildFactsFromExtraction.ts#L207-L225)

**Positive triggers**:
- Keywords: `nur kasse`, `keine mehrkosten`, `kassenfüllung`, `kassenleistung`, `ohne mehrkosten`, `regelversorgung`

---

## Precedence Rules

1. **Highest**: `nurKasse === true` → suppress all GOZ addons
2. **High**: Dictation negation (e.g., "ohne Adhäsiv")
3. **Medium**: Explicit dictation (e.g., "120€", "Komposit")
4. **Low**: Manual override / askback answer
5. **Lowest**: Settings / defaults

```
if (nurKasse) → NO addon
else if (mehrkostenMentioned) → addon ON
else if (amountDetected) → addon ON
else if (askbackConfirmed) → addon ON
else → addon OFF (safe default)
```

---

## Addon Chips

| Chip ID | Description | billingRef.MKV |
|---------|-------------|----------------|
| `mehrschicht` | Mehrschichttechnik | `GOZ_2197` (nur bei Adhäsiv/Schichttechnik) |

## Dokumentationschip (Begründung)

| Chip ID | Description | Notes |
|---------|-------------|-------|
| `mkv_begruendung` | Mehrkosten-Begründung | Textbaustein aus Askback/Diktat |

**Location**: [unified.json:497-543](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json#L497-L543)

---

## KB Concept for Emission

**Concept Case**: `concept:billing-context:mkv_mehrschicht_addon`  
**Location**: [medical_kb.v1.json:139-175](file:///Users/david/dokumaster-ui/src/docudent/medical_kb/medical_kb.v1.json#L139-L175)

**When (Füllung)**:
```json
{
  "field": "facts.treatmentId", "op": "eq", "value": "fuellung"
},
{
  "field": "facts.mehrkostenConfirmed", "op": "eq", "value": true
}
,
{
  "field": "facts.layeringMentioned", "op": "eq", "value": "yes"
}
```

**Then**: emit chip `mehrschicht`

**Alternative case** (statt `layeringMentioned`):
```json
{
  "field": "facts.adhesiveTechnique", "op": "eq", "value": true
}
```

---

## Billing Channelization

### renderFromKbChips Logic

**Location**: [renderFromKbChips.ts:239-260](file:///Users/david/dokumaster-ui/src/docudent/v10/renderer/renderFromKbChips.ts#L239-L260)

| Insurance | Base | Addon |
|-----------|------|-------|
| GKV | `chip.billingRef.GKV` | - |
| PKV | `chip.billingRef.PKV` | - |
| MKV | `chip.billingRef.GKV` | `chip.billingRef.MKV` or `chip.billingRef.PKV` |

---

## Askback (When Ambiguous)

**Condition**: MKV selected AND `mehrkostenMentioned === false` AND `nurKasse === false`

**Askback ID**: `mkv_addon_confirmation`

**Question**: "Mehrkostenleistung durchgeführt?"

**Options**:
1. `komposit_adhesiv` → emit `mehrschicht` chip
2. `komposit_basic` → no addon chip
3. `nur_kasse` → set `nurKasse=true`, no addon

**Note**: Currently not implemented as askback — triggers automatically based on amount/keyword detection.

---

## Test Cases

| Scenario | Input | Expected Billing |
|----------|-------|------------------|
| GKV basic | "Zahn 27 mod" | BEMA_13c |
| GKV with LA | "Zahn 27 mod mit LA" | BEMA_13c, BEMA_40 |
| MKV + amount | "Zahn 27 mod 120€" | BEMA_13c + GOZ_2100 |
| MKV + komposit | "Zahn 27 mod Komposit" | BEMA_13c + GOZ_2100 |
| MKV + nur Kasse | "Zahn 27 mod nur Kasse" | BEMA_13c only |
| PKV basic | "Zahn 27 mod" | GOZ_2060 |

---

## Where to Change

| Change | Location |
|--------|----------|
| Add keyword | `detectMehrkostenMentioned()` in buildFactsFromExtraction.ts |
| Add suppression | `detectNurKasse()` in buildFactsFromExtraction.ts |
| Change addon chip | unified.json → `mehrschicht.billingRef.MKV` |
| Change KB concept | medical_kb.v1.json → `billing-context` (case `mkv_mehrschicht_addon`) |
| Change channelization | renderFromKbChips.ts |
