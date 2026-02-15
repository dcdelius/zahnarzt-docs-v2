# V10 System Atlas

**Single source of truth for Docudent V10 architecture, contracts, and verification.**

---

## What is V10?

- **End-to-end dental dictation → billing pipeline** for German BEMA/GOZ billing
- **SSOT architecture**: chips, askbacks, and billing derive from knowledge bases
- **Channelization via BillingIntent**: `allowBema` / `allowGoz` / `allowGozAddon` control catalog lookups
- **Multi-instance support**: `perInstance` is SSOT, global `billingCodes` derived via `flatMap` (no dedup)
- **Extensible**: new treatments via "pack" structure (fuellung, endo, ...)

---

## Pipeline Diagram

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────┐
│  Dictation  │───▶│  Extraction │───▶│    Facts     │───▶│ Procedure   │
└─────────────┘    └─────────────┘    └──────────────┘    └────────────┘
                                                                 │
                                          chipIds[] + requiredAskbacks[]
                                                                 │
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────▼──────┐
│   Output    │◀───│Combinability│◀───│   Billing    │◀───│  Renderer  │
│  (UI/API)   │    │ PASS/WARN/? │    │ (BillingDB)  │    │ (Chips→Text)│
└─────────────┘    └─────────────┘    └──────────────┘    └────────────┘
                          ▲
                          │
                    Askbacks (if needed)
            (Procedure + Medical KB requirements)
```

---

## SSOT vs Derived (Canonical Reference)

> This is the single source of truth for data lineage. Other docs should reference this table.

| Data | SSOT Source | Derived From | Notes |
|------|-------------|--------------|-------|
| Askbacks (IDs + definitions) | `medical_kb.v1.v10.json` (`askbacks[]` + rule effects) | — | KB is the registry; tooth scoping adds `::tooth:XX` |
| Chips (chip IDs) | Procedure graph + event bundle meta (`event_bundles/*.json`) | Facts + ContractContext | Only Procedure nodes emit chips (except `manualOverride`) |
| Questions (UI) | `medicalAskbackAdapter.ts` + `questionServiceV2.ts` | Askbacks + Extraction | Medical askbacks are merged with non-medical questions |
| Text snippets | `unified.json` chip definitions | Chips | Renderer looks up text |
| BillingRefs | Bundle meta `billingRefIds` + `surfaceBillingResolver.ts` | Chips + BillingIntent | Resolved via BillingDB (no hardcoded codes) |
| perInstance | Pipeline output | — | SSOT for per-tooth billing |
| billingCodes | `flatMap(perInstance.billingRefs)` | perInstance | NO DEDUP - multiplicity preserved |
| Combinability | `combinability_kb.v1.json` | billingRefs | BLOCK → askback (override) by default |
| BillingIntent | `computeBillingIntent()` | insuranceType + mehrkostenActive | Controls catalog lookups |

---

## Where to Start Reading Code

| File | Path (from repo root) | Purpose |
|------|----------------------|---------|
| runV10.ts | `src/docudent/v10/pipeline/runV10.ts` | Main pipeline orchestrator |
| types.ts | `src/docudent/v10/types.ts` | Core types + BillingIntent |
| Procedure match | `src/docudent/v10/procedure/resolver/matchProcedureGraph.ts` | Facts → matched nodes + required askbacks |
| Bundle meta | `src/docudent/v10/procedure/bundleMeta/index.ts` | Event bundle meta registry (chips/billing/disclosures) |
| medicalAskbackAdapter.ts | `src/docudent/v10/medical/medicalAskbackAdapter.ts` | requiredAskbacks[] → DynamicQuestion[] |
| questionServiceV2.ts | `src/docudent/core/questions/questionServiceV2.ts` | Non-medical questions bundle |
| renderFromKbChips.ts | `src/docudent/v10/renderer/renderFromKbChips.ts` | Chips → text + billing |
| surfaceBillingResolver.ts | `src/docudent/v10/billing/surfaceBillingResolver.ts` | Surface count → F-code via BillingIntent |
| scoping.ts | `src/docudent/v10/multitreatment/scoping.ts` | Multi-instance detection |
| useV10Pipeline.ts | `src/docudent/v10/hooks/useV10Pipeline.ts` | UI hook for pipeline |
| unified.json | `src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json` | Fuellung chip definitions |
| medical_kb.v1.v10.json | `src/docudent/medical_kb/medical_kb.v1.v10.json` | V10 askbacks + medical validations (no chip emission) |

---

## How to Verify

| Suite | Command | Expected | Report Location |
|-------|---------|----------|-----------------|
| Final Audit | `npm run v10:final-audit` | ✅ All green | `docs/system-atlas/artifacts/_latest/*` |
| Build | `npm run build` | ✅ No errors | — |
| Practice Check | `npm run v10:practice-check` | 8/8 ✅ | — |
| Medical E2E | `npx vitest run gate-v10-medical-e2e-v2` | 10/10 ✅ | — |
| Multi-Treatment (Headless) | `npx vitest run src/docudent/v10/__tests__/multitreatment/multitreatment.scenario-suite.test.ts` | 2/2 ✅ | — |
| Gate Suite | `npx vitest run gate-` | 2796+ tests | — |
| E2E Wiring | `npm run e2e:v10:wiring` | 10/10 ✅ | — |
| Praxis-16 | `npm run e2e:v10:praxis16` | 16/16 ✅ | `artifacts/_latest/v10-praxis-16/report.md` |
| Endo-16 | `npm run e2e:v10:endo16` | Run to generate report | `artifacts/_latest/v10-endo-16/summary.md` |
| Endo Headless | `npm run v10:scenario-run:endo` | Run to generate report | `artifacts/_latest/v10-scenario-run-endo/summary.md` |

---

## Where to Change What

> Quick reference for extending the system safely.

| If You Want To... | Change These Files | Verify With |
|-------------------|-------------------|-------------|
| **Add new clinical action** | `treatments/{pack}/unified.json` (chip) + `core/billing/knowledgeBase/event_bundles/{pack}.json` (bundle meta) + `src/docudent/v10/procedure/events/{pack}.ts` (matching) | `gate-v10-procedure-coverage-audit` |
| **Add new askback** | `medical_kb.v1.v10.json` (askbacks[] + rule effects) | `gate-askback-sufficiency` |
| **Add insurance/channelization rule** | `types.ts` (`computeBillingIntent`) | `gate-insurance-channelization` |
| **Add new treatment pack** | `treatments/{pack}/unified.json` + `event_bundles/{pack}.json` + procedure graph wiring + `medical_kb.v1.v10.json` askbacks | Create `{pack}-16` E2E suite |
| **Add combinability rule** | `combinability_kb.v1.json` | `gate-combinability` |
| **Add E2E scenario** | `e2e/scenarios/praxis16.scenarios.ts` | `npm run e2e:v10:praxis16` |

---

## Extension Guides

### Add a New Chip

1. `treatments/{pack}/unified.json` — add chip definition: `id`, `text`, `billingRefs`
2. `core/billing/knowledgeBase/event_bundles/{pack}.json` — add/extend bundle meta to reference:
   - `chipIds` / `textRefIds`
   - `billingRefIds`
   - `disclosureIds` (if needed)
3. `src/docudent/v10/procedure/events/{pack}.ts` — ensure a Procedure bundle matches Facts and emits the chip ID

**Checklist:**
- [ ] Chip ID is unique
- [ ] Text snippet exists
- [ ] BillingRefs are DB keys (not hardcoded codes like `BEMA_13`)
- [ ] `npm test -- --run src/docudent/__tests__/gates/gate-v10-procedure-coverage-audit.test.ts` passes

---

### Add a New Askback

1. `medical_kb.v1.v10.json` — add askback definition in `askbacks[]` (`id`, `questionKey`, `options`, `required`)
2. `medical_kb.v1.v10.json` — add/extend a rule that emits `require_askback` with `target = <askbackId>`
3. Ensure the askbackId normalizes to the right `questionKey` in `src/docudent/v10/medical/medicalAskbackAdapter.ts` (or extend aliasMap)

**Checklist:**
- [ ] ID format: `{pack}_{questionKey}`
- [ ] No fallback question is rendered (means KB askback definition was found)
- [ ] `npx vitest run gate-askback-sufficiency` passes

---

### Add a Combinability Rule

1. `combinability_kb.v1.json` — add rule with `id`, `betrifft`, `blockWith`, `schweregrad`

**Checklist:**
- [ ] BillingRef IDs match catalog keys
- [ ] `schweregrad`: "warnung" (WARN) or "regress" (BLOCK)
- [ ] `npx vitest run gate-combinability` passes

---

### Add a New Treatment Pack

1. `treatments/{packName}/unified.json` — chip definitions with `surface_mapping`
2. `core/billing/knowledgeBase/event_bundles/{packName}.json` — bundle meta (chips/billing/disclosures)
3. `src/docudent/v10/procedure/events/{packName}.ts` + `src/docudent/v10/procedure/registry/treatments/index.ts` — procedure matching/graph wiring
4. `medical_kb.v1.v10.json` — add/extend askbacks for the pack (if needed)
5. Create E2E suite before praxis testing

**Checklist:**
- [ ] `surface_mapping` exists if treatment uses variable surfaces
- [ ] All chips have text snippets
- [ ] All emitted askback IDs have matching entries in `medical_kb.v1.v10.json` (`askbacks[]`)
- [ ] `{pack}-16` E2E suite created and passing

---

## Related Docs

| Document | Purpose |
|----------|---------|
| [reality.snapshot.v10.md](./reality.snapshot.v10.md) | Current pipeline status |
| [product.plan.md](./product.plan.md) | Product UX plan: Dictation -> Chip Control Center -> Final output (SSOT) |
| [atlas.map.md](./atlas.map.md) | Component responsibility matrix |
| [known-gaps.md](./known-gaps.md) | Non-blocking risks |
| [gear.askback-registry.md](./gear.askback-registry.md) | Askback SSOT details |
| [gear.billing-multiplicity.md](./gear.billing-multiplicity.md) | Multiplicity preservation |
| [no-hardcoded-billing.md](./no-hardcoded-billing.md) | P0 contract enforcement |
| [coverage.index.v10.md](./coverage.index.v10.md) | Chip/Askback coverage |
| [ssot/ssot-entrypoints.md](./ssot/ssot-entrypoints.md) | SSOT architecture (GP5) |
| [playbooks/add-treatment.md](./playbooks/add-treatment.md) | Add new treatment (GP5) |
| [playbooks/debug-billing.md](./playbooks/debug-billing.md) | Debug billing (GP5) |
| [howto/v10-scenario-suites.md](./howto/v10-scenario-suites.md) | Headless scenario suites (single + multi-treatment) |

---

## Gate Index

| Gate File | Purpose |
|-----------|---------|
| `gate-fuellung-billing-complete.test.ts` | 40 truthcases verify `billingCompleteness.isComplete` |
| `gate-fuellung-no-user-facing-block.test.ts` | No BLOCK verdict from combinability |
| `gate-kb-coverage-fuellung.test.ts` | All chips have valid billingRef branches |
| `gate-fuellung-no-silent-defaults.test.ts` | No silent defaults in output |
| `gate-combinability-auto-resolve.test.ts` | AutoResolve drops codes instead of BLOCK |
| `gate-combinability-final-billing.test.ts` | Dropped codes not in final output |
| `gate-goz-addon-requires-confirmation.test.ts` | GOZ addons need MKV confirmation |
| `gate-truthcases-top15.test.ts` | Top 15 Fuellung scenarios |
| `gate-determinism.test.ts` | Same input → same output |

---

## Quick Commands

```bash
# Run all V10 gates
npm test -- --run src/docudent/v10/__tests__/gates

# Run Fuellung gates only
npm test -- --run src/docudent/v10/__tests__/gates/gate-fuellung

# Run full V10 test suite
npm test -- --run src/docudent/v10/__tests__

# Build check
npm run build
```

---

*Updated: 2026-01-29*
