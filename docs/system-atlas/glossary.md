# Glossary

## Terms

| Term | Definition |
|------|------------|
| **SSOT** | Single Source of Truth — authoritative data location |
| **Chip** | Atomic output segment with ID, text, billing refs |
| **Askback** | Question triggered by medical rules when fact unclear |
| **unified.json** | Treatment SSOT file containing chips, billing mappings |
| **BillingRef** | Reference to catalog code (e.g., BEMA_13, GOZ_2060) |
| **Gate** | Vitest test that enforces invariants |
| **Repro** | Reproducible test case for pipeline verification |
| **V7/V10** | Version layers; V7 = shim, V10 = runtime |
| **MKV** | Mehrkostenvereinbarung (patient copay) |
| **GKV/PKV** | Gesetzliche/Private Krankenversicherung |

## File Patterns

| Pattern | Meaning |
|---------|---------|
| `*.unified.json` | Treatment SSOT |
| `gate-*.test.ts` | Invariant enforcement test |
| `*.e2e.spec.ts` | End-to-end test (Playwright) |
| `__fixtures__/` | Test fixture data |
| `__tests__/` | Test files |
