# Reality Audit: perInstance is SSOT

**Date**: 2025-12-31
**Prompt**: 1/6
**Status**: ✅ PASS

## Audit Findings

### Before (Dual Rendering Problem)
```typescript
// GLOBAL RENDER (line 484) - REMOVED
const renderResult = renderFromKbChips({ chips: allowedChipIds... });

// PER-INSTANCE RENDER (line 541)
// ... but then FALLBACK to global:
finalFullText = perInstanceTexts[0] ?? renderResult.fullText;  // BAD
billingCodes: allBillingRefs.length > 0 ? allBillingRefs : renderResult.billingCodes;  // BAD
```

### After (Single SSOT)
```typescript
// ONLY perInstance rendering - no global renderResult
for (const result of results) {
    perInstance[result.instanceId] = { ...renderFromKbChips(instance.chips)... };
}

// Global derived from perInstance ONLY
finalFullText = perInstanceTexts.join(' \n\n') || perInstanceTexts[0] || '';  // No fallback!
billingCodes = allBillingRefs;  // No fallback!
```

## Changes Made
- **Removed**: Global `renderResult` at line 484-493
- **Removed**: Fallback `?? renderResult.fullText` at line 569
- **Removed**: Fallback `allBillingRefs.length > 0 ? ... : renderResult.billingCodes`

## New Tests Added
Contract F: SSOT Derivation in `v10.per-instance-output.contract.test.ts`:
- Global fullText = concat of perInstance texts
- Global billingCodes = union of perInstance billingRefs
- Global cannot have MORE codes than perInstance total

## Verification
| Command | Status |
|---------|--------|
| `npm run build` | ✅ |
| `npx vitest run v10/__tests__/ui` | ✅ 47/47 |
| `npx vitest run gate-v10-no-imports-from-v7` | ✅ 5/5 |
| `npm run atlas:refresh` | ✅ |
| `npm run atlas:check` | ✅ |
