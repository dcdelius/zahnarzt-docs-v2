# PROMPT A — Fuellung Evidence Table (Reality Chain)

## UI → Output Reality Chain

| Step | File | Function | Input | Output | Role |
|------|------|----------|-------|--------|------|
| 1. UI | `DocudentV10Page.tsx` | user input | dictation, insuranceType, textLength | `runV10(input)` | VIEW |
| 2. Pipeline | `runV10.ts` | `execute()` | V10Input | orchestration | ORCHESTRATOR |
| 3. Extraction | `stubExtractor.ts` / LLM | `extract()` | dictation | `ExtractionResult` | SSOT |
| 4. Facts | `buildFactsFromExtraction.ts` | `buildFuellungFacts()` | extraction | `TreatmentFacts` | SSOT |
| 5. Procedure | `v10/procedure/*` | `matchProcedureGraph()` | facts + contract | `chipIds[]` + `requiredAskbacks[]` | **SSOT (chip emission)** |
| 6. Medical KB | `applyMedicalKb.ts` | `applyMedicalKb()` | facts | `requiredAskbacks[]` | SSOT (askbacks only) |
| 7. Renderer | `renderFromKbChips.ts` | `renderFromKbChips()` | chips, facts, branch | text segments + `billingRefs[]` | **CONSTRUCTOR** |
| 8. Combinability | `checkCombinabilityFromKb.ts` | `check()` | billingRefs | verdict, droppedCodes | FILTER |
| 9. Drop Filter | `runV10.ts` | inline | allBillingRefs | finalBillingRefs | FILTER |
| 10. Composer | `composeDocumentationV10.ts` | `compose()` | perInstance, facts | fullText, sections | VIEW |
| 11. Output | `runV10.ts:output` | return | all | `output.billingCodes + fullText` | PASSTHROUGH |

## Key Decisions Per Step

| Step | Entscheidung |
|------|--------------|
| Facts | surfaces, material, adhesive, cariesDepth, anesthesia, kofferdam, nurKasse, mehrkostenConfirmed |
| Procedure | Cp/P constraints, LA/isolation matching, MKV contract chips, required askbacks |
| Medical KB | askback requirements + medical validations (no chip emission in V10) |
| Renderer | branch selection (GKV/PKV/MKV), chip text + surface_mapping → billing refs |
| Combinability | 2197 vs 2060-2120 auto-resolve |
| Composer | Sections: Diagnose, Behandlung, LA, Isolation, MKV |

## SSOT Beweis

```
grep -rn "billingCodes\.push" src/docudent/v10/renderer → renderFromKbChips.ts:283,286 ONLY
grep -rn "GOZ_\|BEMA_" src/docudent/v10/{renderer,billing,pipeline,facts} → ZERO MATCHES
```

**Verdict: All billing from KB, no hardcodes.**
