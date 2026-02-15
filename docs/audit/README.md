# Billing Audit Documentation

This directory contains audit reports and tools for verifying billing DB/KB integrity.

## Reports

| File | Description |
|------|-------------|
| `billing-db-structure.md` | SSOT inventory + duplicate/legacy sweep |
| `billing-db-proof-without-html.md` | Proof that runtime is HTML-independent |
| `html_truthset.v1.json` | Extracted truth set from HTML sources |
| `html_vs_db_comparison.md` | Gap analysis between HTML and DB |

## Running the Truth Set Generator

```bash
# Generate fresh truth set
npx tsx scripts/generateHtmlTruthSet.ts

# Output: docs/audit/html_truthset.v1.json
```

## Running the Gates

```bash
# All billing HTML gates
npm test -- --run gate-billing-html

# Specific gates
npm test -- --run gate-billing-html-truthset-generation-deterministic
npm test -- --run gate-billing-combinability-covered-by-html-or-dbonly
npm test -- --run gate-billing-html-vs-db-gap-report-empty

# All billing gates
npm test -- --run gate-billing
```

## Gate Summary

| Gate | Purpose |
|------|---------|
| `gate-billing-no-duplicate-ssot` | Ensure 1 unified.json per treatment |
| `gate-billing-no-legacy-imports-runtime` | v7/v10 no legacy imports |
| `gate-billing-no-runtime-html-dependency` | v7/v10 no HTML dependencies |
| `gate-billing-kb-has-provenance-fields` | KB entries have sourceRefs |
| `gate-billing-html-truthset-generation-deterministic` | Stable truth set output |
| `gate-billing-combinability-covered-by-html-or-dbonly` | All BLOCK rules have sources |
| `gate-billing-html-vs-db-gap-report-empty` | Critical rules covered |
