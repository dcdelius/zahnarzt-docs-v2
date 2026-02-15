# Architecture

## Layer Map

```
┌─────────────────────────────────────────────────────────┐
│ UI Layer                                                │
│   DocudentV10Page, V10DebugDrawer, QuestionsFlowV2      │
├─────────────────────────────────────────────────────────┤
│ Hook Layer                                              │
│   useV10Pipeline (state + orchestration)                │
├─────────────────────────────────────────────────────────┤
│ Orchestrator                                            │
│   runV10.ts — single entry point                        │
├─────────────────────────────────────────────────────────┤
│ Extraction                                              │
│   selectExtractor → core extractionService / stub        │
├─────────────────────────────────────────────────────────┤
│ Facts                                                   │
│   buildFactsFromExtraction, applyAnswersToFacts          │
├─────────────────────────────────────────────────────────┤
│ Medical Engine                                          │
│   applyMedicalKb (medical_kb) + medicalAskbackAdapter   │
├─────────────────────────────────────────────────────────┤
│ Questions                                               │
│   QuestionServiceV2 (+ Endo adapter)                    │
├─────────────────────────────────────────────────────────┤
│ Chips/SSOT                                              │
│   treatments/*/unified.json, chipResolver               │
├─────────────────────────────────────────────────────────┤
│ Renderer                                                │
│   renderFromKbChips (perInstance text + billingRefs)    │
├─────────────────────────────────────────────────────────┤
│ Composer                                                │
│   outputComposerV10 → outputComposer (sections)          │
├─────────────────────────────────────────────────────────┤
│ Billing                                                 │
│   billingEligibilityGuard, treatmentEngine, catalogs    │
├─────────────────────────────────────────────────────────┤
│ Combinability                                           │
│   checkCombinabilityFromKb, combinability_kb.v1.json     │
└─────────────────────────────────────────────────────────┘
```

## Chip Cohesion Mantra (Anti-Fragmentation)

- One clinical action → one concept → one chip (SSOT).
- The same chip must drive text, billing, disclosures, and settings/askbacks.
- No parallel/duplicate entries for the same meaning (avoid drift and mismatched outputs).
- Material/system choices must resolve via the catalog and appear consistently in text + billing.

## What Must Never Happen

| Violation | Gate Test |
|-----------|-----------|
| V7 imports from core/billing | `gate-v7-ssot-boundaries.test.ts` |
| V6 imported at runtime | `gate-no-runtime-imports-from-v6.test.ts` |
| Hardcoded chip IDs | `gate-no-hardcoded-chip-ids.test.ts` |
| Empty billing without diagnostic | `gate-m82-no-silent-billing-drop.test.ts` |
| Text not from unified.json | `gate-v10-ssot-chip-closure.test.ts` |

## Legacy Boundaries

| Layer | Status |
|-------|--------|
| `v6/` | DEAD — no runtime imports allowed |
| `v7/` | LEGACY UI + support pages (still used for some routes/styles) |
| `v10/` | RUNTIME — pipeline + UI flow for V10 |
| `core/billing` | SHARED — catalogs, treatment KB, composer, validation |

**V7 Role (today)**: V10 no longer delegates orchestration to V7. V7 still exists for:
- legacy routes (`/docudent/v7`, `/docudent/v8`)
- re-used pages/styles under the V10 router (temporary)
