# Facts/Extraction Sufficiency Audit

**Date**: 2025-12-31
**Status**: 🟡 "Fast MVP, aber X blockiert"

## 1. Current Facts Schema (buildFuellungFacts)

```typescript
{
    treatmentId: 'fuellung',
    cariesDepth: detectCariesDepth(extracted),      // profunda|pulp_near|normal|unknown
    capping: { performed: 'unknown' },              // direkt|indirekt|unknown
    counseling: { pulpitisRisk: 'unknown' },        
    bleeding: { detected: detectBleeding() },      // yes|no|unknown
    sensitivity: { reported: detectSensitivity() } // yes|no|unknown
}
```

## 2. MVP Facts Requirements (Fuellung Germany)

| Fact | Source | Current Status | Used By |
|------|--------|----------------|---------|
| treatmentId | hardcoded | ✅ Present | All |
| cariesDepth | extracted | ✅ Present | fuellung.capping |
| capping | askback L1 | ✅ Present | fuellung.capping |
| **material** | extracted/askback | ❌ **MISSING** | fuellung.adhesive, fuellung.layering |
| **isolation** | extracted/askback | ❌ **MISSING** | common.isolation |
| **adhesive** | extracted/askback | ❌ **MISSING** | fuellung.adhesive |
| **layering** | extracted/askback | ❌ **MISSING** | fuellung.layering |
| surfaces | extracted | ❌ **MISSING** | Text rendering |
| insuranceType | input | ⚠️ In input, not facts | fuellung.layering |

## 3. Critical Gap Analysis

### Missing Facts → Missing Askback Triggers

The askback rules check:
```typescript
facts.material === 'unknown'  // fuellung.adhesive, fuellung.material
facts.isolation === 'unknown' // common.isolation
```

But `buildFuellungFacts` **never sets** `material` or `isolation` facts!

This means:
1. Askback `when()` conditions can't evaluate properly
2. Questions may fire when they shouldn't (or vice versa)

---

## 4. 10-Dictation Fact Sufficiency Test

| ID | Dictation | Expected Facts | Actual Facts | Gap |
|----|-----------|----------------|--------------|-----|
| 01 | Füllung 36 okklusal | material=unknown | ❌ material not in facts | **material missing** |
| 02 | Komposit adhäsiv | material=komposit, adhesive=ja | ❌ not extracted to facts | **material, adhesive missing** |
| 03 | GIZ | material=giz | ❌ not in facts | **material missing** |
| 04 | mit Kofferdam | isolation=kofferdam | ❌ not in facts | **isolation missing** |
| 05 | ohne Kofferdam | isolation=relativ | ❌ not in facts | **isolation missing** |
| 06 | profunda | cariesDepth=profunda | ✅ Works | - |
| 07 | Unterfüllung Ca(OH)2 | capping=indirekt | ⚠️ Not detected | capping detection |
| 08 | 36 37 okklusal | per-tooth facts | ⚠️ Scoped but incomplete | - |
| 09 | Mehrkosten | insuranceType=MKV? | ❌ Not in facts | **insurance context** |
| 10 | PKV | insuranceType=PKV | ⚠️ In input, not facts | Should be in facts |

---

## 5. RFC: Missing Facts

### RFC 1: Add `material` fact

```typescript
{
    name: 'material',
    type: 'komposit' | 'giz' | 'amalgam' | 'unknown',
    source: 'extraction (from dictation) → askback if unknown',
    askbacksImpacted: ['fuellung.adhesive', 'fuellung.material'],
    chipsImpacted: ['material_komposit', 'material_giz', 'material_amalgam']
}
```

### RFC 2: Add `isolation` fact

```typescript
{
    name: 'isolation',
    type: 'kofferdam' | 'relativ' | 'keine' | 'unknown',
    source: 'extraction → askback if unknown',
    askbacksImpacted: ['common.isolation'],
    chipsImpacted: ['isolation_kofferdam', 'isolation_relativ']
}
```

### RFC 3: Add `adhesive` fact

```typescript
{
    name: 'adhesive',
    type: 'ja' | 'nein' | 'unknown',
    source: 'extraction (from "adhäsiv") → askback if unknown',
    askbacksImpacted: ['fuellung.adhesive'],
    chipsImpacted: ['adhesive_technique']
}
```

---

## 6. Root Cause Chain

```
Dictation ("Komposit adhäsiv")
    ↓
Extraction (extracts "material: komposit")
    ↓
buildFuellungFacts() ← DOES NOT MAP material/adhesive/isolation
    ↓
Facts: { cariesDepth: 'unknown', capping: 'unknown', ... }  ← NO material
    ↓
Askback when() checks: facts.material === 'unknown' ← UNDEFINED, not 'unknown'
    ↓
Askbacks don't fire as expected
```

---

## 7. Next Steps

1. 🔴 **Extend buildFuellungFacts** to include material, isolation, adhesive
2. 🔴 **Update extraction** to detect "Komposit", "GIZ", "Kofferdam", "adhäsiv"
3. 🟡 **Add surfaces** to facts for text rendering
4. 🟡 **Verify insuranceType** flows from input to facts
