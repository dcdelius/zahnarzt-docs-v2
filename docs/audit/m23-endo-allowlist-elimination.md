# M23 Endo Allowlist Elimination

## Summary

M23 eliminates the endo pack allowlist entirely:
- **Coverage: 17/17 chips (100%)**
- **Allowlist: 0** (was 17 → 6 → 0)

## Chips Now Covered

| Chip | Trigger Fact |
|------|--------------|
| `la_leitung` | `anesthesiaType === 'leitung'` |
| `la_infiltr` | `anesthesiaType === 'infiltration'` |
| `wf_warm` | `wfTechnique === 'warm'` |
| `wf_einzel` | `wfTechnique === 'einzel'` |
| `roentgen_einzelzahn` | `diagnosticXray === true` |
| `aufbau_postendo` | `postEndoAufbau === true` |

## Implementation

### Medical KB Rules Added (6)

- `rule-endo-la-leitung-emits-chip`
- `rule-endo-la-infiltr-emits-chip`
- `rule-endo-wf-warm-emits-chip`
- `rule-endo-wf-einzel-emits-chip`
- `rule-endo-roentgen-einzelzahn-emits-chip`
- `rule-endo-aufbau-postendo-emits-chip`

### Type Extensions

`EndoFact` interface extended with:
- `anesthesiaType?: 'leitung' | 'infiltration'`
- `wfTechnique?: 'warm' | 'einzel'`
- `diagnosticXray?: boolean`
- `postEndoAufbau?: boolean`

### Extraction Layer

`buildEndoFacts` now detects:
- LA type from keywords (leitungsanästhesie, infiltration, etc.)
- WF technique from warm/thermoplast/downpack or einzelstift/single-cone
- Diagnostic X-ray from einzelzahnfilm/befundbild
- Post-endo buildup from aufbau/adhäsiver aufbau

### Scenarios Added (6)

- `E_M23_01-la-leitung`
- `E_M23_02-la-infiltr`
- `E_M23_03-wf-warm`
- `E_M23_04-wf-einzel`
- `E_M23_05-roentgen-einzelzahn`
- `E_M23_06-aufbau-postendo`

## Verification

```
✅ M23: 15/15
✅ M18-M22: 171/171  
✅ Total: 186 tests
```
