# M4 Audit: Mixed Treatments (Füllung + Endo)

**Date**: 2025-12-22  
**Purpose**: Document how mixed-treatment dictations are segmented and processed.

---

## Key Question: Where is Dictation Split into TreatmentSegments?

**Currently**: Segmentation is NOT automatic. Pre-built by UI/hook before calling orchestrator.

**Location**: `useV7Pipeline.ts` or external caller constructs `MultiTreatmentPlan.segments[]`

**Current Reality**: For mixed treatments, the UI/caller must:
1. Parse dictation to identify treatment keywords ("Füllung", "Endo")
2. Build separate segments per treatment type
3. Assign instances per tooth

---

## How is treatmentId Decided per Segment?

**Answer**: Set by caller when constructing `TreatmentSegment`:

```typescript
interface TreatmentSegment {
    id: string;
    treatmentId: 'fuellung' | 'endo' | ...;  // Explicit per segment
    dictationSlice: string;                   // Relevant portion of dictation
    instances?: TreatmentInstance[];
    ...
}
```

**No automatic detection** in orchestrator — it's a pass-through.

---

## Segment → Instance Relationship

```
MultiTreatmentPlan
└── segments[]
    ├── Segment 1 (treatmentId: 'fuellung')
    │   └── instances[]
    │       ├── Instance A (tooth: '16')
    │       └── Instance B (tooth: '17')
    │
    └── Segment 2 (treatmentId: 'endo')
        └── instances[]
            └── Instance C (tooth: '11')
```

**Flow**: `orchestrator.ts:runMultiTreatment()` → loops segments → loops instances → `executeInstance()` per tooth

---

## Aggregation Points (Text/Billing/Warnings)

| What | Where | How |
|------|-------|-----|
| Text | `orchestrator.ts:132-148` | `perRunCopyText.join(SEPARATOR)` |
| Billing | `orchestrator.ts:151` | `aggregateBillingCodesWithScope()` |
| Warnings | `orchestrator.ts:207` | Collected per run into `allWarnings` |
| State | `orchestrator.ts:123` | `deriveAggregatedState()` — any questions → 'questions' |

---

## Question Bundling Today

**Location**: `orchestrator.ts:68-69` + `187-194`

```typescript
const perInstanceBundles: Record<string, QuestionBundle> = {};
// ...
if (runResult.result.questionBundle) {
    perInstanceBundles[instance.instanceId] = runResult.result.questionBundle;
}
```

**Problem**: Each instance has its own bundle, but there's no cross-segment aggregation.

---

## Required Changes for M4

1. **Question Bundle Aggregation** (Step 2)
   - After collecting `perInstanceBundles`, merge into single bundle
   - Order: segment order → tooth ascending → required before optional

2. **Output Ordering** (Step 3)
   - Already deterministic via segment loop order
   - Verify with snapshot tests

3. **Scope Dedup** (already implemented)
   - SESSION scope: first occurrence wins
   - TOOTH scope: per-tooth dedup

---

## Endo Question Bank Reference

From `endo_question_bank.json`, key required questions:
- `endo_step` (required)
- `kanalzahl` (required)
- `endo_material` (optional)

These must NOT appear for fuellung segments.
