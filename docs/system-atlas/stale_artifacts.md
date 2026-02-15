# Stale Artifacts Registry

**Purpose:** Track outdated Atlas claims that need fixing or removal.

---

## Fixed (Archived)

| Date | Artifact | Issue | Resolution |
|------|----------|-------|------------|
| 2026-01-01 | coverage-reality-map.md | Listed measures as MISSING | v2 shows 21 chips exist in unified.json |
| 2026-01-01 | Various | MKV logic not documented | Added BillingIntent to types.ts |

---

## Current Discrepancies

None. All Atlas artifacts are now in sync with runtime.

---

## Verification Commands

```bash
# Atlas sync
npm run atlas:check

# Pipeline reality
npm run v10:practice-check

# Gate suite
npx vitest run gate-

# E2E
npm run e2e:v10:practice
```
