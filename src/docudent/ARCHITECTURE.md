# Docudent Architecture (V10)

## 1. Runtime Pipeline Flow

```mermaid
flowchart TD
    subgraph UI["UI Layer (V10)"]
        Page["DocudentV10Page.tsx"]
        Hook["useV10Pipeline()"]
    end

    subgraph Orchestrator["v10/pipeline"]
        Pre["Preanalysis: detect intents + build segments"]
        Bundle["runV10Bundle()"]
        Single["runV10() per instance"]
        Merge["Scope-aware question + billing aggregation"]
    end

    subgraph Core["core/* + v10/* runtime services"]
        Extract["Extraction normalization"]
        Facts["Facts build + answer apply"]
        Askbacks["Question/askback engine"]
        Packs["Procedure pack events"]
        Render["KB renderer (chips → text + billing refs)"]
        Billing["Session combinability + guardrails"]
    end

    subgraph KB["SSOT Treatment KB"]
        Unified["unified.json"]
        AMap["answer_map.json"]
        QBank["question_bank.json"]
        Template["template.json"]
        Finding["finding_map.json"]
    end

    Page --> Hook --> Pre --> Bundle --> Single
    Single --> Extract --> Facts --> Askbacks --> Packs --> Render --> Billing --> Merge
    Facts --> AMap
    Askbacks --> QBank
    Packs --> Unified
    Render --> Template & Finding
    Merge -->|"state: questions | output | error"| Page
```

## 2. SSOT Invariants

- `copyText` is derived from `blocks` (never built independently).
- UI is renderer-only for billing semantics (no hardcoded billing rules in UI).
- Billing codes are resolved from KB/DB-backed rules, then validated by combinability.
- Multi-treatment output is deterministic (stable ordering + stable hash gates).

## 3. Registry Dependency Graph

```mermaid
graph LR
    subgraph SSOT["core/billing/knowledgeBase/treatments/{treatmentId}/"]
        U["unified.json"]
        A["answer_map.json"]
        Q["question_bank.json"]
        T["template.json"]
        F["finding_map.json"]
    end

    subgraph Loaders["registry/loaders.ts"]
        LU["loadUnifiedConfig()"] --> U
        LA["loadAnswerMapConfig()"] --> A
        LQ["loadQuestionBankConfig()"] --> Q
        LT["loadTemplateConfig()"] --> T
        LF["loadFindingMapConfig()"] --> F
    end

    subgraph Runtime["V10 runtime consumers"]
        Packs["procedure packs"] --> LU & LA
        Questions["askback/question engine"] --> LQ
        Renderer["kb renderer/output"] --> LT & LF
    end
```

## 4. Gate Coverage Map

```mermaid
flowchart LR
    B["Boundary gates (UI/core SSOT)"]
    K["KB/schema gates"]
    M["Multi-treatment + determinism gates"]
    P["Procedure pack onboarding gates"]
    E["Realistic E2E suites"]

    B --> K --> M --> P --> E
```

## 5. Module Map

```
WHERE TO FIND (V10 FOCUS):

├── V10 UI ROUTING         → v10/app/V10Router.tsx
├── PIPELINE ORCHESTRATION → v10/pipeline/runV10.ts
│                           v10/pipeline/runV10Bundle.ts
├── PREANALYSIS/SEGMENTS   → v10/preanalysis/*
│                           v10/multitreatment/*
├── FACTS + ANSWERS        → v10/facts/*
├── QUESTIONS/ASKBACKS     → v10/askbacks/*
├── PROCEDURE PACKS        → v10/packs/*
├── BILLING SESSION CHECKS → v10/billing/sessionCombinability.ts
├── KB RENDERING           → v10/renderer/renderFromKbChips.ts
├── SSOT KB FILES          → core/billing/knowledgeBase/treatments/{treatmentId}/
├── MANIFEST IDS           → contracts/treatments.manifest.ts
├── V10 GATES              → v10/__tests__/gates/
└── LEGACY/FROZEN          → v7/* (compat renderer), v6/* (no new code)
```
