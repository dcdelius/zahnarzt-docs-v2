# M3 Audit: MultiTreatment/MultiInstance + Medical Layer

**Date**: 2025-12-22  
**Purpose**: Document where multi-instance orchestration happens and how medical layer should integrate.

---

## Key Finding: Orchestration Location

**File**: `src/docudent/v7/multitreatment/orchestrator.ts`

---

## Structure with 2+ Teeth

When dictation mentions multiple teeth (e.g., "Zahn 16 o Caries profunda, Zahn 17 o Caries"):

```typescript
interface MultiTreatmentPlan {
  segments: TreatmentSegment[];  // One segment per treatment type
  context: { insuranceType, textLength, hasMKV, userDefaults }
}

interface TreatmentSegment {
  id: string;
  treatmentId: 'fuellung' | 'endo';
  dictationSlice: string;
  instances?: TreatmentInstance[];  // One per tooth
  answers: Map<string, unknown>;    // Segment-level answers
  extracted?: { tooth, surfaces, diagnosis, mentioned }
}

interface TreatmentInstance {
  instanceId: string;               // e.g., "fuellung::tooth:16"
  tooth: string;                    // "16", "17", etc.
  dictationSlice?: string;          // Instance-specific dictation
  answers: Map<string, unknown>;    // Per-instance answers
  extracted?: ExtractionResult;
}
```

---

## Where Instances Are Built

**Currently**: Pre-built by UI/hook before calling `runMultiTreatment()`.  
**Location**: `useV7Pipeline.ts` parses extracted.teeth[] and creates instances[].

---

## Where generateFinalOutput is Called

**Path**: `orchestrator.ts` → `executeInstance()` → `runPipeline()` → `generateFinalOutput()`

Each instance gets its own pipeline run:
```typescript
// orchestrator.ts:299
async function executeInstance(instance, segment, plan) {
    const result = await runPipeline(pipelineInput);
    const billingCodes = extractBillingCodesWithScopeForInstance(result, ...);
    return { ... };
}
```

---

## Billing Scopes

**Source**: `billingScopeResolver.ts` reads from `comment_rules_v1.json`

| Scope | Behavior |
|-------|----------|
| TOOTH | Allow duplicates if teeth differ |
| SESSION | Dedupe completely |
| JAW | Dedupe per jaw |
| CASE | Dedupe per case |
| UNKNOWN | Keep all, flag conflict |

---

## Medical Layer Integration Point

**Current State**: Medical layer (facts, askbacks, chips) is NOT integrated into orchestrator.

**Required Changes**:
1. In `executeInstance()`, after pipeline returns:
   - Create facts from extracted
   - Evaluate askbacks per instance
   - If required unanswered → add to perInstanceBundles
2. Question IDs must be instance-scoped (e.g., `medical_ueberkappung::tooth:16`)
3. Answer matching must handle scoped IDs
4. Chip emission happens per instance

**Existing Instance ID Pattern**:
```typescript
instanceId = `${treatmentId}::tooth:${tooth}`  // e.g., "fuellung::tooth:16"
```

---

## Recommendation

The medical layer already works standalone (25/25 tests pass).  
For M3, we can:
1. Create gate tests that verify multi-instance behavior using current structure
2. Medical askbacks can be scoped by prefixing with instanceId
3. Chip aggregation already happens in orchestrator's billing code path

**No major refactor needed** — the orchestrator already runs pipeline per-instance.
