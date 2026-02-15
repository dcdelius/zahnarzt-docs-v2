# Product Plan: Dictation -> Control Center -> Final (KZV + Billing)

**Captured:** 2026-01-29  
**Status:** Draft (product brainstorm distilled into an implementation plan)

## Current Status (2026-02-01)

- **Scenario coverage:** `v10:scenario-run` now includes 30 cases, incl. MKV + multi‑tooth + settings‑material defaults; last run is **30/30 PASS**.
- **Multi-Treatment (Headless):** `multitreatment.scenario-suite.test.ts` validates Endo + Fuellung + Extraction in one session (MKV addon vs "nur Kasse").
- **Settings → Text:** Material defaults from Settings are verified to appear in output text (catalog labels like Filtek/Tetric/SDR).
- **Multi‑tooth MKV:** A dedicated MKV multi‑tooth scenario (26 MOD + 36 O) is now part of the official test suite.
- **Renderer placeholders:** `{fill_material}` is fully substituted in final output via composer placeholders.
- **Important:** The previously shared "Praxis‑Test Analyse" is outdated/miswired (used wrong inputs), and should not be used for decisions.

## North Star

"Sonia-like" flow: smart askbacks + upsell + perfect KZV documentation text + correct billing, while staying fully SSOT/auditable.

See also:
- [benchmark.sonia-vs-dokumaster.md](./benchmark.sonia-vs-dokumaster.md) — Markt-Must-Haves + Gap/Priorities
- [settings.scopes-and-taxonomy.md](./settings.scopes-and-taxonomy.md) — Was gehoert in Praxis vs Benutzer vs Fall
- [settings.fuellung.scope-plan.md](./settings.fuellung.scope-plan.md) — Fuellung: was ist Praxis-Inventar vs Behandler-Defaults

## UX Flow (3 Pages)

### Page 1: Dictation
- Input: dictation + treatment/insurance context.
- Action: run pipeline once (Extraction -> Facts -> Procedure -> Chips -> Renderer/Billing -> Combinability; Medical KB contributes askback requirements).
- Output: either `questions` (missing critical info) or a preview output.
- Multi-treatment handling: dictation may cover several procedures (endo, filling, crown prep, etc.). The pipeline segments the dictation into per-treatment/per-tooth instances, so Page 1 triggers one run that fans out multiple `perInstance` outputs which are merged downstream, preserving order yet keeping billing/text deterministic.

### Page 2: Control Center (Chips as Buttons)
Goal: the user validates what the system will generate, via chips/controls, not via free-text editing.

Show (grouped):
- **Detected from dictation** (active chips).
- **Practice standards** (active by default, clearly labeled as "standard").
- **Suggestions/upsell** (inactive or "pending", with rationale and confidence).
- **Blocking controls** (askbacks/required fields that must be confirmed before finalization).
- **Session standard chips** (any defaults added from the practice/user settings area, even if the dictation never emitted them, should appear here as clearly labeled). These are the “active ships” the dentist always expects; the dentist can confirm/disable them to keep them in sync with the DB-side facts while the Renderer remains SSOT.

Interaction model:
- Chips are visible as buttons/toggles, but toggling must not edit billing/text directly.
- User interaction updates **facts/overrides**; chips are re-derived deterministically from Facts -> KB.
- Live rerun updates chips, text preview, billing refs, and combinability.

### Page 3: Final Output
- Final KZV documentation text (from renderer, derived from chips).
- Billing (from billing refs + catalogs, derived from perInstance).
- Optional "Trace" view: Code -> Chip -> KB entry -> KB version -> Fact provenance.

## SSOT / Invariants (Must Never Break)

- **Renderer is SSOT** for user-facing text + billing refs. UI must not "write" text/codes.
- **Settings fill Facts, not Billing**: practice defaults are default facts (with provenance), not forced codes.
- A dedicated settings screen (practice + per-user zones) seeds these defaults. Practice settings expose global materials, devices and mandatory steps (polish, alternatives, forensic checks) while user settings let each dentist define which facts/chips should be active by default for a given treatment. The pipeline simply marks those facts as sourced from `settings`, so they may be overridden later on Page 2 but still show up in the trace.
- Settings defaults are governed by a **policy contract** per control (`mode`, `billingEligibility`, `scope`, `defaultSource`) so the UI renders policy rather than inventing it.
- **perInstance is SSOT**: global `billingCodes` derived via `flatMap(perInstance.billingRefs)` (no dedup).
- **BillingRef-only** runtime: no hardcoded BEMA/GOZ strings in runtime paths.
- **BillingIntent channelization** prevents forbidden lookups (GKV != GOZ, PKV != BEMA, MKV addon only when allowed).
- **Combinability**: BLOCK -> askback override by default (no user-facing error); dropped codes must be removed from billing + text.
- **Scenario suite is canonical:** use `scripts/v10/scenarios.v10.fuellung.json` + `v10:scenario-run` as the SSOT for regression checks.
  - Multi-treatment regression is covered by `scripts/v10/scenarios.v10.multitreatment.json` + `multitreatment.scenario-suite.test.ts`.

## Practice Standards (Defaults)

Model practice-specific behavior as default facts with provenance:
- `source = settings` for defaults
- `source = dictation` for extracted
- `source = askback` for answers
- `source = manual` for explicit toggles/overrides

Two-tier settings model:
- **Practice/global defaults** (materials, devices, mandatory steps)
- **Per-user defaults** (dentist-specific preferences per treatment)
User settings override practice defaults; both are reviewable in Page 2.

Practical rule of thumb:
- **Low-risk defaults** may be auto-on (mainly documentation style / non-billable).
- **Billable/risky defaults** should be "standard but reviewable" (visible + easy to disable, may require confirmation depending on policy).

## Chips as Controls (Unifying Askbacks + Review)

Many "askbacks" are really structured controls (yes/no or small enumerations). Page 2 should support:
- required (blocking) controls for missing critical facts
- optional controls to correct/override
- a uniform control surface (chips) with clear source + impact

Implementation idea:
- Maintain an explicit mapping: `controlId -> factKey(s) -> value(s)` and/or `chipId -> underlying fact toggle`.
- Re-run pipeline after any change; chips stay derived.

## LLM Role (SSOT-Conform)

LLM should behave as a **suggestion engine**, not a free text/codes generator:
- Output structure: `suggestedFacts[]` (and optional `suggestedControls[]`) with confidence + evidence spans.
- Suggestions are surfaced on Page 2; user acceptance converts to fact updates.
- Final text/billing still comes from KB chips and renderer (traceable + reproducible).

## KB Release Versioning (Long-Term)

Goal: live KB updates without losing reproducibility.

Recommended default:
- **Pin a KB releaseId per session/practice** (e.g. `activeKbReleaseId = 2026-02-01`) and store the used KB meta in finalized cases.
- Offer an explicit "Update to latest" action (intentional bump).
- Always include KB meta (version + hash) in any exported/repro bundle.

Plan: `docs/system-atlas/plan.kb-releases.md`

## Firestore Usage for Multi‑Practice Onboarding

Use Firestore only for **practice/user configuration** and **session metadata**:
- **Practice settings**: materials per treatment, defaults per treatment.
- **User settings**: per‑dentist preferences per treatment.
- **Sessions/Cases**: KB release pin, reproducibility links, audit metadata.

Keep **medical + billing KB** global, versioned, and read‑only (served as immutable releases; Firestore mirroring is optional).

## Material Catalog (P0)

Problem: Freitext-Listen fuer Materialien sind schwer vergleichbar, nicht filterbar, und nicht stabil (IDs fehlen).

Loesung (P0):
- Kuratierter Material-Katalog im Code (read-only)
- Praxis waehlt \"verfuegbar\" + Standard-Anästhetikum
- Benutzer waehlt persoenliche Defaults aus Praxis-Auswahl
- Dokumentation nutzt KB-Variablen (SSOT bleibt erhalten)

Plan: `docs/system-atlas/material-catalog.md`

## Incremental Implementation (WS-Aligned)

1) **WS0 (Stability):** make output flow robust; enforce droppedCodes propagation; harden UI session output shape.
2) **Standards (Settings -> Facts):** implement practice defaults as fact defaults with provenance.
3) **Control Center UI:** expose chips in main flow with toggles that write facts/overrides, not text/codes.
4) **Trace UX:** make Code -> Chip -> KB -> provenance inspectable (debug -> user-facing).
5) **WS1/WS2:** add LLM suggestions + askback prioritization/upsell as a layer on Page 2 (never bypassing SSOT).
6) **WS3:** Firestore KB: versioned releases + pinned-session behavior.
7) **Multi-treatment readiness:** ensure pipeline/Control Center/Trace handle multiple packs per dictation, that settings/default chips can apply per treatment, and that merged outputs stay deterministic while preserving perInstance multiplicity.

## Open Questions

- Which practice defaults are allowed to auto-enable if they have billing impact?
- Do we allow "preview output" on Page 2 even when blocking controls exist, or do we gate finalization only?
- How strict should we be on "suggestion confidence" before presenting as a default-on recommendation?
