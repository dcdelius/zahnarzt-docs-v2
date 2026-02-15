# Data Sources (SSOT)

> Single Source of Truth catalog mapping with file evidence.

---

## SSOT Catalogs (Primary)

These are the authoritative billing code catalogs:

| Catalog | Path | Loaded By | Evidence |
|---------|------|-----------|----------|
| `bema.json` | `src/docudent/core/billing/knowledgeBase/kataloge/bema.json` | `treatmentEngine.ts` | L16 |
| `goz.json` | `src/docudent/core/billing/knowledgeBase/kataloge/goz.json` | `treatmentEngine.ts` | L17 |
| `goae.json` | `src/docudent/core/billing/knowledgeBase/kataloge/goae.json` | `treatmentEngine.ts` | L18 |

**Usage:**
- `loadBemaCatalog()` → treatmentEngine.ts L159-164
- `loadGozCatalog()` → treatmentEngine.ts L166-171
- `lookupBillingCode()` → treatmentEngine.ts L180-233

---

## Treatment Definitions

| Treatment | Path | Evidence |
|-----------|------|----------|
| `fuellung` | `core/behandlungen/fuellung/fuellung_unified.json` | loadTreatmentJSON L132-149 |
| `endo` | `core/behandlungen/endo/` | getTreatment() in index.ts |

**Loader:** `treatmentEngine.ts` L132-149 `loadTreatmentJSON()`

---

## Rules JSONs

| Rule Type | Path | Loaded By |
|-----------|------|-----------|
| Kombinationen | `regeln/kombinationen.json` | `treatmentEngine.ts` L241-247 |
| BEMA Frequenz | `regeln/bema_frequenzregeln_komplett.json` | knowledgeBase/index.ts |
| BEMA Prothetik | `regeln/bema_prothetik_regeln.json` | knowledgeBase/index.ts |
| BEMA ZE | `regeln/bema_ze_regeln_komplett.json` | knowledgeBase/index.ts |

---

## Secondary Comment Cards (NOT for UI)

These are **backend-only** sources for analog reasoning:

| Index | Path | Purpose |
|-------|------|---------|
| `commentIndex_bema.json` | `secondary/` | Full BEMA commentary |
| `commentIndex_goz.json` | `secondary/` | Full GOZ commentary |
| `commentIndex_goz_v2.json` | `secondary/` | GOZ v2 commentary |
| `commentIndex_analog.json` | `secondary/` | Analog full index |

**Loader:** `commentCardStore.ts` L58+ (backend only)

> ⚠️ **FORBIDDEN in UI code** — enforced by `gate-no-comment-index-in-ui.test.ts`

---

## Thin Index (Allowed in UI)

| Index | Path | Purpose |
|-------|------|---------|
| `commentIndex_analog_thin.json` | `secondary/` | Minimal analog hints |

**Usage:** `analogResolver.ts` uses thin index for suggestions without leaking commentary.

---

## Module → Source Mapping

```
V7 Pipeline
├── extractFromDictation → (LLM, no JSON)
├── generateQuestions → treatmentEngine → fuellung_unified.json
└── generateFinalOutput
    ├── chipResolver → fuellung_unified.json (chips)
    ├── TreatmentEngine
    │   ├── loadTreatmentJSON → fuellung_unified.json
    │   ├── loadBemaCatalog → bema.json
    │   ├── loadGozCatalog → goz.json
    │   └── loadKombinationen → kombinationen.json
    └── outputComposer → output templates
```

---

## Open Questions

1. Where is `bel2_leistungsverzeichnis_2022_extracted.json` loaded? (found in docudent root, loader unknown)
