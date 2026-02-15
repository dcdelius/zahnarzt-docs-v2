# Legacy Quarantine

**Status**: QUARANTINED (2024-12-30)

## Purpose

This folder contains test files that depend on deleted V6 runtime code or use legacy V7 patterns that are being migrated to V10.

## Contents (20 files)

### V6-Dependent Gates (8 files)
- `gate-festzuschuss-ssot-guard.test.ts` - V6 SSOT guard
- `gate-fuellung-defaults.test.ts` - V6 question service
- `gate-fuellung-medical-golden.test.ts` - V6 question logic
- `gate-fuellung-question-logic.test.ts` - V6 question conditions
- `gate-mkv-technique-defaults.test.ts` - V6 technique defaults
- `gate-question-conditions.test.ts` - V6 question conditions
- `gate0-treatmentId-routing.test.ts` - V6 routing
- `gate1234-golden-output.test.ts` - V6 golden output

### Obsolete Pipeline Gates (3 files)
- `gate-no-v6-mutation.test.ts` - V6 directory deleted
- `gate-pipeline-questionbundle.test.ts` - V7 pipeline internals
- `gate-no-mock-output-strings.test.ts` - V7 mock patterns

### Legacy Numbered Gates (4 files)
- `gate3-answer-effectiveness-endo.test.ts`
- `gate4-pipeline-snapshot-endo.test.ts`
- `gate5-import-paths.test.ts`
- `gate7-stage-emission.test.ts`

### V7 UI Tests (5 files)
- `gate-wiring-matrix.test.ts` - V7 trace markers
- `gate-v7-ui-wiring.test.tsx` - V7 UI wiring
- `ui-flow.test.tsx` - V7 UI flow
- `gate-p14-deep-filling-e2e.test.ts` - V7 E2E
- `ui-flow-e2e.test.tsx` - V7 E2E UI

## Migration Plan

1. **Füllung/Endo Logic Gates**: Rewrite using V10 pack contracts + runV10 assertions
2. **Golden Output Gates**: Migrate to V10 clinical truthcases
3. **Pipeline Gates**: Validate against V10 pipeline contracts

## Why Skipping is Safe

- V6 runtime has been deleted (B2 delete sprint complete)
- V10 has equivalent gate coverage via:
  - `gate-v10-pipeline-*` tests
  - Clinical truthcases (37 cases)
  - Pack completeness gates
  - Boundary gates (enforced)

## Exclusion

Excluded in `vite.config.js`:
```javascript
'**/__legacy_v6_quarantine__/**'
```
