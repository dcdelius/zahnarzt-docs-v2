# GKV Default vs MKV Trigger Rules

**Date**: 2025-12-31T13:18  
**Status**: ✅ Complete

## Summary

| Test | Count | Status |
|------|-------|--------|
| GKV cases | 6 | ✅ |
| PKV cases | 2 | ✅ |
| MKV cases | 2 | ✅ |
| False MKV check | 1 | ✅ |

## Rules Verified

1. **GKV Standard**: F-code only (BEMA_13), no MKV billing
2. **GKV GIZ**: No adhesive → `komposit_basic` chip, no `mehrschicht`
3. **GKV Kofferdam**: F-code + BEMA_12, no MKV
4. **PKV**: GOZ F-codes (GOZ_2060)
5. **MKV**: F-code + `insurance_gkv_mkv` marker chip

## Key Logic

```
adhesiveTechnique: true  → mehrschicht chip
adhesiveTechnique: false → komposit_basic chip (GIZ default)
insuranceType: MKV       → insurance_gkv_mkv chip
```

## Gate Test

[gate-gkv-mkv-billing-rules.test.ts](file:///Users/david/dokumaster-ui/src/docudent/__tests__/gates/gate-gkv-mkv-billing-rules.test.ts)
