# Docudent Pipelines

> V5, V6, and V7 pipeline documentation with flowcharts.

---

## Pipeline Overview

| Version | Status | Entry Point | Use Case |
|---------|--------|-------------|----------|
| **V5** | Production | `useBillingV5Controller.ts` | Full-featured, 4-step wizard with analog justifications |
| **V6** | Stable | `useV6Pipeline.ts` | Simplified 3-section flow |
| **V7** | Active Development | `pipeline/index.ts` | Pure UI renderer, multi-treatment support |

---

## When to Use Which

| Scenario | Recommended Pipeline |
|----------|---------------------|
| Standard filling documentation | V5 or V7 |
| Complex analog billing | V5 (has justification UI) |
| Multi-treatment cases | V7 (has segment editor) |
| Simple dictation → output | V6 |

---

## V7 Pipeline (Recommended)

**Architecture:** Pure UI renderer + Backend orchestrator

```mermaid
flowchart TD
    A[DocudentV7Page.tsx] -->|handleSendClick| B[useV7Pipeline.runPipeline]
    B -->|calls| C[pipeline.run]
    
    subgraph "pipeline/index.ts"
        C --> D[extractFromDictation]
        D --> E[generateQuestions]
        E --> F[generateFinalOutput]
    end
    
    subgraph "V6 Services (reused)"
        D --> D1[extractionService.ts]
        E --> E1[questionService.ts]
        F --> F1[outputService.ts]
    end
    
    subgraph "Core Engine"
        F1 --> G[chipResolver]
        G --> H[TreatmentEngine.processChipsToBilling]
        H --> I[outputComposer.composeOutput]
    end
    
    I --> J[Output to UI]
```

**Key Files:**
- `src/docudent/v7/pages/DocudentV7Page.tsx` — Pure UI (no logic)
- `src/docudent/v7/hooks/useV7Pipeline.ts` — State container
- `src/docudent/v7/pipeline/index.ts` — Orchestrator
- `src/docudent/v7/multitreatment/index.ts` — Multi-treatment support

---

## V5 Pipeline (Full-Featured)

**Architecture:** Integrated controller with 4-step wizard

```mermaid
flowchart TD
    A[DocudentV5Page.tsx] --> B[useBillingV5Controller]
    
    subgraph "analyze()"
        B --> C[extractDictationV3]
        C --> D[inferBillingV2]
        D --> E[validateBillingCodes]
        E --> F[checkCombinationConflicts]
        F --> G[QuestionEngine.getActiveQuestions]
    end
    
    subgraph "generatePreview()"
        H[generatePreview] --> I[inferChipsFromDictation]
        I --> J[resolveChipStates]
        J --> K[generateFinalDocumentation]
    end
    
    subgraph "V5-Only Features"
        L[AnalogJustificationFlow]
        M[AnalogCompletionValidator]
        N[AnalogExportGuard]
    end
    
    G --> H
    K --> O[Preview + Billing]
```

**V5-Only Features:**
- Analog justification UI flow
- Tiered question engine (3 levels)
- Cross-validator with regress warnings
- Chip toggle UI
- Treatment setup wizard

---

## V6 Pipeline (Simple)

**Architecture:** 3-section flow (Dictation → Questions → Output)

```mermaid
flowchart TD
    A[DocudentV6Page.tsx] --> B[useV6Pipeline]
    B --> C[DictationSection]
    C --> D[QuestionsSection]
    D --> E[OutputSection]
    
    subgraph "Services"
        C --> F[extractionService]
        D --> G[questionService]
        E --> H[outputService]
    end
```

**Notes:**
- Simpler than V5 (no analog justifications)
- V7 reuses V6 services

---

## Shared Core Modules

All pipelines use these core modules:

| Module | File | Purpose |
|--------|------|---------|
| TreatmentEngine | `treatmentEngine.ts` | Chip → billing code mapping |
| ChipResolver | `chipResolver.ts` | Active chip resolution |
| OutputComposer | `outputComposer.ts` | Template-driven text rendering |
| BillingRegistry | `billingRegistry.ts` | Treatment-specific billing dispatch |

---

## Pipeline Comparison

| Feature | V5 | V6 | V7 |
|---------|:--:|:--:|:--:|
| Extraction | ✅ | ✅ | ✅ |
| Billing Inference | ✅ | ✅ | ✅ |
| Question Generation | ✅ (tiered) | ✅ | ✅ |
| Output Composition | ✅ | ✅ | ✅ |
| Analog Justification | ✅ | ❌ | ❌ |
| Cross-Validation | ✅ | ❌ | ❌ |
| Multi-Treatment | ❌ | ❌ | ✅ |
| Pure UI Architecture | ❌ | ❌ | ✅ |
