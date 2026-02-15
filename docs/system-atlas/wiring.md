# Wiring

## Graph Summary

Source: [wiring.graph.json](./artifacts/m79/wiring.graph.json)

- **Nodes**: 22
- **Edges**: 21
- **UI Controls**: 10

## Critical Path (File:Line Evidence)

| From | To | File | Line |
|------|-----|------|------|
| UI | runPipeline | `src/docudent/v10/pages/DocudentV10Page.tsx` | (see handleRun) |
| Hook | runV10 | `src/docudent/v10/hooks/useV10Pipeline.ts` | (see runPipeline) |
| runV10 | applyMedicalKb | `src/docudent/v10/pipeline/runV10.ts` | (Step 4) |
| runV10 | buildMedicalQuestionsFromKb | `src/docudent/v10/pipeline/runV10.ts` | (Step 4/5) |
| runV10 | renderFromKbChips | `src/docudent/v10/pipeline/runV10.ts` | (perInstance render) |

## Key Nodes

| Node ID | Type | File |
|---------|------|------|
| ui.DocudentV10Page | component | src/docudent/v10/pages/DocudentV10Page.tsx |
| hook.useV10Pipeline | hook | src/docudent/v10/hooks/useV10Pipeline.ts |
| runtime.runV10 | function | src/docudent/v10/pipeline/runV10.ts |
| medical.applyMedicalKb | function | src/docudent/medical_kb/engine/applyMedicalKb.ts |
| renderer.renderFromKbChips | function | src/docudent/v10/renderer/renderFromKbChips.ts |

## V7 Role

V10 no longer delegates orchestration to V7.

V7 still exists for legacy routes and some shared UI/styling:
- `src/docudent/v10/app/V10Router.tsx` re-uses V7 CSS and some V7 pages for secondary routes.
- Stub extraction currently uses a V7 test stub in stub/test mode (`src/docudent/v10/extraction/selectExtractor.ts`).
