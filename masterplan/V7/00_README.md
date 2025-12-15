# V7 Masterplan — README

## TL;DR
V7 is the new pipeline architecture for Docudent treatment documentation.  
It separates **UI** (V7 frontend) from **Logic** (V6/core services) with strict contracts.

## Current Status
- **Tests**: 55/55 passing (41 original + 14 answer-translator)
- **Known Issues**: 
  - ID mismatches between QuestionBank and AnswerMap (fixed via `answerIdTranslator.ts`)
  - `import.meta.glob` lint errors (runtime works, tsconfig needs vite/client types)
- **Last Update**: 2025-12-13

---

## Navigation Index

| File | Purpose |
|------|---------|
| [00_README.md](./00_README.md) | This file — overview + navigation |
| [01_INVENTORY.md](./01_INVENTORY.md) | Complete file inventory (V7 + core) |
| [02_DATAFLOW_MAP.md](./02_DATAFLOW_MAP.md) | End-to-end data flow + ID transforms |
| [03_CONTRACTS_SSOT.md](./03_CONTRACTS_SSOT.md) | Contract files + what's SSOT |
| [04_CANONICAL_IDS_AND_MAPPING.md](./04_CANONICAL_IDS_AND_MAPPING.md) | Question/Option ID translation |
| [05_LOADERS_AND_VITE_COMPAT.md](./05_LOADERS_AND_VITE_COMPAT.md) | Vite-compatible loaders |
| [06_DEBUG_TRACING.md](./06_DEBUG_TRACING.md) | Reality trace + DEV logging |
| [07_UI_FLOW_AND_VISIBILITY.md](./07_UI_FLOW_AND_VISIBILITY.md) | State machine + control visibility |
| [08_MERGE_PLAN_AND_TASKS.md](./08_MERGE_PLAN_AND_TASKS.md) | Prioritized task list |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         V7 FRONTEND                              │
│  DocudentV7Page → useV7Pipeline → pipeline.run()                │
│  QuestionRenderer → QuestionsLayout → OutputRenderer            │
└────────────────────────────┬────────────────────────────────────┘
                             │ calls
┌────────────────────────────▼────────────────────────────────────┐
│                      V7 PIPELINE                                 │
│  src/docudent/v7/pipeline/index.ts                              │
│  - orchestrates extractFromDictation → generateQuestions        │
│  - orchestrates generateFinalOutput                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ imports
┌────────────────────────────▼────────────────────────────────────┐
│                    V6/CORE SERVICES                              │
│  extractionService.ts → questionService.ts → outputService.ts   │
│  chipResolver.ts → treatmentEngine.ts → outputComposer.ts       │
└─────────────────────────────────────────────────────────────────┘
                             ▲ uses
┌────────────────────────────┴────────────────────────────────────┐
│                    KNOWLEDGE BASE                                │
│  questions/fuellung_question_bank.json                          │
│  mappings/fuellung_answer_map.json                              │
│  behandlungen/fuellung/fuellung_unified.json                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Principles
1. **NO logic in V7 frontend** — only orchestration + rendering
2. **Contracts as SSOT** — `src/docudent/contracts/*`
3. **Semantic IDs in QuestionBank** → **Canonical IDs in AnswerMap**
4. **Vite-compatible** — no `require()`, use `import.meta.glob`
5. **55 tests guard** regressions
