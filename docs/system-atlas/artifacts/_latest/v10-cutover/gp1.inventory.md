# GP1/6: V7 Rest-Inventory + Protection

**Date:** 2025-12-31  
**Status:** ✅ Complete

---

## Summary

| Metric | Value |
|--------|-------|
| Total V7 imports remaining | 9 |
| Location | `v10/components/index.ts` |
| Runtime imports | 0 ✅ |
| Type-only imports | 2 |
| UI component imports | 7 |

---

## Remaining V7 Imports (All in components/index.ts)

### UI Components (7)
| Line | Component | V7 Source |
|------|-----------|-----------|
| 19 | SoftGradientBackground | v7/components/ |
| 20 | HeroSculpture | v7/components/ |
| 23 | QuestionsFlowV2 | v7/components/ |
| 24 | QuestionsFlow | v7/components/ |
| 25 | OutputFlow | v7/components/ |
| 26 | MultiOutputRenderer | v7/components/ |
| 27 | MultiInstancePanel | v7/components/ |

### Types (2)
| Line | Type | V7 Source |
|------|------|-----------|
| 30 | TreatmentInstance | v7/multitreatment/types |
| 31 | UiStep | v7/ui/normalizePipelineResultForUi |

---

## V10 Modules Status ✅

| Module | Files | Used By |
|--------|-------|---------|
| facts/ | types.ts, buildFactsFromExtraction.ts, applyAnswersToFacts.ts, index.ts | runV10.ts, types.ts |
| askbacks/ | compileAskbacksToQuestions.ts, index.ts | runV10.ts |
| renderer/ | renderFromKbChips.ts, index.ts | runV10.ts, runV10Bundle.ts |

---

## Protection Verified

- ✅ No V7 imports in pipeline/
- ✅ No V7 imports in hooks/
- ✅ No V7 imports in pages/
- ✅ V10 modules are canonical
- ✅ No duplicate implementations

---

## Next: GP2

Copy the 7 UI components to V10, move 2 types to contracts, eliminate all V7 re-exports.
