# GP4: Billing Completeness Contract

## Definition

**BillingComplete** = For every Fuellung instance, every billing code has a traceable origin from the KB.

## Origin Types

| Origin | Description | Example |
|--------|-------------|---------|
| `chip.billingRef` | Direct billing from chip definition | `la_infiltr` → `BEMA_40` (GKV) |
| `surface_mapping` | F-code derived from surface count | 3 surfaces → `BEMA_13c` (GKV) |
| `dropped_by_combinability` | Code generated but dropped by autoResolve | `GOZ_2197` dropped (conflicts with F-code) |

## Data Flow

```
Dictation → Extract → Facts → KB Concepts → Chips → Renderer → Combinability → Final Billing
                                            ↓                      ↓
                                     chip.billingRef        droppedCodes
                                     surface_mapping
```

## "No User-facing BLOCK" Rule

For Fuellung treatments, combinability conflicts must **auto-resolve** rather than error:
- `autoResolve: drop_anchor` → drops the conflicting code
- Result: `verdict: WARN` with `droppedCodes` populated
- User sees output, not error

## Gate Enforcement

| Gate | Contract |
|------|----------|
| `gate-fuellung-billing-complete` | `meta.billingCompleteness.isComplete === true` |
| `gate-fuellung-no-user-facing-block` | `state !== 'error'` from combinability |
| `gate-kb-coverage-fuellung` | All chips have resolvable billing branches |

## Debug

Check `meta.billingCompleteness.missing` for gaps.
Check `meta.combinability.droppedCodes` for auto-resolved conflicts.
