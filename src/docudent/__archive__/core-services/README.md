# Archived Core Services

> **⚠️ REFERENCE ONLY — DO NOT IMPORT**

This folder contains archived core/services files that were removed from the active codebase as part of M12.4 (Legacy Quarantine).

## Why Archived

These files contained V6 imports, which are no longer allowed in runtime code paths:
- `outputService.ts` — re-exported `generateFinalOutput` from v6/services/

## What Replaced Them

- **V7 pipeline** now delegates to V10 (see `src/docudent/v7/pipeline/index.ts`)
- **V10** uses the M9 SSOT renderer for output generation
- **Tests** that need legacy output can import directly from `v6/services/outputService`

## Rules

1. ❌ **DO NOT** import from this folder in production code
2. ❌ **DO NOT** move files back without PR review
3. ✅ Reference these files for historical context
4. ✅ Tests may import directly from v6/ if needed

## Restoration

If you need to restore this code:
```bash
git show HEAD:src/docudent/core/services/outputService.ts > path/to/restore.ts
```

## Related

- M12.4 PR: Legacy quarantine gate
- `gate-m12_4-no-core-services-imports.test.ts`
- `gate-m12_4-no-v6-imports-anywhere-runtime.test.ts`
