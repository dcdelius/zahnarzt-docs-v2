# Multi-Treatment + LLM Orchestration Plan (2026-02-15)

## Purpose

This document captures the agreed direction after the latest V10 deep-dive:

- What already works reliably
- What failed in realistic UI/E2E and why
- How to evolve from single-treatment flow to realistic multi-treatment case orchestration
- How to use LLMs more aggressively without losing billing safety/determinism

This is the handoff reference for the next coding agent.

---

## 1) Current Baseline (Validated)

## 1.1 Firestore practice/user realism pack

Implemented and validated:

- Fictional practice seed with realistic materials/defaults:
  - `scripts/firestore/seedFictionalPracticeV10.ts`
- Firestore-backed scenario runner:
  - `scripts/v10/runV10MedicalScenarioRunWithFirestoreSettings.ts`
- npm scripts:
  - `settings:seed:fictional-practice`
  - `v10:medical-scenario-run:firestore`

Seeded demo data:

- Practice: `demo-praxis-nord-2026`
- Users:
  - `dr-anna-keller` (practice_admin)
  - `dr-ben-weiss` (provider)
  - `dr-clara-neumann` (provider)

Validation outcome:

- Online deps OK (`doctor:online`)
- Firestore docs present for practice + all user setting docs
- Realistic 10-case medical scenario suite passed for all 3 users

## 1.2 UI E2E root-cause fixed

Old E2E problem ("3/6 quality") was largely a test harness issue:

- Test sometimes read Post-Analysis view as final output
- Wrong selector strategy (`output-fulltext` only)
- Billing extraction looked only for `BEMA_/GOZ_` tokens
- Freitext askbacks were not always answered (question flow could stall)

Fixes in:

- `e2e/v10-realistic-praxis-test.e2e.spec.ts`

New behavior:

- Explicitly enters real OutputFlow (`Zum Output`)
- Waits on `v10-output-text` and checks `Behandlungsdokumentation` heading
- Billing extracted from:
  - explicit code tokens, and
  - BEMA/GOZ count header fallback
- Deterministic handling of askback inputs (`input-*` + `textarea`)
- Treatment is explicitly selected per scenario

Result:

- Realistic 6-scenario browser E2E run: pass.

---

## 2) Core Product Gap (Still Open)

Single-treatment runs are stable, but realistic dental dictation often contains overlapping procedures:

- Endo + same-tooth build-up
- Crown prep + build-up
- Multi-tooth mixed interventions in one narration
- Shared clinical steps reused across treatments (LA/isolation/etc.)

Current risk:

- If treatment mode is wrong, dictation can be forced through the wrong pack.
- The system still lacks first-class multi-treatment intent orchestration from one fluent dictation.

---

## 3) Target Architecture

## 3.1 Principle

LLM performs semantic pre-structuring; deterministic procedure/billing graph remains authoritative.

- LLM: "what likely happened"
- Procedure Graph + gates: "what is allowed and billable"

## 3.2 Two-stage execution model

1) **LLM Preanalysis (Intent Graph)**
- Input: raw dictation
- Output: strict schema:
  - intent list (`treatmentId`, `tooth`, `step/phase`, `confidence`, `evidenceSpans`)
  - shared facts candidates (LA, isolation, imaging)
  - uncertainty flags

2) **Deterministic Orchestration**
- For each intent:
  - route to treatment Procedure Graph
  - run askback generation
  - resolve chips/billing
- Then run cross-instance combinability and deterministic aggregation.

## 3.3 Non-negotiable invariants

- No intent without evidence span
- No billing ref without instance provenance
- Same input + same settings + same answers => same output/hash
- LLM uncertainty never silently changes billing; it triggers confirmation askbacks

---

## 4) UI/UX Target (Step-2 evolution)

Goal: fast and cognitively light for dentists.

Proposed Step-2 structure:

- "Detected Treatments" board (e.g. 3 lanes/cards)
- Each lane has:
  - tooth + treatment + confidence + source snippet
  - only relevant askbacks for that lane
- Shared-fact strip (LA/isolation etc.) applied once, referenced by lanes
- Quick controls:
  - keyboard-first optioning
  - one-click confirm for high-confidence intents

Motion/style direction:

- Framer Motion staggered reveal for intent cards
- Clear provenance chips (`dictation/settings/askback/manual`)
- Keep density high but avoid noisy controls

---

## 5) Implementation Plan (Exact Sequence)

## Phase A — Contracts + Gates (foundation)

Deliverables:

- New contract type: `TreatmentIntentV1`
- Zod/schema validator for preanalysis payload
- Gate tests:
  - missing evidence span => fail
  - invalid treatment id => fail
  - deterministic serialization for intent graph

Success criteria:

- Intent contract is compile-time + runtime validated
- Failing inputs blocked before pipeline execution

## Phase B — LLM Preanalysis Service

Deliverables:

- `preanalysis.detectTreatmentIntents` (strict JSON output only)
- confidence and uncertainty fields
- replay fixtures for key dictation families

Guardrails:

- If parse/validation fails => fallback safe mode + explicit confirmation step
- No direct billing decisions from this layer

## Phase C — Case Orchestrator

Deliverables:

- Orchestrator that maps intents to multiple Procedure Graph runs
- shared-fact normalization
- deterministic aggregation order

Gates:

- Missing event bundle per instance => warn/block (existing strategy, instance-level)
- Unknown chip emitter => warn/block
- No silent instance drop

## Phase D — Step-2 UI upgrade

Deliverables:

- Intent confirmation UI
- Lane-based askback UX
- provenance labels visible in controls

Validation:

- Browser E2E for 6 mixed-flow cases
- focus on speed-to-complete and zero dead-end states

## Phase E — Consolidated audits

Deliverables:

- Cross-instance billing/combinability audit suite
- online test runbook (with network + Firestore settings)
- atlas docs synced to runtime behavior

---

## 6) Immediate Next Sprint Scope (Recommended)

Smallest valuable vertical slice:

1. Implement intent contract + gates
2. Build one mixed case end-to-end:
   - "Endo + same-tooth build-up in one dictation"
3. Add UI confirm step for exactly that case family
4. Ship deterministic E2E and replay tests

Why:

- Highest product value with bounded risk
- Proves orchestration model before scaling to all pack combinations

---

## 7) Known Risks and Decisions

Risks:

- LLM over-segmentation (too many intents)
- Ambiguous tooth/step references in free speech
- Cross-treatment shared-fact leakage

Mitigations:

- confidence thresholds + explicit confirm UI
- evidence span requirement
- shared-fact registry with explicit scope (`global`, `instance`, `tooth`)

Open decisions to settle early:

- Confidence threshold policy for auto-accept vs forced confirm
- How to represent temporal order across intents
- Whether mixed-case mode is always-on or auto-triggered

---

## 8) Repro / Validation Commands

Core checks used in this cycle:

- `npm run doctor:online -- --verbose`
- `npm run settings:seed:fictional-practice`
- `npm run v10:medical-scenario-run:firestore -- --practice-id=demo-praxis-nord-2026 --user-id=dr-anna-keller --file=scripts/v10/scenarios.v10.realworld.medical.json`
- `npm run v10:medical-scenario-run:firestore -- --practice-id=demo-praxis-nord-2026 --user-id=dr-ben-weiss --file=scripts/v10/scenarios.v10.realworld.medical.json`
- `npm run v10:medical-scenario-run:firestore -- --practice-id=demo-praxis-nord-2026 --user-id=dr-clara-neumann --file=scripts/v10/scenarios.v10.realworld.medical.json`
- `npx playwright test e2e/v10-realistic-praxis-test.e2e.spec.ts --reporter=line`

---

## 9) Handoff Notes for Next Agent

- Do not treat current single-treatment stability as sufficient for real-world dictation complexity.
- Keep LLM in preanalysis/planning role, not final billing authority.
- Any multi-treatment implementation must ship with hard gates, not best-effort behavior.
- Preserve deterministic behavior as release blocker.
