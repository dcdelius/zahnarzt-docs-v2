# V7 Contracts — SSOT

## Purpose
Documents which types are SSOT, where they live, and what must not be duplicated.

---

## SSOT Files

| Contract File | Types Defined | Must Import From |
|---------------|---------------|------------------|
| `contracts/extraction.ts` | `Field<T>`, `ExtractedData`, `MentionedFields`, `KeywordFlags` | Here only |
| `contracts/warnings.ts` | `ValidationWarning` | Here only |
| `contracts/questions.ts` | `DynamicQuestion`, `QuestionOption` | Here only |
| `contracts/pipeline.ts` | `PipelineInput`, `PipelineResult` | Here only |
| `contracts/output.ts` | `ComposedOutput`, `BillingCode` | Here only |
| `contracts/index.ts` | Re-exports all | Convenience import |

---

## Duplication Rules

### ❌ FORBIDDEN
- Inline `interface ValidationWarning` in any file
- `warning: string` anywhere (must be `ValidationWarning`)
- `type InsuranceType = 'GKV' | 'PKV'` duplicated (use from contracts)
- Local `ExtractedData` copies

### ✅ ALLOWED
- Re-exporting via `contracts/index.ts`
- Narrowing types for specific use cases (with explicit extends)

---

## Type Dependencies

```
contracts/extraction.ts
    ├── Field<T>
    ├── AnesthesiaType, AnesthesiaInfo
    ├── CappingType, CappingInfo
    ├── VitalityType, PercussionType
    ├── Surface
    ├── MentionedFields
    ├── KeywordFlags
    └── ExtractedData

contracts/questions.ts
    ├── QuestionOption
    └── DynamicQuestion

contracts/warnings.ts
    └── ValidationWarning

contracts/pipeline.ts
    ├── PipelineInput (uses ExtractedData, DynamicQuestion)
    └── PipelineResult (uses ValidationWarning)

contracts/output.ts
    ├── BillingCode
    ├── BillingSection
    └── ComposedOutput (uses ValidationWarning)
```

---

## Validation Tests

| Test | Guards | Location |
|------|--------|----------|
| `contract-drift.test.ts` | Ensures no inline type definitions | `v7/pipeline/__tests__/` |
| `no-logic.test.ts` | Ensures no forbidden patterns in UI | `v7/pipeline/__tests__/` |

---

## V6 Hooks Compatibility

The V6 hook `useDocudentV6.ts` has its own `ExtractedData` type. This is **legacy**.

**Migration path:**
1. V6 services should import from contracts
2. useDocudentV6.ts should re-export from contracts
3. Eventually deprecate local types
