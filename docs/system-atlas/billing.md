# Billing

## Backbone Overview

The billing system consists of:

1. **Catalogs** (`core/billing/knowledgeBase/kataloge/`)
   - `bema.json` — 508+ BEMA codes with points, categories
   - `goz.json` — GOZ private billing codes
   - `goa.json` — GOÄ medical codes
   - `bel2_2022.json` — BEL II lab costs
   - `festzuschuesse.json` — FZ assignments

2. **Rules** (`core/billing/knowledgeBase/regeln/`)
   - `kombinationen.json` — Combinability rules (BLOCK/WARN)
   - `fuellung_regeln.json` — Füllung-specific rules
   - `splitting_regeln.json` — Splitting rules

> Note: V10 runtime combinability checks run against the compiled KB at
> `src/docudent/v10/kb/combinability/combinability_kb.v1.json`, which is derived from `kombinationen.json`.

3. **Treatment SSOT** (`treatments/*/unified.json`)
   - Chip definitions + billing mappings
   - BillingRefs point to catalog codes

## DO NOT DELETE (Top 20)

Source: [billing.risk_map.json](./artifacts/m82/billing.risk_map.json)

| File | Reason |
|------|--------|
| `kataloge/bema.json` | Primary BEMA catalog, 508+ codes |
| `kataloge/goz.json` | Primary GOZ catalog |
| `kataloge/bel2_2022.json` | BEL II Laborkosten |
| `kataloge/goa.json` | GOÄ medical billing |
| `kataloge/festzuschuesse.json` | FZ mappings |
| `regeln/kombinationen.json` | Combinability SSOT |
| `treatments/fuellung/unified.json` | Füllung SSOT |
| `treatments/endo/unified.json` | Endo SSOT |
| `logic/treatmentEngine.ts` | Core billing engine |
| `logic/billingEligibilityGuard.ts` | Billing guard |
| `logic/chipResolver.ts` | Chip resolution |
| `logic/outputComposer.ts` | Output composition |
| `logic/billingDatabase.ts` | DB lookup |
| `combinability/billingCombinabilityChecker.ts` | Combinability check |
| `knowledgeBase/index.ts` | Barrel export |
| `bema_knowledge_base.json` | Extended KB |
| `analog_services.json` | Analog services |
| `regeln/fuellung_regeln.json` | Füllung rules |
| `regeln/fz_zuordnung_gba.json` | FZ assignment |
| `logic/answerIdTranslator.ts` | Answer translation |

## Safe to Move/Delete

| Path | Count | Reason |
|------|-------|--------|
| `src/docudent/BEMA/*.html` | ~200 | HTML reference docs |
| `src/docudent/GOZ/*.html` | ~200 | HTML reference docs |
| `src/docudent/BEL/*.html` | ~100 | HTML reference docs |
| `src/docudent/Analogleistungen/*.html` | ~190 | HTML reference docs |

**Total HTML**: ~690 files, 66MB — not runtime, move to `/docs/reference/`

## Gates

| Gate | Purpose |
|------|---------|
| `gate-m82-billingref-closure.test.ts` | All refs exist in catalogs |
| `gate-m82-no-silent-billing-drop.test.ts` | Empty billing has diagnostic |
