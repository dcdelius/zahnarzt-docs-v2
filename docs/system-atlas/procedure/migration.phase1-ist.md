# Procedure Migration — Phase 1 (IST + Drift Map)

**Goal:** Create a complete inventory of all current chip emitters, askback paths, settings access points, and renderer dependencies. This is the baseline to remove legacy side paths and move to the new Procedure architecture.

**Scope:** V10 pipeline + medical_kb + question system + billing engine. V6 is frozen (no changes). V7 is legacy.

---

## 1) Current Chip Emitters (ALL PATHS)

### A) Medical KB (SSOT-ish, but mixed with legacy)
- **Concept effects.emitChips** → `src/docudent/medical_kb/medical_kb.v1.json`
- **Rule actions type=emit_chip** → `src/docudent/medical_kb/medical_kb.v1.json`
- **Engine:** `src/docudent/medical_kb/engine/applyMedicalKb.ts`
  - **Note (2026‑02‑08):** Medical KB emitChips are no longer consumed by V10 pipeline; askbacks/defaults only.

### B) Imperative pipeline augmentation (non‑SSOT)
- **RunV10 Step 4b**: adds chips from facts (LA, Kofferdam, Cp/P, Extraction baseline, material detail chips)  
  → `src/docudent/v10/pipeline/runV10.ts`
  - **Note (2026‑02‑08):** Step 4b no longer augments chips; Procedure nodes are SSOT.

### C) Settings‑driven standard chips
- **Auto‑on standard chips** from settings  
  → `src/docudent/v10/settings/chipStandards.ts` via `runV10.ts`

### D) Manual chip overrides (Control Center)
- **Overrides applied in pipeline**  
  → `src/docudent/v10/settings/useChipOverrides.ts` + `runV10.ts`

### E) QuestionBank option chipActivation (legacy)
- **Options can emit chips**  
  → `src/docudent/core/questions/questionServiceV2.ts`  
  → JSON in `src/docudent/core/billing/knowledgeBase/treatments/*/question_bank.json`  
  → also `src/docudent/core/billing/knowledgeBase/questions/*.json`

### F) Answer map defaults (legacy)
- **alwaysOnChipIds**  
  → `src/docudent/core/billing/knowledgeBase/logic/chipResolver.ts`  
  → `src/docudent/core/billing/knowledgeBase/treatments/*/answer_map.json`  
  → `src/docudent/core/billing/knowledgeBase/mappings/*_answer_map.json`

### G) unified.json defaultActive (legacy data path)
- Exists in many `unified.json` files; **not consistently applied** in V10  
  → `src/docudent/core/billing/knowledgeBase/logic/treatmentEngine.ts` has `getDefaultActiveChipsFromJSON`, but visible chips are not auto‑activated

### H) Legacy KB sections inside medical_kb
- `endoConcepts`, `endoRules`, `endoAskbacks` exist **outside schema**  
  → `src/docudent/medical_kb/medical_kb.v1.json`  
  → not part of `MedicalKB` schema, not evaluated by `applyMedicalKb`

---

## 2) Askback / Questions Paths

### A) Medical KB askbacks
- `medical_kb.v1.json` → `askbacks[]`  
- Adapter: `src/docudent/v10/medical/medicalAskbackAdapter.ts`

### B) Question service V2 (legacy semantics)
- Builds questions from QuestionBank and medical result  
  → `src/docudent/core/questions/questionServiceV2.ts`

### C) Endo playbook adapter
- Endo has a separate question build path  
  → `src/docudent/v10/endo/endoQuestionAdapter.ts`

### D) Askback policies + settings skip
- UI contracts define critical/skippable askbacks  
  → `src/docudent/v10/packs/*/ui.contract.ts`  
- Applied in `src/docudent/v10/settings/settingsResolver.ts`

---

## 3) Settings Access (Renderer/Composer risk points)

### A) Pipeline uses settings directly to prepare render input
`src/docudent/v10/pipeline/runV10.ts`:
- Uses settings for material labels, matrix system, anesthetic agent, MKV flags, Aufklärung toggle
- This currently **violates “Composer must not read settings”** rule (settings influence output parameters)

### B) UI controller applies settings defaults separately
`src/docudent/v10/uiController/createV10Session.ts`:
- `applySettingsDefaults(...)` used to populate instance facts
- This duplicates pipeline logic

---

## 4) Known Drift Risks (current)

1) **Multiple chip activation paths** (KB + pipeline + settings + questionBank + answer_map + overrides)  
2) **Legacy data fields in medical_kb** (endoConcepts/Rules/Askbacks not executed)  
3) **Renderer uses settings for output params** (should use Facts/Chips only)  
4) **ID schema variance** (`medical_*`, `askback-*`, `fuellung_*`, `endo_*`)  
5) **DefaultActive/alwaysOn** causing chips without evidence

---

## 5) Removal Targets (Phase 3+)

**Must be removed or migrated to Procedure Nodes:**
- `runV10.ts` Step 4b (imperative chip pushes)
- `chipActivation` in question banks
- `alwaysOnChipIds` in answer maps
- `defaultActive` as activation mechanism
- `medical_kb.v1.json` legacy sections (`endoConcepts/Rules/Askbacks`)

---

## 6) Phase 2 MVP target

**First end‑to‑end chain to prove Procedure architecture:**
- Common anesthesia + isolation events
- One treatment graph (fuellung) wired to Procedure match
- Chips emitted only via node emitters
- Gate `gateNoUnknownChipEmitters` upgraded to BLOCK once emitter provenance exists

---

## Progress Note (2026‑02‑08)

- Procedure graph now matches in `runV10` and traces node hits.
- Node emitters now feed chip provenance; manual overrides are marked as `manualOverride`.
- LA/Kofferdam/Material‑Detail chips are now emitted via Procedure nodes (legacy Step 4b no longer pushes them).
- Cp/P and extraction baseline are now emitted via Procedure nodes (legacy Step 4b removed for these).
- Askback normalization unified via shared helper (`normalizeAskbackId`) for settings + medical adapter.
- Endo question engine now seeds ENDO_T* answers from settings defaults (WL/irrigation/medication/etc.) to suppress redundant askbacks.
- Render/composer path no longer reads settings directly; render context is derived earlier and passed through instance results.
- QuestionBank `chipActivation` removed (Procedure SSOT); gate enforces zero usage.
- Settings “standard chips” now flow through Contract Context → Procedure node (`contract.standard_chips`), no direct pipeline auto‑on.
- Medical KB emitters are now fully disabled in V10 (legacy node removed); procedure nodes are the only chip emitters.
- `applyMedicalKb` is called with `allowChipEmission=false` in V10; KB askbacks no longer carry `chipEffect`.
- V10 uses `medical_kb.v1.v10.json` (no `emit_chip` / `emitChips` in KB).
- Legacy KB snapshot lives at `src/docudent/medical_kb/legacy/medical_kb.v1.legacy.json` (V7 compatibility).
- `answer_map.defaults.alwaysOnChipIds` cleared for V10 packs (baseline chips must come from Procedure nodes).
- Inventory: `docs/system-atlas/procedure/medical_kb_emitters_inventory.md` (all KB emitters mapped to Procedure nodes).
- Added procedure coverage for: `cp_not_required`, `komposit_basic`, `mehrschicht`, `insurance_gkv_mkv`, `mkv_begruendung`, `roentgen_kontrolle`.
- Chip provenance now comes from Procedure node emitters (not medical_kb trace).
- Additional Procedure nodes now cover: fluor, exkavation, finishing, surface anesthesia, vitality/percussion, relative isolation, and key endo chips (WL, WF, irrigation, medication, canal count, diagnostic x‑ray, post‑endo, temp closure, trepanation).
- Removed perInstance cp/p override; Cp/P now fully driven by Procedure node match (`pulpaOpened !== true` for Cp).
- Propagated `chipEmitters` into perInstance so gate warnings resolve.
- Added composer gate: no settings access in composer block (facts.render only).
- Added alwaysOnChipIds gate (must be empty for V10).
- Added procedure coverage audit gate (non‑failing, reports missing chips per treatment).
- Expanded chipActivation gate to include extraction/pzr/crown_prep.
- Added PZR procedure nodes for `zahnstein_entfernung` + `fluoridierung` (dictation-driven facts).
- Default doc chip list expanded with `optisch_elektronisch`.
- Procedure coverage gate is now strict (fails on missing chips).
- Added V10 gate: no `chipEffect` in medical_kb.v1.v10.json.
- Added V10 gate: no legacy emitter references in runtime sources.
- Introduced clinical event bundle scaffold and builder (Procedure nodes can now carry `eventBundleId`).
- Migrated common capability nodes and all current treatment nodes (Füllung/Endo/Extraction/PZR/Crown‑Prep) to event bundles.
- Added gate to warn on Procedure nodes without event bundle origin (wired in runV10).
- Added `allEventBundles` registry + coverage test (no duplicate IDs, all graph nodes/entryNodes mapped).
- Added Bundle‑Meta registry (text/billing/disclosure refs) and wired chip emission via Bundle‑Meta for all current treatments.
- Bundle‑Meta now enforces `textRefIds` alignment with emitted chips; disclosure refs still pending (see GAP‑09).
- Bundle‑Meta disclosure overrides now wired into composer (Füllung baseline + MKV).
- Bundle‑Meta disclosure overrides expanded for Endo baseline and Extraction baseline.
- Bundle‑Meta billingRefIds filled for all treatments + coverage gate added (KB billing chips must appear in bundle meta).
- Composer uses Bundle‑Meta disclosure IDs as authoritative (incl. MKV Hinweis in Abrechnung).
- Billing refs now resolved from Bundle‑Meta billable chips via BillingDB snapshot (KB no longer source of billing refs).
- Billing completeness now traces origins via BillingDB (KB only for text/details).
- Billing details now resolved via BillingDB + catalogs (no KB lookup via treatmentEngine).
