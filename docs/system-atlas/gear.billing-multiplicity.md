# Gear: Billing Multiplicity

**ID:** gear-billing-multiplicity  
**Status:** Active  
**Created:** 2026-01-07

---

## Purpose

Preserve billing code multiplicity for multi-tooth/multi-instance cases. Ensures 2 teeth with same treatment = 2x billing code.

## Contract

```typescript
// SSOT: perInstance (per-tooth billing)
output.perInstance = {
    'fuellung-36-1': { billingRefs: ['BEMA_13'] },
    'fuellung-46-2': { billingRefs: ['BEMA_13'] },
};

// Derived: global billingCodes (with multiplicity preserved)
output.billingCodes = ['BEMA_13', 'BEMA_13'];  // 2x for 2 teeth
```

## Implementation

**File:** `src/docudent/v10/pipeline/runV10.ts` (line ~569)

```typescript
// GEAR 2: Billing Multiplicity - derive from perInstance WITHOUT dedup
const allBillingRefs = Object.values(perInstance).flatMap(p => p.billingRefs);
```

## Previous (Incorrect)

```typescript
// WRONG: Set deduplication loses multiplicity
const allBillingRefs = [...new Set(Object.values(perInstance).flatMap(p => p.billingRefs))];
```

## Verification

Multi-tooth test case:
```
Input: "Füllung 36 und 46 okklusal Komposit"
Expected: billingCodes = ['BEMA_13', 'BEMA_13'] (2x)
```

## Impact

| Before | After |
|--------|-------|
| 1x BEMA_13 | 2x BEMA_13 |
| Under-billing | Correct billing |
