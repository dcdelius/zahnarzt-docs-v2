# V10 Per-Instance Output Implementation

**Date**: 2025-12-31
**Status**: ✅ COMPLETED

## What Changed

Implemented true per-instance output in `runV10` with real instanceIds from scoping.

### Pipeline (`runV10.ts`)
- Uses `scopeExtractionToInstances` for real instanceIds (format: `fuellung-36-1`)
- Each instance rendered separately via `renderFromKbChips`
- `perInstance` is now SSOT - global `fullText`/`billingCodes` derived from it

### Session (`createV10Session.ts`)
- Direct 1:1 mapping from `runV10.output.perInstance`
- Errors if `perInstance` missing (no silent fallback)

### Types (`types.ts`)
```typescript
perInstance: Record<string, {
    instanceId: string;
    teeth: string[];
    text: string;
    billingRefs: string[];
    chips: string[];
}>;
```

## Verification Results

| Command | Result |
|---------|--------|
| `npm run build` | ✅ PASS |
| `npx vitest run v10/__tests__/ui` | ✅ 44/44 passed |
| `npx vitest run gate-v10-no-imports-from-v7` | ✅ 5/5 passed |
| `npm run atlas:refresh` | ✅ PASS |
| `npm run atlas:check` | ✅ PASS |

## New Contract Tests

`v10.per-instance-output.contract.test.ts`:
- A: perInstance keys match session instances
- B: Valid perInstance structure
- C: billingRefs are arrays, not in text
- D: Single-tooth regression
- E: SSOT invariants maintained
