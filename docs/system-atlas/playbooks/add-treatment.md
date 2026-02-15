# How to Add a New Treatment

8-step playbook for adding a new treatment to V10.

## Step 1: Treatment Pack Skeleton

Create treatment folder:
```
src/docudent/core/billing/knowledgeBase/treatments/{treatment}/
├── unified.json       # Chips + surface_mapping
└── concepts.json      # Optional: treatment-specific concepts
```

## Step 2: Facts Contract + Extraction

Define facts in `TreatmentFacts` type:
```typescript
interface {Treatment}Facts {
  surfaces: ('m'|'o'|'d'|'b'|'l')[];
  cariesDepth: 'normal' | 'profunda' | 'unknown';
  anesthesia: 'infiltr' | 'leitung' | 'unknown';
  // ... treatment-specific
}
```

Map extraction → facts in `build{Treatment}Facts()`.

## Step 3: KB Concepts (medical_kb)

Add concepts to `src/docudent/medical_kb/medical_kb.v1.json`:
```json
{
  "id": "{treatment}-baseline",
  "name": "{treatment} baseline",
  "description": "Minimal concept that emits the baseline chip for this pack",
  "cases": [
    {
      "id": "baseline",
      "when": [
        { "field": "facts.treatmentId", "op": "eq", "value": "{treatment}" }
      ],
      "effects": {
        "emitChips": ["{treatment}_grundleistung"]
      },
      "priority": 100
    }
  ],
  "sourceRefs": [{ "document": "TODO", "paragraph": "TODO" }]
}
```

## Step 4: Chips in unified.json

Define chips with correct `billingRef` policy:

| Policy | billingRef | Use Case |
|--------|------------|----------|
| BASE | `{ GKV, PKV }` | LA, Kofferdam |
| ADDON | `{ MKV }` | Mehrschicht |
| PKV_UPSELL | `{ PKV }` only | Oberflächenanästhesie |
| SURFACE_MAPPED | `null` | F-codes (from surface count) |

```json
{
  "id": "la_infiltr",
  "billingRef": { "GKV": "BEMA_40", "PKV": "GOZ_0090" }
}
```

## Step 5: Surface Mapping Coverage

Add `surface_mapping` for surface-dependent codes:
```json
"surface_mapping": {
  "1":  { "GKV": "BEMA_13", "PKV": "GOZ_2060", "MKV": "BEMA_13" },
  "2":  { "GKV": "BEMA_13b", "PKV": "GOZ_2080", "MKV": "BEMA_13b" },
  "3":  { "GKV": "BEMA_13c", "PKV": "GOZ_2100", "MKV": "BEMA_13c" },
  "4+": { "GKV": "BEMA_13d", "PKV": "GOZ_2120", "MKV": "BEMA_13d" }
}
```

## Step 6: Combinability Rules

Add exclusion rules to `src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json` (human source):
```json
{
  "id": "regel_{treatment}_exclusion",
  "betrifft": ["GOZ_XXXX", "GOZ_YYYY"],
  "typ": "ausschluss",
  "titel": "…",
  "beschreibung": "…",
  "regel": { "operator": "darf_nicht", "bedingung": "…" },
  "schweregrad": "regress",
  "autoResolve": "drop_anchor"
}
```

Then regenerate the V10 runtime combinability KB:
- Compiler: `src/docudent/v10/kb/combinability/compiler.ts`
- Runtime KB output: `src/docudent/v10/kb/combinability/combinability_kb.v1.json`

## Step 7: Truthcases (min 20)

Create truthcases in `qa/{treatment}Truthcases.ts`:
- 10 GKV cases
- 5 PKV cases
- 5 MKV cases

Cover: surfaces (1-4+), LA types, Kofferdam, Cp/P, edge cases.

## Step 8: Gate Tests (must pass)

Create gates:
```
src/docudent/v10/__tests__/gates/gate-{treatment}-billing-complete.test.ts
src/docudent/v10/__tests__/gates/gate-{treatment}-no-user-facing-block.test.ts
src/docudent/v10/__tests__/gates/gate-kb-coverage-{treatment}.test.ts
```

Required assertions:
- `state === 'output'`
- `meta.billingCompleteness.isComplete === true`
- No BLOCK verdict from combinability
- All chips have valid billingRef branches

## Verification

```bash
npx vitest run src/docudent/v10/__tests__/gates/gate-{treatment}
npx vitest run src/docudent/v10/__tests__
```

All gates must pass before merge.
