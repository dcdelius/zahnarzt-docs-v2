# Extraction → Facts Mapping v1

## Overview

The **Extraction → Facts Mapping Layer** is the single source of truth for interpreting raw extraction output into `TreatmentFacts`. No regex/parsing logic should exist elsewhere in the medical layer.

**Location**: `src/docudent/v7/medical/extractionToFacts/`

## Entry Point

```typescript
import { buildFactsFromExtraction } from './extractionToFacts';

const facts = buildFactsFromExtraction({
    extracted: extractedData,
    treatmentId: 'fuellung',
    instanceScope: { tooth: '16' }, // Optional
});
```

## Token → Facts Mapping

### Caries Depth

| Tokens | CariesDepth |
|--------|-------------|
| `profunda`, `caries profunda`, `karies profunda`, `sehr tief`, `deep caries` | `profunda` |
| `pulpanah`, `pulpannah`, `nahe pulpa`, `tief`, `tiefe karies`, `near pulp` | `pulp_near` |
| `media`, `caries media`, `normal`, `superficialis` | `normal` |

### Bleeding Detection

| Tokens | BleedingFact |
|--------|--------------|
| `blutung`, `blutet`, `blutend`, `bleeding` | `detected: yes` |
| `starke blutung`, `massive blutung`, `heavy bleeding`, `stark blutend` | `heavy: true` |
| `blutstillung`, `hämostase`, `alcl3`, `gelatamp` | `hemostasisPerformed: yes` |

### Sensitivity Detection

| Tokens | SensitivityFact |
|--------|-----------------|
| `empfindlich`, `sensibel`, `hypersensibel`, `überempfindlich` | `reported: yes` |
| `stark empfindlich`, `sehr empfindlich`, `ausgeprägt` | `level: high` |
| `duraphat`, `fluorid`, `desensibilisierung`, `elmex` | `desensitizerApplied: yes` |

## Scoping Behavior

When `instanceScope.tooth` is provided:
1. Facts are filtered to tooth-specific extraction data
2. If `extracted.teeth[]` has per-tooth notes/depth, those are used
3. Otherwise falls back to full dictation text

## Adding New Triggers

1. **Add tokens** to `maps/shared.v1.ts` synonym tables
2. **Add detection** in `maps/fuellung.v1.ts` or treatment-specific map
3. **Add signals** in `stubExtractor.ts` for test mode
4. **Add golden case** in `goldenMedicalCases.v1.ts`
5. **Run gates** to verify: `npm test -- --run gate-m7`

## File Structure

```
extractionToFacts/
├── index.ts                    # Main entry + types
├── maps/
│   ├── shared.v1.ts           # Synonym tables + helpers
│   ├── fuellung.v1.ts         # Füllung-specific mapping
│   └── endo.v1.ts             # Endo stub (minimal)
```

## Gate Tests

| Gate | Purpose |
|------|---------|
| `gate-m7-golden-medical-cases-full-pipeline` | 20 golden cases end-to-end |
| `gate-m7-extraction-to-facts-coverage` | Mapping layer produces correct facts |
| `gate-m7-no-askback-drift` | Snapshot protection against silent regression |
| `gate-m7-multiinstance-order-determinism` | 30x runs produce stable ordering |
