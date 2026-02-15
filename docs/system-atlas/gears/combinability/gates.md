# Combinability Gate Suite

## Gate Definitions

| Gate | File | Tests |
|------|------|-------|
| Auto-Resolve | `gate-combinability-auto-resolve.test.ts` | 7 |
| Final Billing | `gate-combinability-final-billing.test.ts` | 4 |
| No Hardcodes | `gate-no-hardcoded-billing.test.ts` | 2 |
| DB Coverage | `gate-combinability-db-coverage.test.ts` | TBD |
| Top Cases | `gate-truthcases-top15.test.ts` | 15 |

## Gate Specifications

### gate-combinability-auto-resolve.test.ts (EXISTS)
- 2197 + 2100 → WARN, droppedCodes has 2197
- 2197 alone → PASS
- F-code alone → PASS
- blockedCodes empty for auto-resolved

### gate-combinability-final-billing.test.ts (EXISTS)
- GOZ_2197 NOT in final billingCodes
- GOZ_2197 NOT in perInstance.billingRefs
- warnings in meta, NOT in fullText

### gate-combinability-db-coverage.test.ts (NEW)
```typescript
it('every DB rule has at least 1 truthcase', () => {
  const rules = loadCombinabilityKb().rules;
  const truthcases = loadTruthcases();
  for (const rule of rules) {
    const covered = truthcases.some(tc => tc.ruleId === rule.id);
    expect(covered).toBe(true);
  }
});
```

### gate-no-silent-block.test.ts (NEW)
```typescript
it('BLOCK only when autoResolve=undefined', () => {
  const rules = loadCombinabilityKb().rules;
  for (const rule of rules.filter(r => r.schweregrad === 'regress')) {
    if (!rule.autoResolve) {
      // OK to BLOCK
    } else {
      // Must WARN, not BLOCK
    }
  }
});
```

### gate-kb-schema-combinability.test.ts (NEW)
```typescript
it('all rules have valid matchers', () => {
  const rules = loadCombinabilityKb().rules;
  for (const rule of rules) {
    expect(rule.betrifft.length).toBeGreaterThan(0);
    for (const code of rule.betrifft) {
      expect(code).toMatch(/^(GOZ|BEMA|BEL|TEST)_/);
    }
  }
});
```

## Directory Structure

```
src/docudent/v10/__tests__/gates/
├── gate-combinability-auto-resolve.test.ts     ✅ EXISTS
├── gate-combinability-final-billing.test.ts    ✅ EXISTS
├── gate-combinability-db-coverage.test.ts      📝 NEW
├── gate-no-silent-block.test.ts                📝 NEW
├── gate-kb-schema-combinability.test.ts        📝 NEW
└── gate-truthcases-top15.test.ts               ✅ EXISTS (15 cases)
```

## Run All Gates

```bash
npm test -- --run src/docudent/v10/__tests__/gates
```
