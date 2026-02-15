# M32 Clinical QA v3 Report

## Summary

| Metric | Value |
|--------|-------|
| V3 Truthcases | 30 |
| Negation | 10 |
| Confusable | 10 |
| Endo Core | 5 |
| Multi Scope | 5 |
| New Gates | 3 |

---

## Contract Types

### ExpectedAskbacks
```typescript
{ mustHave?: string[], mustNotHave?: string[] }
```

### ExpectedChips
```typescript
{ mustHave?: string[], mustNotHave?: string[] }
```

### BillingInvariants
```typescript
{
  mustIncludeCodes?: string[],
  mustNotIncludeCodes?: string[],
  mustBeExplainableByChips?: boolean
}
```

---

## Key Assertions

| Category | Assertion | Example |
|----------|-----------|---------|
| Negation | "kein Kofferdam" → no BEMA_12 | neg01 |
| Negation | "ohne Betäubung" → no BEMA_40 | neg02 |
| Confusable | NaCl ≠ NaOCl | conf01 |
| Confusable | "Spritze" → QUESTIONS | conf07 |
| Endo Core | 4 canals → kanalaufbereitung_4 | endo02 |
| Multi Scope | Shared LA → single BEMA_41a | multi01 |

---

## Gates

| Gate | Purpose |
|------|---------|
| gate-m32-clinical-contract-run | Runs 30 V3 truthcases |
| gate-m32-no-false-positive-negations-expanded | Negation MUST NOT billing |
| gate-m32-questions-when-ambiguous | Ambiguous → QUESTIONS |

---

## Test Commands

```bash
# M32 only
npx vitest run src/docudent/__tests__/gates/gate-m32*.test.ts --reporter=verbose

# Regression
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot
```

---

## How to Add a Truthcase

1. Choose category: negation, confusable, endo_core, multi_scope
2. Add to `clinicalTruthcases.v3.ts`:

```typescript
{
    id: 'neg_XX_description',
    treatmentId: 'fuellung',  // or 'endo'
    insuranceType: 'GKV',
    dictation: 'Your German dictation text',
    contract: {
        expectedState: 'output',  // or 'questions' or 'error'
        chips: {
            mustHave: ['chip_a'],
            mustNotHave: ['chip_b'],
        },
        billing: {
            mustIncludeCodes: ['BEMA_XX'],
            mustNotIncludeCodes: ['BEMA_YY'],
        },
    },
    category: 'negation',
    description: 'What this tests',
}
```

3. Run: `npx vitest run gate-m32-clinical-contract-run`

---

## Files

```
# Contract + Truthcases
src/docudent/v10/qa/clinicalAssertionContract.v1.ts
src/docudent/v10/qa/clinicalTruthcases.v3.ts

# Gates
src/docudent/__tests__/gates/gate-m32-clinical-contract-run.test.ts
src/docudent/__tests__/gates/gate-m32-no-false-positive-negations-expanded.test.ts
src/docudent/__tests__/gates/gate-m32-questions-when-ambiguous.test.ts

# Report
docs/audit/m32-clinical-qa-v3-report.md
```
