# M2 Dependency Graph Summary

**Generated**: 2025-12-26T16:10:00Z

---

## Module Clusters

### V10 Runtime (38 files)

| Cluster | Files | Purpose |
|---------|-------|---------|
| `pipeline/` | 3 | Main orchestrators (runV10, runV10Bundle, billingGuard) |
| `kb/` | 10 | Knowledge Base providers (medical, treatment, combinability) |
| `packs/` | 5 | Treatment packs (fuellung, endo, registry) |
| `trace/` | 3 | Trace collection and helpers |
| `extraction/` | 2 | Extractor selection |
| `billing/` | 2 | Combinability checking |
| `compat/` | 3 | Compatibility (milchzahn, combinability) |
| `testOnly/` | 2 | Test fixtures |
| `qa/` | 2 | Clinical suite, pack coverage |
| Root | 3 | types, index, public |

### V7 Runtime (43 files)

| Cluster | Files | Purpose |
|---------|-------|---------|
| `pipeline/` | 12 | Shim + adapters (delegates to V10) |
| `output/` | 2 | SSOT renderer (renderFromKbChips) |
| `medical/` | ~15 | Facts and askback compilation |
| `settings/` | 3 | User settings |
| `hooks/` | 2 | React hooks |
| `multitreatment/` | 5 | Multi-treatment orchestration |

### Medical KB (4 files)

| File | Purpose |
|------|---------|
| `engine/applyMedicalKb.ts` | Medical engine core |
| `engine/index.ts` | Exports |
| `schema.v1.ts` | Schema definitions |
| `index.ts` | Root exports |

---

## Dependency Flow (High-Level)

```
v10/public.ts
    ↓
v10/pipeline/runV10.ts
    ├── v10/extraction/selectExtractor.ts
    ├── v7/medical/extractionToFacts/
    ├── medical_kb/engine/applyMedicalKb.ts
    ├── v7/medical/askbacks/
    ├── v10/pipeline/billingEligibilityGuard.ts
    ├── v7/output/renderFromKbChips.ts
    ├── v10/billing/combinability/
    └── v10/kb/ (providers)
```

---

## Forbidden Import Check

```bash
grep -rn "from '.*v6/\|from '.*_legacy" src/docudent/v10 src/docudent/v7 --include="*.ts" | grep -v "__tests__"
```

**Result**: Empty (no violations)

---

## Gate Coverage

- Total gate files: 43+
- M-prefixed gates: 43
- Coverage: All major runtime modules protected
