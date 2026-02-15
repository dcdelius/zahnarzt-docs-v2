# M31 Clinical QA Report

## Summary

| Metric | Value |
|--------|-------|
| Total Truthcases | 60 |
| Füllung | 25 |
| Endo | 25 |
| Multi-tooth | 10 |
| Gates Created | 5 |

---

## Truthcase Distribution by Category

| Category | Count |
|----------|-------|
| profunda | 3 |
| vipr | 4 |
| la | 3 |
| isolation | 3 |
| wl | 3 |
| wf | 3 |
| spuelung | 3 |
| roentgen | 2 |
| multi | 10 |
| negation | 1 |
| false_positive | 5 |

---

## Top 5 Critical Cases

| Case | Description |
|------|-------------|
| f01_profunda_cp | Profunda with CP → BEMA_25 |
| f02_profunda_p_direct | Direct pulp capping → BEMA_26 |
| e04_wl_elektrisch | WL method → correct chip |
| e13_spuelung_no_nacl | NaCl ≠ NaOCl false positive |
| f13_kofferdam_nicht | Negation "kein Kofferdam" |

---

## Gates

| Gate | Purpose | Tests |
|------|---------|-------|
| gate-m31-clinical-truthcases-v2-run | Runs all 60 cases | 15+ |
| gate-m31-no-vibe-askbacks-expanded | Askbacks require triggers | 5 |
| gate-m31-false-positive-negations | Negation handling | 7 |
| gate-m31-fuellung-clinical-parity | Füllung chip/billing | 6 |
| gate-m31-endo-clinical-parity | Endo chip/billing | 8 |

---

## Test Commands

```bash
# M31 only
npx vitest run src/docudent/__tests__/gates/gate-m31*.test.ts --reporter=verbose

# All M-gates regression
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot
```

---

## Files Created

```
# Assertions + Truthcases
src/docudent/v10/qa/clinicalAssertions.ts
src/docudent/v10/qa/clinicalTruthcases.v2.ts

# Gates
src/docudent/__tests__/gates/gate-m31-clinical-truthcases-v2-run.test.ts
src/docudent/__tests__/gates/gate-m31-no-vibe-askbacks-expanded.test.ts
src/docudent/__tests__/gates/gate-m31-false-positive-negations.test.ts
src/docudent/__tests__/gates/gate-m31-fuellung-clinical-parity.test.ts
src/docudent/__tests__/gates/gate-m31-endo-clinical-parity.test.ts

# Report
docs/audit/m31-clinical-qa-report.md
```

---

## False Positive Protections

| Protection | Example |
|------------|---------|
| "kein Kofferdam" | Must not trigger BEMA_12 |
| "ohne Betäubung" | Must not trigger BEMA_40/41a |
| "keine Röntgen" | Must not trigger BEMA_Ä925a |
| NaCl vs NaOCl | Must distinguish |
| "Patient spült zuhause" | Must not trigger spülung chips |

---

## Askback Triggers (Expected)

| Askback | Triggers |
|---------|----------|
| medical_ueberkappung | profunda, pulpanah, tiefe |
| medical_la_type | spritze, betäubung (ambiguous) |
| medical_vipr | vitalität, sensibilität |
