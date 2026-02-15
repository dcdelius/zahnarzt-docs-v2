# Test Strategy — V10 Frontend Reality

**G120: Tests that guarantee "Frontend funktioniert wirklich"**

---

## 1. Test Pyramid

```
          ┌─────────────────┐
          │   E2E (Browser) │  ← Playwright
          │   5-10 tests    │
          └────────┬────────┘
                   │
          ┌────────┴────────┐
          │  Integration    │  ← Vitest + RTL
          │  20-30 tests    │
          └────────┬────────┘
                   │
          ┌────────┴────────┐
          │     Unit        │  ← Vitest
          │  100+ tests     │
          └─────────────────┘
```

---

## 2. Critical Path Tests

### Layer 1: Core Logic (Unit)
| File | What it tests |
|------|---------------|
| `golden-mode-smoke.test.ts` | Golden facts trigger askbacks |
| `g116.truthcases.test.ts` | 6 truthcases for billing scenarios |
| `g117.stub-extraction.test.ts` | Stub mode sets unknowns |
| `golden.multitooth.test.ts` | Multi-tooth scoping |

### Layer 2: Gates (Unit)
| File | What it tests |
|------|---------------|
| `gate-no-hardcoded-billing-refs.test.ts` | No billing codes in wrong places |
| `gate-ssot-closure.test.ts` | Every output traces to chip |
| `gate-no-hardcoded-billing-codes.test.ts` | No BEMA/GOZ in output text |
| `gate-billingref-closure.test.ts` | All billingRefs exist in catalog |
| `gate-mvp-truth-run.test.ts` | 12 Füllung MVP cases pass |

### Layer 3: Integration (Vitest + RTL)
| File | What it tests |
|------|---------------|
| `v10-pipeline.integration.test.ts` | dictation → questions → chips → output |
| `askback-flow.integration.test.ts` | Answer → chip delta → state update |
| `multitreatment.scenario-suite.test.ts` | Endo + Fuellung + Extraction in one session (headless, deterministic) |

### Layer 4: E2E (Playwright)
| File | What it tests |
|------|---------------|
| `v10.e2e.spec.ts` | Full browser flow |
| `v10-golden.e2e.spec.ts` | Golden mode in browser |

---

## 3. "Frontend Works" Proof

### Minimum Viable Proof
1. ✅ `golden-mode-smoke.test.ts` passes (askbacks defined)
2. ✅ `g117.stub-extraction.test.ts` passes (unknowns set)
3. ✅ `gate-no-hardcoded-billing-refs.test.ts` passes (no cheating)
4. ⚠️ `v10-pipeline.integration.test.ts` passes (full flow)

### What Each Proves

| Test | Proves |
|------|--------|
| Golden mode smoke | Askback definitions exist |
| Stub extraction | Unknowns trigger askbacks |
| Billing gate | No hardcoded billing in KB |
| Pipeline integration | Full flow works |

---

## 4. Running Tests

### All Unit Tests
```bash
npx vitest run src/docudent/v10/
```

### All Gate Tests
```bash
npx vitest run src/docudent/v10/__tests__/gates/
```

### Reality Check (Quick)
```bash
npm run v10:reality-check
```

### E2E (Slow)
```bash
npx playwright test e2e/v10/
```

---

## 5. CI Definition

```yaml
jobs:
  test-v10:
    steps:
      - run: npx vitest run src/docudent/v10/
      - run: npx vitest run src/docudent/v10/__tests__/gates/
      - run: npm run v10:reality-check
```

