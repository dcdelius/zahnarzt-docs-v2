# V10 Treatment Expansion (20 Treatments) - Execution Board

Prepared: 2026-02-16  
Scope: Full production-grade onboarding of 20 treatments in V10, including settings, facts, obligations, chips, billing provenance, and case/test coverage.

## 1) Non-Negotiable Constraints

1. No treatment-specific billing logic in UI (`src/docudent/v10/**` UI components must remain renderer-only).
2. `copyText` remains derived from blocks only (SSOT invariant in `src/docudent/contracts/compose.ts`).
3. Every treatment must be deterministic under `runV10` and `runV10Bundle`.
4. Shared medical concerns (anesthesia, radiology, diagnostics, consent/MKV) must be implemented once and reused, never copy/pasted per treatment.
5. Billing code literals (`BEMA_*`, `GOZ_*`, `BEL_*`) are forbidden in runtime expansion logic; use BillingRef + billing DB/KB lookup only.
6. New treatment activation is blocked unless pack + KB + procedure graph + settings schema + tests all pass.

## 2) Current Audit Summary (Code Reality)

1. Registry drift exists:
   - Core KB registry supports 5 treatments (`fuellung`, `endo`, `extraction`, `pzr`, `crown_prep`).
   - V10 KZV registry supports only 2 (`fuellung`, `endo`).
   - Preanalysis allowlist/classifier support only 4.
2. Settings are still heavily treatment-hardcoded for `fuellung` and `endo`.
3. Shared behavior exists partially (`common` bundles for anesthesia/isolation/vitality/percussion), but there is no central obligations engine yet (GAP-33).
4. Truthcase and gate coverage is still mostly filling-centric in several places.
5. `treatmentMaster` already contains many IDs, but runtime wiring does not consume it as SSOT.

## 3) External Basis Used for Prioritization and Medical Grounding

### 3.1 Frequency Baseline (Germany, GKV)

Primary source:
- KZBV Jahrbuch 2025, table "Positionen mit den hoechsten relativen Haeufigkeiten im Bereich kons./chir. Behandlung 2024"
  - https://www.kzbv.de/service/statistisches-jahrbuch/jahrbuch-2025/
  - https://www.kzbv.de/wp-content/uploads/Seiten_101_bis_103_KZBVJB2025.pdf

Top position signals include (among others): `01`, `Ae1`, `40`, `107`, `8`, `12`, `04`, `13b`, `Ae925a`, `105`, `41a`, `106`, `13a`, `38`, `Ae935d`, `IP4`, `10`, `IP1`, `IP2`, `25`.

### 3.2 Regulatory and Billing Basis

- G-BA Behandlungsrichtlinie: https://www.g-ba.de/richtlinien/32/
- G-BA PAR-Richtlinie: https://www.g-ba.de/richtlinien/124/
- G-BA Individualprophylaxe-Richtlinie: https://www.g-ba.de/richtlinien/31/
- G-BA Festzuschuss-Richtlinie: https://www.g-ba.de/richtlinien/27/
- KZBV BEMA/GOZ Gebührenverzeichnisse entry point: https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/
- GOZ official text: https://www.gesetze-im-internet.de/goz_1987/
- SGB V Section 28: https://www.gesetze-im-internet.de/sgb_5/__28.html
- SGB V Section 55: https://www.gesetze-im-internet.de/sgb_5/__55.html

### 3.3 Clinical Guideline Basis (AWMF/DGZMK)

- Direct composite restorations: https://www.awmf.org/aktuelles-und-angebot/awmf-aktuell/direkte-kompositrestaurationen-an-bleibenden-zaehnen-im-front-und-seitenzahnbereich
- Fissure sealants: https://www.awmf.org/service/awmf-aktuell/fissuren-und-gruebchenversiegelung-1
- Dental trauma: https://www.awmf.org/service/awmf-aktuell/therapie-des-dentalen-traumas-bleibender-zaehne
- Root-end surgery (WSR): https://www.awmf.org/aktuelles-und-angebot/awmf-aktuell/wurzelspitzenresektion
- Caries prevention (permanent dentition): https://www.awmf.org/service/awmf-aktuell/kariespraevention-bei-bleibenden-zaehnen-grundlegende-empfehlungen-1
- Peri-implant infection therapy: https://www.awmf.org/service/awmf-aktuell/die-behandlung-periimplantaerer-infektionen-an-zahnimplantaten
- Implant timing: https://www.awmf.org/service/awmf-aktuell/implantationszeitpunkte

Inference note: KZBV top positions are billing-position data. For product implementation we map them to treatment packs plus shared capabilities.

## 4) Target 20-Treatment Portfolio (Implementation Scope)

Existing (already runtime wired):
1. `fuellung`
2. `endo`
3. `extraction`
4. `crown_prep`
5. `pzr`

New (15 to onboard):
6. `ueberkappung`
7. `fissurenversiegelung`
8. `parodontologie`
9. `upt`
10. `wsr`
11. `trauma`
12. `implant`
13. `krone`
14. `teilkrone`
15. `bruecke`
16. `teilprothese`
17. `totalprothese`
18. `schiene`
19. `untersuchung`
20. `roentgen`

## 5) Architecture Hardening Before Mass Onboarding

### 5.1 Single Manifest SSOT

Create `src/docudent/contracts/treatments.manifest.ts` as the only canonical active-treatment list.

Each entry must include:
- `id`
- `status` (`active | beta | planned`)
- `category`
- `packRequired` (bool)
- `kzvTemplateRequired` (bool)
- `obligationsProfileId`
- `sharedCapabilities` (array)

All of these must derive from manifest only:
- `src/docudent/core/billing/knowledgeBase/registry/treatmentRegistry.ts`
- `src/docudent/v10/kzv/registry/treatmentRegistry.ts`
- `src/docudent/v10/preanalysis/treatmentIntentContract.ts`
- `src/docudent/v10/multitreatment/classifyTreatment.ts`
- treatment selectors/options in V10 UI

### 5.2 Shared Capability Layer (Anti-Duplication)

Introduce capability modules to centralize cross-treatment logic:
- `capability.common.anesthesia`
- `capability.common.isolation`
- `capability.common.radiology`
- `capability.common.vipr_percussion_psi`
- `capability.common.consent_mkv`
- `capability.common.followup`

Implementation target:
- capability specs under `src/docudent/v10/procedure/registry/capabilities/`
- shared event bundles under `src/docudent/v10/procedure/events/common.ts`
- shared askback definitions in catalog (section 5.4)

Rule: treatment bundles may reference capabilities, but cannot redefine equivalent rules.

### 5.3 Central Obligations Engine (GAP-33)

Create obligations layer:
- `src/docudent/v10/procedure/obligations/types.ts`
- `src/docudent/v10/procedure/obligations/engine.ts`
- `src/docudent/v10/procedure/obligations/obligations.v1.json`

Obligation contract:
- `when` (facts + treatment + phase)
- `requiresEvidence`
- `askbackRef`
- `outcome` (`done | not_done | deferred_next_visit`)
- `sourceRef` (guideline/regulatory anchor)

Flow must become:
- facts -> obligations -> procedure bundles -> billing resolver

### 5.4 Askback and Terminology SSOT

Create:
- `src/docudent/v10/askbacks/catalog.v1.ts`
- `src/docudent/v10/medical/terminology.v1.json`

Move inline askback strings out of pack contracts where possible; packs reference keys.

### 5.5 Settings Model Hardening (for 20 treatments)

Extend `src/docudent/v10/settings/settingsTypes.ts` from hardcoded `endo/fuellung` to manifest-driven model:
- shared capability defaults (`medicalDefaults`, radiology defaults, prophylaxis defaults)
- treatment-specific overrides keyed by manifest IDs

Refactor mapping logic from huge switch blocks:
- split `settingsResolver` into composable mappers per capability + per treatment
- add gate to block duplicate settings mapping for same askback key

### 5.6 Cases and Chips Wiring Standard

For each treatment, require:
- deterministic chip provenance (`node:<bundleId>` or equivalent)
- chip-to-billing refs from SSOT KB only
- minimum scenario/case set in QA harness

## 6) Per-Treatment Onboarding Contract (Definition of Done)

Every treatment must provide all artifacts below before activation:

1. KB files under `src/docudent/core/billing/knowledgeBase/treatments/<treatmentId>/`:
   - `unified.json`
   - `answer_map.json`
   - `question_bank.json`
   - `template.json`
   - `finding_map.json`
2. Pack files under `src/docudent/v10/packs/<treatmentId>/`.
3. Procedure bundles under `src/docudent/v10/procedure/events/<treatmentId>.ts`.
4. Graph registration in `src/docudent/v10/procedure/registry/treatments/index.ts`.
5. Bundle metadata in `src/docudent/core/billing/knowledgeBase/event_bundles/<treatmentId>.json`.
6. Settings schema entry in pack `ui.contract.ts` with askback mappings to catalog keys.
7. Facts extraction/apply wiring via reusable mappers (no duplicate logic).
8. Preanalysis + classifier support derived from manifest.
9. KZV template/finding map wiring for treatment.
10. Pack clinical scenarios (minimum 6):
    - 2 standard output cases
    - 2 strict evidence askback cases
    - 2 combinability/risk cases
11. Gate coverage updates (section 9).
12. Hosted E2E slices (minimum 3 dictations: GKV, PKV, mixed/edge).
13. Atlas documentation updates (frequency + evidence matrix + known gaps state).
14. Release checklist pass (`proof-pack`, gates, deterministic hash checks).

## 7) Wave Plan (Sequenced, Hard Dependencies)

### Phase 0 (Week 1): Foundations

Deliver:
- treatment manifest SSOT
- registry de-dup wiring to manifest
- new gates for manifest and allowlist drift

Exit criteria:
- no hardcoded treatment lists outside manifest
- all existing 5 treatments pass unchanged behavior

### Phase 1 (Week 2): Shared Layer + Obligations

Deliver:
- obligations engine v1
- shared capability catalog v1
- askback catalog v1
- migrate `fuellung` and `endo` onto obligations layer (behavior parity)

Exit criteria:
- strict evidence logic for `fuellung`/`endo` resolved through obligations engine
- no regression in existing gates/truthcases

### Phase 2 (Weeks 3-4): Wave A (highest immediate value)

Onboard 5 treatments:
- `untersuchung`, `roentgen`, `ueberkappung`, `fissurenversiegelung`, `parodontologie`

Exit criteria:
- onboarding contract complete per treatment
- all pack coverage and gate checks green

### Phase 3 (Weeks 5-6): Wave B

Onboard 5 treatments:
- `upt`, `wsr`, `trauma`, `implant`, `schiene`

Exit criteria:
- obligations and shared capabilities reused (no duplicate anesthesia/radiology logic)
- hosted slice stable for each treatment

### Phase 4 (Weeks 7-9): Wave C

Onboard 5 treatments:
- `krone`, `teilkrone`, `bruecke`, `teilprothese`, `totalprothese`

Exit criteria:
- fixed/removable prosthetic chain integrated with consistent settings/chip behavior
- combinability and evidence gates green

## 8) 15-New-Treatment Work Matrix

| Treatment ID | Main frequency/clinical driver | Shared capabilities required | Extra focus |
|---|---|---|---|
| `untersuchung` | `01`, `Ae1` | consent_mkv, followup | exam/baseline documentation standardization |
| `roentgen` | `Ae925a`, `Ae935d` | radiology, consent_mkv | indication, timing, finding evidence |
| `ueberkappung` | `25` | anesthesia, isolation, vipr_percussion_psi | direct/indirect path + material variants |
| `fissurenversiegelung` | `IP5` context | prophylaxis, isolation | indication and retention/follow-up wording |
| `parodontologie` | `04` (PSI signal) | vipr_percussion_psi, radiology, followup | PAR baseline + staged treatment evidence |
| `upt` | PAR maintenance | followup, prophylaxis | interval and risk-profile documentation |
| `wsr` | endo-surgery overlap | anesthesia, radiology, woundcare | indication and postop evidence chain |
| `trauma` | acute emergency path | radiology, anesthesia, followup | trauma class + immediate actions |
| `implant` | implant care path | radiology, consent_mkv, followup | timing and informed-consent variants |
| `schiene` | function/TMJ path | radiology (optional), followup | indication and adjustment protocol |
| `krone` | prosthetic fixed path | anesthesia, consent_mkv | preparation-impression-provisional-finish chain |
| `teilkrone` | prosthetic fixed path | anesthesia, consent_mkv | material/indication variants |
| `bruecke` | prosthetic fixed path | anesthesia, consent_mkv | abutment and pontic documentation |
| `teilprothese` | removable prosthetics | consent_mkv, followup | insertion and pressure-point follow-up |
| `totalprothese` | removable prosthetics | consent_mkv, followup | jaw relation and adaptation documentation |

## 9) New Gates Required (Release Blockers)

1. `gate-treatment-manifest-single-source.test.ts`
   - fails if active treatment sets differ across registry/preanalysis/classifier/UI.
2. `gate-obligations-layer-no-duplication.test.ts`
   - fails on duplicate semantic rules between obligations and treatment bundles.
3. `gate-askback-catalog-single-source.test.ts`
   - fails on inline askback text for catalog-managed keys.
4. `gate-settings-askback-mapping-unique.test.ts`
   - fails if one askback key is mapped by multiple conflicting settings paths.
5. `gate-treatment-onboarding-min-artifacts.test.ts`
   - fails when any active treatment misses required files/assets.
6. `gate-treatment-min-case-coverage.test.ts`
   - fails if active treatment has fewer than required scenarios/E2E slices.

## 10) Operational Tracking Checklist

Track progress per treatment with this exact checklist:

- [ ] Manifest entry active
- [ ] KB 5-file set present
- [ ] Pack registered
- [ ] Procedure graph wired
- [ ] Bundle metadata present
- [ ] Settings schema + mappings complete
- [ ] Facts mappings complete
- [ ] Askbacks from catalog only
- [ ] Obligations mapped with source refs
- [ ] QA scenarios >= 6
- [ ] Hosted E2E >= 3
- [ ] Gates green
- [ ] Atlas docs updated

## 11) Immediate Next Actions (Start Here)

1. Implement manifest SSOT and replace all hardcoded treatment allowlists.
2. Implement obligations engine skeleton and migrate strict evidence for `fuellung` and `endo` first.
3. Extract shared askbacks from existing pack contracts into catalog v1.
4. Start Wave A with `untersuchung` and `roentgen` to stabilize diagnostics/radiology foundations before broader onboarding.
5. Enforce new gates before activating any of the 15 new treatments.

## 12) Iterative Delivery Protocol ("weiter"-Mode)

This rollout is executed one treatment at a time. No parallel activation of multiple new treatments.

Per-treatment cycle (mandatory):
1. Source refresh from official references (G-BA/KZBV/AWMF/GOZ/BEMA context), including treatment variants/material paths.
2. KB + pack + procedure + settings + facts implementation for one treatment only.
3. Gate/unit execution for changed areas.
4. Real-life frontend E2E run (dictation -> questions -> output) with medical plausibility + billing plausibility review.
5. Immediate fixes for detected mismatches (medical logic, billing mapping, output wording/fit to dictation).
6. Segment closeout report (what changed, what passed, what remains).
7. Wait for explicit user confirmation keyword: `weiter`.

Hard stop rules:
- No next treatment starts before current treatment closeout is green.
- No hardcoded billing code literals in runtime expansion paths.
- No unresolved medical-source ambiguity for activated obligations.

## 13) Architecture Deep-Dive Baseline (Must Match Existing V10 Pattern)

This section locks the implementation shape to the current architecture used by `fuellung` and `endo`.

### 13.1 Existing Canonical Wiring Pattern

Per treatment, runtime integration currently relies on:
1. Pack registry entry in `src/docudent/v10/packs/registry.ts`.
2. Pack contract implementation (`getTreatmentKb`, scenarios, combinability goldens, UI contract).
3. Procedure graph + event bundles registration.
4. Bundle metadata in `core/billing/knowledgeBase/event_bundles/*.json`.
5. Billing refs resolved via billing DB and surface mapping (`resolveBillingRefsFromBundleMeta` + `billing_db.v1.json`).
6. Settings-to-askback mapping through pack UI contract and `settingsResolver`.
7. Final orchestration through `runV10`/`runV10Bundle` with per-instance trace and provenance.

Rule: New treatments must reuse this shape; no alternative side pipelines.

### 13.2 Required Reuse Rules (No Parallel Universe)

1. Facts:
   - Reuse global facts builders by default.
   - Introduce treatment-specific facts adapters only when truly needed and documented.
2. Chips:
   - Emit through procedure nodes + bundle metadata.
   - No direct UI-side or ad-hoc runtime chip emission paths.
3. Billing:
   - Resolve from BillingRef + billing DB/KB only.
   - No literal billing code arrays in expansion runtime logic.
4. Settings:
   - Wire through pack `settingsSchema` and shared resolver paths.
   - Avoid bespoke per-treatment settings resolvers outside the shared model.
5. Cases:
   - Case lifecycle/services must accept expanded treatment set (no residual union locks to `fuellung|endo`).
   - Case outputs/provenance remain deterministic and per-instance compatible.

### 13.3 Pre-Implementation Drift Fixes (Before First New Treatment)

These drifts must be resolved before onboarding treatment #6:
1. Unify treatment registry/allowlists under manifest (core KB, V10 KZV, preanalysis, classifier, selector).
2. Remove residual billing literal dependencies in expansion runtime paths (keep gate enforced).
3. Update case-layer treatment typing where still constrained (`core/case/caseService.ts` currently uses `TreatmentId = 'fuellung' | 'endo'`).
4. Consolidate askback/settings mapping toward shared catalog to avoid per-pack text/key drift.

## 14) Praxis-Realism Hardening (Anti-Loop)

This section defines when a segment is considered true progress versus local churn.

Segment is only "done" if all of the following are true:
1. One realistic dictation for the treatment runs end-to-end in frontend (dictation -> intent/askback -> output) with screenshot artifact.
2. At least one confusable dictation variant is covered by automated test (preanalysis or pipeline) to prevent phantom or duplicate intents.
3. Billing in UI output matches billing DB mapping for chosen insurance channel (no hardcoded literals).
4. No open required askbacks remain when the dictation already contains all critical evidences.
5. A regression test is added for every bug discovered during live E2E.

Anti-loop KPI (review every 3 treatments):
1. `false_positive_intent_rate`: number of wrong extra intents in realistic E2E / number of realistic E2E runs.
2. `askback_overask_rate`: required askbacks shown despite explicit evidence in dictation.
3. `billing_mismatch_rate`: output billing mismatch versus billing DB expectation.
4. `real_e2e_green_streak`: consecutive treatments with green live E2E + green targeted tests.

Escalation rule:
- If any KPI worsens across two consecutive treatment segments, pause new treatment onboarding and fix classifier/preanalysis/facts architecture first.
