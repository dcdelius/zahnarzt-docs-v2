# Merge Plan and Tasks

## Purpose
Step-by-step merge plan with prioritized tasks and acceptance criteria.

---

## Priority Legend
- 🔴 **P0 (Critical)**: Blocks correct output, fix immediately
- 🟡 **P1 (Important)**: Improves reliability, fix this sprint
- 🟢 **P2 (Nice-to-have)**: Polish, can defer

---

## Phase 1: Fix Core Data Flow (P0)

### Task 1.1: Verify Extraction → Output State Persistence
- [ ] Add trace to confirm extracted object is same instance across runs
- [ ] If state lost, fix useV7Pipeline to preserve extracted between question/output phases

**Files**: `v7/hooks/useV7Pipeline.ts`, `v7/pipeline/index.ts`  
**Acceptance**: G1 extraction tooth="36" visible in output composition logs

### Task 1.2: Add Golden Test for G1
- [ ] Create `v7/pipeline/__tests__/golden.test.ts`
- [ ] Implement G1 test with mock extraction (deterministic)
- [ ] Assert: tooth="36", surfaces=["m","o","d"], no warnings, no placeholders

**Files**: `v7/pipeline/__tests__/golden.test.ts`  
**Acceptance**: `npm test src/docudent/v7` passes with golden test

### Task 1.3: Fix Placeholder Resolution
- [ ] Audit outputComposer for all `{placeholder}` patterns
- [ ] Ensure each placeholder has a resolution source (chip or extracted)
- [ ] Add assertion: no placeholders in final output

**Files**: `logic/outputComposer.ts`  
**Acceptance**: G1 output contains no `{` or `}`

### Task 1.4: Verify answerIdTranslator E2E
- [ ] Add trace checkpoint `ANSWERS_CANONICAL`
- [ ] Verify all semantic IDs have canonical mappings
- [ ] Add test for unmapped ID warning

**Files**: `logic/answerIdTranslator.ts`, answer-translator.test.ts  
**Acceptance**: Console shows correct canonical translations for G1

---

## Phase 2: Improve Reliability (P1)

### Task 2.1: Add Trace Helper
- [ ] Create `v7/pipeline/trace.ts`
- [ ] Implement `createTracer()` with checkpoint logging
- [ ] Wire into pipeline.run()

**Files**: `v7/pipeline/trace.ts`, `v7/pipeline/index.ts`  
**Effort**: 1h

### Task 2.2: Fix tsconfig for Vite Types
- [ ] Add `"vite/client"` to tsconfig types
- [ ] Verify no more `import.meta.glob` lint errors

**Files**: `tsconfig.json`  
**Effort**: 15m

### Task 2.3: Add G2 and G3 Golden Tests
- [ ] Implement G2 (basic filling, no MKV)
- [ ] Implement G3 (single surface, PKV)
- [ ] Assert correct billing codes for each

**Files**: `v7/pipeline/__tests__/golden.test.ts`  
**Effort**: 1h

### Task 2.4: Migrate V6 Types to Contracts
- [ ] Update useDocudentV6.ts to import from contracts
- [ ] Remove inline ExtractedData definition
- [ ] Verify V6 still works

**Files**: `v6/hooks/useDocudentV6.ts`  
**Effort**: 30m

---

## Phase 3: Scaling (P2)

### Task 3.1: Glob Loader for Answer Maps
- [ ] Create `mappings/answerMapLoader.ts`
- [ ] Use import.meta.glob for auto-discovery
- [ ] Update chipResolver to use loader

**Files**: `mappings/answerMapLoader.ts`, `logic/chipResolver.ts`  
**Effort**: 1h

### Task 3.2: Add Second Treatment (Krone)
- [ ] Create `krone_question_bank.json`
- [ ] Create `krone_answer_map.json`
- [ ] Add ID translations to answerIdTranslator
- [ ] Verify auto-discovery works

**Files**: Multiple  
**Effort**: 2h

### Task 3.3: UI Parity Polish
- [ ] Review V6 → V7 visual parity
- [ ] Fix any missing elements
- [ ] Document in walkthrough

**Files**: V7 components  
**Effort**: 2h

---

## Fix Plan: Root Cause Closure

### Fix A: Answers Not Applying

**Root Cause**: Semantic question/option IDs don't match answer_map patterns

**Strategy**: Translation layer (DONE via `answerIdTranslator.ts`)

**Verification**:
1. Add trace `ANSWERS_CANONICAL`
2. Verify console shows `{kofferdam: "yes"}` not `{isolation: "kofferdam"}`
3. If wrong, check QUESTION_ID_MAP and OPTION_ID_MAP in translator

### Fix B: Placeholder Not Resolving

**Root Cause**: Template has `{material}` but no chip/extracted provides value

**Strategy**: 
1. Map material answer to `extractedDataForComposer.material`
2. OR add chip snippet for material

**Implementation**:
```typescript
// In outputService.ts, before calling composeOutput
const extractedDataForComposer = {
    tooth: extracted.tooth,
    surfaces: extracted.surfaces,
    material: answers.get('material') || extracted.mentioned?.material || '?',
    // ... other fields
};
```

### Fix C: Wrong Tooth / State Drift

**Root Cause**: Second pipeline run creates new extraction instead of reusing

**Strategy**: 
1. useV7Pipeline stores extracted in state
2. Second run (with answers) uses stored extracted, not fresh extraction

**Verification**:
1. Add trace showing same `traceId` for extraction and output
2. If different, extraction is being re-run

### Fix D: Missing Tooth Warnings

**Root Cause**: outputComposer checks `tooth === null || tooth === '?'`

**Strategy**:
1. Ensure extraction always sets tooth if detectable
2. If extraction fails, generate "tooth" question
3. Merge tooth answer into extracted before output

---

## Quick Wins (30 Minutes)

| Task | Time | Impact |
|------|------|--------|
| Add `ANSWERS_CANONICAL` trace | 5m | Debug visibility |
| Check extracted.tooth in output log | 5m | Identify state drift |
| Create golden.test.ts with G1 | 20m | Regression guard |

---

## Acceptance Criteria

### For G1 Dictation ("36 mod tief 120€ LA")
- [ ] Output shows tooth **36** (not 35)
- [ ] Output shows surfaces **m, o, d**
- [ ] No "Zahnangabe fehlt" warning
- [ ] No "Flächen fehlen" warning
- [ ] No `{material}` or other placeholders
- [ ] Billing codes include 13a (BEMA) and 2060 (GOZ)

### For All Tests
- [ ] `npm test src/docudent/v7` passes (55+ tests)
- [ ] Golden tests pass
- [ ] No unresolved placeholders in any output

---

## Definition of Done

1. ✅ All P0 tasks complete
2. ✅ Golden tests for G1, G2, G3 passing
3. ✅ Traces show consistent IDs across pipeline
4. ✅ No placeholders in any output section
5. ✅ 55+ tests passing
