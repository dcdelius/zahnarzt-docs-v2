# M39 Clinical QA v4

## Summary

| Metric | Value |
|--------|-------|
| Truthcases | 35 |
| Gates | 6 |
| Tests | 53/53 ✅ |

---

## Truthcase Categories

| Category | Count | Focus |
|----------|-------|-------|
| Settings reduce askbacks | 10 | defaultLA, isolation, WL, WF, capping |
| Manual overrides | 10 | override beats settings, reset to auto |
| Multi-treatment | 10 | scope isolation, danach/zusätzlich |
| Confusables | 5 | NaCl vs NaOCl, traps |

---

## Gates

| Gate | Tests |
|------|-------|
| gate-m39-clinical-v4-settings-reduce-askbacks | Settings provide values |
| gate-m39-clinical-v4-manual-overrides-beat-settings | Override precedence |
| gate-m39-clinical-v4-negation-precedence-holds | Negation always wins |
| gate-m39-clinical-v4-multitreatment-scope-does-not-leak | Segment scoping |
| gate-m39-clinical-v4-determinism-100x | Hash stability |
| gate-m39-billing-invariants-explainable-by-chips | No phantom codes |

---

## Why No Exact Billing Expectations?

Exact billing lists are fragile:
- SSOT changes break tests
- Masks root cause (chip logic vs rendering)
- Creates maintenance burden

Instead we use **invariants**:
- `mustInclude` / `mustNotInclude` for known requirements
- `explainableByChips` ensures every code traces to chip billingRef
- Contract assertions catch logic errors, not data drift

---

## Commands

```bash
npx vitest run src/docudent/__tests__/gates/gate-m39*.test.ts --reporter=verbose
```

---

## Files

```
src/docudent/v10/qa/clinicalTruthcases.v4.ts
src/docudent/v10/qa/clinicalAssertionContract.v2.ts (extended)
src/docudent/__tests__/gates/gate-m39-*.test.ts (5 files)
```
