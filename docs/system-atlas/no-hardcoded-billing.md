# No Hardcoded Billing Codes Contract

**Date:** 2026-01-08 | **Status:** VERIFIED CLEAN

---

## P0 Contract

> In runtime code, NEVER hardcode billing codes (BEMA_, GOZ_, BEL_).  
> Runtime uses BillingRef/DB-Key only. Codes come from catalog lookup.

## Sweep Results

| Location | Pattern | Count | Classification |
|----------|---------|-------|----------------|
| Comments (types.ts, resolver.ts) | `BEMA_13/GOZ_2060` | 5 | **OK: Documentation** |
| Test fixtures (clinicalTruthcases.*.ts) | `mustIncludeCodes` | 40+ | **OK: Test data** |
| Combinability goldens (pack.ts) | `codes: ['BEMA_*']` | 20+ | **OK: Test fixtures** |
| Catalog data (feeCatalog.ts) | Catalog entries | 50+ | **OK: Catalog source** |
| **Runtime paths** | — | 0 | ✅ **CLEAN** |

## Enforcement

- Renderer outputs `billingRefs` (IDs), not codes
- UI displays from catalog lookup
- Tests may use code literals in assertions
- Gate: `src/docudent/v10/__tests__/gates/gate-no-hardcoded-billing.test.ts`
  - Scans expansion-critical runtime paths (`pipeline`, `procedure`, `settings`, `preanalysis`, `multitreatment`, `kzv/registry`, `billing`, `renderer`, `output`, `facts`)
  - Blocks new hardcoded `BEMA_*`, `GOZ_*`, `BEL_*`, `GOAE_*` literals outside allowlisted fixture/diagnostic zones

## Verification Command

```bash
grep -rn "BEMA_\|GOZ_" src/docudent/v10 --include="*.ts" | grep -v "test\|spec\|qa\|Truthcases\|pack.ts.*codes\|//\|*"
```
