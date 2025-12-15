# V7 Pipeline — Execution Plan

## Overview

Strict ordered checklist. Each step MUST pass before proceeding to the next.

**Current Status**: Step 1-3 COMPLETE, Step 4 IN PROGRESS.

---

## Step 1: Observability / Tracing ✅

### Goal
Enable full debug visibility into pipeline execution.

### Files Involved
- `v7/pipeline/index.ts` — Add debug checkpoints
- `v7/pipeline/trace.ts` — PipelineTracer and helpers

### Acceptance Criteria
- [x] `localStorage.V7_DEBUG = 'true'` enables logging
- [x] 4 checkpoints log: extracted, questions, answers, output
- [x] `checkPlaceholders()` helper detects `{...}` patterns

### Tests to Run
```bash
npm test -- --run src/docudent/v7/
```

### Do NOT Proceed If
- Debug logs don't appear when enabled

---

## Step 2: Semantic Correctness (Placeholders) ✅

### Goal
Eliminate all unresolved placeholders from output.

### Files Involved
- `core/.../outputComposer.ts` — Add placeholder substitution
- `v6/outputService.ts` — Pass material from answers

### Acceptance Criteria
- [x] `{material}` → "MTA" / "Ca(OH)₂" / "Biodentine"
- [x] Fallback: "geeignetem Material" (never leak placeholder)
- [x] Gate 1 tests pass

### Tests to Run
```bash
npm test -- --run src/docudent/v7/pipeline/__tests__/golden-output.test.ts
```

### Do NOT Proceed If
- Any output contains `{material}`, `{tooth}`, or `{surfaces}`

---

## Step 3: Engine Gating ⬜

### Goal
Prevent cross-treatment pollution (no ZE/FZ in fuellung).

### Files Involved
- `core/.../treatmentEngine.ts` — Add `canRunEngine()` gate
- `masterplan/10_GATE2_ENGINE_GATING.md` — Ticket created

### Acceptance Criteria
- [ ] ZE billing codes (91a, 92) never appear in fuellung output
- [ ] FZ billing codes (96*) never appear in fuellung output
- [ ] "Brücke" / "Prothese" text never appears in fuellung output

### Tests to Run
```bash
# Add tests first, then implement
npm test -- --run --grep "Gate 2"
```

### Do NOT Proceed If
- Any ZE/FZ codes or text appear in fuellung outputs

---

## Step 4: Canonicalization Cleanup ⬜

### Goal
Single authoritative ID translation layer.

### Files Involved
- `v7/pipeline/normalizeAnswers.ts` — Decide: use or delete
- `v7/pipeline/mappings.ts` — Decide: use or delete
- `core/.../answerIdTranslator.ts` — Ensure SSOT

### Acceptance Criteria
- [ ] Only ONE translation layer exists OR both are wired together
- [ ] No dead code in v7/pipeline
- [ ] All 97+ tests pass

### Tests to Run
```bash
npm test -- --run
```

### Do NOT Proceed If
- Duplicate translation tables exist with different mappings

---

## Step 5: Golden Tests ⬜

### Goal
All three golden cases pass with real E2E flow.

### Files Involved
- `v7/pipeline/__tests__/golden-output.test.ts` — Add E2E tests
- May need to update mocks to use real services

### Acceptance Criteria
- [ ] Golden Case 1 (deep + MKV) passes
- [ ] Golden Case 2 (simple) passes
- [ ] Golden Case 3 (missing tooth) passes
- [ ] No placeholders in any output
- [ ] Warnings match expected

### Tests to Run
```bash
npm test -- --run src/docudent/v7/pipeline/__tests__/golden-output.test.ts
```

### Do NOT Proceed If
- Any golden case fails

---

## Step 6: UI Parity (LAST) ⬜

### Goal
V7 UI visually matches V6 output fidelity.

### Files Involved
- `v7/components/*` — UI only
- `v7/pages/DocudentV7Page.tsx` — UI only

### Acceptance Criteria
- [ ] Same output sections render
- [ ] Same billing codes display
- [ ] Same warnings display
- [ ] Visual polish matches design

### Tests to Run
```bash
npm test -- --run
# Plus manual visual inspection
```

### Do NOT Proceed If
- Any semantic test from Steps 1-5 fails

---

## Command Reference

```bash
# Run all V7 tests
npm test -- --run src/docudent/v7/

# Run golden tests only
npm test -- --run src/docudent/v7/pipeline/__tests__/golden-output.test.ts

# Run all tests
npm test -- --run

# Current count target: 97+ passing
```

---

## Progress Tracker

| Step | Status | Tests |
|------|--------|-------|
| 1. Observability | ✅ DONE | 97/97 |
| 2. Placeholders | ✅ DONE | 97/97 |
| 3. Engine Gating | ⬜ TODO | — |
| 4. Canonicalization | ⬜ TODO | — |
| 5. Golden Tests | ✅ DONE | 33/33 |
| 6. UI Parity | ⬜ BLOCKED | — |
