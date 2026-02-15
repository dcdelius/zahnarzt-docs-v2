# Medical Engine v1 — Documentation

## Overview

The Medical Engine (`applyMedicalKb`) is a KB-driven rule evaluation system that:
- Evaluates medical rules from `medical_kb.v1.json`
- Applies defaults to facts
- Determines required/optional askbacks
- Emits chip IDs

All medical decisions are **traceable** via `sourceRefs` linking to `sources.v1.yaml`.

## Usage

```typescript
import { applyMedicalKb } from '@/docudent/medical_kb/engine';

const result = applyMedicalKb({
    facts: {
        treatmentId: 'fuellung',
        cariesDepth: 'profunda',
        capping: { performed: 'unknown' },
        counseling: { pulpitisRisk: 'unknown' },
    },
    treatmentId: 'fuellung',
    instanceScope: { tooth: '16' }, // Optional: for multi-tooth cases
});

// result.facts — facts with defaults applied
// result.requiredAskbacks — scoped askback IDs (e.g., 'medical_ueberkappung::tooth:16')
// result.emittedChips — chip IDs (e.g., 'cp', 'cp_not_required')
// result.trace — debugging/auditing info
```

## Rule Evaluation Order

1. **Defaults Application** — Apply defaults from KB `defaults[]` to facts where values are `unknown`
2. **Rule Matching** — Evaluate all active rules sorted by `priority` (ascending: lower = higher priority)
3. **Action Collection** — Collect `require_askback` and `emit_chip` actions from fired rules
4. **Deduplication** — Remove duplicate askbacks/chips, sort by priority then ID for determinism
5. **Scoping** — If `instanceScope.tooth` provided, scope askback IDs with `::tooth:XX` suffix

## Scoping Helpers

```typescript
// Add tooth scope to askback ID
withToothScope('medical_ueberkappung', '16')
// → 'medical_ueberkappung::tooth:16'

// Remove tooth scope
stripToothScope('medical_ueberkappung::tooth:16')
// → 'medical_ueberkappung'

// Extract tooth from scoped ID
getToothFromScopedId('medical_ueberkappung::tooth:16')
// → '16'
```

## Rule Conditions

Supported operators:
- `eq` — exact match
- `neq` — not equal
- `in` — value in array
- `gt`, `lt` — numeric comparison
- `exists` — field exists and is not `null`/`undefined`/`'unknown'`

Field paths use dot notation: `facts.capping.performed`, `facts.cariesDepth`

## KB Structure

```
medical_kb.v1.json
├── concepts[]     — Medical concept definitions
├── rules[]        — Condition → Action rules
├── askbacks[]     — Askback definitions
├── chips[]        — Chip definitions  
└── defaults[]     — Default value rules
```

Every rule/askback/chip with `medical` tag **must** have `sourceRefs` linking to `sources.v1.yaml`.

## Current Rules (v1)

| Rule ID | Condition | Action |
|---------|-----------|--------|
| rule-profunda-requires-ueberkappung-askback | profunda + fuellung + capping unknown | require medical_ueberkappung |
| rule-ueberkappung-yes-emits-cp | capping = yes | emit cp |
| rule-ueberkappung-no-emits-cp-not-required | capping = no + profunda | emit cp_not_required |
| rule-profunda-default-pulpitis-risk-yes | profunda | set pulpitisRisk = yes |
| rule-ueberkappung-material-required | capping = yes + no material | require medical_ueberkappung_material |
| rule-bleeding-requires-hemostasis-askback | bleeding + fuellung | require medical_hemostasis |
| rule-sensitivity-reported-requires-followup-askback | sensitivity + fuellung | require medical_sensitivity_followup |

## Gate Tests

- `gate-m6-medical-engine-parity-deep-filling.test.ts` — Parity with legacy medical layer
- `gate-m6-medical-engine-source-refs-valid.test.ts` — Source reference validation
- `gate-m6-medical-engine-multiinstance-scoping.test.ts` — Multi-tooth scoping
- `gate-m6-medical-engine-determinism.test.ts` — Deterministic output ordering
