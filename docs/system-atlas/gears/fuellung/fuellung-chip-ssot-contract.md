# Füllung Chip SSOT Contract (GP7)

> **Policy**: No medical chip logic in `runV10.ts`. All chip emission is KB-driven.

## SSOT Chain

```
Facts → KB Concepts → Chips → Billing/Text
  │          │         │         │
  │          │         │         └─ renderFromKbChips.ts
  │          │         └─ chip.billingRef / surface_mapping
  │          └─ medical_kb.v1.json (concept effects)
  └─ buildFactsFromExtraction.ts + applyAnswersToFacts.ts
```

## Chip Emission Concepts (KB-Driven)

| Fact | KB Concept/Case | Chip | billingRef (GKV) | billingRef (PKV) | Text Snippet |
|------|------------------|------|------------------|------------------|--------------|
| `capping.performed='yes' + pulpaOpened!=true` | `concept:indirect-capping:indirect_cp` | `cp` | BEMA_25 | GOZ_2330 | "indirekte Überkappung" |
| `capping.performed='yes' + pulpaOpened=true` | `concept:direct-capping:direct_p` | `p` | BEMA_26 | GOZ_2340 | "direkte Überkappung" |
| `capping.performed='no' + profunda/pulp_near` | `concept:indirect-capping:indirect_cp_not_required` | `cp_not_required` | — | — | "Cp nicht erforderlich" |
| `anesthesia='infiltr'` | `concept:local-anesthesia-infiltration:infiltr_fuellung` | `la_infiltr` | BEMA_40 | GOZ_0090 | "Infiltrationsanästhesie" |
| `anesthesia='leitung'` | `concept:local-anesthesia-leitung:leitung_fuellung` | `la_leitung` | BEMA_41a | GOZ_0100 | "Leitungsanästhesie" |
| `kofferdamUsed=true` | `concept:kofferdam:kofferdam_used` | `kofferdam` | BEMA_12 | — | "Kofferdam" |
| `mehrkostenConfirmed=true` | `concept:billing-context:mkv_mehrschicht_addon` | `mehrschicht` | — | GOZ_2197 | "Mehrschichttechnik" |

> **Note**: LA, Kofferdam, Cp/P are now **strictly KB concept-driven** (no runV10 augmentation).

## Wiring Details

### Answer → Fact → KB Concept Chain

```
UI Askback              Answer Key                     Fact Update                    KB Condition
─────────────────────────────────────────────────────────────────────────────────────────────────────
"Überkappung?"          medical_ueberkappung           capping.performed = 'yes'      facts.capping.performed == 'yes'
"Material?"             medical_ueberkappung_material  capping.material = 'Ca(OH)₂'   — (text variable)
(dictation)             —                              pulpaOpened = true             facts.pulpaOpened == true
```

### File Locations

| Component | File | Function |
|-----------|------|----------|
| Facts Building | `facts/buildFactsFromExtraction.ts` | `buildFuellungFacts()`, `detectPulpaOpened()` |
| Answer Merge | `facts/applyAnswersToFacts.ts` | `applyAnswersToFacts()` |
| KB Concepts | `medical_kb/medical_kb.v1.json` | `indirect-capping`, `direct-capping` |
| KB Engine | `medical_kb/engine/applyMedicalKb.ts` | `evaluateConcepts()` |
| Chip Render | `renderer/renderFromKbChips.ts` | `renderFromKbChips()` |

## Gate Tests

| Gate | File | Assertion |
|------|------|-----------|
| Gate 1: Facts→Chips | `gate-fuellung-capping-ssot.test.ts` | `cp`/`p` emitted based on `capping.performed` + `pulpaOpened` |
| Gate 1b: No Hardcode | `gate-fuellung-capping-ssot.test.ts` | No `augmentedChips.push('cp')` in runV10.ts |
| Gate 2: BillingOrigin | `gate-fuellung-capping-ssot.test.ts` | `billingCompleteness.origins` contains `chip.billingRef` |
| Gate 3: Text | `gate-fuellung-capping-ssot.test.ts` | `fullText` contains "Überkappung" |
| Gate 4: MKV | `gate-fuellung-capping-ssot.test.ts` | No GOZ addon when `nurKasse=true` |

## Debug Checklist

### "Cp im UI geklickt, aber kein Cp im Output"

1. **Check Askback Answer**
   ```bash
   # Look for medical_ueberkappung answer
   grep -i "medical_ueberkappung" # in test payload
   ```

2. **Check Facts After Answers**
   ```ts
   // In DEV logs: [PROBE B] Facts Mapping
   // Should show: capping: { performed: 'yes' }
   ```

3. **Check KB Concept Fires**
   ```ts
   // In DEV logs: result.meta.trace.firedConcepts
   // Should include: 'concept:indirect-capping:indirect_cp'
   ```

4. **Check Chips Emitted**
   ```ts
   // In result.output.perInstance[x].chips
   // Should include: 'cp' or 'p'
   ```

5. **Check Billing Resolution**
   ```ts
   // result.meta.billingCompleteness.origins
   // Should show: { code: 'BEMA_25', origin: 'chip.billingRef', ref: 'cp' }
   ```

### "P statt Cp emittiert"

Check `facts.pulpaOpened`:
- `true` → `p` chip (direkte Überkappung)
- `false/undefined` → `cp` chip (indirekte Überkappung)

Source: `buildFactsFromExtraction.ts` → `detectPulpaOpened()`

## Related Documentation

- [GP4 Billing Completeness Contract](gp4-billing-completeness-contract.md)
- [GP4 Debug Playbook](gp4-debug-playbook.md)
- [SSOT Entry Points](../ssot/ssot-entrypoints.md)
