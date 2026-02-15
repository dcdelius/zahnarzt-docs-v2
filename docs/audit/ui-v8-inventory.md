# V8 Frontend Inventory

**Generated**: 2025-12-26  
**Scope**: All UI components relevant to V10 pipeline wiring

---

## Architecture Overview

**V7** = Primary implementation (production)  
**V8** = "Jeton" UI variant (same backend, different layout)  
**Both use**: `useV7Pipeline` → `runV10()`

---

## V8 Folder Structure

```
src/docudent/v8/
├── app/
│   └── V8Router.tsx          # Routes for /docudent/v8/*
├── components/
│   ├── V8InsuranceSelector.tsx
│   └── V8TextLengthSelector.tsx
└── pages/
    └── DocudentV8Page.tsx    # Main page (Jeton layout)
```

**Key Insight**: V8 imports `useV7Pipeline` from V7 (L14), so **same backend**.

---

## 1. AppShell / Layout

| Component | Path | Purpose | V10 Status |
|-----------|------|---------|------------|
| AppShell | `v7/app/AppShell.tsx` | Premium shell with nav | N/A (layout) |
| V7Router | `v7/app/V7Router.tsx` | Route definitions | N/A |
| Navigation | `v7/app/Navigation.tsx` | Sidebar nav | N/A |
| designTokens | `v7/app/designTokens.ts` | CSS tokens | N/A |
| v7.css | `v7/app/v7.css` | Global styles | N/A |

---

## 2. Main Page

| Component | Path | Purpose | Data In | Data Out |
|-----------|------|---------|---------|----------|
| DocudentV7Page | `v7/pages/DocudentV7Page.tsx` (1132L) | Main entry | `useV7Pipeline()` | Renders current state |

**Pipeline Call Site**: 
- `useV7Pipeline.runPipeline()` → `pipeline.run()` → `runV10()` (L288)
- Multi: `runMultiTreatment()` → `runV10Bundle()`

---

## 3. Dictation Input

| Component | Path | Purpose |
|-----------|------|---------|
| Textarea | `DocudentV7Page.tsx:795-900` | Hero input zone |
| ActionDock | `v7/components/ActionDock.tsx` | Mic + Send buttons |
| DictationAura | `v7/components/DictationAura.tsx` | Recording visual |
| TreatmentSelector | `v7/components/TreatmentSelector.tsx` | Treatment picker |
| InsuranceSelector | `v7/components/InsuranceSelector.tsx` | GKV/PKV toggle |
| TextLengthSelector | `v7/components/TextLengthSelector.tsx` | Kurz/Mittel/Lang |

---

## 4. Multi-Tooth / Instances

| Component | Path | Purpose |
|-----------|------|---------|
| MultiInstancePanel | `v7/components/MultiInstancePanel.tsx` | Multi-tooth prompt |
| SegmentEditor | `v7/components/SegmentEditor.tsx` | Segment editing |
| MultiOutputRenderer | `v7/components/MultiOutputRenderer.tsx` | Bundle output |

**Hook API**:
- `createInstancesAndRun(instances)` → `runMultiTreatment()`
- `runLastMultiPlan()` → Retry after questions

---

## 5. Questions UI

| Component | Path | Purpose |
|-----------|------|---------|
| QuestionsFlow | `v7/components/QuestionsFlow.tsx` | Legacy flat questions |
| QuestionsFlowV2 | `v7/components/QuestionsFlowV2.tsx` (19KB) | Progressive disclosure |
| QuestionRenderer | `v7/components/QuestionRenderer.tsx` | Single question |
| QuestionsCard | `v7/components/QuestionsCard.tsx` | Card wrapper |

**Store**: `useV7Pipeline.answers: Map<string, unknown>`

**Multi-instance**: 
- `instanceAnswers: Record<string, Map<string, unknown>>`
- `answerInstanceQuestion(instanceId, qId, value)`

---

## 6. Output UI

| Component | Path | Purpose |
|-----------|------|---------|
| OutputFlow | `v7/components/OutputFlow.tsx` (21KB) | Single output |
| OutputRenderer | `v7/components/OutputRenderer.tsx` | Text sections |
| SummaryChips | `v7/components/SummaryChips.tsx` | Billing summary |
| EditableSummaryChip | `v7/components/EditableSummaryChip.tsx` | Editable chips |
| WarningCard | `v7/components/WarningCard.tsx` | Combinability warnings |

**Data**: `result.output: { fullText, sections, billingCodes }`

---

## 7. Error UI

| Location | States | Evidence |
|----------|--------|----------|
| DocudentV7Page.tsx:587-601 | `state === 'error'` | Error card |
| DocudentV7Page.tsx:732-776 | `state === 'unsupported'` | Milchzahn etc. |

**Error Shape**: `{ state: 'error', error: string }`

---

## 8. Debug UI

| Component | Path | Purpose | Status |
|-----------|------|---------|--------|
| (None exposed) | - | Trace viewer | ❌ Missing |
| (None exposed) | - | KB meta viewer | ❌ Missing |
| (None exposed) | - | ExplainRun viewer | ❌ Missing |

**Available Data** (not rendered):
- `result.debug.v10TraceLines` (attached in pipeline shim)

---

## 9. Pipeline Call Path

```
DocudentV7Page
  └── useV7Pipeline()
        ├── runPipeline() [L271-303]
        │     └── pipeline.run(input) [L288]
        │           └── v7/pipeline/index.ts:run()
        │                 └── runV10(v10Input) [L66]
        │
        └── createInstancesAndRun() [L350-421]
              └── runMultiTreatment(plan)
                    └── runV10Bundle()
```

---

## 10. Types

| Type | Path | Purpose |
|------|------|---------|
| PipelineInput | `v7/pipeline/types.ts` | V7 input shape |
| PipelineResult | `v7/pipeline/types.ts` | V7 output shape |
| V10PipelineInput | `v10/pipeline/runV10.ts` | V10 input shape |
| V10PipelineOutput | `v10/pipeline/runV10.ts` | V10 output shape |

**Adapters**:
- `v7/pipeline/adapters/toV10Input.ts` → V7 → V10
- `v7/pipeline/adapters/fromV10Output.ts` → V10 → V7
