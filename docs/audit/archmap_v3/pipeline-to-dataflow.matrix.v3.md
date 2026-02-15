# Pipeline-to-Dataflow Matrix v3

**Generated**: 2025-12-26T16:40:00Z  
**Methodology**: Grep of JSON imports + manual trace of runV10 stages

---

## Legend

- **R** = READ (with purpose)
- **—** = Not used by this stage
- Evidence format: `module:line`

---

## Stage × Asset Matrix

| Stage | medical_kb.v1 | unified.json | question_bank | kombinationen | combinability_kb | bema/goz/goa |
|-------|---------------|--------------|---------------|---------------|------------------|--------------|
| 1. Input Normalization | — | — | — | — | — | — |
| 2. Extractor Selection | — | — | — | — | — | — |
| 3. Extraction | — | — | — | — | — | — |
| 4. Facts Mapping | — | — | — | — | — | — |
| 5. applyMedicalKb | **R** | — | — | — | — | — |
| 6. Askback Compiler | — | — | **R** | — | — | — |
| 7. Answer Handlers | — | — | — | — | — | — |
| 8. Chip Emission | — | — | — | — | — | — |
| 9. Billing Guard | — | — | — | — | — | — |
| 10. Renderer | — | **R** | — | — | — | — |
| 11. Billing Dedup | — | — | — | — | — | — |
| 12. Combinability | — | — | — | — | **R** | — |
| 13. Output Assembly | — | — | — | — | — | — |

---

## Detailed Evidence

### Stage 5: applyMedicalKb

| Asset | Purpose | Evidence |
|-------|---------|----------|
| medical_kb.v1.json | Rule evaluation | `medical_kb/engine/applyMedicalKb.ts:305` |

**Input**: `facts: Record<string, unknown>`  
**Output**: `{ emittedChips, requiredAskbacks, optionalAskbacks, trace }`

### Stage 6: Askback Compiler

| Asset | Purpose | Evidence |
|-------|---------|----------|
| question_bank.json | Question definitions | `v7/medical/askbacks/questionBankAdapter.ts:83-91` |

**Input**: `askbackMeta[]`  
**Output**: `{ required: DynamicQuestion[], optional: DynamicQuestion[] }`

### Stage 10: Renderer

| Asset | Purpose | Evidence |
|-------|---------|----------|
| unified.json | textSnippets + billingRef | `v7/output/renderFromKbChips.ts:119-122` |

**Input**: `{ chips[], treatmentId, insuranceType, textLength }`  
**Output**: `{ fullText, billingCodes[] }`

### Stage 12: Combinability

| Asset | Purpose | Evidence |
|-------|---------|----------|
| combinability_kb.v1.json | BLOCK/WARN rules | `v10/kb/combinability/index.ts:14` |

**Input**: `billingCodes[]`  
**Output**: `{ verdict: PASS|WARN|BLOCK, conflicts[] }`

---

## Stages With No Asset Reads

| Stage | Module | Why No Asset |
|-------|--------|--------------|
| 1. Input Normalization | `runV10.ts:248-260` | Pure transformation |
| 2. Extractor Selection | `selectExtractor.ts:59` | Env/config based |
| 3. Extraction | LLM/stub | External call |
| 4. Facts Mapping | `extractionToFacts/` | Pure transformation |
| 7. Answer Handlers | `applyAnswersToFacts` | Facts mutation |
| 8. Chip Emission | Inline in applyMedicalKb | Part of stage 5 |
| 9. Billing Guard | `billingEligibilityGuard.ts` | Logic only |
| 11. Billing Dedup | Inline | Set operations |
| 13. Output Assembly | `buildMeta()` | Aggregation |

---

## Cross-Reference

All 22 runtime assets from `data-assets.runtime.v3.json` are covered:
- 5 assets are READ in pipeline (5, 6, 10, 12)
- 17 assets are READ elsewhere (core/billing, legacy paths)
