# G114 — Medical Layer Expansion Plan

**Purpose:** Define which medical aspects to add — targeted, not blind

---

## Current Medical Coverage

### Füllung (Implemented)

| Aspect | Fact | Askback? | Chip |
|--------|------|----------|------|
| Caries depth | `cariesDepth` | ✅ if profunda | `cp` |
| Adhesive | `adhesiveMentioned` | ⚠️ MISSING | `mehrschicht` |
| Kofferdam | `kofferdamUsed` | ✅ optional | `kofferdam` |
| LA type | (derived from tooth) | ❌ No | `la_leitung`/`la_infiltr` |
| Material | `capping.material` | ✅ if capping | `cp` context |

### Endo (Partial)

| Aspect | Fact | Askback? | Chip |
|--------|------|----------|------|
| Pulpa status | `pulpaStatus` | ⚠️ MISSING | `trepanation` |
| Root count | `rootCount` | ⚠️ MISSING | billing mult. |
| VitE | `vitalitaet` | ⚠️ MISSING | `vipr_pos`/`neg` |

---

## Missing Medical Aspects

### Priority 1: Adhesive Technique Askback (Füllung)

**Gap:** When dictation says "adhäsiv", we don't ask if it was actually applied.

**Add:**
```json
{
    "id": "rule-adhesive-unclear-askback",
    "when": {
        "facts.adhesiveMentioned": true,
        "facts.adhesiveApplied": { "$exists": false }
    },
    "then": {
        "require_askback": "medical_adhesive"
    }
}
```

**Fact:** `adhesiveMentioned: boolean`, `adhesiveApplied: boolean | undefined`
**Askback:** "Wurde Adhäsivtechnik angewendet?" (Ja/Nein)
**Chip:** `mehrschicht` if yes, `komposit_basic` if no
**Source:** GOZ 2197, MKV-Abrechnung

---

### Priority 2: Pulpanähe Askback (Füllung)

**Gap:** Deep caries requires capping decision, but we only ask if profunda detected.

**Extend:**
- Trigger askback earlier (media + profunda)
- Ask about pulpa exposure risk

**Fact:** `pulpaNaehe: 'nah' | 'fern' | 'unknown'`
**Askback:** "Pulpanahe Kavität?"
**Chip:** Influences `cp` vs no capping

---

### Priority 3: Canal Count (Endo)

**Gap:** Billing depends on number of root canals.

**Add:**
```json
{
    "id": "rule-root-count-askback",
    "when": {
        "facts.treatmentId": "endo",
        "facts.rootCount": { "$exists": false }
    },
    "then": {
        "require_askback": "medical_root_count"
    }
}
```

**Fact:** `rootCount: 1 | 2 | 3 | 4`
**Askback:** "Anzahl Wurzelkanäle?"
**Chip:** Billing multiplier

---

### Priority 4: Sensitivity/Vitality (Both)

**Current:** Assumed positive unless stated.
**Better:** Ask when not explicit.

**Fact:** `vitalitaet: '+' | '-' | '?' | 'nicht geprüft'`
**Askback:** "Vitalitätsprüfung?"
**Chip:** `vipr_pos` or `vipr_neg`

---

## Expansion Roadmap

### Phase 1 (NOW): Adhesive Askback
- Add `medical_adhesive` to question_bank.json
- Add rule to medical_kb.v1.json
- Test with golden mode

### Phase 2: Pulpa/Capping Flow
- Refine profunda detection
- Add pulpaNaehe fact
- Chain: profunda → pulpaNaehe → capping decision

### Phase 3: Endo Basics
- Root count askback
- Pulpa status askback
- Proper WKB billing

### Phase 4: Settings Integration
- Default materials from practice settings
- DocMode configuration
- Auto-fill based on preferences

---

## Sources

| Aspect | Guidelines | Billing |
|--------|------------|---------|
| Adhesive | DGZMK Kompositrichtlinie | GOZ 2197 |
| Pulpanähe | DGZMK Überkappung | BEMA 25/P |
| Root count | DGZMK WKB | BEMA 32/GOZ 2330 |
| Vitalität | Standard of care | Documentation |

---

## Next Concrete Step

1. Add `medical_adhesive` askback to `question_bank.json`
2. Add rule `rule-adhesive-unclear-askback` to `medical_kb.v1.json`
3. Test with `testOnly.goldenMode = true`
