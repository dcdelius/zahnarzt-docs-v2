# System Atlas Changelog

Append-only log of atlas updates.

## 2026-02-16

- Resolved Firestore KB drift for `extraction` by reseeding treatment KB (`medical_kb/2026-02-06/treatments/extraction`).
- Hardened consolidated release audit: added mandatory `doctor:online` and `v10:kb-parity` steps.
- Added gate `gate-v10-consolidated-audit-coverage` so audit coverage cannot silently regress.
- Added release audit profile `v10:audit:release` (hosted-auth gate enforced); consolidated audit now fails fast when hosted auth env is missing or local URL is used.
- Added gate `gate-v10-release-audit-script` to lock release audit script wiring.
- Added V10 runtime LLM transparency surface (`v10-llm-runtime-meta`) and visible fallback banner (`v10-llm-fallback-banner`) to avoid silent fallback behavior.
- Extended Debug Drawer with LLM runtime card and added guard gate `gate-v10-llm-runtime-visibility`.
- Added deterministic helper tests for parsing preanalysis/extraction runtime diagnostics (`llmRuntimeMeta.test.ts`).
- Executed release-grade consolidated audit with hosted auth included (`v10:audit:release`) against `https://zahnarzt-app.web.app`; report is fully green including hosted gate.
- Deployed V10 update to hosted (`https://zahnarzt-app.web.app`) after S11 multi-treatment drift fix.
- Added extraction guardrail in preanalysis (`llm-missed-extraction:fallback-override`) when LLM misses extraction but deterministic fallback detects it.
- Extended hosted auth gate default coverage to include S11 multi-treatment case.
- Verified hosted realistic suite end-to-end: 12/12 scenarios pass with authenticated flow.
- Marked hosted release gate execution board item as done and moved GAP-19 to resolved.
- Hardened server trust boundary: `detectTreatmentIntentsV1` now rejects unauthenticated calls; added gate `gate-v10-server-llm-auth-boundary`.
- Logged deployment guardrail GAP-31: functions release target is missing in this repo (`firebase deploy --only functions` currently not configured).
- Wired functions deployment target in `firebase.json`, added gate `gate-firebase-functions-target`, and deployed active LLM callables selectively (no destructive legacy-function deletion).
- Normalized settings UI write path for shared medical defaults: V10 settings now uses medical-default patch helpers for anesthesia/isolation/capping (practice+user) instead of direct legacy-field writes.
- Added gate `gate-v10-settings-medical-default-write-path` and patch-helper unit coverage to prevent regression to legacy-only UI writes.
- Hardened settings persistence: shared medical defaults are now stored canonically under `medicalDefaults` in V10 settings sanitizer payload (legacy mirror fields no longer persisted in write path).
- Added gate `gate-v10-settings-storage-normalized-medical-defaults` to prevent regressions in storage payload shape.
- Hardened runtime settings state canonicalization: after normalization/migration in `useSettings`, shared legacy mirror fields are stripped from live state so V10 reads from one normalized source.
- Added gate `gate-v10-settings-runtime-canonicalization` and unit coverage for mirror-stripping helpers.
- Added shared `canonicalizeSettingsInput` helper and wired it at V10 pipeline entry (`runV10`) so legacy/loose test-repro settings payloads are normalized before use.
- Canonicalized exported v4 clinical truthcases settings via the same helper to reduce legacy fixture drift.
- Added gates `gate-v10-settings-pipeline-canonicalization` and `gate-v10-clinical-truthcases-settings-canonicalization`.
- Finalized legacy-read cutover guardrails for shared medical defaults:
  - exported runtime getters in `medicalDefaults.ts` now read canonical `medicalDefaults` only (no legacy mirror fallback),
  - migration compatibility remains only in explicit normalization/canonicalization helpers.
- Added gate `gate-v10-settings-no-legacy-mirror-read-fallback` and updated askback settings gates to assert normalized-domain inputs.
- Hardened preanalysis fallback against over-segmentation noise:
  - low-confidence clauses without explicit treatment signal are skipped after the first detected intent,
  - new guard gate `gate-v10-preanalysis-noise-segment-skip` locks this behavior.
- Hardened preanalysis contract + confirmation lanes:
  - treatment ids are now strict allowlist only (`fuellung`, `endo`, `extraction`, `crown_prep`) even if additional packs exist,
  - confirmation lane options are bound to the same allowlist (`gate-v10-intent-confirm-options-allowlist`),
  - duplicate intent collapse now preserves uncertainty only when truly present, and explicit “am selben Zahn” phrasing resolves without forced confirmation.
- Expanded overlap coverage in fallback preanalysis:
  - added deterministic triple-overlap fixture (`crown_prep + fuellung same tooth + extraction`),
  - added gate `gate-v10-preanalysis-triple-overlap-deterministic`,
  - extended fixture-coverage gate to require at least one deterministic triple-overlap path.
- Hardened marker-poor fluent dictation segmentation for fallback preanalysis:
  - added ASCII connector aliases (`zusaetzlich`, `anschliessend`, `ausserdem`) and sentence-boundary splitting (`. ! ?`) in V10 segment splitter,
  - sentence-dot split is decimal-safe (no split for values like `120.50`),
  - added regression gate `gate-v10-preanalysis-marker-poor-flow` and dedicated splitter tests (`segmentDictation.test.ts`).
- Re-ran consolidated release baseline (`v10:audit:consolidated`) and realistic browser suite (`e2e/v10-realistic-praxis-test.e2e.spec.ts`): green (12/12).
- Hardened audit truth path:
  - `v10:real-dictation-check` now fails fast and supports explicit expected phase (`output`/`questions`),
  - `v10:reality-check` fixed source paths + legacy question alias normalization + deterministic chip serialization,
  - reality fixtures aligned to current V10 defaults/askback behavior (`10/10` scenarios green).
- Hardened LLM-path assurance:
  - `doctor:online` now validates server LLM path using `chat/completions` (`OPENAI_API_KEY`) and reports if the key was derived from VITE fallback for local runs.
  - `v10:real-dictation-check` now enforces LLM extraction path (`method=llm`, `llmError=none`) by default and fails on fallback-only runs.
  - `createV10Session` now exposes `v10TraceLines` in output debug so extraction method is auditable in script runs.
  - hosted-aware assertions added to realistic V10 browser suite: hosted runs must show `preanalysis=llm`, `extraction=llm`, and no fallback banner.

## 2026-02-15

- Added handoff snapshot (`status-2026-02-15.md`) with current goals and next steps.
- Extended KZV/forensic documentation inventory (BGB/StrlSchG/QBÜ‑RL‑Z/MKV).
- Clarified output length policy (kurz/mittel/lang invariants).
- Cleaned medical source registry and aligned DGZMK endo anchors.
- Updated known gaps with P0/P1 migration blockers.
- Wired strict forensic evidence askbacks into procedure bundles (fuellung + endo) and hardened gate modes (WARN/BLOCK).
- Added review + trace provenance extensions (fact source labels and code->chip->fact chain visibility).
- Added KB release pinning hooks (`kbReleaseId`) for pipeline/session/multi-treatment runs.
- Added consolidated audit runner (`npm run v10:audit:consolidated`) and onboarding contract doc.
- Started settings domain normalization: introduced `medicalDefaults` (practice/user), mirrored legacy keys for compatibility, and added parity tests in settings + pipeline.

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 397
- Artifacts: 40

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: 44

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: 45

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: 46

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: 48

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: 48

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-29 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 398
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 399
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 346
- Test files: 380
- Artifacts: TBD

## 2025-12-30 (unknown)

- Runtime files: 347
- Test files: 388
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 347
- Test files: 388
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 355
- Test files: 388
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 362
- Test files: 389
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 362
- Test files: 389
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 364
- Test files: 389
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 364
- Test files: 390
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 364
- Test files: 392
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 364
- Test files: 392
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 369
- Test files: 398
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 369
- Test files: 401
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 402
- Artifacts: TBD

## 2026-02-01

- Added headless deterministic multi-treatment scenario suite (Endo + Fuellung + Extraction).
- Added howto doc: `howto/v10-scenario-suites.md` and linked from `README.md`.

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 402
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 402
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 403
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 403
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 403
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 403
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 404
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 404
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 404
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 404
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 404
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 404
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 404
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 404
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 370
- Test files: 407
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 371
- Test files: 408
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 371
- Test files: 411
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 371
- Test files: 413
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 371
- Test files: 414
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 371
- Test files: 415
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 371
- Test files: 415
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 371
- Test files: 415
- Artifacts: TBD

## 2025-12-31 (unknown)

- Runtime files: 374
- Test files: 415
- Artifacts: TBD

## 2026-01-01 (unknown)

- Runtime files: 374
- Test files: 417
- Artifacts: TBD

## 2026-01-01 (unknown)

- Runtime files: 374
- Test files: 422
- Artifacts: TBD

## 2026-01-29 (Verification & Stabilization)

### Summary
Comprehensive verification and stabilization of the V10 pipeline. All identified regressions fixed, TypeSafety hardened, and hybrid fallback mechanism for questions established.

### Key Achievements
1. **MKV Askback Suppression Fixed**:
   - `runV10.ts` now correctly detects "Komposit", "nur Kasse", and €-amounts to suppress unnecessary MKV questions.
   - Verified via `gate-mkv-minimal-askback-v2` and smoke tests.

2. **Chip Precedence Fixed**:
   - Dictated chips (e.g. `Leitungsanästhesie`) now correctly override user settings/defaults.
   - Core invariants preserved (dictation > settings).

3. **Medical Question Fallback (Hybrid Model)**:
   - **Problem**: New Rule Engine (`applyMedicalKb`) was missing rules for vital questions (Vitality, Percussion).
   - **Fix**: Implemented fallback in `runV10.ts` to allow `QuestionServiceV2` (Matrix) questions when KB is silent.
   - **Benefit**: Ensures safety net during migration while prioritizing new rules where they exist.

4. **Type Safety Hardening**:
   - Fixed 8 strict-mode TypeScript errors in `runV10.ts` (casts, type narrowing).

5. **Verification**:
   - Automated Smoke Test Suite established covering 5 critical paths.
   - Full Test Suite Passing (3511 tests).

- Runtime files: 383
- Test files: 468
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 472
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 472
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 473
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 473
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 473
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 473
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 473
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 474
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 474
- Test files: 519
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 474
- Test files: 520
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 476
- Test files: 520
- Artifacts: TBD

## 2026-02-14 (unknown)

- Runtime files: 477
- Test files: 520
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 483
- Test files: 572
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 483
- Test files: 572
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 483
- Test files: 572
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 484
- Test files: 572
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 484
- Test files: 573
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 485
- Test files: 574
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 485
- Test files: 575
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 485
- Test files: 577
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 485
- Test files: 578
- Artifacts: TBD

## 2026-02-15 (unknown)

- Runtime files: 485
- Test files: 580
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 489
- Test files: 591
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 489
- Test files: 592
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 489
- Test files: 592
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 489
- Test files: 593
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 489
- Test files: 594
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 489
- Test files: 595
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 490
- Test files: 597
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 490
- Test files: 597
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 609
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 610
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 611
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 613
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 614
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 614
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 615
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 615
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 615
- Artifacts: TBD

## 2026-02-16 (unknown)

- Runtime files: 491
- Test files: 615
- Artifacts: TBD

## 2026-02-17 (unknown)

- Runtime files: 568
- Test files: 658
- Artifacts: TBD

## 2026-02-17 (unknown)

- Runtime files: 568
- Test files: 661
- Artifacts: TBD
