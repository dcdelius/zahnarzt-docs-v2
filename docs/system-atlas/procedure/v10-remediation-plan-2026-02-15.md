# V10 Remediation Plan (Execution Board)

**Created:** 2026-02-15  
**Owner:** Engineering + QA  
**Mode:** sequential execution (`weiter` => next item)

---

## 1) Audit Baseline (validated)

Latest verification on **2026-02-15**:

- `npm run v10:audit:consolidated` → **PASS**
- `npm run doctor:online -- --verbose` → **PASS**
- `npm run v10:kb-parity` → **PASS**
- `npm run atlas:refresh && npm run atlas:check` → **PASS** (stale-index issue removed)

This board tracks the remaining architecture/product hardening work from that baseline.

---

## 2) Findings (priority ordered)

### P0 (must harden first)

1. **Client-side LLM/API key exposure risk**
   - Direct OpenAI calls still occur in frontend/runtime paths.
   - Target state: LLM access only through backend-controlled gateway.

2. **Firestore policy/path parity for settings is incomplete**
   - V10 writes nested settings under `Praxen/{practice}/Benutzer/{user}/Settings/v10`.
   - Legacy `Praxen` rule surface still too permissive/inconsistent for full multi-tenant model.

3. **Bundle billing dedupe policy can undercount overlap cases**
   - Current tooth-level dedupe key can collapse legitimately distinct billing events on same tooth.
   - Need policy-based dedupe by scope (`SESSION` vs `INSTANCE` vs `TOOTH`).

### P1 (next after P0)

4. **Two multi-treatment orchestrators still coexist**
   - Runtime uses `pipeline/runV10Bundle`, but scripts/tests also rely on `multitreatment/runV10Bundle`.
   - Target: one orchestrator contract, one execution path.

5. **Intent orchestration coverage is still narrow**
   - Preanalysis fallback/options still focused on a limited treatment set.
   - Need production-grade mixed-treatment coverage + safer uncertainty policy.

6. **Settings taxonomy still partly treatment-centric**
   - Shared medical defaults (e.g. anesthesia/isolation) should be modeled globally once and reused.

### P2 (governance and productization)

7. **Atlas governance must remain continuously green**
   - Fixed once now; must be CI-gated to prevent drift.

8. **Hosted authenticated E2E release gate pending**
   - Full online hosted flow must be mandatory before release.

---

## 3) Execution Queue (strict order)

| Order | Workstream | Status | Done Criteria |
|------:|------------|--------|---------------|
| 1 | Atlas governance reset + baseline lock | DONE | `atlas:check` pass and baseline documented |
| 2 | LLM trust boundary (backend gateway) | DONE | No direct OpenAI calls in active V10 runtime paths |
| 3 | Firestore settings policy/path parity | DONE | Rules + runtime writes aligned + emulator allow/deny tests |
| 4 | Billing dedupe policy hardening (overlap-safe) | DONE | Multi-treatment same-tooth truthcases pass without undercount |
| 5 | Orchestrator unification (single bundle entry) | DONE | Runtime + scripts/tests on one orchestrator |
| 6 | Intent coverage + uncertainty contract v2 | IN PROGRESS | Mixed-treatment fixtures/E2E expanded and green |
| 7 | Settings domain normalization (global medical defaults) | IN PROGRESS | Shared defaults mapped in one medical domain + legacy parity locked by tests |
| 8 | Hosted authenticated E2E release gate | DONE | Required pass in release checklist |

---

## 4) Current Increment

### Increment 1 (completed)

- Atlas was stale and failing (`atlas:check`).
- Action: `npm run atlas:refresh`.
- Result: `npm run atlas:check` is green again.

---

## 5) Next Increment (active target)

**Increment 2:** LLM trust boundary (start with preanalysis path, then extraction path)  
Goal: remove direct client OpenAI dependency from active V10 runtime flow without breaking determinism or E2E stability.

Progress in this increment:

- Browser preanalysis no longer reads `VITE_OPENAI_API_KEY`; browser path runs deterministic fallback until backend gateway is wired.
- Regression checks after this change are green:
  - preanalysis unit/gate tests (8/8),
  - realistic browser E2E (10/10).
- Browser preanalysis now calls callable backend gateway `detectTreatmentIntentsV1` and no longer calls OpenAI directly from V10 runtime.
- New boundary gate ensures browser preanalysis wiring stays gateway-first (`gate-v10-preanalysis-gateway-boundary`).
- Browser extraction now calls callable backend gateway `extractFromDictationV1` and no longer calls OpenAI directly from V10 runtime.
- New boundary gate ensures browser extraction wiring stays gateway-first (`gate-v10-extraction-gateway-boundary`).
- Firestore legacy rules now explicitly cover `Praxen/{practiceId}/Benutzer/{userId}/Settings/{settingId}` with constrained writes (practice_admin or own uid + mandatory practice membership claim).
- Added parity gate: `gate-firestore-v10-settings-path-parity`.
- Added emulator-backed rules test suite for V10 settings paths (`gate-firestore-v10-settings-rules-emulator`) and expanded denial coverage for cross-practice own-uid writes.
- Added overlap-safe billing dedupe policy test (`runV10Bundle.billing-dedupe-policy`) and switched bundle dedupe to instance-aware policy for non-session codes.
- V10 settings hook now resolves non-admin user-settings writes via auth UID fallback (`resolveUserSettingsDocId`), so rules and runtime path semantics match.
- Orchestrator single-path is enforced: `src/docudent/v10/multitreatment/runV10Bundle.ts` delegates to `pipeline/runV10Bundle` only, with gate `gate-v10-orchestrator-single-path`.
- Bundle output determinism hardened: `runV10Bundle.meta.durations.total` is now stable (`0`) so repeated runs with identical input stay byte-identical.
- Preanalysis coverage expanded with mixed fixtures (including extraction+filling and explicit low-confidence confirm path) and guarded via `gate-v10-preanalysis-fixture-coverage`.
- Preanalysis uncertainty policy hardened for fallback parsing:
  - implicit tooth carryover now emits `inferred_tooth_from_context` + forced confirmation,
  - segments without any tooth reference emit `missing_tooth_reference` + forced confirmation,
  - both paths are locked by fixture and unit tests.
- Preanalysis contract v2 hardened:
  - any intent with `uncertainty` now requires `needsConfirmation=true`,
  - low-confidence intents (`confidence < 0.6`) require explicit uncertainty code,
  - missing tooth references without uncertainty are rejected.
- Settings domain normalization phase 1 shipped: `medicalDefaults` added for practice/user, runtime fallback wired, and legacy <-> normalized parity covered by tests.
- Settings domain normalization phase 2: isolation default resolution now emits deterministic provenance (`settings:practice` vs `settings:user`) instead of always tagging practice source; covered by dedicated settings tests.
- Firestore emulator runtime is now available with `openjdk@21` (`/opt/homebrew/opt/openjdk@21/bin/java`).
- Hosted auth release gate command added: `npm run e2e:v10:hosted-auth-gate` (runs realistic hosted scenarios with mandatory login/env guards).
- OpenAI server env boundary hardened: active server paths now accept canonical `OPENAI_API_KEY` (no `VITE_OPENAI_API_KEY` fallback), locked by gate `gate-v10-server-openai-env-boundary`.
- Canonical settings-store target fixed for this release line: V10 runtime stays on `Praxen/*` (decision doc: `v10-settings-store-decision-2026-02-15.md`) with guard gate `gate-v10-settings-store-single-target`.
- Remaining scope for this increment: run hosted auth gate against real hosted URL with real credentials as mandatory release proof.
- Hosted auth gate execution attempted on 2026-02-15; currently blocked locally because required env vars are not set (`PLAYWRIGHT_BASE_URL`, `E2E_LOGIN_EMAIL`, `E2E_LOGIN_PASSWORD`).
- Hosted full realistic run surfaced a drift on S11 (extraktion+füllung) where LLM preanalysis dropped extraction intent on hosted.
- Guardrail added: if dictation carries extraction signals but LLM bundle misses extraction while deterministic fallback finds it, runtime auto-falls back (`llm-missed-extraction:fallback-override`).
- Hosted gate default coverage extended to include S11 multi-treatment scenario.
- App deployed to hosting (`https://zahnarzt-app.web.app`) with S11 guardrail fix.
- Hosted auth gate is now green for S1/S4/S11/S12.
- Full hosted realistic suite is now green: 12/12 on 2026-02-16.
- Added server auth boundary hardening for LLM gateway callables:
  - `detectTreatmentIntentsV1` now requires authenticated context.
  - Gate added: `gate-v10-server-llm-auth-boundary` to prevent unauthenticated regressions.
- Functions deployment path is now wired in repo (`firebase.json -> functions.source=functions`) with guard gate `gate-firebase-functions-target`.
- LLM gateway functions were deployed selectively (without deleting legacy remote functions) and hosted realistic suite stayed green (12/12).
- Firestore KB drift (`extraction`) was corrected by reseeding treatment KB; strict parity check is green again (5/5).
- Consolidated audit is now hardened to always include `doctor:online` + `v10:kb-parity`; guard gate added (`gate-v10-consolidated-audit-coverage`).
- Release profile is now explicit: `npm run v10:audit:release` enforces hosted-auth gate inclusion and fails fast when hosted credentials/base URL are missing.
- LLM transparency hardening shipped in V10 UI:
  - runtime meta marker (`v10-llm-runtime-meta`) and visible fallback banner (`v10-llm-fallback-banner`) prevent silent fallback behavior,
  - debug drawer exposes preanalysis/extraction runtime diagnostics,
  - coverage is locked with `gate-v10-llm-runtime-visibility` + runtime meta unit tests.
- Release profile was executed successfully against hosted URL on 2026-02-16:
  - consolidated audit report now shows `v10-realistic-e2e` + `v10-hosted-auth-gate` as PASS in one run.
- Settings domain normalization phase 3 progressed:
  - global medical defaults in V10 settings UI (anesthesia/isolation/capping + practice anesthetic) now write via normalized `medicalDefaults` patch helpers,
  - regression gate added: `gate-v10-settings-medical-default-write-path`,
  - realistic browser suite remains green (12/12).
- Settings domain normalization phase 4 progressed:
  - V10 settings persistence sanitizer now stores shared defaults canonically in `medicalDefaults` (legacy mirror fields removed from persisted write payload),
  - regression gate added: `gate-v10-settings-storage-normalized-medical-defaults`,
  - realistic browser suite remains green (12/12).
- Settings domain normalization phase 5 progressed:
  - `useSettings` now canonicalizes runtime state by stripping shared legacy mirror fields after normalization/migration,
  - regression gate added: `gate-v10-settings-runtime-canonicalization`,
  - realistic browser suite remains green (12/12).
- Settings domain normalization phase 6 progressed:
  - shared canonicalization helper now normalizes pipeline-entry settings payloads (`runV10`) including legacy user-only shapes,
  - v4 clinical truthcases export now canonicalizes settings fixtures via the same helper,
  - regression gates added: `gate-v10-settings-pipeline-canonicalization`, `gate-v10-clinical-truthcases-settings-canonicalization`,
  - realistic browser suite remains green (12/12).
- Settings domain normalization phase 7 progressed:
  - exported runtime getters for shared defaults now read canonical `medicalDefaults` only (legacy mirror read fallback removed from runtime getter path),
  - migration compatibility is isolated to explicit normalization/canonicalization helpers (`normalize*MedicalDefaults`, `canonicalizeSettingsInput`),
  - regression gate added: `gate-v10-settings-no-legacy-mirror-read-fallback`,
  - realistic browser suite remains green (12/12).
- Intent orchestration hardening progressed:
  - fallback preanalysis now suppresses low-confidence follow-up clauses that contain no explicit treatment signal (reduces duplicate/noise intent lanes in fluent dictations),
  - regression gate added: `gate-v10-preanalysis-noise-segment-skip`,
  - realistic browser suite remains green (12/12).
- Intent orchestration hardening continued:
  - preanalysis treatment IDs are now strict allowlist-bound (`fuellung/endo/extraction/crown_prep`) to prevent pack-registry leakage in intent routing,
  - confirmation lane option set is bound to the same allowlist (gate: `gate-v10-intent-confirm-options-allowlist`),
  - explicit same-tooth phrasing (`am selben Zahn`) now resolves as deterministic context-linking without unnecessary confirmation clicks while uncertainty is still preserved for ambiguous duplicate merges.
- Overlap-coverage increment delivered:
  - mixed fallback fixtures now include a deterministic triple-overlap route (`crown_prep 16 -> fuellung 16 -> extraction 28`),
  - new gate `gate-v10-preanalysis-triple-overlap-deterministic` prevents regression on that path,
  - fixture-coverage gate now requires at least one deterministic triple-overlap case.
- Marker-poor flow hardening delivered:
  - V10 segment splitter now supports ASCII connector variants (`zusaetzlich`, `anschliessend`, `ausserdem`) plus sentence-boundary splitting (`. ! ?`) for fluent dictations without explicit semicolons,
  - dot-boundary split is decimal-safe to avoid monetary-value fragmentation,
  - regression gate `gate-v10-preanalysis-marker-poor-flow` + splitter unit tests lock behavior.
- Ambiguous same-clause overlap hardening delivered:
  - fallback preanalysis now detects concurrent treatment signal families in one clause and emits explicit intents per family instead of silently collapsing to one treatment,
  - emitted overlap intents are flagged with `uncertainty='llm_ambiguous_mapping'` so run orchestration stays in explicit confirmation mode (`needs_confirmation`),
  - regression gate `gate-v10-preanalysis-ambiguous-overlap-confirmation` locks this fail-safe behavior.
- Cross-clause ambiguity hardening delivered:
  - fallback preanalysis no longer auto-binds follow-up clauses without tooth reference to the "last tooth" when prior context contains multiple teeth,
  - ambiguous carry-over now remains unresolved (`tooth=unknown`, `uncertainty='llm_ambiguous_mapping'`) and is forced through explicit confirmation flow,
  - regression gate `gate-v10-preanalysis-cross-clause-ambiguous-tooth-context` + fixture `cross-clause-ambiguous-tooth-context` lock this behavior.
- Audit-truth hardening delivered (Block 1):
  - `v10:real-dictation-check` is fail-fast (`process.exit(1)` on any scenario issue) and now supports explicit `expectedPhase` so unresolved-MKV cases can intentionally stay in askback phase without false negatives.
  - `v10:reality-check` now runs with correct source paths from `scripts/v10/`, normalizes legacy question ids (`fuellung.capping` -> `ueberkappung`) and serializes chips deterministically as arrays in reports.
  - Reality fixtures were aligned to current V10 askback/default policy (`TC1`, `TC3` no longer require blocking questions) so failing scenarios now indicate real regressions instead of stale expectations.
  - Verification on 2026-02-16: `npm run v10:reality-check` (10/10), `npm run v10:final-audit` (PASS), `npx playwright test e2e/v10-realistic-praxis-test.e2e.spec.ts --project=chromium` (12/12).
- LLM-path assurance hardening delivered (start Block 2):
  - `doctor:online` now verifies the server LLM path against `OPENAI_API_KEY` with a real `chat/completions` probe (`gpt-4o-mini`) instead of only `/models`.
  - For local developer runs, `doctor:online` and `v10:real-dictation-check` can derive `OPENAI_API_KEY` from `VITE_OPENAI_API_KEY` to avoid false fallback-only runs.
  - `v10:real-dictation-check` now enforces LLM extraction path for output scenarios by default (`DOCUDENT_REQUIRE_LLM_PATH`), using `extract_detail` trace parsing.
  - Session output now carries `v10TraceLines` in debug meta, so LLM/regex method is auditable in script runs.
  - Hosted realistic UI suite now contains hard assertions that hosted runs use real LLM path (`preanalysis=llm`, `extraction=llm`, no fallback banner).
