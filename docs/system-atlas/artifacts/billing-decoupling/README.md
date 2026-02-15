# Billing Decoupling — README

## Purpose

This directory contains artifacts for enforcing the billing decoupling rule:

> **Billing codes (GOZ, BEMA, BEL, GOÄ) may ONLY exist in allowed locations.**

## Allowed Locations

1. **Billing Catalogs** — `src/docudent/core/billing/knowledgeBase/kataloge/*.json`
2. **SSOT Chip Definitions** — `src/docudent/core/billing/knowledgeBase/treatments/**/*.json`
3. **Test Fixtures** — `src/docudent/**/__tests__/**` and `gates/**`
4. **Documentation** — `docs/**/*.md`, `docs/**/*.json`

## Files

| File | Purpose |
|------|---------|
| `hardcode.report.json` | Audit results from last scan |
| `scripts/audit_no_hardcoded_billing_refs.ts` | Audit script |
| `src/docudent/v10/gates/gate-no-hardcoded-billing-refs.test.ts` | Gate test |

## Running the Audit

```bash
npx ts-node scripts/audit_no_hardcoded_billing_refs.ts
```

## Gate Test

```bash
npx vitest run src/docudent/v10/gates/gate-no-hardcoded-billing-refs.test.ts
```

## Rule

**NEVER** add billing codes directly in:
- Medical KB rules (`medical_kb.v1.json` — only chip names allowed)
- Pipeline functions (`runV10.ts`, hooks)
- UI components

**ALWAYS** use chips that resolve to billing via SSOT `unified.json`.
