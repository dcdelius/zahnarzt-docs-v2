# GIGAPROMPT B — Runtime Checker Contract

## API Contract

### CombinabilityInput

```typescript
interface CombinabilityInput {
  billingCodes: string[];
  perInstance: {
    instanceId: string;
    billingRefs: string[];
    facts?: Record<string, unknown>;
    chips?: string[];
  }[];
  insuranceType: 'GKV' | 'PKV' | 'MKV';
  treatmentId: string;
  scope?: 'SESSION' | 'TOOTH';
}
```

### CombinabilityResult

```typescript
interface CombinabilityResult {
  verdict: 'PASS' | 'WARN' | 'BLOCK';
  conflicts: CombinabilityConflict[];
  droppedCodes: string[];  // Auto-resolved
  blockedCodes: string[];  // Hard block
  warnings: string[];      // Human-readable
  traceLine: string;
  kbVersion: string;
}
```

## Matching Semantik

| Type | Pattern | Example | Implementation |
|------|---------|---------|----------------|
| Exact | `GOZ_2197` | `code === 'GOZ_2197'` | `billingCodes.includes(code)` |
| Prefix | `GOZ_21*` | `GOZ_2100`, `GOZ_2197` | `code.startsWith('GOZ_21')` |
| Range | `GOZ_2060..GOZ_2120` | All F-codes | Expand to array at compile time |
| Regex | `/^BEMA_13[a-d]?$/` | `BEMA_13`, `BEMA_13b` | Fallback, sparse use |

## AutoResolve Policy Matrix

| Policy | Behavior | Use Case |
|--------|----------|----------|
| `NONE` | BLOCK if severity=regress | Default, strict |
| `DROP_ANCHOR` | Remove anchor code(s) | 2197 inkludiert in 2060-2120 |
| `DROP_BLOCKWITH` | Remove blockWith codes | Rare |
| `PREFER_SPECIFIC` | Keep specific, drop generic | Future |

### Determinism Rules

1. AutoResolve only if rule.autoResolve is set
2. Multiple drops: sort by priority (desc), then id (asc)
3. Re-check loop: max 3 iterations until stable or BLOCK
4. Same input → identical output (gate enforced)

## Integration in runV10

```
allBillingRefs (from perInstance)
       ↓
checkCombinabilityFromKb()
       ↓
  droppedCodes?
       ↓
filter finalBillingCodes + perInstance.billingRefs
       ↓
meta.combinability = result
       ↓
state = 'output' (if verdict != BLOCK)
```

### Key Lines (runV10.ts)

```typescript
if (combinabilityResult?.droppedCodes.length > 0) {
    finalBillingCodes = allBillingRefs.filter(c => !droppedSet.has(c));
    // Filter from perInstance too
}
```

## Warnings: Debug Only

- `result.warnings` → `meta.combinability.warnings` (DEV drawer)
- `fullText` → NEVER contains drop/warning text
- Gate: `gate-combinability-final-billing.test.ts`
