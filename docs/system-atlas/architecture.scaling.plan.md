# Architecture Scaling Plan: Packs + Multi-Treatment

**Captured:** 2026-01-29  
**Status:** Draft (architecture review + concrete refactor plan)

## Status Tracker (Keep Current)

- [x] P1a: Provider loads unified.json via registry loader (no hardcoded list)
- [x] P1b: Renderer uses provider or injected KB (no internal loader)
- [x] P2: Pack-driven facts mapping (pack hooks + runtime delegation)
- [ ] P3: One settings/controls layer with provenance (defaults -> facts/chips)
  - [x] P3a: Apply pack-mapped settings to facts (runV10)
  - [x] P3b: Connect chip overrides/controls to pipeline rerun (param mapping via pack contract)
  - [x] P3d: SettingsResolver returns ResolvedSettings + deep-merge into facts (no legacy overrides)
  - [x] P3e: Settings‑material defaults verified end‑to‑end (material labels appear in output)
- [x] P3c: Persist provenance (dictation vs settings vs override) in trace
- [ ] P4: Pack completeness gates (KB + UI contract + scenarios + combinability)
- [ ] P5: File structure hygiene + KB segmentation for easier per-pack onboarding
- [ ] M1: Segment classification by treatmentId
- [ ] M2: Multi-pack per-instance isolation + answer scoping
- [ ] M3: Session-level merge + combinability + deterministic output order

## Current Runtime (What Actually Runs)

V10 UI + pipeline entrypoints:
- UI page: `src/docudent/v10/pages/DocudentV10Page.tsx`
- Hook/orchestration: `src/docudent/v10/hooks/useV10Pipeline.ts`
- Orchestrator (single entry): `src/docudent/v10/pipeline/runV10.ts`

Core pipeline (single-instance, simplified):
1. Extraction: `src/docudent/v10/extraction/selectExtractor.ts`
2. Facts: `src/docudent/v10/facts/buildFactsFromExtraction.ts` + `src/docudent/v10/facts/applyAnswersToFacts.ts`
3. Medical KB: `src/docudent/medical_kb/engine/applyMedicalKb.ts` (concepts+askbacks+defaults in `src/docudent/medical_kb/medical_kb.v1.json`)
4. Questions: medical askbacks -> `src/docudent/v10/medical/medicalAskbackAdapter.ts`, merged with `src/docudent/core/questions/questionServiceV2.ts`
5. Renderer (SSOT text + billing refs): `src/docudent/v10/renderer/renderFromKbChips.ts`
6. Combinability: `src/docudent/v10/billing/combinability/checkCombinabilityFromKb.ts` + runtime KB `src/docudent/v10/kb/combinability/combinability_kb.v1.json`
7. Output composition (KZV doc sections): `src/docudent/v10/output/outputComposerV10.ts` (re-export of core composer)

## Latest Verification (2026-02-01)

- **Scenario-run:** 30/30 PASS (`docs/system-atlas/artifacts/_latest/v10-scenario-run/summary.md`)
- **MKV multi‑tooth:** explicit scenario added (26 MOD + 36 O) with per‑tooth answers
- **Settings‑material propagation:** defaults now appear in text via `{fill_material}` placeholder
- **Composer placeholder support:** `{fill_material}` resolved in core composer

## SSOT Surfaces (Must Stay True)

- Text and billing refs must come from treatment KB chips (no UI-authored text/codes).
  - Treatment KB source: `src/docudent/core/billing/knowledgeBase/treatments/*/unified.json`
  - V10 renderer: `src/docudent/v10/renderer/renderFromKbChips.ts`
- Combinability human source-of-truth: `src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json`
  - V10 runtime check uses compiled KB: `src/docudent/v10/kb/combinability/combinability_kb.v1.json`
- Catalog SSOT (code details): `src/docudent/core/billing/knowledgeBase/kataloge/*`

## Billing KB Map (Where the Rules Live)

Catalogs:
- `src/docudent/core/billing/knowledgeBase/kataloge/bema.json`
- `src/docudent/core/billing/knowledgeBase/kataloge/goz.json`
- `src/docudent/core/billing/knowledgeBase/kataloge/goa.json`
- `src/docudent/core/billing/knowledgeBase/kataloge/bel2_2022.json`
- `src/docudent/core/billing/knowledgeBase/kataloge/festzuschuesse.json`

Rules (selected):
- Combinability/exclusions: `src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json`
- Treatment-specific: `src/docudent/core/billing/knowledgeBase/regeln/fuellung_regeln.json`
- Other: `src/docudent/core/billing/knowledgeBase/regeln/splitting_regeln.json`, `bema_*_regeln_komplett.json`

Engines (selected):
- Chip->codes/text engine: `src/docudent/core/billing/knowledgeBase/logic/treatmentEngine.ts`
- Output composer: `src/docudent/core/billing/knowledgeBase/logic/outputComposer.ts`
- Billing guard: `src/docudent/v10/pipeline/billingEligibilityGuard.ts`
- Billing validation: `src/docudent/core/billing/knowledgeBase/logic/billingValidation.ts`

## Pack System (What Exists Today)

Runtime UI contracts + tests live here:
- Pack types/contract: `src/docudent/v10/packs/types.ts`
- Registry: `src/docudent/v10/packs/registry.ts`
- Example pack with UI contract: `src/docudent/v10/packs/fuellung/pack.ts`

Today, packs are used mainly for UI (controls/settings schema/askback policy) and QA harnessing.
The V10 pipeline itself is still mostly "treatmentId-driven" and does not fully delegate
facts mapping + settings/controls behavior to packs yet.

## Scaling Blockers (Need Fix For 20-30 Treatments)

1) KB loading duplication / hardcoded lists (RESOLVED P1)
- V10 treatment KB JSON provider now loads via registry loader:
  - `src/docudent/v10/kb/treatment/providers/jsonProvider.ts`
- V10 renderer now uses provider (or injected KB), no internal loader:
  - `src/docudent/v10/renderer/renderFromKbChips.ts`

2) Facts are hard-coded to 2 treatments (RESOLVED P2)
- Facts typing now allows pack-defined treatmentId + extensions:
  - `src/docudent/v10/facts/types.ts`
- Runtime delegates facts build/apply to pack hooks when provided:
  - `src/docudent/v10/pipeline/runV10.ts`

3) Settings/controls not yet a single, clean "source channel" (PARTIAL P3)
- There are multiple parallel concepts:
  - settings->facts helpers: `src/docudent/v10/settings/resolveDefaultsToFacts.ts`
  - settings types + askback mapping: `src/docudent/v10/settings/settingsTypes.ts`
  - pack-provided settings schema: `src/docudent/v10/packs/*/pack.ts`
  - chip overrides: `src/docudent/v10/settings/useChipOverrides.ts`
  - runtime settings resolver: `src/docudent/v10/settings/settingsResolver.ts`
  - runtime override application (per-instance): `src/docudent/v10/pipeline/runV10.ts`
  - ResolvedSettings contract now outputs a fact patch that is deep-merged before KB (removes the legacy M62 “default material” override).

4) Multi-treatment scoping is tooth/segment-only (not multi-pack yet)
- Scoping currently assigns a single `packId` and does not classify treatment per segment:
  - `src/docudent/v10/multitreatment/scoping.ts`

## Target Architecture (Scalable + SSOT)

### A) "Pack-Driven Runtime" (Single Treatment)

Goal: Adding a treatment pack should require no edits across unrelated modules.

Proposed responsibilities per pack:
- KB access (unified.json via provider)
- Facts mapping:
  - extraction -> facts
  - answers/settings/controls -> facts (or chip overrides, but traceable)
- UI contract:
  - controls (chips + params)
  - settings schema
  - askback policy (critical vs skippable)
- QA artifacts:
  - clinical scenarios
  - combinability goldens

Pipeline becomes:
`extract -> pack.buildFacts -> applyMedicalKb -> questions merge -> (settings/controls apply) -> render -> composability`

### B) Multi-Treatment (Multiple Packs In One Dictation)

Goal: One dictation can yield multiple segments and multiple treatment types, per session.

Proposed flow:
1. `planFromDictation(dictation)` -> segments (each with `treatmentId`, `dictationSlice`, `toothScope`)
2. For each segment, create per-tooth instances (answer isolation) and run V10 pipeline
3. Merge outputs:
   - `perInstance` stays SSOT (segmentId + instanceId keys)
   - session-level combinability runs on aggregated billing refs across segments
   - billing scopes decide duplicates (TOOTH vs SESSION)

Related types already exist:
- `src/docudent/v10/multitreatment/types.ts`
- session combinability helper: `src/docudent/v10/billing/sessionCombinability.ts`

## KB Releases + Firestore Usage (Recommended Model)

### Principle
Use Firestore for:
- org/practice/user + memberships/invites
- practice/user settings + session/case metadata

Keep medical/billing knowledge as **immutable, versioned KB releases**.
Distribution can be:
- repo-bundled JSON (deterministic default)
- remote provider (backend/CDN) (preferred long-term)
- optional Firestore mirror (bridge, read-only)

Plan: `docs/system-atlas/plan.kb-releases.md`

### Data Model (Proposed)
- `Praxen/{practiceId}`
  - `Settings/v10`
    - `activeKbReleaseId` (pinned default for the practice)
    - materials/defaults/etc.
  - `Benutzer/{userId}/Settings/v10`
    - user defaults
  - `Sessions/{sessionId}` / `cases/{caseId}`
    - store `kbMeta` used for the run (version + hash) for reproducibility

### Why This Split
- multi-practice scale needs per-practice defaults (materials/standards)
- auditability requires immutable KB releases + pinned usage
- billing logic must remain global SSOT (never edited in the UI)

## Concrete Work Plan (1 then 2)

### 1) Pack/Treatment Modularization

P1. Make KB loading scalable:
- V10 treatment KB provider loads all `treatments/*/unified.json` deterministically (no manual import list)
  - `src/docudent/v10/kb/treatment/providers/jsonProvider.ts`
- V10 renderer uses the provider (or injected KB) instead of its own hardcoded loader
  - `src/docudent/v10/renderer/renderFromKbChips.ts`

P2. Move facts mapping into packs (or a pack registry):
- Add pack hooks for `buildFactsFromExtraction` + `applyAnswersToFacts` (per treatment)
- Remove `TreatmentFacts.treatmentId` union limitation (or replace with a pack schema contract)

P3. Unify settings/controls into one deterministic layer:
- "Practice standards" become either:
  - default answers (settings -> askbacks) for facts-driven chips, and/or
  - default chips (settings -> chipOverrides) for always-on workflow steps
- Record provenance: dictation vs settings vs manual override vs askback answer

P4. Gates for scalability:
- Every pack has: KB present, UI contract present, scenarios present, combinability goldens present
- V10 pipeline must reject unknown chip IDs with provenance (already enforced by renderer)

### 2) Multi-Treatment (Multi-Pack)

M1. Segment classification:
- Determine `treatmentId` per segment (keywords/extraction hints first; LLM classifier later)

M2. Per-segment/per-tooth isolation:
- Instance IDs include segment/treatment to prevent leaks
- Answers map is scoped by instance

M3. Output merge:
- `mergedOutput.fullText` is deterministic concatenation of perInstance texts (stable ordering)
- session combinability runs post-merge and can drop codes + update text/billing sections

## Open Questions (To Decide Together)

- Do we treat "standard steps" as default chips (reviewable) or as default answers (facts-driven), or both?
- For multi-treatment: how do we order segments deterministically when dictation is ambiguous?
- Which codes are truly SESSION-scoped (dedupe) vs TOOTH-scoped (allow duplicates)?

## Structure Cleanup Proposal (Before 20-30 Packs)

Goal: keep treatment growth boring to maintain.

**Proposed pack layout (per treatment):**
```
src/docudent/v10/packs/<pack>/
  pack.ts                // registry entry + meta
  facts.ts               // build/apply facts (pack-specific)
  ui.contract.ts         // chipControls + settingsSchema + askbackPolicy
  scenarios.ts           // clinical scenarios
  combinability.ts       // goldens (PASS/BLOCK)
  README.md              // scope + assumptions
```

**Medical KB split (compile-time):**
- `src/docudent/medical_kb/packs/<pack>/concepts.json`
- `src/docudent/medical_kb/packs/<pack>/askbacks.json`
- build step compiles to `medical_kb.v1.json` for runtime

**Benefits:**
- each pack owns its own UI contract + facts + scenarios
- minimal cross-file edits when adding a new treatment
- easier review/QA per pack

**Applied now:**
- Fuellung + Endo packs split into `facts.ts`, `ui.contract.ts`, `scenarios.ts`, `combinability.ts`, `extraction.ts`, `coverage.ts` + `README.md`

## Architecture Hygiene

### Why refactor now
- We are still onboarding multi-treatment dictations, an expanding billing KB, and a dozen custom user/practice defaults. Without a clean folder structure it will be hard to reason about settings, KB chips, and packs once we reach 20–30 treatments.
- `docs/system-atlas/billing.md` already highlights the ~66 MB of legacy HTML reference material under `src/docudent/BEMA`, `GOZ`, `BEL` etc. That material can live under `docs/reference/` so runtime contributors do not have to wade through it, but it still stays available for audits.
- The existing KB artifacts in `src/docudent/core/billing/knowledgeBase` (catalogs, rules, unified treatment JSON) are large but largely static; we should keep them in dedicated subfolders per pack so they do not balloon the repo root as we add treatments.

### Action items
1. **Per-pack README + contract** — keep adding `pack.ts`, `facts.ts`, `ui.contract.ts`, `scenarios.ts`, etc., so every treatment has a predictable shape before touching shared runtime modules.
2. **Relocate runtime noise** — move the HTML reference dumps into `docs/reference/` (per the “Safe to Move/Delete” table) and add sparse landing pages if we ever need to inspect them.
3. **Document multi-treatment touchpoints** — add short entries in this plan (and `docs/system-atlas/atlas.map.md`) that outline where segmentation, combi, and session merging live (`src/docudent/v10/multitreatment`, `billing/sessionCombinability.ts`), so new packs follow the same pattern.
4. **Track large KB artifacts** — treat `src/docudent/core/billing/knowledgeBase/kataloge` and `regeln` as append-only, but version them (via Firestore metadata), and ensure any new catalog is accompanied by a matching `gate-` test to keep SSOT quality high.

## Next Plan: Settings Hub (Prio nach WS0)

1. **ResolvedSettings → UI**: Build the Jeton Settings Hub as an editor for `ResolvedSettings` (practice + user + policies) rather than ad‑hoc form fields.  
2. **Policy Contract**: Extend pack UI contracts to expose `mode / billingEligibility / scope / defaultSource` for every control, so UI renders policy instead of inventing it.  
3. **Trace/Simulator**: Connect Settings Hub to a live Control‑Center simulator + Trace panel (always visible right column).  
4. **Tests**: Add unit coverage for settings→facts patch + askback suppression; verify no regressions with `gate-settings-*` and `gate-v10-medical-*`.
