# M34 Clinical MultiTreatment QA v5

## Summary

| Metric | Value |
|--------|-------|
| V5 Truthcases | 25 |
| Same-tooth | 10 |
| Different-tooth | 10 |
| Confusable | 5 |
| Gates | 4 |

---

## What Improved vs M33/M32

| M32/M33 | M34 |
|---------|-----|
| Single-treatment contracts | **Per-instance contracts** |
| Global askback checking | **Instance-scoped askbacks** |
| Single-level chip assertions | **byInstance chip expectations** |
| Basic negation detection | **Negation leak prevention per instance** |

---

## Contract V2 Structure

```typescript
interface ClinicalContractV2 {
  expectedState: 'output' | 'questions' | 'error';
  global?: {
    askbacks?: { mustHave?: string[]; mustNotHave?: string[] };
    billing?: { mustIncludeCodes?: string[]; mustNotIncludeCodes?: string[] };
  };
  byInstance?: Record<InstanceKey, {
    chips?: { mustHave?: string[]; mustNotHave?: string[] };
    billing?: { mustNotIncludeCodes?: string[] };
    textMustContain?: string[];
  }>;
}
```

---

## Coverage Table

| Pattern | Cases | Example |
|---------|-------|---------|
| Endo LA + Füllung ohne Betäubung | 4 | st01, cf01, cf03 |
| Endo Kofferdam + Füllung kein Kofferdam | 3 | st02, cf05 |
| Endo Röntgen + Füllung keine Röntgen | 2 | st03, dt07 |
| Different-tooth scope | 10 | dt01-dt10 |
| Pronoun leakage | 1 | cf03 |
| NaCl vs NaOCl in multi | 1 | cf04 |
| Session-level negation | 1 | cf05 |

---

## Top 10 Failure Modes Prevented

1. **Endo LA blocked by Füllung "ohne Betäubung"**
2. **Endo Kofferdam blocked by Füllung "kein Kofferdam"**
3. **Endo Röntgen blocked by Füllung "keine Röntgen"**
4. **Session-level negation applied only to first treatment**
5. **Pronoun "die Füllung" not recognized as scope marker**
6. **NaCl confused with NaOCl across instances**
7. **Askback attributed to wrong instance**
8. **Postendo Aufbau chips mixed with Endo chips**
9. **Different-tooth treatments sharing LA billing incorrectly**
10. **Non-deterministic instance ordering**

---

## How to Add a Truthcase

```typescript
// In clinicalTruthcases.v5.multitreatment.ts
{
    id: 'st_XX_description',
    dictation: 'Endo 14 ... danach Füllung ...',
    contractV2: {
        expectedState: 'output',
        byInstance: {
            'endo': {
                chips: { mustHave: ['la_leitung'] },
            },
            'fuellung': {
                chips: { mustNotHave: ['la_infiltr'] },
            },
        },
    },
    category: 'same_tooth',
    description: 'What this tests',
}
```

---

## Commands

```bash
# M34 only
npx vitest run src/docudent/__tests__/gates/gate-m34*.test.ts --reporter=verbose

# All M-gates
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot
```

---

## Files

```
src/docudent/v10/qa/clinicalAssertionContract.v2.ts
src/docudent/v10/qa/clinicalTruthcases.v5.multitreatment.ts
src/docudent/__tests__/gates/gate-m34-*.test.ts (4 files)
docs/audit/m34-clinical-multitreatment-qa-v5.md
```
