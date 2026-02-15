# M0 Baseline - Repo Snapshot

**Generated**: 2025-12-26T16:05:00Z

---

## Git State

```
HEAD: 5049ec58f88799d7691e32a684067438571be589
Branch: feature/gpt5-optimization-firebase-firebase-instructions
```

### Modified Files (uncommitted)
```
M src/docudent/__tests__/gates/gate-billing-no-legacy-imports-runtime.test.ts
M src/docudent/medical_kb/engine/applyMedicalKb.ts
M src/docudent/medical_kb/medical_kb.v1.json
M src/docudent/medical_kb/schema.v1.ts
M src/docudent/v10/packs/endo/pack.ts
M src/docudent/v10/packs/fuellung/pack.ts
M src/docudent/v7/medical/extractionToFacts/maps/endo.v1.ts
M src/docudent/v7/medical/extractionToFacts/maps/fuellung.v1.ts
M src/docudent/v7/medical/types.ts
```

### Untracked (audit artifacts)
```
docs/audit/chip-ssot-comprehensive-audit.md
docs/audit/chip_classification.latest.json
docs/audit/chip_inventory.latest.json
docs/audit/legacy_shadowpaths.latest.md
docs/audit/m21-m26 audit files
```

---

## Environment

| Tool | Version |
|------|---------|
| Node.js | v22.14.0 |
| npm | 10.9.2 |

---

## Package Scripts (relevant)

| Script | Command |
|--------|---------|
| `dev` | vite |
| `build` | vite build |
| `test` | vitest run |
| `test:v7:unit` | vitest run src/docudent/v7/__tests__/ |
| `e2e:v7` | playwright test v7 specs |
| `proof-pack` | Full test suite |

---

## src/docudent Directory Structure

| Directory | Purpose |
|-----------|---------|
| `v10/` | **Runtime orchestrator** (current) |
| `v7/` | Compatibility shim + pipeline |
| `v6/` | Legacy (archived) |
| `v5/` | Legacy (archived) |
| `v8/` | Experimental |
| `core/` | Shared billing/KB infrastructure |
| `medical_kb/` | Medical knowledge base + engine |
| `legacy/` | Empty folder |
| `ui/` | UI components |
| `contracts/` | Type contracts |
| `__tests__/` | Gate tests |
| `__fixtures__/` | Test fixtures |

### Non-code assets
- `BEMA/`, `GOZ/`, `BEL/` - Billing code HTML sources
- `Analogleistungen/` - Analog billing reference
- `*.pdf`, `*.json` - Reference documents

---

## Evidence Commands Run

```bash
git rev-parse HEAD
git status --porcelain | head -20
node -v && npm -v
ls -la src/docudent
```
