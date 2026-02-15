# Audits — How To Run

## GP6: Billing Enforcement Gates

### Run All Gates
```bash
npx vitest run src/docudent/v10/__tests__/gates/
```

### Run Specific Gate
```bash
npx vitest run src/docudent/v10/__tests__/gates/gate-no-hardcoded-billing-refs.test.ts
```

---

## Catalog Audit

### Run Audit
```bash
npx vitest run scripts/billing/catalog_audit.test.ts
```

### Output
Report written to:
```
docs/system-atlas/artifacts/gigaprompt_fuellung_06/catalog_audit.report.json
```

---

## Medical KB Validation

### Validate Askbacks have Chip Effects
```bash
npx vitest run scripts/medical/
```

---

## What Each Audit Checks

| Audit | Checks |
|-------|--------|
| `gate-no-hardcoded-billing-refs` | Pipeline, hooks, pages, golden artifacts for billing codes |
| `catalog_audit` | Full codebase scan, reports by catalog (GOZ/BEMA/BEL/GOÄ) |
| `validate_askbacks` | Askbacks have chip effects (except context-only) |

---

## Allowed Locations for Billing Codes

1. **Catalogs**: `src/docudent/core/billing/knowledgeBase/kataloge/`
2. **Treatment SSOT**: `src/docudent/core/billing/knowledgeBase/treatments/`
3. **Test Fixtures**: `__tests__/`, `gates/` (for testing purposes)
4. **Docs**: `docs/` (for documentation examples)
