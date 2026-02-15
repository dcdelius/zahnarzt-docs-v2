# M12.4 Legacy Quarantine — Summary

## Archive Actions

| File | Action | Reason |
|------|--------|--------|
| `core/services/outputService.ts` | Moved to `__archive__/core-services/` | V6 import (generateFinalOutput) |

## V6 Import Status

**Before M12.4:**
- `core/services/outputService.ts` → imported from `v6/services/outputService`

**After M12.4:**
- `core/` has **zero V6 imports**
- V6-importing file archived to `__archive__/core-services/`

## Gate Tests Added

| File | Tests |
|------|-------|
| `gate-m12_4-no-v6-imports-anywhere-runtime.test.ts` | 7 |
| `gate-m12_4-no-core-services-imports.test.ts` | 3 |

## Unskipped Tests

- `gate-m12_3-no-runtime-v6-imports.test.ts` → "core/ does not import from V6"

## Verification (grep proof)

```bash
# Zero V6 imports in core/
grep -r "from.*v6/" src/docudent/core/
# No results

# V6 imports only in allowed locations
grep -rl "from.*v6/" src/docudent/ | grep -v __tests__ | grep -v __test__ | grep -v __archive__ | grep -v "/v6/"
# No results outside tests/v6
```

## Final Gate Results

| Suite | Passed | Skipped |
|-------|--------|---------|
| M12.4 | 10 | 0 |
| M12.3 | 21 | 0 |
| M12.2 | 41 | 0 |
| M12.1 | 22 | 0 |
| M6-M11 | 221 | 0 |
| **Total** | **316** | **0** |

## Never Import Rule

```
❌ DO NOT import from:
   - src/docudent/__archive__/**
   - src/docudent/v6/** (except in tests)

✅ USE instead:
   - V10 public API (src/docudent/v10/public.ts)
   - M9 SSOT renderer
   - Appropriate core modules
```

## Restoration (if needed)

```bash
# Restore archived file from git
git checkout HEAD~1 -- src/docudent/core/services/outputService.ts
```
