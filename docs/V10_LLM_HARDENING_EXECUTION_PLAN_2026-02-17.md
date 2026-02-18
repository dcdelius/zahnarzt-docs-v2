# V10 LLM Hardening Execution Plan (2026-02-17)

## Mission
Deliver a production-ready V10 flow where realistic long-form dental dictation is transformed into:
1. Correct treatment pre-sorting,
2. Minimal but mandatory follow-up questions,
3. Forensically sound and readable final documentation text,
4. Billing-safe output sourced from DB-backed references with combinability rules.

## Architectural Deep-Dive Summary
Current architecture is solid and already aligned with SSOT principles:
- Extraction and preanalysis are centralized (`core/extraction`, `v10/preanalysis`).
- Questioning and obligations are in dedicated engines (`v10/askbacks`, `v10/obligations`).
- Billing routing is DB/KB-driven and combinability-checked (`v10/billing`, `core/billing`).
- Rendering is section-based with optional LLM refinement guarded by safety checks (`v10/llm/forensicComposer.ts`, `v10/llm/textRefiner.ts`).

Recent hardening introduced:
- Better clause-level extraction prompt logic.
- Historical complaint demotion (prevents phantom active procedures).
- Context hint routing into extraction payload.

Remaining systemic gaps to close before practice-grade confidence:
1. Coverage gap: rich context extraction exists, but end-to-end use in askbacks/output must be proven for all treatment families.
2. Answer-to-text fidelity: answered critical askbacks must always be reflected in final text (no silent drops).
3. Extraction-only observability: we need a dedicated benchmark for raw LLM extraction quality before downstream logic.
4. Real-life regression discipline: no stable audited corpus yet that checks dictation -> extraction -> questions -> output -> billing together.
5. Formatting/legal readability consistency: output text quality must be consistently compliant in all paths.

## Non-Negotiable Constraints
- No hardcoded billing codes in business logic paths.
- Billing references must resolve through DB-backed mapping.
- Combinability validation must stay authoritative.
- No parallel architecture: extend existing modules only.
- Determinism preserved where contract requires determinism.

## Execution Blocks

### Block A - Extraction Intelligence Benchmark (LLM-only first)
Goal: objectively measure how well the prompt extracts structure + context from realistic prose.

Tasks:
- Build a dedicated extraction benchmark harness (no question/render side effects).
- Add a corpus of realistic prose dictations (multi-treatment, historical context, medication change, social/family context, follow-up notes).
- Record raw extraction JSON + normalized extraction + mismatch analysis.

Artifacts:
- `__reports__/llm-extraction-benchmark/*.json`
- `__reports__/llm-extraction-benchmark/summary.md`

Exit criteria:
- >= 90% correct treatment intent hinting for explicit treatment actions.
- >= 95% preservation of non-procedural context facts (in any context bucket).
- 0 critical false active-treatment promotions from pure historical complaints.

Weight: 20%

### Block B - Askback Coherence and Sufficiency
Goal: ensure extracted signals trigger the right mandatory/optional questions and no random drift.

Tasks:
- Build askback matrix tests per treatment family.
- Verify mapping from fact hints and unresolved hints into askbacks.
- Verify that context-only facts do not create irrelevant procedural askbacks.
- Verify obligation rules are satisfied or asked.

Artifacts:
- `__reports__/askback-matrix/*.json`
- `__reports__/askback-matrix/failures.md`

Exit criteria:
- 100% mandatory askbacks present for missing critical facts.
- < 5% unnecessary askbacks in clean dictations.
- Stable askback ordering and scoping in multi-treatment runs.

Weight: 15%

### Block C - Answer-to-Output Fidelity Contract
Goal: every critical answered item is guaranteed to appear in the final documentation where required.

Tasks:
- Define critical answer-to-text contract list per treatment.
- Add automated tests that compare answered fields vs rendered sections.
- Add negative checks: no text claims without fact support.

Artifacts:
- `src/docudent/v10/__tests__/gates/gate-documentation-fidelity-*.test.ts`
- `__reports__/fidelity-audit/*.md`

Exit criteria:
- 0 missing critical-answer renderings in gate suite.
- 0 unsupported claims in output sections.

Weight: 15%

### Block D - Output Quality and Forensic Readability
Goal: produce a legally usable, readable, section-consistent document in all routes.

Tasks:
- Normalize section output contracts (headings/order/spacing).
- Validate forensic composer and text refiner behavior under safety constraints.
- Add regression checks for malformed section concatenation.

Artifacts:
- `__reports__/output-quality/*.md`
- Additional output contract tests in `v10/__tests__/gates/`.

Exit criteria:
- 100% section format contract pass.
- No header concatenation or lowercase corruption in final text.
- Forensic LLM steps either apply safely or skip cleanly with trace transparency.

Weight: 10%

### Block E - Billing Integrity and DB Referencing Audit
Goal: guarantee billing integrity from chips to final billing refs.

Tasks:
- Run billing provenance audit for all target treatments.
- Verify no hardcoded code paths bypass DB mapping.
- Verify pack-specific allowlists and cross-pack leakage prevention.
- Re-run combinability checks on multi-treatment real cases.

Artifacts:
- `__reports__/billing-integrity/*.json`
- `__reports__/billing-integrity/violations.md`

Exit criteria:
- 0 non-DB billing emissions.
- 0 known cross-treatment leakage cases.
- 100% combinability checks pass or expected-block with explicit rationale.

Weight: 20%

### Block F - Real-Life End-to-End Praxis Validation
Goal: validate full behavior with realistic long prose dictations and complete protocol.

Tasks:
- Run 20+ realistic E2E cases in UI and pipeline harness.
- For each case capture:
  - Dictation text,
  - Extraction output,
  - Asked follow-up questions,
  - Given answers,
  - Final text,
  - Billing output,
  - Medical/forensic/billing assessment.
- Maintain case-by-case correction loop.

Artifacts:
- `__reports__/praxis-e2e-20/CASE_*.md`
- `__reports__/praxis-e2e-20/summary-scorecard.md`

Exit criteria:
- All critical cases medically plausible and forensically acceptable.
- Billing outputs consistent with expected treatment path + insurance context.
- No unresolved critical defects in top-priority scenario set.

Weight: 20%

## Progress Model (for each "weiter" checkpoint)
- Block A: 0-20%
- Block B: 20-35%
- Block C: 35-50%
- Block D: 50-60%
- Block E: 60-80%
- Block F: 80-100%

After each block:
- report achieved percentage,
- report hard findings,
- report fixes applied,
- report residual risk,
- state exact next step.

## Test Layers (Execution Order)
1. LLM extraction-only benchmark (fast iterations).
2. Pipeline unit/gate tests (logic safety).
3. Clinical suite truthcases (domain behavior).
4. UI E2E with realistic prose dictations.
5. Manual forensic review protocol for selected high-risk cases.

## Source-of-Truth and Medical Validation Notes
- Use official/primary sources for medical and billing validation (KZV/KZBV, BEMA/GOZ references, guideline-grade sources).
- Keep source links inside case reports for auditability.
- Distinguish explicitly: confirmed fact vs inference vs unresolved.

## Immediate Next Step
Start Block A:
- create extraction benchmark harness + first corpus batch (20 realistic long prose dictations),
- run baseline,
- publish first extraction quality report and defect taxonomy.
