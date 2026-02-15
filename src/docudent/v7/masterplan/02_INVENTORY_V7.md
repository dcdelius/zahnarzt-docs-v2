# V7 Inventory

## Purpose
Complete V7 file listing with responsibilities and data flow role.

---

## Pipeline Layer

| File | Purpose | Data Flow Role |
|------|---------|----------------|
| `v7/pipeline/index.ts` | Single entry point | Orchestrates all steps |
| `v7/pipeline/types.ts` | Local type re-exports | Contract bridge |

## Hooks

| File | Purpose | Data Flow Role |
|------|---------|----------------|
| `v7/hooks/useV7Pipeline.ts` | React state wrapper | Holds answers Map, triggers pipeline |

## UI Components

| File | Purpose | Data Flow Role |
|------|---------|----------------|
| `v7/components/QuestionRenderer.tsx` | Render questions | Calls onAnswer(questionId, optionId) |
| `v7/components/QuestionsLayout.tsx` | Two-column layout | Passes answers to children |
| `v7/components/QuestionsCard.tsx` | Glass card wrapper | Display only |
| `v7/components/SummaryChips.tsx` | Extracted data display | Reads extracted prop |
| `v7/components/StepDots.tsx` | Progress indicator | Reads currentState |
| `v7/components/OutputRenderer.tsx` | Final output display | Reads output prop |
| `v7/components/WarningCard.tsx` | Warning display | Reads warnings prop |
| `v7/components/InsuranceSelector.tsx` | GKV/PKV toggle | Sets insuranceType |
| `v7/components/TextLengthSelector.tsx` | Text length toggle | Sets textLength |
| `v7/components/TreatmentSelector.tsx` | Treatment picker | Sets treatmentId |
| `v7/components/ActionDock.tsx` | Bottom actions | Triggers reset/copy/export |
| `v7/components/PrimaryCTAButton.tsx` | Submit button | Triggers runPipeline |
| `v7/components/HeroSculpture.tsx` | 3D tooth visual | Reads tooth number |
| `v7/components/DictationAura.tsx` | Recording effect | Visual only |

## Pages

| File | Purpose | Data Flow Role |
|------|---------|----------------|
| `v7/pages/DocudentV7Page.tsx` | Main page | Coordinates all components |

## Tests

| File | Purpose | Guards |
|------|---------|--------|
| `__tests__/answer-translator.test.ts` | ID translation | Canonical ID mapping |
| `__tests__/contract-drift.test.ts` | Contract sync | No inline type copies |
| `__tests__/no-logic.test.ts` | Forbidden patterns | No business logic in UI |
| `__tests__/reality-flow.test.ts` | E2E flow | State transitions |
| `__tests__/reality-integration.test.ts` | SSOT integration | Question/chip alignment |
| `__tests__/render.test.tsx` | Component render | UI rendering |

---

## Core/KnowledgeBase Layer (Shared)

| File | Purpose | Data Flow Role |
|------|---------|----------------|
| `logic/answerIdTranslator.ts` | Semantic → Canonical | Translates before chip resolution |
| `logic/chipResolver.ts` | Answers → Chips | Determines active chips |
| `logic/outputComposer.ts` | Chips → Output | Generates final text |
| `logic/treatmentEngine.ts` | Chip definitions | Provides chip metadata |
| `questions/questionBank.ts` | Question loader | Loads JSON via glob |
| `questions/fuellung_question_bank.json` | Question definitions | Semantic IDs |
| `mappings/fuellung_answer_map.json` | Answer → Chip mapping | Canonical patterns |

---

## Data Flow Summary

```
1. DocudentV7Page
   ↓ dictation, settings
2. useV7Pipeline.runPipeline()
   ↓ calls
3. pipeline.run(input)
   ↓ step 1
4. extractionService.extractFromDictation(dictation)
   ↓ returns ExtractedData
5. questionService.generateQuestions(extracted)
   ↓ returns DynamicQuestion[]
6. [User answers in QuestionRenderer]
   ↓ answers Map populated
7. pipeline.run(input) [second call]
   ↓ step 4
8. outputService.generateFinalOutput({extracted, answers})
   ↓ calls
9. chipResolver.resolveActiveChipIds()
   ↓ uses answerIdTranslator, returns chipIds[]
10. outputComposer.composeOutput()
    ↓ returns ComposedOutput
11. UI renders OutputRenderer
```

---

## Critical ID Generation Points

| Location | Generates | Format |
|----------|-----------|--------|
| `questionBank.json:key` | question.id | `vitality`, `isolation` |
| `questionBank.json:option.id` | option.id | `pos`, `kofferdam` |
| `answerIdTranslator.ts` | canonical IDs | `kofferdam` → `yes` |
| `answer_map.json:answers` | chip activation | `yes` → `"kofferdam"` chip |
