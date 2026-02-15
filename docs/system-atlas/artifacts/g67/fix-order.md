# Fix Order — Top 10 Max Leverage First

## Summary
- **Total Failing Files**: 46
- **E2E/Playwright**: 12 (move to Playwright suite)
- **Firebase**: 1 (mock or emulator)
- **Gates + Integration**: 33 (fixable)

---

## Top 10 Fixes

### 1. Move E2E tests to Playwright (G68)
**Files**: 12 `*.e2e.spec.ts` files
**Action**: Already in e2e/ folder but running in Vitest. Exclude from Vitest, run via Playwright.
**Leverage**: Removes 12 failures instantly.

### 2. Fix gate-m12_4-no-core-services-imports (G70)
**File**: `gate-m12_4-no-core-services-imports.test.ts`
**Issue**: llmExtractorAdapter imports core/services (documented exception)
**Action**: Add to allowlist with documented reason.

### 3. Fix pack completeness gates (G70)
**Files**: gate-m18, gate-m19, gate-m20, gate-m25
**Issue**: extraction_stub pack missing KB data
**Action**: Add minimal KB or update expectations.

### 4. Fix clinical parity gates (G70)
**Files**: gate-m31-endo, gate-m31-fuellung
**Issue**: Clinical output drift
**Action**: Update expectations or fix pipeline.

### 5. Mock firestore.rules.test.ts (G69)
**File**: firestore.rules.test.ts
**Issue**: Needs Firebase emulator
**Action**: Add emulator guard or vi.mock.

### 6. Fix UI wiring gates (G70)
**Files**: gate-v7-ui-wiring, gate-wiring-matrix
**Issue**: UI component references
**Action**: Update mocks or component paths.

### 7. Fix integration tests (G70)
**Files**: billing-eligibility, case.flow, reality-integration
**Issue**: Contract mismatches
**Action**: Update fixtures to match V10 contracts.

### 8. Quarantine legacy numbered gates (G71)
**Files**: gate3, gate4, gate5, gate7
**Issue**: V6 dependencies
**Action**: Move to `__legacy_v6_quarantine__/`.

### 9. Fix determinism gate (G70)
**File**: gate-m39-clinical-v4-determinism-100x
**Issue**: Non-deterministic output
**Action**: Add stable sorting or fix seed.

### 10. Fix MVP no-error gate (G70)
**File**: gate-mvp-no-error.test.ts
**Issue**: Pipeline error in repro case
**Action**: Fix root cause or update fixture.

---

## Execution Order
1. **G68**: E2E → Playwright (12 files)
2. **G69**: Firebase mock (1 file)
3. **G70 Wave 1**: Pack + Pipeline gates (18 files)
4. **G70 Wave 2**: UI + Integration (10 files)
5. **G71**: Legacy quarantine (4 files)
