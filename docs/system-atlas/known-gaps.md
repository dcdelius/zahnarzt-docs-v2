# V10 Known Gaps

**Updated:** 2026-02-15  
**Status:** Non-blocking risks tracked for monitoring

---

## Active Gaps

| ID | Description | Opened | Notes |
|----|-------------|--------|-------|
| GAP-14 | Strict KZV mode not wired (evidence askbacks) | 2026-02-15 | QBÜ‑RL‑Z / StrlSchG / MKV evidence lists documented but not yet enforced in procedure graph. |
| GAP-15 | Output text length policy not enforced across chips/disclosures | 2026-02-15 | `kurz/mittel/lang` invariants documented; needs enforcement + coverage gate. |
| GAP-16 | One treatment not yet migrated end‑to‑end to Procedure Graph | 2026-02-15 | Choose Füllung or Endo and remove legacy emitters. |
| GAP-17 | 3‑step UI coherence (Step 2 style alignment) | 2026-02-15 | Questions/Extracted Facts view should match Step‑1 visual language. |
| GAP-18 | Settings flag for Strict KZV mode missing | 2026-02-15 | Needs practice‑level toggle + wiring to askback gating. |

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

---

## Related Docs

- [README.md](./README.md) — Atlas overview
- [reality.snapshot.v10.md](./reality.snapshot.v10.md) — Verification status
- [atlas.map.md](./atlas.map.md) — Component matrix
- [status-2026-02-15.md](./status-2026-02-15.md) — Handoff snapshot

---
