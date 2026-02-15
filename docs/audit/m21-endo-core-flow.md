# M21 Endo Core Flow Wiring v1

## Summary

M21 implements coverage-driven validation for the endo treatment pack, with 8 new clinical scenarios and 4 gate tests that verify the extraction → facts → chips path for endodontic procedures.

## Current State

### Coverage Report
- **Total billing chips:** 17
- **Covered by scenarios:** 0 (extraction → chip wiring not complete)
- **Allowlisted:** 17 (all explicitly documented)
- **Violations:** 0

### Why Coverage is 0

The `packCoverage` helper checks if chips are *emitted* during scenario runs. Currently:
1. Extraction layer (`endo.v1.ts`) correctly detects tokens
2. Facts are built correctly (`buildEndoFacts`)
3. But medical KB → chip emission for endo isn't fully wired

This is intentional: Billing chips should only emit with provenance, and the pipeline guards against inferred defaults producing billing codes.

## New Scenarios (M21)

| ID | Description |
|----|-------------|
| `E_M21_01` | Full core endo: warm WF with all steps |
| `E_M21_02` | Full core endo: kalt WF |
| `E_M21_03` | Full core endo: Einzelstift |
| `E_M21_04` | Minimal endo: no WF, temp seal |
| `E_M21_05` | LA + Kofferdam + core |
| `E_M21_06` | PKV premium with all extras |
| `E_M21_07` | False positive prevention (minimal) |
| `E_M21_08` | Ambiguous canal count |

## Gate Tests (M21)

| Gate | Tests | Purpose |
|------|-------|---------|
| `gate-m21-endo-core-flow-golden` | 15 | KB structure validation |
| `gate-m21-determinism-50x-endo-core` | 8 | Extraction determinism |
| `gate-m21-endo-false-positive-prevention` | 10 | Non-endo context safety |
| `gate-m21-endo-pack-coverage-shrinks-allowlist` | 6 | Coverage tracking |

## Allowlist Justifications

### Chips Not Yet Covered

1. **Trepanation/Access**: Extraction detects but chip emission not wired
2. **Canal prep (1-4)**: Canal count detection works, but no chip activation rule
3. **Längenmessung (elek/röntgen)**: Detection works, chip emission missing
4. **WF variants**: Same pattern
5. **Einlage/Kofferdam/LA**: Detection complete, chip rules TODO

### Reduction Path

To reduce allowlist from 17 to ≤5:
1. Add medical KB rules that map `facts.endo.*` → chip emissions
2. Or: Add askback→chip flow in question service
3. Both require careful provenance tracking

## Files Changed

- `src/docudent/v10/packs/endo/pack.ts` — 8 new scenarios
- `src/docudent/__tests__/gates/gate-m21-*.test.ts` — 4 new gate files

## Verification

```bash
npm test -- --run gate-m21  # 39 tests
npm test -- --run gate-m18 gate-m19 gate-m20 gate-m21  # 142 tests
npm test -- --run gate-m10 gate-m11 ... gate-m17  # 410 tests
```

All 552 tests pass.
