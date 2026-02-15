# Full-Circle Verification & Hardening Report

**Generated**: 2025-12-26  
**Status**: 🟢 GREEN

---

## Ampelübersicht

| Component | Status | Evidence |
|-----------|--------|----------|
| V10 Orchestrator | 🟢 | Single entry point |
| SSOT Chips | 🟢 | unified.json per treatment |
| No Phantom Billing | 🟢 | gate-no-phantom-billing-codes |
| Combinability Guard | 🟢 | BLOCK → state=error |
| Text Drift | 🟢 | Allowlist enforced |
| Billing Mismatch | 🟢 | gate-m26-no-billing-mismatch |
| Determinism | 🟢 | 100x stable hash |

---

## Test Runbook (Copy/Paste Ready)

### 1. Schnellcheck (alle Gates)
```bash
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot
```

### 2. M27 Fokus (Hardening/Explain)
```bash
npx vitest run src/docudent/__tests__/gates/gate-m27*.test.ts --reporter=verbose
```

### 3. Soak (Determinism 100x)
```bash
npx vitest run src/docudent/__tests__/gates/gate-m27-explain-report-determinism-100x.test.ts --reporter=verbose
```

### 4. Extended Soak (500x - lokal)
```bash
# Modify test file: change 100 to 500
npx vitest run src/docudent/__tests__/gates/gate-m27-explain-report-determinism-100x.test.ts
```

### 5. No-Cheat Proof Gates
```bash
npx vitest run src/docudent/__tests__/gates/gate-no-phantom*.test.ts \
  src/docudent/__tests__/gates/gate-chips-exist*.test.ts \
  src/docudent/__tests__/gates/gate-combinability-block*.test.ts
```

### 6. Combinability Truthcases (45 cases)
```bash
npx vitest run src/docudent/__tests__/gates/gate-m27-combinability-truthcases.test.ts --reporter=verbose
```

---

## Top 10 Failure Modes + Guards

| # | Failure Mode | Guard |
|---|--------------|-------|
| 1 | Phantom billing code (no chip source) | gate-no-phantom-billing-codes |
| 2 | Chip missing in unified.json | gate-chips-exist-in-ssot |
| 3 | BLOCK verdict but output produced | gate-combinability-block-means-error |
| 4 | Text without chip | gate-m27-textblocks-map-to-chips |
| 5 | Billing mismatch in common chip | gate-m26-no-billing-mismatch |
| 6 | Orphan emit rule | gate-m26-emit-rules-target-valid-chips |
| 7 | Text drift without allowlist | gate-m26-text-drift-explicit |
| 8 | Non-deterministic output | gate-m27-explain-report-determinism-100x |
| 9 | Legacy imports in V10 | gate-billing-no-legacy-imports-runtime |
| 10 | Inferred-only chip drives billing | BillingEligibilityGuard |

---

## 20 New High-Pain Truthcases

### Distribution

| Verdict | Count | Focus |
|---------|-------|-------|
| BLOCK | 8 | Endo WF-ohne-WL, GOZ exclusions, Triple LA |
| PASS | 8 | WKB chains, Multi-canal, LA+Füllung |
| WARN | 4 | Revision, Many fillings, Frequency |

### Sample Cases

| ID | Codes | Expected |
|----|-------|----------|
| endo_block_001_wf_ohne_wl | BEMA_34 | BLOCK |
| goz_block_001_2100_2120 | GOZ_2100 + GOZ_2120 | BLOCK |
| la_block_001_triple | BEMA_40 + 41a + 42 | BLOCK |
| freq_block_001_pzr_double | BEMA_107a × 2 | BLOCK |
| endo_pass_001_wkb_chain | BEMA_32 + 33 + 34 | PASS |
| la_pass_001_infiltr_fuellung | BEMA_40 + 25 | PASS |
| endo_warn_001_revision | GOZ_2410 + 2330 | WARN |

---

## Known Incomplete Treatments

| Treatment | Status | Fail-Fast |
|-----------|--------|-----------|
| extraction | ❌ No chips | gate-mvp-no-error fails |
| pzr | ❌ No chips | gate-mvp-no-error fails |
| crown_prep | ❌ No chips | gate-mvp-no-error fails |

### Recommended: M28 Fail-Fast

```typescript
// In runV10.ts before extraction:
if (!SUPPORTED_TREATMENTS.has(treatmentId)) {
    return {
        state: 'error',
        error: `Behandlung '${treatmentId}' wird noch nicht unterstützt.`,
        meta: { unsupportedTreatment: true }
    };
}
```

---

## Next PRs Roadmap

| PR | Description | Priority |
|----|-------------|----------|
| **M28** | Fail-fast for unsupported treatments | HIGH |
| **M29** | Nightly soak test (500x determinism) | MEDIUM |
| **M30** | Truthcases expansion (50+ cases) | MEDIUM |
| **M31** | Billing code → Chip provenance complete | LOW |

---

## Verification Commands

```bash
# Full gate suite
npx vitest run src/docudent/__tests__/gates/ --reporter=dot

# Count gates
ls src/docudent/__tests__/gates/gate-*.test.ts | wc -l
```

---

## Proof Summary

1. ✅ Every billingCode has sourceChipId (gate-no-phantom)
2. ✅ Every chip exists in unified.json (gate-chips-exist-in-ssot)
3. ✅ Every textBlock maps to chips (gate-m27-textblocks)
4. ✅ BillingGuard blocks inferred-only (in runV10)
5. ✅ BLOCK → state=error (gate-combinability-block-means-error)
6. ✅ ExplainReport is deterministic (gate-m27-determinism-100x)
