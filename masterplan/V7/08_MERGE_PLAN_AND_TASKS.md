# V7 Merge Plan and Tasks

## Purpose
Prioritized task list with effort estimates and affected files.

---

## Priority Legend
- 🔴 **Critical** — Blocks data flow, must fix immediately
- 🟡 **Important** — Improves quality, should fix soon
- 🟢 **Nice-to-have** — Polish, can defer

---

## Tasks

### 🔴 Critical

| # | Task | Effort | Files | Status |
|---|------|--------|-------|--------|
| 1 | ~~ID Translation Layer~~ | 2h | `answerIdTranslator.ts`, `chipResolver.ts` | ✅ DONE |
| 2 | ~~Expand AnswerMap patterns~~ | 30m | `fuellung_answer_map.json` | ✅ DONE |
| 3 | Add missing `tiefe` mapping | 15m | `fuellung_answer_map.json` | ✅ DONE |
| 4 | Verify tooth/surfaces flow | 1h | `outputComposer.ts`, `extractionService.ts` | 🔲 TODO |

**Task 4 Details:**
- Check why "Zahnangabe fehlt" appears
- Verify extraction populates tooth correctly
- Verify outputComposer receives tooth
- Add fallback question if extraction fails

---

### 🟡 Important

| # | Task | Effort | Files | Status |
|---|------|--------|-------|--------|
| 5 | Fix tsconfig for Vite types | 15m | `tsconfig.json` | 🔲 TODO |
| 6 | Add debug snapshot helper | 30m | `pipeline/debugSnapshot.ts` | 🔲 TODO |
| 7 | Migrate V6 types to contracts | 2h | `useDocudentV6.ts`, `contracts/` | 🔲 TODO |
| 8 | Add "tooth question" if missing | 1h | `questionService.ts`, `questionBank.json` | 🔲 TODO |

**Task 5 Details:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

**Task 8 Details:**
- If extraction has `tooth: null`, generate question "Welcher Zahn?"
- Add tooth question to questionBank with options 11-48

---

### 🟢 Nice-to-have

| # | Task | Effort | Files | Status |
|---|------|--------|-------|--------|
| 9 | Glob loader for answer maps | 1h | `chipResolver.ts` | 🔲 TODO |
| 10 | Glob loader for templates | 1h | `outputComposer.ts` | 🔲 TODO |
| 11 | Multi-treatment support | 4h | Multiple | 🔲 TODO |
| 12 | V6 parity UI polish | 2h | V7 components | 🔲 TODO |

---

## Test Coverage

| Test File | Guards | Status |
|-----------|--------|--------|
| `answer-translator.test.ts` | ID translation | ✅ 14 tests |
| `contract-drift.test.ts` | Contract sync | ✅ |
| `no-logic.test.ts` | Forbidden patterns | ✅ |
| `reality-flow.test.ts` | E2E flow | ✅ |
| `reality-integration.test.ts` | SSOT integration | ✅ |
| `render.test.tsx` | Component render | ✅ |

**Total: 55/55 passing**

---

## Tests to Add

| Test | Guards | Priority |
|------|--------|----------|
| Tooth/surfaces flow | Extraction → Output | 🔴 |
| Full E2E with answers | Questions → Output text | 🟡 |
| MKV flag propagation | hasMKV → mehrschicht chip | 🟡 |

---

## Definition of Done

After fixing all 🔴 tasks:
1. "36 mod tief" dictation → no "Zahnangabe fehlt" warning
2. ViPr+, Perk-, Kofferdam answers → appear in output text
3. All 55+ tests passing
4. DEV logs show clean translation: semantic → canonical
