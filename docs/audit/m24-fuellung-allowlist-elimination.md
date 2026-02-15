# M24 Fuellung Allowlist Elimination

## Summary

M24 eliminates the fuellung pack allowlist:
- **Coverage: 7/7 chips (100%)**
- **Allowlist: 0** (was 6)

## Uncovered → Fix → Covered

| Chip | Trigger Fact | KB Rule |
|------|--------------|---------|
| `la_leitung` | `fuellung.anesthesiaType === 'leitung'` | `rule-fuellung-la-leitung-emits-chip` |
| `la_infiltr` | `fuellung.anesthesiaType === 'infiltration'` | `rule-fuellung-la-infiltr-emits-chip` |
| `oberflaeche_la` | `fuellung.surfaceAnesthesia === true` | `rule-fuellung-oberflaeche-la-emits-chip` |
| `kofferdam` | `fuellung.isolation === 'kofferdam'` | `rule-fuellung-kofferdam-emits-chip` |
| `p` | `capping.type === 'direct'` | `rule-fuellung-p-direct-capping-emits-chip` |
| `fluor` | `fuellung.fluoridation === true` | `rule-fuellung-fluor-emits-chip` |

## Implementation

### Medical KB Rules Added (6)
All in `medical_kb.v1.json` with `treatmentId === 'fuellung'` guard.

### Type Extensions
```typescript
interface FuellungFact {
    anesthesiaType?: 'leitung' | 'infiltration';
    surfaceAnesthesia?: boolean;
    isolation?: 'kofferdam' | 'relativ' | 'none';
    fluoridation?: boolean;
}
```

### Extraction Layer
`buildFuellungFacts` in `maps/fuellung.v1.ts` detects:
- LA type from dictation keywords
- Surface anesthesia
- Isolation type (kofferdam/relativ)
- Fluoridation
- Direct capping (Pulpaeröffnung)

### Scenarios Added (6)
`F_M24_01` through `F_M24_06` in `fuellung/pack.ts`.

## Verification

All M24 gates pass:
- `gate-m24-fuellung-allowlist-eliminated` (7 tests)
- `gate-m24-fuellung-chips-from-facts` (7 tests)
- `gate-m24-fuellung-no-false-positive-billing` (7 tests)
