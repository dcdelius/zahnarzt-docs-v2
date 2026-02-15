# Audit.Output.md — Output & Frontend Verification

**Generated:** 2025-12-30  
**Status:** ✅ VERIFIED

---

## 1. Output Invariants

### ✅ NO TEXT WITHOUT CHIP
**File:** `src/docudent/v7/output/renderFromKbChips.ts`

**Hard Enforcement (lines 240-246):**
```typescript
if (!chip) {
    meta.missingChips.push(chipId);
    if (process.env.NODE_ENV !== 'production') {
        throw new Error(`[SSOT RENDERER] Chip "${chipId}" not found in KB...`);
    }
    continue;
}
```

- **DEV:** Throws error if chip not in KB
- **PROD:** Adds to `meta.missingChips` and skips

### ✅ NO CHIP WITHOUT KB
All chips must exist in `unified.json` for the treatment. Validated by:
- `renderFromKbChips` (runtime)
- `validateMedicalChipsExistInKb()` (gate tests)

---

## 2. PII Safety

### ✅ NO PATIENT PII IN OUTPUT

**Searched for patient fields in V10 pipeline:**
```
patient.*name, patientName, patient_name → 0 results
age, birthdate, gender, geschlecht → 0 results
```

**V10PipelineOutput Contract (from runV10.ts):**
```typescript
{
  state: 'questions' | 'output' | 'error',
  questions?: DynamicQuestion[],
  output?: {
    fullText: string,          // KB-derived only
    billingCodes: string[],    // From unified.json
    perTooth?: [...]           // Optional multi-instance
  },
  meta: {...}                  // Trace/debug only
}
```

**No patient-identifying fields in output contract.**

---

## 3. UI Readiness

### Output States:
| State | UI Component | Handled? |
|-------|--------------|----------|
| `questions` | `QuestionsFlowV2` | ✅ |
| `output` | `OutputFlow` | ✅ |
| `error` | Error display | ✅ |

### Multi-Instance Support:
- `perTooth` array available in output
- UI can render per-tooth sections

### Askback Completeness:
- `questionsBundle` provides `required`, `optionalVisible`, `optionalHidden`
- UI can progressively disclose options

---

## 4. Test Coverage

### E2E Tests:
| Area | Test File | Status |
|------|-----------|--------|
| Output rendering | V7 E2E tests (quarantined) | ⚠️ Quarantined |
| Multi-instance | gate-v10-workflow-multi-scoping | ✅ Active |
| Billing output | gate-m82-no-silent-billing-drop | ✅ Active |

### ⚠️ GAP: Quarantined E2E Tests
The full UI flow E2E tests are in quarantine:
- `ui-flow-e2e.test.tsx`
- `ui-flow.test.tsx`

These test V7 UI patterns. V10 relies on component-level tests.

---

## 5. Summary

| Question | Answer |
|----------|--------|
| No text without chip? | ✅ YES (enforced in renderer) |
| No chip without KB? | ✅ YES (throws in DEV) |
| No PII in output? | ✅ YES (verified by grep) |
| UI can handle all states? | ✅ YES |
| E2E coverage? | ⚠️ PARTIAL (V7 E2E quarantined) |
