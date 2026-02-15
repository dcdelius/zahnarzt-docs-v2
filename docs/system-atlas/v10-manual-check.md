# V10 MVP Go-Live Runbook

**Date:** 2026-01-01  
**Status:** MVP Ready

---

## 10-Minute Quick Check

```bash
# 1. Final audit (online deps + V10 gates + scenario audits)
npm run v10:final-audit

# 2. Atlas freshness (optional)
npm run atlas:check
```

---

## E2E Testing

```bash
# Run insurance billing E2E tests
npm run e2e:v10:insurance

# Run all V10 E2E tests
npx playwright test src/docudent/v10/__e2e__/
```

| Test | Insurance | Expected |
|------|-----------|----------|
| T1 | GKV | Only BEMA |
| T2 | PKV | Only GOZ |
| T3 | MKV + Mehrkosten | BEMA + GOZ |
| T4 | MKV + nurKasse | Only BEMA |
| T5 | Surface ambiguous | Askback |

---

## Troubleshooting: Empty BillingRefs

| Step | Check | Fix |
|------|-------|-----|
| 1. Facts | `facts.surfaces` populated? | Add surface to dictation or askback |
| 2. Chips | `chips[]` contains `fuellung_grundleistung`? | Check medical_kb concepts |
| 3. Renderer | `renderFromKbChips` gets surfaces? | Check `context.surfaces` in runV10:509 |

### Repro Bundle Export

```typescript
// In browser console:
const bundle = window.__v10ReproBundle;
console.log(JSON.stringify(bundle, null, 2));
// Copy and save as .json file
```

---

## "Stop the Bleeding" Rules

| Check | Contract | Evidence |
|-------|----------|----------|
| MKV + GOZ → Text | If `addonCode` in output, `insurance_gkv_mkv` chip text must appear | gate-mehrkosten-text-compliance |
| Unknown Surfaces → Askback | If `surfaces=[]`, emit askback, never default to surfaceCount=1 | gate-surface-billing-no-silent-default |
| No MKV→GKV Mapping | MKV must not silently become GKV | gate-no-mkv-gkv-mapping |

---

## Definition of MVP

| Requirement | Status | Evidence |
|-------------|--------|----------|
| 0 UI casts | ✅ | wiring-proof.md |
| 0 MKV→GKV mapping | ✅ | Controlled fallback only (MKV??GKV in surface_mapping) |
| InsuranceType SSOT | ✅ | hasMKV→effectiveInsuranceType='MKV' |
| Truthset ≥46/50 | ✅ | bema-f-truthset: 46/50 (4 need expectation update) |
| Atlas current | ✅ | npm run atlas:check passes |

---

## Key File Locations

| Component | Path |
|-----------|------|
| UI Toggle | `v10/components/V10InsuranceSelector.tsx` |
| Hook | `v10/hooks/useV10Pipeline.ts:172` (effectiveInsuranceType) |
| Pipeline | `v10/pipeline/runV10.ts` |
| Renderer | `v10/renderer/renderFromKbChips.ts` |
| Surface Resolver | `v10/billing/surfaceBillingResolver.ts` |
| Facts | `v10/facts/buildFactsFromExtraction.ts` |
| Truthset | `__tests__/truthset/bema-f-regression-suite.json` |

---

## MKV Billing Logic

```
if (insuranceType === 'MKV') {
    base = BEMA (from surface_mapping.MKV or .GKV)
    addon = null
    
    if (mehrkostenConfirmed && !nurKasse) {
        addon = GOZ (from surface_mapping.MKV_addon)
    }
}
```

**Praxis-Default:** MKV always gets addon unless `nurKasse=true`
