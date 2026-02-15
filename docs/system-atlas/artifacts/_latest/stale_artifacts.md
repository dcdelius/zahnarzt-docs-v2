# Stale Artifacts Report

**Generated:** 2026-01-01

## Stale Claims Found

| File | Line | Stale Claim | Current Reality | Gate/Evidence | Action |
|------|------|-------------|-----------------|---------------|--------|
| [v10-reality/summary.md](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/_latest/v10-reality/summary.md#L30) | 30 | "perInstance.output is global → runV10 limitation" | perInstance is now SSOT, global derived | `gate-m27-per-instance-ssot.test.ts` | **DELETE** |
| [v10-reality/summary.md](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/_latest/v10-reality/summary.md#L31) | 31 | "Chips assigned to first instance → provenance TODO" | Instance-scoped chips work | `gate-v10-instance-isolation.test.ts` | **DELETE** |
| [v10-reality/report.json](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/_latest/v10-reality/report.json#L71) | 71 | "perInstance.output is global" in known_limitations | Fixed | Evidence in runV10.ts | **REGENERATE** |
| [depatch-plan.md](file:///Users/david/dokumaster-ui/docs/system-atlas/artifacts/_latest/v10-mvp/depatch-plan.md#L10) | 10 | "perTooth in types.ts - Needs manual confirm" | perTooth derivation already removed | Previous session | **UPDATE** to ✅ |

## Summary

- **3 files** need updates
- **0 files** to delete entirely
- **4 claims** to fix

## Recommended Actions

1. Remove "Known Limitations" section from v10-reality/summary.md
2. Regenerate v10-reality/report.json with updated known_limitations: []
3. Update depatch-plan.md perTooth status to ✅
