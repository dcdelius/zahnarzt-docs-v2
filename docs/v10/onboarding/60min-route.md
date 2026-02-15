# 60-Minute Onboarding Route

**Goal**: Understand V10 pipeline end-to-end in 6 blocks × 10 min.

---

## Block 1: Entry Point (10 min)

### Why
Understand where execution starts and what the public API looks like.

### What to See
- Single entry point for all pipeline execution
- V7 shim that delegates to V10

### Files to Open

1. [src/docudent/v10/public.ts#L1-L32](src/docudent/v10/public.ts#L1-L32) — Public API surface
2. [src/docudent/v10/pipeline/runV10.ts#L242-L260](src/docudent/v10/pipeline/runV10.ts#L242-L260) — Main orchestrator entry
3. [src/docudent/v7/pipeline/index.ts#L49-L77](src/docudent/v7/pipeline/index.ts#L49-L77) — V7 shim (delegates to V10)

### Key Insight
> V7 `run()` is just a wrapper. All logic lives in runV10.

---

## Block 2: Extraction & Facts (10 min)

### Why
Understand how dictation becomes structured facts.

### What to See
- Extractor selection (stub vs LLM)
- Facts mapping from extraction

### Files to Open

1. [src/docudent/v10/extraction/selectExtractor.ts#L50-L80](src/docudent/v10/extraction/selectExtractor.ts#L50-L80) — Extractor selection
2. [src/docudent/v7/medical/extractionToFacts/index.ts#L1-L50](src/docudent/v7/medical/extractionToFacts/index.ts#L1-L50) — Facts builder
3. [src/docudent/v10/pipeline/runV10.ts#L295-L320](src/docudent/v10/pipeline/runV10.ts#L295-L320) — Extraction in orchestrator

### Key Insight
> `VITE_STUB_EXTRACTION=true` bypasses LLM for deterministic testing.

---

## Block 3: Medical Engine (10 min)

### Why
Understand how facts become chips and askbacks.

### What to See
- Rule evaluation from medical_kb.v1.json
- Chip emission logic

### Files to Open

1. [src/docudent/medical_kb/engine/applyMedicalKb.ts#L305-L350](src/docudent/medical_kb/engine/applyMedicalKb.ts#L305-L350) — Main engine
2. [src/docudent/medical_kb/medical_kb.v1.json](src/docudent/medical_kb/medical_kb.v1.json) — Rules source (scroll to `emit_chip`)
3. [src/docudent/v10/pipeline/runV10.ts#L127-L132](src/docudent/v10/pipeline/runV10.ts#L127-L132) — Engine call site

### Key Insight
> `emit_chip` rules define what billing items are generated.

---

## Block 4: Askbacks & Questions (10 min)

### Why
Understand how required questions are determined.

### What to See
- Question bank loading
- Askback compilation

### Files to Open

1. [src/docudent/v7/medical/askbacks/compileAskbacksToQuestions.ts#L1-L50](src/docudent/v7/medical/askbacks/compileAskbacksToQuestions.ts#L1-L50) — Compiler
2. [src/docudent/v7/medical/askbacks/questionBankAdapter.ts#L80-L95](src/docudent/v7/medical/askbacks/questionBankAdapter.ts#L80-L95) — Question bank loader
3. [src/docudent/core/billing/knowledgeBase/treatments/fuellung/question_bank.json](src/docudent/core/billing/knowledgeBase/treatments/fuellung/question_bank.json) — Example bank

### Key Insight
> `require_askback` in medical_kb triggers questions from question_bank.

---

## Block 5: Renderer & Billing (10 min)

### Why
Understand how chips become text and billing codes.

### What to See
- SSOT renderer
- unified.json structure

### Files to Open

1. [src/docudent/v7/output/renderFromKbChips.ts#L211-L260](src/docudent/v7/output/renderFromKbChips.ts#L211-L260) — SSOT renderer
2. [src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json#L1-L100](src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json#L1-L100) — Chip definitions
3. [src/docudent/v10/pipeline/runV10.ts#L451-L460](src/docudent/v10/pipeline/runV10.ts#L451-L460) — Renderer call site

### Key Insight
> Every text snippet and billing code comes from unified.json.

---

## Block 6: Combinability & Output (10 min)

### Why
Understand the final validation and output assembly.

### What to See
- Combinability check (BLOCK/WARN/PASS)
- Output assembly

### Files to Open

1. [src/docudent/v10/billing/combinability/checkCombinabilityFromKb.ts#L1-L50](src/docudent/v10/billing/combinability/checkCombinabilityFromKb.ts#L1-L50) — Combinability checker
2. [src/docudent/v10/kb/combinability/combinability_kb.v1.json](src/docudent/v10/kb/combinability/combinability_kb.v1.json) — Rules source
3. [src/docudent/v10/pipeline/runV10.ts#L478-L496](src/docudent/v10/pipeline/runV10.ts#L478-L496) — Combinability call and BLOCK handling

### Key Insight
> BLOCK verdict triggers `state=error`. No output is generated.

---

## Summary Checklist

After 60 minutes, you should be able to answer:

- [ ] Where is the single entry point?
- [ ] How does stub vs LLM extraction work?
- [ ] What triggers chip emission?
- [ ] Where do questions come from?
- [ ] How is billing text generated?
- [ ] What blocks output generation?
