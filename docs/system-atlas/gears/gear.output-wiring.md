# Gear: Output Wiring Contract

**Owner:** V10 Pipeline  
**Status:** ✅ Locked

## Output Contract (SSOT)

```typescript
// runV10 → useV10Pipeline → OutputFlow

interface V10Output {
    fullText: string;
    billingCodes: string[];  // BillingRefs at ROOT
    perInstance?: Record<string, InstanceOutput>;
    sections?: ComposedSection[];
}
```

## Contract Invariants

| Rule | Enforcement |
|------|-------------|
| `billingCodes` at root | Hook normalization preserves shape |
| No `billing.codes` | BANNED - legacy shape removed |
| No hardcoded billing | BillingRefs only, no BEMA_/GOZ_ in runtime |
| perInstance is SSOT | Global derived, no dedup |

## Data Flow

```
┌─────────────┐    ┌───────────────────┐    ┌────────────────┐
│   runV10    │───▶│  useV10Pipeline   │───▶│   OutputFlow   │
│  .output    │    │   normalize()     │    │                │
│ billingCodes│    │  preserve shape   │    │ billingCodes   │
└─────────────┘    └───────────────────┘    └────────────────┘
```

## Key Files

| Purpose | File |
|---------|------|
| Pipeline | `src/docudent/v10/pipeline/runV10.ts` |
| Hook | `src/docudent/v10/hooks/useV10Pipeline.ts` |
| Output UI | `src/docudent/v10/components/OutputFlow.tsx` |
| Contract | `src/docudent/contracts/output.ts` |

## DEV Instrumentation

```typescript
// useV10Pipeline.ts (DEV only)
console.debug('[V10 raw billingCodes]', v10Result?.output?.billingCodes);
console.debug('[V10 billingCodes count]', result.output?.billingCodes?.length);
```

## Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Keine Positionen" | billingCodes undefined | Check hook normalization |
| Empty output text | fullText not preserved | Check spread operator |
| Wrong billing count | Dedup applied | Use perInstance as SSOT |
