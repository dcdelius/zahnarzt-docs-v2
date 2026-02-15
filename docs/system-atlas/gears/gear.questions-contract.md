# Gear: Questions Contract

**Owner:** V10 Pipeline  
**Status:** ✅ Locked

## DynamicQuestion Contract

```typescript
interface DynamicQuestion {
    id: string;               // Unique question ID
    questionKey?: string;     // SSOT key (medical_kb.askbacks[].questionKey or QuestionServiceV2)
    category: 'medical' | 'forensic' | 'upsell' | 'mkv' | 'rule';
    question: string;         // Prompt text for user (SSOT)
    type?: 'single' | 'number' | 'multi';
    options?: QuestionOption[];  // REQUIRED for type='single'!
    medicalSeverity?: 'hard' | 'soft';
}

interface QuestionOption {
    id: string;
    label: string;           // UI display text
    dataValue?: unknown;     // Value stored as answer (SSOT)
}
```

## Contract Invariants

| Rule | Enforcement |
|------|-------------|
| `type='single'` requires `options[]` | Compiler DEV error + UI error card |
| Answers = `option.dataValue` | UI stores string, never boolean |
| KB is SSOT for options | `medical_kb.v1.json` askbacks |
| No raw "true"/"false" in output | Renderer boolean guard |

## Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│ medical_kb.v1   │───▶│ medicalAskback   │───▶│ QuestionsFlow  │
│   askbacks[]    │    │ Adapter          │    │     V2         │
│   .options[]    │    │ (+ QuestionSvc)  │    │                │
└─────────────────┘    └──────────────────┘    └────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   Output Text   │◀───│  renderFromKb    │◀───│   Answers      │
│  (no booleans)  │    │    Chips()       │    │ (dataValue)    │
└─────────────────┘    └──────────────────┘    └────────────────┘
```

## Key Files

| Purpose | File |
|---------|------|
| Schema | `src/docudent/medical_kb/schema.v1.ts` |
| KB Data | `src/docudent/medical_kb/medical_kb.v1.json` |
| Medical askback adapter | `src/docudent/v10/medical/medicalAskbackAdapter.ts` |
| Non-medical questions | `src/docudent/core/questions/questionServiceV2.ts` |
| UI | `src/docudent/v10/components/QuestionsFlowV2.tsx` |
| Renderer | `src/docudent/v10/renderer/renderFromKbChips.ts` |

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Error card in UI | Single question missing options | Add options to KB askback |
| "true"/"false" in output | Boolean in context | Check answer storage, guard renderer |
| Empty question text | Missing `name` in KB | Add `name` to askback definition |

## Verification

```bash
# Gates (examples)
npx vitest run gate-askback-sufficiency
npx vitest run gate-v10-ui-state-machine

# Build
npm run build
```

## Data-TestIDs

| TestID | Purpose |
|--------|---------|
| `v10-docudent-page` | Page reality check |
| `v10-questions-flow-v2` | Component reality check |
| `question-row-{id}` | Individual question |
| `option-{label}` | Option button |
| `error-no-options` | Contract violation |
