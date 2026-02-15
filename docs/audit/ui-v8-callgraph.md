# V8 Frontend Call Graph

**Main Entry**: `DocudentV7Page.tsx`

---

## Call Flow

```
DocudentV7Page.tsx
│
├── useV7Pipeline() ─────────────────────────────┐
│   Path: v7/hooks/useV7Pipeline.ts:110          │
│                                                 │
│   ┌─────────────────────────────────────────────┘
│   │
│   ├── runPipeline() [L271]
│   │   └── pipeline.run(input) [L288]
│   │       Path: v7/pipeline/index.ts:48
│   │       │
│   │       ├── toV10Input(input) [L51]
│   │       │   Path: v7/pipeline/adapters/toV10Input.ts
│   │       │
│   │       ├── runV10(v10Input) [L66]
│   │       │   Path: v10/pipeline/runV10.ts:242
│   │       │   (V10 ORCHESTRATOR)
│   │       │
│   │       └── fromV10Output(v10Output) [L69]
│   │           Path: v7/pipeline/adapters/fromV10Output.ts
│   │
│   ├── createInstancesAndRun() [L350]
│   │   └── runMultiTreatment(plan) [L387]
│   │       Path: v7/multitreatment/index.ts
│   │       │
│   │       └── (internal) → runV10Bundle()
│   │           Path: v10/pipeline/runV10Bundle.ts:102
│   │
│   └── runLastMultiPlan() [L444]
│       └── runMultiTreatment(plan) [L505]
│
├── <QuestionsFlowV2 /> ──────────────────────────
│   Path: v7/components/QuestionsFlowV2.tsx
│   Props: bundle, answers, onAnswer, onComplete
│
├── <QuestionsFlow /> ────────────────────────────
│   Path: v7/components/QuestionsFlow.tsx
│   Props: questions, answers, onAnswer, onComplete
│
├── <OutputFlow /> ───────────────────────────────
│   Path: v7/components/OutputFlow.tsx
│   Props: output, onReset, onEdit, combinability
│
└── <MultiOutputRenderer /> ──────────────────────
    Path: v7/components/MultiOutputRenderer.tsx
    Props: result, onReset
```

---

## State Machine

```
idle ──[submit]──► running ──► questions ──► output
  ▲                   │             │           │
  │                   ▼             │           │
  │                 error ◄────────┼───────────┘
  │                   │            │
  └───────[reset]─────┴────────────┘
```

---

## Key Files (Evidenced)

| File | Lines | Role |
|------|-------|------|
| `v7/pages/DocudentV7Page.tsx` | 1132 | Main page |
| `v7/hooks/useV7Pipeline.ts` | 612 | State + actions |
| `v7/pipeline/index.ts` | 97 | V10 shim |
| `v7/pipeline/adapters/toV10Input.ts` | ~80 | Input adapter |
| `v7/pipeline/adapters/fromV10Output.ts` | ~120 | Output adapter |
| `v10/pipeline/runV10.ts` | ~400 | V10 orchestrator |
| `v10/pipeline/runV10Bundle.ts` | ~200 | Multi-instance |
