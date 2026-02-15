# M28-M30 Hardening Report

## Summary

| Task | Status | Files |
|------|--------|-------|
| T1: Test-only isolation | ✅ | kombinationen.test_only.json, 2 gates |
| T2: M28 Fail-fast | ✅ | gate-m28 |
| T3: M29 Soak | ✅ | gate-m29, debug-playbook.md |
| T4: M30 Truthcases | ✅ | gate-m30 (55 cases) |

---

## Changes

### New Files

```
src/docudent/core/billing/knowledgeBase/regeln/kombinationen.test_only.json
src/docudent/__tests__/gates/gate-no-testonly-rules-in-prod-build.test.ts
src/docudent/__tests__/gates/gate-testonly-options-blocked-in-prod.test.ts
src/docudent/__tests__/gates/gate-m28-unsupported-treatments-are-failfast.test.ts
src/docudent/__tests__/gates/gate-m29-soak-determinism-500x.test.ts
src/docudent/__tests__/gates/gate-m30-truthcases-expanded.test.ts
docs/v10/onboarding/debug-playbook.md
```

### Modified Files

```
src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json (-36 lines)
src/docudent/v10/types.ts (+3 lines: forceBillingCodes)
```

---

## Test Commands

```bash
# All M-gates
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot

# New gates only
npx vitest run \
  src/docudent/__tests__/gates/gate-no-testonly*.test.ts \
  src/docudent/__tests__/gates/gate-testonly-options*.test.ts \
  src/docudent/__tests__/gates/gate-m28*.test.ts \
  src/docudent/__tests__/gates/gate-m29*.test.ts \
  src/docudent/__tests__/gates/gate-m30*.test.ts \
  --reporter=verbose

# Soak with 500 iterations (CI nightly)
SOAK_COUNT=500 npx vitest run gate-m29 --timeout=300000

# Skip soak locally
SKIP_SOAK=true npx vitest run gate-m29
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Test rules accidentally merged in prod | Gate verifies no TEST_ codes in prod kombinationen.json |
| Soak test timeout | SKIP_SOAK env var for local, longer timeout in CI |
| BLOCK truthcases depend on real rules | Uses GOZ_2197 rule which is production-stable |
| Unsupported treatments not caught | hasPack() check in pack registry verified by M28 gate |

---

## Gate Count

- M28: 6 assertions (unsupported treatments)
- M29: 4 tests (soak + singles)
- M30: 55 truthcases + 6 shape tests
- Test-only: 12 assertions (prod isolation)
