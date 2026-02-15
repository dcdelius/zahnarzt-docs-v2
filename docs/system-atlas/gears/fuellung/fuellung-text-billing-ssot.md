# Füllung Text-Billing SSOT Contract (GP8)

> **Contract**: Output text MUST NOT mention any billing code that is NOT in `output.billingCodes`.
> DroppedCodes from combinability auto-resolve are filtered from BOTH billing AND text.

## Problem Solved

Before GP8, `composedDoc` was built BEFORE droppedCodes filtering. This caused drift:
- `output.billingCodes` was correct (filtered)
- `output.fullText` was stale (pre-filter)
- Example: GOZ_2197 dropped but still listed in Abrechnung section

## Architecture Fix

```
┌─────────────────────────────────────────────────────────────────┐
│                        runV10.ts Flow                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Renderer → billingRefs per chip                            │
│  2. Combinability → check conflicts                            │
│  3. AutoResolve → droppedCodes[]                               │
│  4. Filter → finalBillingCodes, finalPerInstance               │
│  5. Composer → text using FILTERED data ← GP8 FIX HERE         │
│  6. BillingCompleteness → track origins                        │
│  7. Output → fullText + billingCodes + perInstance             │
└─────────────────────────────────────────────────────────────────┘
```

## Key Implementation

```typescript
// runV10.ts - GP8 Critical Order

// 1. Filter billing codes FIRST
if (combinabilityResult?.droppedCodes.length > 0) {
    finalBillingCodes = allBillingRefs.filter(c => !droppedSet.has(c));
    finalPerInstanceWithFacts = { /* filtered data */ };
}

// 2. THEN compose text with filtered data
const composedDoc = composeDocumentationV10({
    perInstance: finalPerInstanceWithFacts,  // ← Filtered!
    ...
});
```

## Contracts Enforced

| Contract | Description | Gate |
|----------|-------------|------|
| Text ⊆ Billing | Every code in fullText must be in billingCodes | `gate-fuellung-text-billing-consistency` |
| Dropped ∉ Text | DroppedCodes must not appear in text | `gate-fuellung-droppedcodes-propagation` |
| Abrechnung = Final | Abrechnung section uses finalBillingCodes | Both gates |

## Debug Checklist

### "GOZ_2197 in text but not in billingCodes"

1. **Check droppedCodes**
   ```ts
   result.meta.combinability?.droppedCodes  // Should include 'GOZ_2197'
   ```

2. **Check if composer was called AFTER filtering**
   - Look for `GP8` comments in runV10.ts
   - Verify `composeDocumentationV10` uses `finalPerInstanceWithFacts`

3. **Compare section content with billingCodes**
   ```ts
   const abr = result.output.sections.find(s => s.id === 'abrechnung');
   // Should only list codes present in result.output.billingCodes
   ```

## Related Gates

| Gate | Tests | Command |
|------|-------|---------|
| `gate-fuellung-text-billing-consistency` | 8 | `npm test -- --run gate-fuellung-text-billing-consistency` |
| `gate-fuellung-droppedcodes-propagation` | 3 | `npm test -- --run gate-fuellung-droppedcodes-propagation` |

## Related Documentation

- [Chip SSOT Contract (GP7)](./fuellung-chip-ssot-contract.md)
- [Billing Completeness (GP4)](./gp4-billing-completeness-contract.md)
