# M29 Soak Determinism — Debug Playbook

## What is Soak Testing?

Soak testing runs the same input many times (500+) to verify determinism.
The pipeline must produce identical output (chips, billing codes, text) every time.

---

## Running the Soak Test

### Local (Quick, 50 runs)

```bash
# Default 50 iterations
npx vitest run src/docudent/__tests__/gates/gate-m29-soak-determinism-500x.test.ts
```

### Local (Skip soak, basic only)

```bash
SKIP_SOAK=true npx vitest run gate-m29
```

### CI Nightly (500 runs)

```bash
SOAK_COUNT=500 npx vitest run gate-m29 --timeout=300000
```

---

## Debugging Failures

If determinism fails:

1. **Check trace output**: `result.trace?.instances[0]` should be identical
2. **Check chips**: They must be in same order and count
3. **Check ruleHits**: Same rules must fire every time
4. **Check random seeds**: No `Math.random()` in pipeline

### Common Causes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Different chip order | Non-deterministic Set iteration | Use Array + sort |
| Different question order | Async race | Use sequential processing |
| Different billing codes | Random selection | Deterministic priority |

---

## Test Input

The soak test uses a fixed input:

```typescript
{
    dictation: 'Füllung Zahn 36 mo Komposit Caries media',
    treatmentId: 'fuellung',
    insuranceType: 'GKV',
    textLength: 'mittel',
    testOnly: {
        enabled: true,
        forceExtraction: { tooth: '36', surfaces: ['mo'], diagnosis: 'caries_media' },
        forceAnswers: { medical_ueberkappung: 'keine' },
    },
}
```

This ensures no LLM extraction variance.
