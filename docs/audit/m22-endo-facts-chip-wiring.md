# M22 Endo Facts → Chip Emission Wiring

## Summary

M22 wires endo facts to chip emission via medical KB rules, achieving:
- **Coverage: 0 → 11 chips**
- **Allowlist: 17 → 6 chips**
- **No false positives**

## Medical KB Rules Added

Added 14 `emit_chip` rules to `medical_kb.v1.json`:

| Rule ID | Trigger | Emits |
|---------|---------|-------|
| `rule-endo-trepanation-emits-chip` | `step in [trepanation, ...]` | `trepanation` |
| `rule-endo-kofferdam-emits-chip` | `kofferdam === true` | `kofferdam` |
| `rule-endo-wl-elek-emits-chip` | `workingLengthMethod === 'electronic'` | `laengenmessung_elek` |
| `rule-endo-wl-xray-emits-chip` | `workingLengthMethod === 'xray'` | `laengenmessung_roentgen` |
| `rule-endo-canal-1..4-emits-chip` | `canalCount === 1..4` | `kanalaufbereitung_1..4` |
| `rule-endo-naocl-emits-chip` | `irrigationSolutions.contains('NaOCl')` | `spuelung_naocl` |
| `rule-endo-edta-emits-chip` | `irrigationSolutions.contains('EDTA')` | `spuelung_edta` |
| `rule-endo-caoh2-emits-chip` | `medication === 'Ca(OH)2'` | `einlage_caoh2` |
| `rule-endo-wf-kalt-emits-chip` | `obturated === true` | `wf_kalt` |
| `rule-endo-roentgen-kontrolle-emits-chip` | `step === 'obturation'` | `roentgen_kontrolle` |

All rules include:
- `treatmentId === 'endo'` guard
- `sourceRefs` for provenance
- Priority ordering

## Schema Extensions

Added operators to `RuleCondition`:
- `contains`: Check if array contains value
- `empty`: Check if array is empty

## Remaining Allowlist (6 chips)

| Chip | Reason |
|------|--------|
| `aufbau_postendo` | Typically separate session |
| `la_infiltr` | Needs anesthesia→chip rule |
| `la_leitung` | Needs anesthesia→chip rule |
| `roentgen_einzelzahn` | Diagnostic vs control distinction |
| `wf_einzel` | Needs technique detection |
| `wf_warm` | Needs technique detection (default=kalt) |

## Verification

```bash
npm test -- --run gate-m22  # 29 tests
npm test -- --run gate-m18 gate-m19 gate-m20 gate-m21 gate-m22  # 171 tests
npm test -- --run gate-m10..17  # 410 tests
```

Total: **581 tests passing**
