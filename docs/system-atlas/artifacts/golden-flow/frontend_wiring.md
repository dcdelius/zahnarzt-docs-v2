# Frontend Wiring — V10 Golden Flow

**Ziel:** UI-Flow von Dictation → Askbacks → Output dokumentieren

---

## Wiring Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DocudentV10Page.tsx                            │
│  ┌──────────────┐                                                   │
│  │ dictation    │──────────────┐                                    │
│  │ (useState)   │              ▼                                    │
│  └──────────────┘    ┌─────────────────────┐                        │
│                      │ useV10Pipeline()    │                        │
│                      │  - runPipeline()    │                        │
│                      │  - answerQuestion() │                        │
│                      │  - result           │                        │
│                      └─────────┬───────────┘                        │
│                                │                                    │
│              ┌─────────────────┼─────────────────┐                  │
│              ▼                 ▼                 ▼                  │
│         state='questions'  state='output'   state='error'           │
│              │                 │                 │                  │
│              ▼                 ▼                 ▼                  │
│     ┌────────────────┐  ┌────────────────┐  ┌────────────┐          │
│     │ QuestionsFlowV2│  │   OutputFlow   │  │ ErrorPanel │          │
│     │  (V7 reexport) │  │ (V7 reexport)  │  └────────────┘          │
│     └────────────────┘  └────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step UI Flow

| Step | State | UI Component | data-testid |
|------|-------|--------------|-------------|
| 1 | idle | Dictation input | `dictation-input` |
| 2 | idle | "Dokumentieren" button | `run-pipeline-button` |
| 3 | processing | Loading spinner | `processing-spinner` |
| 4 | questions | QuestionsFlowV2 | `questions-container` |
| 5 | questions | Question row | `question-row-{id}` |
| 6 | questions | Answer button | `answer-{questionId}-{optionId}` |
| 7 | questions | "Fertigstellen" button | `complete-questions-button` |
| 8 | processing | Loading spinner | `processing-spinner` |
| 9 | output | OutputFlow | `output-container` |
| 10 | output | Billing codes | `billing-codes-list` |

---

## Key Wiring Points

### 1. Dictation → runV10

```typescript
// DocudentV10Page.tsx
const handleRun = async () => {
    await runPipeline();  // calls runV10 internally
};
```

### 2. hasAnyUnanswered → Questions

```typescript
// useV10Pipeline.ts
if (result.state === 'questions') {
    // Render QuestionsFlowV2
}
```

### 3. Answer → Chip Update

```typescript
// useV10Pipeline.ts
const answerQuestion = (questionId: string, value: unknown) => {
    answers.set(questionId, value);
    // Next runPipeline() will use these answers
};
```

### 4. Chips → Output

```typescript
// runV10.ts → renderFromKbChips()
const output = renderFromKbChips(chips, treatmentKb, config);
// output.fullText, output.billingCodes
```

---

## TestID Requirements

Für E2E Tests müssen diese TestIDs existieren:

| Component | TestID | Status |
|-----------|--------|--------|
| Dictation input | `dictation-input` | ✅ Exists |
| Run button | `run-pipeline-button` | ⚠️ Verify |
| Questions container | `questions-container` | ⚠️ Verify |
| Output container | `output-container` | ⚠️ Verify |
| Billing list | `billing-codes-list` | ⚠️ Verify |
