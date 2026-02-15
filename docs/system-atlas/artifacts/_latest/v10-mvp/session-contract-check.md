# Session Contract Check: createV10Session

**Date**: 2025-12-31
**Prompt**: 2/6
**Status**: ✅ PASS

## Audit Findings

### 1. buildPerInstanceOutput Removed ✅
- Grep search returns 0 results for `buildPerInstanceOutput`
- Replaced with pure `mapPipelinePerInstance` at line 384-403

### 2. mapPipelinePerInstance is Pure ✅
```typescript
function mapPipelinePerInstance(pipelinePerInstance): Record<...> {
    // PURE: Only uses input parameter
    // NO access to: instances, perTooth, fullText, global state
    const result = {};
    for (const [key, val] of Object.entries(pipelinePerInstance)) {
        result[key] = { text: val.text, billingRefs: val.billingRefs };
    }
    return result;
}
```

### 3. answer() Uses Instance-Scoped Keys ✅
Line 257: `answers.set(\`${inst.instanceId}::${key}\`, val)`
- Format: `instanceId::factKey`
- Prevents cross-contamination between instances

### 4. Error Handling for Missing perInstance ✅
Lines 178-182 (start) and 283-287 (answer):
```typescript
if (!result.output.perInstance) {
    state = { phase: 'error', error: '[BUG] runV10 output missing perInstance' };
    return state;
}
```

## Verification
| Check | Status |
|-------|--------|
| buildPerInstanceOutput removed | ✅ |
| mapPipelinePerInstance is pure | ✅ |
| answer() uses ${instanceId}::${factKey} | ✅ |
| Error on missing perInstance | ✅ |
| Tests pass | ✅ |
