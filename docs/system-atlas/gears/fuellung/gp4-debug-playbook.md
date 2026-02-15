# GP4: Debug Playbook

## Quick Debug Steps

### 1. Run truthcase with DEV mode

```typescript
const result = await runV10({
    dictation: 'Zahn 36 mod Füllung',
    treatmentId: 'fuellung',
    insuranceType: 'GKV',
    textLength: 'mittel',
});
console.log(result.meta.billingCompleteness);
```

### 2. Check billing completeness

```typescript
// Is everything traced?
if (!result.meta.billingCompleteness?.isComplete) {
    console.log('Missing:', result.meta.billingCompleteness?.missing);
}
```

### 3. Check origins

```typescript
for (const origin of result.meta.billingCompleteness?.origins ?? []) {
    console.log(`${origin.code} ← ${origin.origin} (${origin.ref})`);
}
```

### 4. Check combinability

```typescript
if (result.meta.combinability?.droppedCodes?.length) {
    console.log('Dropped:', result.meta.combinability.droppedCodes);
    console.log('Conflicts:', result.meta.combinability.conflicts);
}
```

## Common Issues

| Symptom | Check | Fix |
|---------|-------|-----|
| `isComplete: false` | `missing` array | Add billingRef to chip or surface_mapping |
| `state: error` from combinability | `autoResolve` missing | Add `autoResolve: drop_anchor` to rule |
| GOZ in GKV | Channelization | Check `chip.billingRef.GKV` branch |
| Missing F-code | surface_mapping | Verify surfaces extracted correctly |

## Gate Commands

```bash
# Run all GP4 gates
npm test -- --run src/docudent/v10/__tests__/gates/gate-fuellung

# Run specific gate
npm test -- --run gate-fuellung-billing-complete

# Run with verbose output
npm test -- --run gate-fuellung-billing-complete --reporter=verbose
```
