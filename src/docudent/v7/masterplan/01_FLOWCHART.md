# V7 Pipeline — Real Call Chain Flowchart

## Mermaid Diagram

```mermaid
flowchart TD
    subgraph "V7 UI Layer"
        A[DocudentV7Page.tsx]
        B[useV7Pipeline.ts]
    end
    
    subgraph "V7 Orchestrator"
        C[v7/pipeline/index.ts::run]
        C_NORM[normalizeAnswers ⚠️ NOT USED]
    end
    
    subgraph "V6 Services"
        D[extractionService.ts::extractFromDictation]
        E[questionService.ts::generateQuestions]
        F[outputService.ts::generateFinalOutput]
    end
    
    subgraph "Core Logic"
        G[answerIdTranslator.ts::translateAnswers]
        H[chipResolver.ts::resolveActiveChipIds]
        I[treatmentEngine.ts::processChipsToBilling]
        J[outputComposer.ts::composeOutput]
    end
    
    A -->|"dictation: string"| B
    B -->|"PipelineInput"| C
    C -->|"dictation"| D
    D -->|"ExtractedData"| C
    C -->|"extracted, insuranceType, hasMKV"| E
    E -->|"DynamicQuestion[]"| C
    C -.->|"UNUSED"| C_NORM
    C -->|"extracted, answers, options"| F
    F -->|"answers"| G
    G -->|"canonicalAnswers"| H
    H -->|"activeChipIds[]"| I
    I -->|"ProcessingResult"| J
    J -->|"ComposedOutput"| F
    F -->|"ComposedOutput"| C
    C -->|"PipelineResult"| B
    B -->|"render"| A
```

---

## Data Artifacts at Each Step

| Step | Function | Input | Output |
|------|----------|-------|--------|
| 1 | `extractFromDictation` | `dictation: string` | `ExtractedData { tooth, surfaces, diagnosis, costs, mentioned, gaps }` |
| 2 | `generateQuestions` | `extracted, insuranceType, hasMKV` | `DynamicQuestion[] { id, question, options, category }` |
| 3 | `normalizeAnswers` ⚠️ | `treatmentId, answers` | **OUTPUT NOT USED** |
| 4 | `generateFinalOutput` | `extracted, answers, insuranceType, textLength, hasMKV` | `ComposedOutput` |
| 4a | `translateAnswers` | `treatmentId, answers` | `canonicalAnswers` (this is what matters!) |
| 4b | `resolveActiveChipIds` | `treatmentId, extracted, canonicalAnswers, options` | `activeChipIds[]` |
| 4c | `processChipsToBilling` | `treatmentId, activeChipIds, insuranceType, ...` | `ProcessingResult { billingCodes, billingDetails, warnings }` |
| 4d | `composeOutput` | `treatmentId, engineResult, activeChips, extractedData, insuranceType, composeOptions` | `ComposedOutput { sections, fullText, billingCodes, warnings }` |

---

## Key Insight

The arrow from `v7/pipeline/index.ts` to `normalizeAnswers` is **dotted** because:

1. `normalizeAnswers()` IS called
2. Its output `canonicalAnswers` is logged to debug
3. But the **raw `answers`** Map is passed to `generateFinalOutput`
4. V6's `answerIdTranslator.translateAnswers()` does the actual translation

This is the source of confusion: V7 has translation code, but V6 is authoritative.
