# Full Circle Map — V10 Pipeline Reference

**Source**: [architecture-map.v3.md](../../audit/archmap_v3/architecture-map.v3.md)

---

## Entry Points

| Entry | File | Line |
|-------|------|------|
| runV10 | [runV10.ts](src/docudent/v10/pipeline/runV10.ts#L242) | 242 |
| runV10Bundle | [runV10Bundle.ts](src/docudent/v10/pipeline/runV10Bundle.ts#L102) | 102 |
| V7 shim | [index.ts](src/docudent/v7/pipeline/index.ts#L49) | 49 |

---

## 1. Pipeline Stages (13 Stages)

### Stage 1: Input Normalization

| Property | Value |
|----------|-------|
| **Purpose** | Normalize V10PipelineInput |
| **File** | [src/docudent/v10/pipeline/runV10.ts#L248-L260](src/docudent/v10/pipeline/runV10.ts#L248-L260) |
| **Input** | `V10PipelineInput` |
| **Output** | Destructured: dictation, treatmentId, insuranceType, answers, teeth |
| **Assets READ** | None |
| **Trace Lines** | `input` (treatmentId, insuranceType) |
| **Gates** | None |

---

### Stage 2: Extractor Selection

| Property | Value |
|----------|-------|
| **Purpose** | Choose stub/LLM/forced extractor |
| **File** | [src/docudent/v10/extraction/selectExtractor.ts#L50-L80](src/docudent/v10/extraction/selectExtractor.ts#L50-L80) |
| **Input** | `testOnly.extraction` flag |
| **Output** | `Extractor` instance |
| **Assets READ** | None |
| **Environment** | `VITE_STUB_EXTRACTION`, `DOCUDENT_TEST_MODE` |
| **Gates** | None |

---

### Stage 3: Extraction

| Property | Value |
|----------|-------|
| **Purpose** | Extract structured data from dictation |
| **File** | [src/docudent/v10/pipeline/runV10.ts#L295-L313](src/docudent/v10/pipeline/runV10.ts#L295-L313) |
| **Input** | dictation string |
| **Output** | `Record<string, unknown>` (extracted) |
| **Assets READ** | None (external LLM call) |
| **Trace Lines** | `extract` (engine, tooth, surfaces) |
| **Gates** | gate-extraction-parity |

---

### Stage 4: Facts Mapping

| Property | Value |
|----------|-------|
| **Purpose** | Map extraction to TreatmentFacts |
| **File** | [src/docudent/v7/medical/extractionToFacts/index.ts](src/docudent/v7/medical/extractionToFacts/index.ts) |
| **Input** | extracted JSON, treatmentId |
| **Output** | `TreatmentFacts` |
| **Assets READ** | None |
| **Gates** | gate-extraction-teeth-ssot |

---

### Stage 5: Medical Engine (applyMedicalKb)

| Property | Value |
|----------|-------|
| **Purpose** | Evaluate rules, emit chips, require askbacks |
| **File** | [src/docudent/medical_kb/engine/applyMedicalKb.ts#L305-L350](src/docudent/medical_kb/engine/applyMedicalKb.ts#L305-L350) |
| **Call Site** | [src/docudent/v10/pipeline/runV10.ts#L127-L132](src/docudent/v10/pipeline/runV10.ts#L127-L132) |
| **Input** | `{ facts, treatmentId, instanceScope }` |
| **Output** | `{ emittedChips, requiredAskbacks, optionalAskbacks, trace }` |
| **Assets READ** | [medical_kb.v1.json](src/docudent/medical_kb/medical_kb.v1.json) |
| **Trace Lines** | Rule hits in engine trace |
| **Gates** | gate-m26-emit-rules-target-valid-chips |

---

### Stage 6: Askback Compiler

| Property | Value |
|----------|-------|
| **Purpose** | Map askbackIds to DynamicQuestion[] |
| **File** | [src/docudent/v7/medical/askbacks/compileAskbacksToQuestions.ts](src/docudent/v7/medical/askbacks/compileAskbacksToQuestions.ts) |
| **Input** | `askbackMeta[]` |
| **Output** | `{ required: DynamicQuestion[], optional: DynamicQuestion[] }` |
| **Assets READ** | [question_bank.json](src/docudent/core/billing/knowledgeBase/treatments/fuellung/question_bank.json) |
| **Gates** | gate-medical-required-questions |

---

### Stage 7: Answer Handlers

| Property | Value |
|----------|-------|
| **Purpose** | Apply user answers to facts |
| **File** | [src/docudent/v7/medical/facts.ts](src/docudent/v7/medical/facts.ts) |
| **Call Site** | [src/docudent/v10/pipeline/runV10.ts#L123-L124](src/docudent/v10/pipeline/runV10.ts#L123-L124) |
| **Input** | facts, answers Map |
| **Output** | mutated TreatmentFacts |
| **Assets READ** | None |
| **Gates** | None |

---

### Stage 8: Chip Emission

| Property | Value |
|----------|-------|
| **Purpose** | Emit chips based on medical rules |
| **File** | [src/docudent/medical_kb/engine/applyMedicalKb.ts#L273](src/docudent/medical_kb/engine/applyMedicalKb.ts#L273) |
| **Trigger** | `emit_chip` action in rule |
| **Output** | `chipIds[]` |
| **Assets READ** | medical_kb.v1.json (rules) |
| **Provenance** | `trace.emittedChips[].ruleId` |
| **Gates** | gate-m26-emit-rules-target-valid-chips |

---

### Stage 9: Billing Guard

| Property | Value |
|----------|-------|
| **Purpose** | Filter chips by provenance eligibility |
| **File** | [src/docudent/v10/pipeline/billingEligibilityGuard.ts](src/docudent/v10/pipeline/billingEligibilityGuard.ts) |
| **Call Site** | [src/docudent/v10/pipeline/runV10.ts#L431](src/docudent/v10/pipeline/runV10.ts#L431) |
| **Input** | `ChipWithProvenance[]` |
| **Output** | `{ allowed, blocked }` |
| **Assets READ** | None |
| **Trace Lines** | `billing_guard` |
| **Gates** | gate-no-billing-without-confirmed-fact |

---

### Stage 10: SSOT Renderer

| Property | Value |
|----------|-------|
| **Purpose** | Generate text + billingCodes from chips |
| **File** | [src/docudent/v7/output/renderFromKbChips.ts#L211-L260](src/docudent/v7/output/renderFromKbChips.ts#L211-L260) |
| **Call Site** | [src/docudent/v10/pipeline/runV10.ts#L451-L460](src/docudent/v10/pipeline/runV10.ts#L451-L460) |
| **Input** | `{ chips, treatmentId, insuranceType, textLength, treatmentKb }` |
| **Output** | `{ fullText, billingCodes }` |
| **Assets READ** | [unified.json](src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json) |
| **Trace Lines** | `render` |
| **Gates** | gate-no-text-drives-billing |

---

### Stage 11: Billing Dedup

| Property | Value |
|----------|-------|
| **Purpose** | Deduplicate and scope billing codes |
| **File** | [src/docudent/v10/pipeline/runV10.ts#L403](src/docudent/v10/pipeline/runV10.ts#L403) |
| **Logic** | `[...new Set(allChips)]` |
| **Scope** | SESSION vs TOOTH |
| **Assets READ** | None |

---

### Stage 12: Combinability Check

| Property | Value |
|----------|-------|
| **Purpose** | Validate billing code combinations |
| **File** | [src/docudent/v10/billing/combinability/checkCombinabilityFromKb.ts](src/docudent/v10/billing/combinability/checkCombinabilityFromKb.ts) |
| **Call Site** | [src/docudent/v10/pipeline/runV10.ts#L478-L484](src/docudent/v10/pipeline/runV10.ts#L478-L484) |
| **Input** | `billingCodes[], context` |
| **Output** | `{ verdict, conflicts, blockedCodes }` |
| **Assets READ** | [combinability_kb.v1.json](src/docudent/v10/kb/combinability/combinability_kb.v1.json) |
| **Trace Lines** | `combinability` |
| **BLOCK Handling** | [src/docudent/v10/pipeline/runV10.ts#L489-L494](src/docudent/v10/pipeline/runV10.ts#L489-L494) |
| **Gates** | gate-billing-combinability |

---

### Stage 13: Output Assembly

| Property | Value |
|----------|-------|
| **Purpose** | Assemble final V10PipelineOutput |
| **File** | [src/docudent/v10/pipeline/runV10.ts#L498-L524](src/docudent/v10/pipeline/runV10.ts#L498-L524) |
| **Output** | `{ state, output, meta, trace }` |
| **Meta** | kb hashes, provenance, combinability |
| **Trace Lines** | All collected |

---

## 2. Billing Full Circle

### Medical KB → Chips

```
Rule: when(facts.cariesDepth === 'profunda') → emit_chip("cp")
Source: medical_kb.v1.json
Call: applyMedicalKb.ts:273
```

### Chips → Text + BillingRef

```
Chip: cp → unified.json lookup
  textSnippets.kurz: "Caries profunda Behandlung"
  billingRef: { GKV: "BEMA_25", PKV: "GOZ_2060" }
Call: renderFromKbChips.ts:211
```

### BillingRef → Combinability

```
Codes: ["BEMA_25", "BEMA_12", ...]
Check: combinability_kb.v1.json rules
Verdict: PASS | WARN | BLOCK
Call: checkCombinabilityFromKb.ts
```

### BLOCK → Error

```typescript
if (combinabilityResult.verdict === 'BLOCK') {
    return {
        state: 'error',
        error: `Kombinationsausschluss: ${reason}`,
        meta: { combinability: { verdict: 'BLOCK', conflicts } }
    };
}
```

---

## 3. Stage × Asset READ Matrix

| Stage | medical_kb.v1 | unified.json | question_bank | combinability_kb |
|-------|---------------|--------------|---------------|------------------|
| 5. applyMedicalKb | ✅ READ | — | — | — |
| 6. Askback Compiler | — | — | ✅ READ | — |
| 10. Renderer | — | ✅ READ | — | — |
| 12. Combinability | — | — | — | ✅ READ |

---

## 4. Where to Add New Treatment

### Checklist

1. [ ] Create [treatments/{id}/unified.json](src/docudent/core/billing/knowledgeBase/treatments/) — Chip definitions
2. [ ] Create [treatments/{id}/question_bank.json](src/docudent/core/billing/knowledgeBase/treatments/) — Questions
3. [ ] Add map: [v7/medical/extractionToFacts/maps/{id}.v1.ts](src/docudent/v7/medical/extractionToFacts/maps/)
4. [ ] Add pack: [v10/packs/{id}/pack.ts](src/docudent/v10/packs/)
5. [ ] Update registry: [v10/packs/registry.ts](src/docudent/v10/packs/registry.ts)
6. [ ] Add medical KB rules: [medical_kb.v1.json](src/docudent/medical_kb/medical_kb.v1.json) (emit_chip, require_askback)
7. [ ] Update jsonTreatmentKbProvider: [kb/treatment/providers/jsonProvider.ts#L22](src/docudent/v10/kb/treatment/providers/jsonProvider.ts#L22)

---

## 5. Zero-Omission Proof

### Runtime File Coverage

| Category | Count | Source |
|----------|-------|--------|
| V10 files | 38 | runtime-closure.v3.json |
| V7 files | 43 | runtime-closure.v3.json |
| medical_kb files | 4 | runtime-closure.v3.json |
| **Total** | 85 | — |

### Runtime Asset Coverage

| Type | Count |
|------|-------|
| MEDICAL_KB | 1 |
| TREATMENT_KB | 10 |
| COMBINABILITY_KB | 2 |
| KATALOG | 4 |
| OTHER | 5 |
| **Total** | 22 |

### Statement

> These docs cover 100% of the runtime closure. Validated by gate-onboarding-v3-covers-runtime-closure.test.ts.

---

## 6. Billing Catalogs

| Catalog | Path | Loader | Purpose |
|---------|------|--------|---------|
| BEMA | [kataloge/bema.json](src/docudent/core/billing/knowledgeBase/kataloge/bema.json) | treatmentEngine.ts:16 | GKV codes |
| GOZ | [kataloge/goz.json](src/docudent/core/billing/knowledgeBase/kataloge/goz.json) | treatmentEngine.ts:17 | PKV codes |
| GOÄ | [kataloge/goa.json](src/docudent/core/billing/knowledgeBase/kataloge/goa.json) | treatmentEngine.ts:18 | Medical codes |
| BEL2 | [kataloge/bel2_2022.json](src/docudent/core/billing/knowledgeBase/kataloge/bel2_2022.json) | bel2Catalog.ts:12 | Lab codes |
