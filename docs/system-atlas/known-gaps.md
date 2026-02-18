# V10 Known Gaps

**Updated:** 2026-02-17  
**Status:** Non-blocking risks tracked for monitoring (P0/P1 gaps resolved)

---

## Active Gaps

| ID | Description | Opened | Notes |
|----|-------------|--------|-------|
| GAP-17 | 3‑step UI coherence (Step 2 style alignment) | 2026-02-15 | Questions/Extracted Facts view should match Step‑1 visual language. |
| GAP-20 | Praxis-/Behandler-Settings hierarchy not fully productized | 2026-02-15 | Phase 3 guardrails live: hierarchy reconciliation + practice-write role policy + visible governance toggles in V10 settings; remaining work is full tenant onboarding/workflow model and richer permission matrix. |
| GAP-23 | Actor-role trust model still partially client-side | 2026-02-15 | Actor role derives from auth token claims and legacy `Praxen/*` Firestore writes now require practice_admin claims. Active LLM callables are now auth-gated; remaining work is full rule parity for all prod paths and deeper backend role validation. |
| GAP-24 | Settings taxonomy still partly treatment-centric for globally shared medical defaults | 2026-02-15 | Phase 1 complete: normalized `medicalDefaults` (practice/user) with legacy parity + runtime fallback is live. Phase 2 complete: global anesthesia/isolation/capping UI controls now write through normalized patch helpers (gate: `gate-v10-settings-medical-default-write-path`). Phase 3 complete: persisted settings payload now stores shared medical defaults canonically via `medicalDefaults` (gate: `gate-v10-settings-storage-normalized-medical-defaults`). Phase 4 complete: runtime settings state is canonicalized by stripping legacy mirror fields after normalization/migration (`gate-v10-settings-runtime-canonicalization`). Phase 5 complete: pipeline entry + v4 clinical truthcases now canonicalize loose/legacy settings payloads via shared helper (`gate-v10-settings-pipeline-canonicalization`, `gate-v10-clinical-truthcases-settings-canonicalization`). Phase 6 complete: exported runtime settings getters are canonical-only (no legacy mirror read fallback), locked by `gate-v10-settings-no-legacy-mirror-read-fallback`; migration compatibility remains isolated to explicit normalize/canonicalize paths. Remaining work: finish full medical-domain UI for all defaults and remove legacy mirror fields from type contracts after migration window. |
| GAP-25 | Multi-treatment intent orchestration from one fluent dictation not yet fully productized | 2026-02-15 | Phase 1 is live (intent preanalysis, confirmation board, lane askbacks, deterministic bundle hash/provenance). Noise-segment suppression is active in fallback preanalysis (low-confidence follow-up clauses without treatment signal are skipped) and guarded by `gate-v10-preanalysis-noise-segment-skip`. Preanalysis treatment routing is allowlist-bound (`fuellung/endo/extraction/crown_prep`) and intent-confirm options are locked to that set (`gate-v10-intent-confirm-options-allowlist`). Overlap coverage includes deterministic triple-intent fallback fixtures (Krone 16 + Aufbau 16 + Extraktion 28) guarded by `gate-v10-preanalysis-triple-overlap-deterministic`; explicit same-tooth phrasing (`am selben Zahn`) resolves without forced confirmation. Segmentation now handles marker-poor sentence boundaries and ASCII connector variants (`zusaetzlich`, `anschliessend`, `ausserdem`) with decimal-safe dot handling, guarded by `gate-v10-preanalysis-marker-poor-flow` and `segmentDictation.test.ts`. Ambiguous same-clause overlap now escalates to explicit confirm lanes with `llm_ambiguous_mapping` uncertainty instead of silent single-treatment collapse (`gate-v10-preanalysis-ambiguous-overlap-confirmation`). Cross-clause follow-up mappings after multi-tooth clauses now fail-safe to unresolved tooth + explicit confirmation (no silent carry-tooth binding), guarded by `gate-v10-preanalysis-cross-clause-ambiguous-tooth-context`. Remaining work: wider treatment coverage beyond current packs and confidence-policy tuning for broader real-world phrasing variance. |
| GAP-26 | Treatment-pack coverage is still narrow versus real praxis spectrum | 2026-02-15 | Fundamentals are being hardened first (deterministic orchestration + strict gates). Systematic onboarding for further Behandlungsarten remains open and should follow the pack-onboarding contract (<1 day per treatment). |
| GAP-33 | Central clinical-obligations engine (cross-treatment gold-standard prompts) missing | 2026-02-16 | Phase 1 shipped: centralized deterministic radiology-obligation evaluator is wired in `runV10` with explicit outcomes (`done`, `not_done`, `deferred_next_visit`) and meta summary (`meta.clinicalObligations`). Remaining work: migrate additional non-radiology obligations from distributed procedure/medical rules into this engine and lock with dedicated gates. |

## Resolved Gaps

| ID | Description | Resolved |
|----|-------------|----------|
| GAP-00 | Multiplicity dedup bug | 2026-01-07 |
| GAP-03 | Endo pack verified (Endo‑16 E2E) | 2026-02-13 |
| GAP-05 | Settings ↔ Askback Coverage IDs | 2026-02-03 |
| GAP-08 | Combinability BLOCK → Askback (kein Error) | 2026-02-08 |
| GAP-09 | Event‑Bundle SSOT Metadata + BillingDB externalized | 2026-02-11 |
| GAP-10 | Billing‑Katalog externalized | 2026-02-11 |
| GAP-01 | Praxis‑16 A12/A13 now assert PASS (no GOZ_2197 in PKV) | 2026-02-14 |
| GAP-04 | LA askback ambiguity covered by procedure test | 2026-02-14 |
| GAP-06 | UI session chips surfaced via meta.debug fallback | 2026-02-14 |
| GAP-07 | Offline fallback logs clarified + treatmentId normalized | 2026-02-14 |
| GAP-02 | Debug toggle z‑index fixed (drawer zIndex + toggle) | 2026-02-14 |
| GAP-11 | Output chronology drift in Behandlungsablauf (chips not phase-sorted) | 2026-02-14 |
| GAP-12 | Multitreatment toothless segments caused phantom `unknown` instances | 2026-02-14 |
| GAP-13 | Milchzahn unsupported returned `error` instead of Askback | 2026-02-14 |
| GAP-14 | Strict KZV mode not wired (evidence askbacks) | 2026-02-15 |
| GAP-15 | Output text length policy not enforced across chips/disclosures | 2026-02-15 |
| GAP-16 | One treatment not yet migrated end‑to‑end to Procedure Graph | 2026-02-15 |
| GAP-18 | Settings flag for Strict KZV mode missing | 2026-02-15 |
| GAP-22 | V10 realistic full-workflow E2E unstable in askback completion | 2026-02-15 |
| GAP-21 | Firestore settings hydration parity gap in V10 hook | 2026-02-15 |
| GAP-27 | Consolidated release checklist/audit gate missing | 2026-02-15 |
| GAP-19 | Final online UI regression run completed after full stage merge | 2026-02-16 |
| GAP-28 | Direct client-side LLM/OpenAI runtime path still present | 2026-02-15 |
| GAP-29 | Bundle billing dedupe policy may undercount same-tooth overlap scenarios | 2026-02-15 |
| GAP-30 | Dual bundle orchestrators increase drift risk | 2026-02-15 |
| GAP-31 | Functions deployment path wired (`firebase.json` functions source + selective functions deploy path verified) | 2026-02-16 |
| GAP-32 | Audit baseline mismatch: stale reality-check expectations + non-fail-fast real-dictation check | 2026-02-16 |
| GAP-34 | Askback input controls in fallback UI lacked stable automation hooks for text-only evidence questions | 2026-02-17 |

---

## Related Docs

- [README.md](./README.md) — Atlas overview
- [reality.snapshot.v10.md](./reality.snapshot.v10.md) — Verification status
- [atlas.map.md](./atlas.map.md) — Component matrix
- [status-2026-02-15.md](./status-2026-02-15.md) — Handoff snapshot
- [procedure/v10-remediation-plan-2026-02-15.md](./procedure/v10-remediation-plan-2026-02-15.md) — Active sequential remediation board

---
