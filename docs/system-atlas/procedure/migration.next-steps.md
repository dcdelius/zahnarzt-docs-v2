# Procedure Migration — Remaining Work (2026-02-14)

**Goal:** Finish the remaining items after the Procedure architecture migration so we can declare the system “production‑ready” (no legacy emitters, stable online/offline behavior, full UI observability).

---

## Snapshot (from Atlas)

- Procedure graphs exist for all current treatments (Fuellung/Endo/Extraction/PZR/Crown‑Prep).
- Coverage gates for bundle/meta/billing are active and passing.
- Legacy emitter paths are gated (chipActivation/alwaysOn/chipEffect).
- Real‑world medical scenario suite passes in live mode (LLM + Firestore).

---

## Coverage Matrix (per Treatment)

| Treatment | KB Chips | Covered | Missing | Source |
|---|---:|---:|---:|---|
| Fuellung | 35 | 28 | 0 | `docs/system-atlas/procedure/coverage-report-2026-02-10.md` |
| Endo | 29 | 29 | 0 | `docs/system-atlas/procedure/coverage-report-2026-02-10.md` |
| Extraction | 14 | 14 | 0 | `docs/system-atlas/procedure/coverage-report-2026-02-10.md` |
| PZR | 15 | 15 | 0 | `docs/system-atlas/procedure/coverage-report-2026-02-10.md` |
| Crown Prep | 15 | 15 | 0 | `docs/system-atlas/procedure/coverage-report-2026-02-10.md` |

Note: “Covered” excludes doc‑standard chips that are emitted via `contract.standard_chips` (they are tracked separately in the coverage report).

---

## Remaining Work (Prioritized)

### P0 — Must‑fix before calling migration “done”
1. **Firestore KB parity**
   - Ensure Firestore KB contains all new chips/bundles (remove “KB FALLBACK” warnings).
   - Add a lightweight smoke check that compares Firestore KB version/tag with repo KB.
   - **Status:** Seeded `medical_kb/2026-02-06/treatments/*` from repo KB on 2026‑02‑13. Parity smoke check added (`scripts/firestore/checkTreatmentKbParity.ts`) on 2026‑02‑14.
   - **Note:** Parity check + `doctor:online` support a client‑SDK fallback when `FIREBASE_SERVICE_ACCOUNT` is not set (this proves reachability + rules allow read; admin parity still recommended for CI).
2. **UI session chip visibility**
   - `createV10Session` should expose per‑instance chips (or map `meta.debug` into UI instances).
   - This is required for auditability and debugging via UI.
   - **Status:** Fallback to `meta.debug.instances` wired in `createV10Session` (2026‑02‑13).
3. **Offline fallback correctness**
   - Fix Endo “No rules found” warning when Firestore is offline (ensure local KB fallback is complete).
   - Make the fallback path explicit in logs (so it’s not confusing).
   - **Status:** Normalized treatmentId in rule engines + added explicit JSON fallback logs in Firestore provider (2026‑02‑13).

### P1 — High‑value stabilization
4. **Combinability KB coverage (GAP‑01)**
   - A12/A13 now assert PASS (PKV doesn’t emit GOZ_2197 in current KB).
   - Re‑open only if PKV adhesive billing is introduced.
   - **Status:** Updated Praxis‑16 expectations + Known‑Gaps entry (2026‑02‑14).
5. **LA askback trigger reliability (GAP‑04)**
   - Procedure test covers ambiguity → `medical_la_type`.
   - **Status:** Closed in Known‑Gaps (2026‑02‑14).
6. **Standard‑chips policy audit**
   - Verified: settings → contract.standardChips → procedure node (no direct activation).
   - Gate: `gate-v10-standard-chips-from-settings`.

### P2 — Polishing / UX
7. **Debug drawer z‑index (GAP‑02)**
   - Debug toggle fixed with high z‑index + drawer z‑index raised.
   - **Status:** Closed in Known‑Gaps (2026‑02‑14).
8. **Atlas cleanup**
   - Updated: `migration.next-steps.md` + `known-gaps.md`.

---

## Completion Criteria (Definition of Done)

- All P0 items completed.
- Live E2E suites pass (Praxis‑16 + Endo‑16).
- Medical scenario runs pass in live mode with no KB fallback warnings.
- UI shows per‑instance chips (no blind spots).
- All gates pass (procedure coverage, billing/disclosure, no legacy emitters).

---

## Latest Verification (2026‑02‑14)

- `npm run v10:final-audit` ✅ (fast reproducible audit; see `docs/system-atlas/procedure/final-audit-2026-02-14.md`)
- `npm run v10:medical-scenario-run -- --file scripts/v10/scenarios.v10.realworld.medical.json` ✅ 10/10 PASS
- `npm run e2e:v10:praxis16` ✅ 16/16 PASS
- `npm run e2e:v10:endo6` ✅ 16/16 PASS

---

## Suggested Order of Execution

1. Firestore KB parity  
2. UI chips visibility  
3. Offline fallback cleanup  
4. Combinability KB rules  
5. LA askback reliability  
6. Standard‑chips audit  
7. UI z‑index polish  
8. Atlas doc cleanup
