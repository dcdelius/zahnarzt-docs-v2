# Gear: Billing SSOT

> Single Source of Truth for V10 Billing Code Generation

## Key Invariants

1. **Single Constructor**: `renderFromKbChips()` is the ONLY place billing codes are created
2. **No Hardcoded Codes**: Runtime code never contains `"BEMA_13c"` or `"GOZ_2060"` strings
3. **Channelization**: GKV→BEMA only, PKV→GOZ only, MKV→BEMA base + GOZ addon (if confirmed)
4. **MKV Base Protection**: LA/Kofferdam/Cp always use GKV branch in MKV
5. **GOZ Addon Requires Confirmation**: MKV branch only used when `mehrkostenConfirmed=true`

## Chip Classification (KB Schema)

| Class | billingRef | Example |
|-------|------------|---------|
| BASE | GKV (+PKV) | la_infiltr, kofferdam |
| ADDON | MKV only | mehrschicht |
| PKV_UPSELL | PKV only | oberflaeche_la |
| SURFACE_MAPPED | null (uses surface_mapping) | fuellung_grundleistung |

## Gate Tests (38 total)

| File | Tests |
|------|-------|
| gate-no-hardcoded-billing | 2 |
| gate-billing-channelization | 8 |
| gate-mkv-base-no-goz | 3 |
| gate-goz-addon-requires-confirmation | 4 |
| gate-kb-schema-billingref-policy | 6 |
| gate-truthcases-top15 | 15 |

## Verify

```bash
npm test -- --run src/docudent/v10/__tests__/gates
```
