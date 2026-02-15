# Gear: Medical Askbacks (SSOT)

**ID:** gear-askback-registry  
**Status:** Active  
**Updated:** 2026-01-29

---

## Purpose

Make askbacks fully traceable and deterministic:
- KB emits askback IDs (required/optional)
- UI renders questions from KB definitions
- Answer wiring updates facts, then KB re-evaluates → chips/text/billing

## SSOT Sources

- **Askback emission (when/why):** `src/docudent/medical_kb/medical_kb.v1.json` (`concepts[].effects`)
- **Askback definitions (wording/options):** `src/docudent/medical_kb/medical_kb.v1.json` (`askbacks[]`)
- **ID → questionKey normalization:** `src/docudent/v10/medical/medicalAskbackAdapter.ts`

## ID Format Contract

| Component | Format | Example |
|-----------|--------|---------|
| ID | `{pack}_{questionKey}` | `fuellung_material` |
| QuestionKey | suffix without pack prefix | `material` |
| Scoped ID | `{id}::tooth:{FDI}` | `fuellung_material::tooth:36` |

## Data Flow

```
KB Concept → emits askback ID (e.g., 'fuellung_material')
     ↓
applyMedicalKb → requiredAskbacks: ['fuellung_material']
     ↓
medicalAskbackAdapter.normalizeAskbackId('fuellung_material') → 'material'
     ↓
Lookup in medical_kb.askbacks[] by questionKey → question definition
     ↓
UI renders question
```

## Adding New Askback

1. Add an askback definition to `src/docudent/medical_kb/medical_kb.v1.json` (`askbacks[]`)
2. Add/extend a concept case in the same file to emit `require_askback` with `target = <askbackId>`
3. Ensure `askbackId` normalizes to the intended `questionKey` (see `normalizeAskbackId()` in `src/docudent/v10/medical/medicalAskbackAdapter.ts`)

## Failure Modes

| Failure | Detection | Fix |
|---------|-----------|-----|
| Askback renders as fallback text field | `medicalAskbackAdapter` could not find askback definition by questionKey | Fix `questionKey` mismatch or normalization |
| Askback never appears | Concept conditions never match (facts not `unknown`) | Fix Facts mapping / defaults / concept conditions |
| Wrong tooth context in multi-tooth | Missing scoping (`::tooth:XX`) | Ensure engine uses instanceScope and UI displays scoped IDs |
