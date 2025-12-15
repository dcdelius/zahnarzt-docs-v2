# Docudent Architecture

## 1. Runtime Pipeline Flow

```mermaid
flowchart TD
    subgraph UI["UI Layer"]
        V7Page["DocudentV7Page.tsx"]
        Hook["useV7Pipeline()"]
    end

    subgraph V7["v7/pipeline/index.ts"]
        INIT["INIT: validate inputs"]
        EXTRACT["EXTRACT: extractionService"]
        QUESTIONS["QUESTIONS: questionService"]
        TRANSLATE["TRANSLATE: answerIdTranslator"]
        CHIPS["CHIPS: chipResolver"]
        ENGINE["ENGINE: treatmentEngine"]
        COMPOSE["COMPOSE: outputComposer"]
        EMIT["EMIT: PipelineResult"]
    end

    subgraph V6["v6/services"]
        QS["questionService.ts"]
        OS["outputService.ts"]
        ES["extractionService.ts"]
    end

    subgraph Core["core/billing/knowledgeBase/logic"]
        AIT["answerIdTranslator.ts"]
        CR["chipResolver.ts"]
        TE["treatmentEngine.ts"]
        OC["outputComposer.ts"]
    end

    subgraph Registry["registry/loaders.ts"]
        LU["loadUnifiedConfig"]
        LA["loadAnswerMapConfig"]
        LQ["loadQuestionBankConfig"]
        LT["loadTemplateConfig"]
        LF["loadFindingMapConfig"]
    end

    V7Page --> Hook --> INIT --> EXTRACT --> ES
    EXTRACT --> QUESTIONS --> QS --> LQ
    QUESTIONS --> TRANSLATE --> AIT --> LA
    TRANSLATE --> CHIPS --> CR --> LA
    CHIPS --> ENGINE --> TE --> LU
    ENGINE --> COMPOSE --> OC --> LT & LF
    COMPOSE --> EMIT -->|"state"| V7Page
```

## 2. SSOT Registry Dependency Graph

```mermaid
graph LR
    subgraph SSOT["treatments/{treatmentId}/"]
        U["unified.json"]
        A["answer_map.json"]
        Q["question_bank.json"]
        T["template.json"]
        F["finding_map.json"]
    end

    subgraph Loaders["Loader Functions"]
        LU["loadUnifiedConfig()"] --> U
        LA["loadAnswerMapConfig()"] --> A
        LQ["loadQuestionBankConfig()"] --> Q
        LT["loadTemplateConfig()"] --> T
        LF["loadFindingMapConfig()"] --> F
    end

    subgraph Consumers["Runtime Consumers"]
        TE["treatmentEngine"] --> LU
        CR["chipResolver"] --> LA
        AIT["answerIdTranslator"] --> LA
        QB["questionBank"] --> LQ
        OC["outputComposer"] --> LT & LF
    end
```

## 3. Gates Map

```mermaid
flowchart LR
    G0["Gate 0: treatmentId routing"]
    G1["Gate 1-4: Golden output"]
    G5["Gate 5: Import paths + SSOT"]
    G6["Gate 6: Trace contract"]
    G7["Gate 7: Stage emission"]

    G0 -->|"gate0-treatmentId-routing.test.ts"| G1
    G1 -->|"gate1234-golden-output.test.ts"| G5
    G5 -->|"gate5-import-paths.test.ts"| G6
    G6 -->|"gate6-trace-contract.test.ts"| G7
```

## 4. Module Map

```
WHERE TO FIND:

├── EXTRACTION        → v6/services/extractionService.ts
├── QUESTIONS         → v6/services/questionService.ts
│                     → core/billing/knowledgeBase/questions/questionBank.ts
├── TRANSLATION       → core/billing/knowledgeBase/logic/answerIdTranslator.ts
├── CHIPS             → core/billing/knowledgeBase/logic/chipResolver.ts
├── BILLING           → core/billing/knowledgeBase/logic/treatmentEngine.ts
├── COMPOSITION       → core/billing/knowledgeBase/logic/outputComposer.ts
├── REGISTRY          → core/billing/knowledgeBase/registry/loaders.ts
├── SSOT FILES        → core/billing/knowledgeBase/treatments/{treatmentId}/
├── GATES             → __tests__/gates/
└── LEGACY (gated)    → knowledgeBase/{behandlungen,mappings,templates}/
```
