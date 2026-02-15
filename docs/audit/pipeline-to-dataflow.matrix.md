# Pipeline-to-Dataflow Matrix

**Generated**: 2025-12-26T16:25:00Z

---

## Legend

- **R** = READ
- **W** = WRITE (runtime modification)
- **—** = Not used

---

## Matrix

| Pipeline Stage | medical_kb.v1.json | unified.json | kombinationen.json | bema.json | goz.json | question_bank.json |
|----------------|--------------------|--------------|--------------------|-----------|----------|-------------------|
| **1. Extraction** | — | — | — | — | — | — |
| **2. buildFactsFromExtraction** | — | — | — | — | — | — |
| **3. applyMedicalKb** | **R** | — | — | — | — | — |
| **4. compileAskbacksToQuestions** | — | — | — | — | — | **R** |
| **5. applyBillingGuard** | — | — | — | — | — | — |
| **6. renderFromKbChips** | — | **R** | — | — | — | — |
| **7. checkCombinabilityFromKb** | — | — | **R** | — | — | — |

---

## Detailed Evidence

### 1. Extraction
- **File**: `v10/extraction/selectExtractor.ts`
- **Data assets**: None (LLM/stub extraction)

### 2. buildFactsFromExtraction
- **File**: `v7/medical/extractionToFacts/index.ts`
- **Data assets**: None (transforms extraction JSON to facts)

### 3. applyMedicalKb
- **File**: `medical_kb/engine/applyMedicalKb.ts:305`
- **Reads**: `medical_kb.v1.json` via `jsonMedicalKbProvider` (line 12)
- **Purpose**: Evaluates `emit_chip`, `require_askback` rules

### 4. compileAskbacksToQuestions
- **File**: `v7/medical/askbacks/compileAskbacksToQuestions.ts`
- **Reads**: `question_bank.json` via `questionBankAdapter.ts:83-91`
- **Purpose**: Maps askback IDs to question definitions

### 5. applyBillingGuard
- **File**: `v10/pipeline/billingEligibilityGuard.ts`
- **Data assets**: None (logic only)

### 6. renderFromKbChips
- **File**: `v7/output/renderFromKbChips.ts:211`
- **Reads**: `unified.json` via `require()` (lines 119, 122) or injected `treatmentKb`
- **Purpose**: SSOT text + billingRef lookup

### 7. checkCombinabilityFromKb
- **File**: `v10/billing/combinability/checkCombinabilityFromKb.ts`
- **Reads**: `kombinationen.json` (indirectly via `regelEngine.ts:64`)
- **Purpose**: BLOCK/WARN verdict

---

## Write Operations

No pipeline stage **writes** to data assets at runtime. All assets are read-only.
