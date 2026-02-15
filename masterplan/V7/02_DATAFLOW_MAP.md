# V7 Data Flow Map

## Purpose
End-to-end data flow visualization showing inputs, outputs, and ID transforms at each stage.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ USER INPUT                                                       │
│ dictation: "36 mod tief"                                        │
│ insuranceType: 'GKV'                                            │
│ hasMKV: false                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: extractFromDictation(dictation)                         │
│ Location: src/docudent/v6/services/extractionService.ts         │
├─────────────────────────────────────────────────────────────────┤
│ OUTPUT: ExtractedData                                           │
│ {                                                                │
│   tooth: "36",                                                  │
│   surfaces: ["m", "o", "d"],                                    │
│   diagnosis: "Caries profunda",                                 │
│   mentioned: {                                                  │
│     vitality: undefined,      // → GAP                          │
│     percussion: undefined,    // → GAP                          │
│     kofferdam: undefined,     // → GAP                          │
│   }                                                             │
│ }                                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: generateQuestions(extracted, insuranceType, hasMKV)     │
│ Location: src/docudent/v6/services/questionService.ts           │
├─────────────────────────────────────────────────────────────────┤
│ INPUT: extracted.gaps                                           │
│ LOOKUP: questionBank.getQuestionDef('fuellung', key)            │
│                                                                  │
│ OUTPUT: DynamicQuestion[]                                       │
│ [                                                                │
│   { id: "vitality", options: [{id: "pos"}, {id: "neg"}] },     │
│   { id: "percussion", options: [{id: "pos"}, {id: "neg"}] },   │
│   { id: "isolation", options: [{id: "kofferdam"}, {id: "relativ"}] }, │
│   { id: "tiefe", options: [{id: "normal"}, {id: "tief"}] },    │
│   { id: "material", options: [{id: "caoh"}, {id: "mta"}] },    │
│ ]                                                                │
│                                                                  │
│ ⚠️ ID SOURCE: questionBank.json key field                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: UI collects answers                                     │
│ Location: QuestionRenderer.tsx → useV7Pipeline.answerQuestion() │
├─────────────────────────────────────────────────────────────────┤
│ OUTPUT: answers Map<string, unknown>                            │
│ {                                                                │
│   "vitality" → "pos",         // question.id → option.id       │
│   "percussion" → "neg",                                         │
│   "isolation" → "kofferdam",  // ⚠️ SEMANTIC IDs               │
│   "tiefe" → "tief",                                             │
│   "material" → "mta",                                           │
│ }                                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: resolveActiveChipIds(treatmentId, extracted, answers)   │
│ Location: src/docudent/core/billing/knowledgeBase/logic/        │
│           chipResolver.ts                                        │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ TRANSLATION LAYER: answerIdTranslator.translateAnswers()    │
│                                                                  │
│ SEMANTIC → CANONICAL:                                           │
│   "isolation" → "kofferdam"                                     │
│   "kofferdam" → "yes"                                           │
│   "relativ" → "no"                                              │
│   "tiefe" → "cavity_depth"                                      │
│   "tief" → "deep"                                               │
│                                                                  │
│ CANONICAL answers:                                              │
│ {                                                                │
│   "kofferdam" → "yes",                                          │
│   "cavity_depth" → "deep",                                      │
│   "vitality" → "pos",                                           │
│ }                                                                │
│                                                                  │
│ PROCESS: applyAnswersToChipSelection()                          │
│ LOOKUP: fuellung_answer_map.json → questionIdPatterns           │
│                                                                  │
│ OUTPUT: chipIds[]                                               │
│ ["exkavation", "komposit_basic", "finishing", "kofferdam", "cp"]│
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: processChipsToBilling() + composeOutput()               │
│ Location: treatmentEngine.ts + outputComposer.ts                │
├─────────────────────────────────────────────────────────────────┤
│ INPUT: chipIds[], insuranceType, textLength, extractedData     │
│                                                                  │
│ OUTPUT: ComposedOutput                                          │
│ {                                                                │
│   sections: BillingSection[],                                   │
│   billingCodes: BillingCode[],                                  │
│   warnings: ValidationWarning[],                                │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## ID Transform Table

| Stage | ID Type | Example | Source |
|-------|---------|---------|--------|
| QuestionBank | key | `isolation` | `fuellung_question_bank.json` |
| Question | id | `isolation` | questionService uses def.key |
| Option | id | `kofferdam` | `fuellung_question_bank.json` |
| Answer Map | questionId | `isolation` → translated to `kofferdam` | answerIdTranslator |
| Answer Map | answerId | `kofferdam` → translated to `yes` | answerIdTranslator |
| Answer Map pattern | questionIdPatterns | `["isolation", "kofferdam"]` | `fuellung_answer_map.json` |
| Chip | chipId | `kofferdam` | `fuellung_unified.json` |

---

## Where "Missing Tooth/Surfaces" Originates

1. **outputComposer.ts** checks `extractedData.tooth` and `extractedData.surfaces`
2. If `tooth === null` or `tooth === '?'` → adds warning "Zahnangabe fehlt"
3. Extraction provides these values, **not** question answers
4. **Root Cause**: If extraction fails, UI doesn't have a way to override

### Fix Strategy
- Questions for tooth/surfaces if extraction uncertain
- OR: Trust extraction (current implementation)
