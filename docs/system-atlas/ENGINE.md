# ENGINE — Runtime Path & Zahnräder

> Single source of truth for how Docudent V10 actually works (based on current code entrypoints).  
> Note: wiring/critical_path artifacts may lag — prefer the file paths referenced here.

## Runtime Path (15 Steps)

```
1.  [Router] V10Router              → route /docudent/v10
2.  [UI] DocudentV10Page            → dictation UI
3.  [Hook] useV10Pipeline           → state management + pipeline trigger
4.  [Runtime] runV10                → MAIN ORCHESTRATOR
5.  [Runtime] scopeExtractionToInstances → multi-tooth / multi-treatment segmentation
6.  [Runtime] selectExtractor       → forced / stub / LLM extraction
7.  [Runtime] buildFactsFromExtraction + applyAnswersToFacts
8.  [Medical] applyMedicalKb        → requiredAskbacks (chip emission disabled in V10)
9.  [Procedure] resolveContractContext + matchProcedureGraph → chipIds + requiredAskbacks (SSOT)
10. [Questions] medicalAskbackAdapter + QuestionServiceV2 merge
11. [Billing] applyBillingGuard     → provenance-based chip eligibility
12. [Renderer] renderFromKbChips    → perInstance text + billingRefs (from KB + BillingDB)
13. [Billing] checkCombinabilityFromKb → PASS/WARN/BLOCK + droppedCodes (BLOCK → askback override)
14. [Composer] composeOutput        → final sections/text aligned to filtered billingRefs
15. [Meta] billingCompleteness + concept checks + trace/provenance
```

## Drop Points (DP1–DP6)

| ID | Location | Symptom | How to Repro | Guard Test |
|----|----------|---------|--------------|------------|
| DP1 | selectExtractor | Empty extraction | LLM unavailable + stub off | `gate-v10-workflow-diagnostics-enforcement` |
| DP2 | medicalAskbackAdapter | Askback → fallback question | Askback definition missing / questionKey mismatch | `gate-v10-askback-nonredundancy` |
| DP3 | applyBillingGuard | Chips blocked, billing empty | Inferred la_infiltr | `gate-m82-no-silent-billing-drop` |
| DP4 | checkCombinabilityFromKb | BLOCK verdict | Conflicting codes | `gate-billing-combinability` |
| DP5 | droppedCodes propagation | Billing/text mismatch | droppedCodes not filtered before compose | `gate-combinability-final-billing` |
| DP6 | runV10 multi-instance | Answer leakage | 2 instances, scoped LA | `gate-v10-workflow-multi-scoping` |

## Why V7 Exists Today

V10 pipeline orchestration no longer delegates to V7, but V7 still exists for:
- legacy routes (`/docudent/v7`, `/docudent/v8`)
- re-used secondary pages/styles under the V10 router (`src/docudent/v10/app/V10Router.tsx`)
- a stub extractor used only in stub/test mode (`src/docudent/v10/extraction/selectExtractor.ts`)

## Remaining Cleanup Candidates (V7 Dependencies)

| Current | Why it exists | Direction |
|---------|---------------|-----------|
| `src/docudent/v10/app/V10Router.tsx` imports V7 CSS/pages | shared UI for secondary routes | migrate pages/styles to V10 or a shared UI layer |
| `src/docudent/v10/extraction/selectExtractor.ts` imports V7 stub extractor in stub mode | test/dev convenience | move stub extractor to `v10/testOnly` |

## Workflow Contracts (C1–C6)

| Contract | Invariant | Gate |
|----------|-----------|------|
| C1 Sufficiency | fullText ≠ '' OR diagnostic ≠ null | `gate-v10-workflow-diagnostics-enforcement` |
| C2 Non-redundancy | No duplicate questions | `gate-v10-askback-nonredundancy` |
| C3 Critical askbacks | Missing tooth → tooth question | `gate-v10-workflow-critical-tooth-required` |
| C4 No silent drop | Empty billing → diagnostic | `gate-m82-no-silent-billing-drop` |
| C5 Multi-scoping | Answers scoped per instance | `gate-v10-workflow-multi-scoping` |
| C6 Guard transparency | Blocked chips in diagnostic | `gate-v10-unknown-chip-error-has-provenance` |

## Delete Sprint Safety Net

Before each bucket, these gates MUST be GREEN:

| Bucket | Prerequisite Gates |
|--------|-------------------|
| B1 HTML Move | `npm run build`, `npx vitest run` |
| B2 Delete v6 | `gate-no-runtime-imports-from-v6` ✅ |
| B3 Dead code | `gate-runtime-manifest-consistency`, manual review |
| B4 V7→V10 | Parity R1+R2, all C1–C6 contracts |

---
*Maintained manually. Update when runtime entrypoints change.*
