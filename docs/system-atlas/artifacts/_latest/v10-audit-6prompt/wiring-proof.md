# V10 Frontend Wiring Proof

**Date:** 2026-01-01  
**Status:** ✅ Clean - No V7 shims

## Call Path: UI Button → runV10

| Step | File:Line | Function | Input Shape | V7 Free? |
|------|-----------|----------|-------------|----------|
| 1. Button Click | [DocudentV10Page.tsx:315](file:///Users/david/dokumaster-ui/src/docudent/v10/pages/DocudentV10Page.tsx#L315) | `onClick={runPipeline}` | - | ✅ |
| 2. Hook Import | [DocudentV10Page.tsx:57](file:///Users/david/dokumaster-ui/src/docudent/v10/pages/DocudentV10Page.tsx#L57) | `runPipeline` from `useV10Pipeline` | - | ✅ |
| 3. Pipeline Fn | [useV10Pipeline.ts:164](file:///Users/david/dokumaster-ui/src/docudent/v10/hooks/useV10Pipeline.ts#L164) | `runPipeline = useCallback(...)` | - | ✅ |
| 4. Insurance Map | [useV10Pipeline.ts:172](file:///Users/david/dokumaster-ui/src/docudent/v10/hooks/useV10Pipeline.ts#L172) | `effectiveInsuranceType = hasMKV ? 'MKV' : insuranceType` | - | ✅ |
| 5. runV10 Call | [useV10Pipeline.ts:180](file:///Users/david/dokumaster-ui/src/docudent/v10/hooks/useV10Pipeline.ts#L180) | `await runV10({...})` | `V10PipelineInput` | ✅ |
| 6. runV10 Entry | [runV10.ts:266](file:///Users/david/dokumaster-ui/src/docudent/v10/pipeline/runV10.ts#L266) | `export async function runV10(input)` | `V10PipelineInput` | ✅ |

## V7 Shim Points: **NONE**

```bash
$ grep -r "v7\|V7\|shim" src/docudent/v10/hooks/useV10Pipeline.ts
# No results
```

## Gate Coverage

| Contract | Gate Test |
|----------|-----------|
| No V7 imports | `gate-v10-no-imports-from-v7.test.ts` (5/5 ✅) |
| Direct runV10 | Comment at line 179: "DIRECT V10 CALL - NO V7 DELEGATION" |

## Refactor Recommendation

**Status: No refactor needed.** V10 UI already directly uses `useV10Pipeline` which calls `runV10` with no V7 involvement.
