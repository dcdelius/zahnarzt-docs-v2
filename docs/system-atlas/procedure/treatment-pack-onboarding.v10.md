# V10 Treatment Pack Onboarding (< 1 Day)

**Updated:** 2026-02-15

Goal: A new treatment pack is production-ready in one day, without bypassing SSOT or Procedure gates.

---

## 0) Required Inputs (before coding)

- Treatment ID + clinical scope
- Minimal legal/forensic evidence list
- Billing target (BEMA/GOZ/MKV behavior)
- Expected askbacks (hard vs optional)

If any input is missing: stop and add a TODO + gate first (no silent assumptions).

---

## 1) Pack + KB skeleton (2-3h)

Create under `src/docudent/core/billing/knowledgeBase/treatments/<treatmentId>/`:

- `unified.json`
- `answer_map.json` (`defaults.alwaysOnChipIds` must stay empty)
- `question_bank.json` (no `chipActivation`)
- `template.json`
- `finding_map.json`

Also wire pack:

- `src/docudent/v10/packs/<treatmentId>/pack.ts`
- `src/docudent/v10/packs/registry.ts`

---

## 2) Procedure graph + event bundles (2-3h)

- Add bundles in `src/docudent/v10/procedure/events/<treatmentId>.ts`
- Register in `src/docudent/v10/procedure/events/allBundles.ts`
- Register treatment graph in `src/docudent/v10/procedure/registry/treatments/index.ts`
- Add bundle metadata in `src/docudent/core/billing/knowledgeBase/event_bundles/<treatmentId>.json`

Invariant: emitted chips must be explainable via `node:<bundleId>` emitters.

---

## 3) Askbacks/facts wiring (1-2h)

- Add fact mapping in `src/docudent/v10/facts/applyAnswersToFacts.ts`
- Add fact-known filter in `src/docudent/v10/settings/settingsResolver.ts`
- Ensure review provenance labels resolve to one of:
  - `dictation`
  - `settings`
  - `askback`
  - `manual`

---

## 4) Gates/tests (2-3h)

Minimum mandatory checks:

- Procedure coverage + bundle metadata coverage
- Unknown chip emitters gate (WARN/BLOCK strategy)
- No legacy emitters (`chipActivation`, `chipEffect`, `alwaysOnChipIds`)
- Output contract (section order + length policy)
- Multi-treatment deterministic aggregation

Run:

- `npm run v10:audit:consolidated`

---

## 5) Done criteria

A treatment is onboarded only if all are true:

- `runV10` and `runV10Bundle` pass with deterministic outputs
- No legacy emitter side paths remain active
- Procedure gates pass in configured mode (WARN/BLOCK)
- Trace panel shows code -> chip -> fact provenance
- Atlas docs updated (`known-gaps`, `reality.snapshot.v10`, changelog)
