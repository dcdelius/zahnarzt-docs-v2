# Root Cause Diagnosis: 0 Chips from Medical KB

**Date**: 2025-12-31
**Status**: 🔴 CONFIRMED ROOT CAUSE

## Single Point of Failure

**"0 chips because Facts/KB field mismatch: KB rules check for fields that buildFuellungFacts never sets."**

## Evidence Chain

### 1. KB Rules Check These Fields

| Rule ID | Condition Field | Expected Value | Emits |
|---------|-----------------|----------------|-------|
| `rule-adhesive-yes-emits-filling-chips` | `facts.adhesiveTechnique` | `true` | `filling_adhesive`, `filling_layered` |
| `rule-adhesive-no-emits-basic-filling` | `facts.adhesiveTechnique` | `false` | `filling_basic` |
| `rule-kofferdam-yes-emits-chip` | `facts.kofferdamUsed` | `true` | `isolation_kofferdam` |
| `rule-kofferdam-no-emits-relative` | `facts.kofferdamUsed` | `false` | `isolation_relative` |
| `rule-ueberkappung-yes-emits-cp` | `facts.capping.performed` | `'yes'` | `cp` |
| `rule-material-unknown-askback` | `facts.materialMentioned` | `'unknown'` | (askback) |

### 2. buildFuellungFacts Sets These Fields

```typescript
{
    treatmentId: 'fuellung',
    cariesDepth: detectCariesDepth(extracted),
    capping: { performed: 'unknown' },
    counseling: { pulpitisRisk: 'unknown' },
    bleeding: { detected: detectBleeding() },
    sensitivity: { reported: detectSensitivity() }
}
```

**Missing**: `adhesiveTechnique`, `kofferdamUsed`, `kofferdamMentioned`, `materialMentioned`, `mkvPresent`

### 3. Why Rules Don't Fire

```
Dictation: "Füllung 36 okklusal Komposit adhäsiv"
↓
Extraction: { tooth: '36', surfaces: ['okklusal'], material: 'komposit' }
↓
buildFuellungFacts: {
    treatmentId: 'fuellung',
    cariesDepth: 'unknown',  // OK
    capping: { performed: 'unknown' },  // OK
    // BUT NO adhesiveTechnique, kofferdamUsed, materialMentioned!
}
↓
KB Rule Check: facts.adhesiveTechnique === true  → UNDEFINED ≠ true → SKIP
KB Rule Check: facts.adhesiveTechnique === false → UNDEFINED ≠ false → SKIP
KB Rule Check: facts.kofferdamUsed === true → UNDEFINED ≠ true → SKIP
↓
0 chips emitted
```

## 3 Minimal Repro Dictations

| Dictation | Expected Chips | Actual Chips | Gap |
|-----------|----------------|--------------|-----|
| "Füllung 36 okklusal Komposit adhäsiv" | `filling_adhesive`, `filling_layered` | 0 | `adhesiveTechnique` not in facts |
| "Füllung 14 distal GIZ" | `filling_basic` | 0 | `adhesiveTechnique` not in facts |
| "Füllung 36 mit Kofferdam" | `isolation_kofferdam` | 0 | `kofferdamUsed` not in facts |

## Top 3 Fixes (by Impact)

### 1. 🔴 Fix buildFuellungFacts to Extract Material/Adhesive/Kofferdam

**Module**: `v10/facts/buildFactsFromExtraction.ts`
**Action**: Add fields that KB rules need

```typescript
{
    // Existing
    treatmentId: 'fuellung',
    cariesDepth: detectCariesDepth(extracted),
    
    // NEW - from extraction
    materialMentioned: extracted.material ?? 'unknown',
    adhesiveTechnique: detectAdhesive(extracted),  // 'adhäsiv' in dictation → true
    kofferdamUsed: detectKofferdam(extracted),     // 'Kofferdam' in dictation → true
    kofferdamMentioned: detected('Kofferdam'),
    
    // Existing
    capping: { performed: 'unknown' },
}
```

### 2. 🟡 Add Baseline Rule in KB for Fuellung

**Module**: `medical_kb/medical_kb.v1.json`
**Action**: Add rule that always emits baseline chip when tooth+surface present

```json
{
    "id": "rule-fuellung-baseline",
    "when": [
        { "field": "facts.treatmentId", "op": "eq", "value": "fuellung" }
    ],
    "then": [
        { "type": "emit_chip", "target": "fuellung_grundleistung" }
    ],
    "priority": 1,
    "active": true
}
```

### 3. 🟡 Ensure Renderer Has Mappings for All Chips

**Module**: `v10/kb/treatment/fuellung/unified.json`
**Action**: Verify chips like `filling_adhesive`, `filling_basic`, `isolation_kofferdam` have text mappings

## Next Step

Proceed to **Prompt 2/6: Fix buildFuellungFacts** with the minimum viable facts.
