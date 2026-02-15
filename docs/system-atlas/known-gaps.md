# V10 Known Gaps

**Updated:** 2026-02-15  
**Status:** Non-blocking risks tracked for monitoring (P0/P1 gaps resolved)

---

## Active Gaps

| ID | Description | Opened | Notes |
|----|-------------|--------|-------|
| GAP-17 | 3‑step UI coherence (Step 2 style alignment) | 2026-02-15 | Questions/Extracted Facts view should match Step‑1 visual language. |
| GAP-19 | Final online UI regression run pending after full stage merge | 2026-02-15 | Hosted smoke is green (`https://zahnarzt-app.web.app` + `/v10` reachable); full authenticated hosted E2E is still pending. |
| GAP-20 | Praxis-/Behandler-Settings hierarchy not fully productized | 2026-02-15 | Phase 3 guardrails live: hierarchy reconciliation + practice-write role policy + visible governance toggles in V10 settings; remaining work is full tenant onboarding/workflow model and richer permission matrix. |
| GAP-23 | Actor-role trust model still partially client-side | 2026-02-15 | Actor role derives from auth token claims and legacy `Praxen/*` Firestore writes now require practice_admin claims; remaining work is full rule parity for all prod paths and backend validation hardening. |
| GAP-24 | Settings taxonomy still partly treatment-centric for globally shared medical defaults | 2026-02-15 | Shared defaults like anesthesia/analgesia should be modeled once (global medical domain) and reused across treatment packs; current split still duplicates some semantics and increases drift risk. |
| GAP-25 | Multi-treatment intent orchestration from one fluent dictation not yet fully productized | 2026-02-15 | Phase 1 is live (intent preanalysis, confirmation board, lane askbacks, deterministic bundle hash/provenance). Remaining work: richer overlap packs (e.g. Krone+Aufbau), advanced confidence fallback policies, and wider treatment coverage. |
| GAP-26 | Treatment-pack coverage is still narrow versus real praxis spectrum | 2026-02-15 | Fundamentals are being hardened first (deterministic orchestration + strict gates). Systematic onboarding for further Behandlungsarten remains open and should follow the pack-onboarding contract (<1 day per treatment). |

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

---

## Related Docs

- [README.md](./README.md) — Atlas overview
- [reality.snapshot.v10.md](./reality.snapshot.v10.md) — Verification status
- [atlas.map.md](./atlas.map.md) — Component matrix
- [status-2026-02-15.md](./status-2026-02-15.md) — Handoff snapshot

---
