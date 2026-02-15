# M14 Test Triage: Pre-existing Test Failures

**Created**: 2025-12-23

This document catalogs pre-existing test failures unrelated to M13/M14 changes.

## Summary

| Category | Count | Description |
|----------|-------|-------------|
| Design Tokens | 5 | Gates enforcing design system patterns |
| V7 Wiring | 25 | UI wiring matrix tests (component integration) |
| SSOT Boundaries | 3 | Boundary enforcement gates |
| UI Flow | 12 | React component tests |
| Pipeline | 2 | No-logic gates for pages |
| Legacy Gates | 20+ | Various pre-existing integration failures |

---

## Reliable Gate-Only Command

To run **only the core gate tests** that are expected to pass:

```bash
# M-series gates (M6-M14) - these are the primary quality gates
npm test -- --run gate-m6 gate-m7 gate-m8 gate-m9 gate-m10 gate-m11 gate-m12 gate-m13 gate-m14

# Alternative: run by pattern
npm test -- --run "gate-m[0-9]+"
```

---

## Failing Test Categories

### 1. Design Token Gates (5 failures)

**File**: `gate-jeton-design-integrity.test.ts`

| Test | Reason | Priority |
|------|--------|----------|
| Card Grid Pattern | Legacy component patterns | Low |
| Raw BoxShadow | Hardcoded shadows in legacy | Low |
| Raw Hex Color | Hardcoded colors in legacy | Low |
| Raw Motion Duration | Hardcoded animations | Low |
| Pages Missing designTokens Import | Legacy pages | Low |

**Action**: These gates enforce design system consistency. Will be fixed as legacy components are migrated.

---

### 2. V7 Wiring Matrix (25 failures)

**File**: `gate-wiring-matrix.test.ts`

These test UI component wiring across the V7 surface. Many failures relate to:
- Missing component exports
- Changed hook signatures
- Legacy path assumptions

**Action**: Requires UI-level refactoring. Out of scope for backend M14 work.

---

### 3. SSOT Boundaries (3 failures)

**File**: `gate-v7-ssot-boundaries.test.ts`

| Test | Reason |
|------|--------|
| Import boundary violations | Some V7 files still import from core |
| Legacy paths | Old import patterns |

**Action**: Related to M12.4 legacy quarantine. In progress.

---

### 4. UI Flow Tests (12 failures)

**Files**: `ui-flow.test.tsx`, `ui-flow-e2e.test.tsx`, `gate-v7-ui-wiring.test.tsx`

React component tests failing due to:
- DOM structure changes
- Missing test utilities
- Async timing issues

**Action**: UI-specific. Separate from backend pipeline work.

---

### 5. Pipeline Tests (2 failures)

**File**: `no-logic.test.ts`

| Test | Reason |
|------|--------|
| pages/ should contain no business logic | Some pages have inline logic |
| components/ should contain no business logic | Some components have inline logic |

**Action**: Architecture refactoring needed.

---

### 6. Other Integration Failures

Various gates with pre-existing issues:
- `gate-fragmentation-sentinel.test.ts` (2 failures)
- `gate-no-hardcoded-chip-ids.test.ts` (1 failure)
- `gate-p14-deep-filling-e2e.test.ts` (1 failure)
- `gate-output-coverage.test.ts` (4 failures)
- `gate-treatment-isolation.test.ts` (4 failures)
- `gate7-stage-emission.test.ts` (3 failures)
- `gate-no-v6-mutation.test.ts` (1 failure)
- `gate-pipeline-questionbundle-always-present.test.ts` (4 failures)
- `gate-no-mock-output-strings.test.ts` (1 failure)
- `gate-mvp-no-error.test.ts` (5 failures)

---

## Core Gate Health Report

✅ **Green gates** (reliably passing):
- `gate-m6-*` (medical KB)
- `gate-m7-*` (extraction)
- `gate-m8-*` (askback compiler)
- `gate-m9-*` (renderer)
- `gate-m10-*` (combinability)
- `gate-m11-*` (multi-instance)
- `gate-m12-*` (legacy quarantine)
- `gate-m13-*` (KB provider)
- `gate-m14-*` (clinical QA) ← NEW

---

## Recommended Workflow

1. **Before merge**: Run `npm test -- --run gate-m` to verify core gates
2. **CI configuration**: Consider separating gate suites into:
   - `gate-core` (M-series) - must pass
   - `gate-ui` (UI wiring) - informational
   - `gate-design` (tokens) - informational

---

## Notes

The pre-existing failures are **not regressions** from M13/M14 work. They represent:
- Legacy code that hasn't been migrated
- UI tests that need DOM/component updates
- Design system enforcement gates awaiting migration
