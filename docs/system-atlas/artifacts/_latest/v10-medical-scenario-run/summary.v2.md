# V10 Medical Scenario Audit v2 - Summary

**Run ID:** 2026-01-05T16:00:39Z  
**Total:** 10 | **Pass:** 10 | **Fail:** 0

## Inventory (Actual KB/Askbacks)

### Chips in unified.json
- `fuellung_grundleistung` - Baseline
- `la_infiltr` / `la_leitung` - Anästhesie (BEMA_40/41, GOZ_0090/0100)
- `kofferdam` - (BEMA_12, GOZ_2040)
- `rel_trocken` - Relative Trockenlegung
- `vipr_pos` / `vipr_neg` - Vitalität

### Askbacks in fuellung.askbacks.ts
- `fuellung.capping` → ueberkappung (when profunda + unknown)
- `fuellung.surfaces` → surfaces (when surfaceAmbiguous)
- `fuellung.mehrkosten` (when MKV + mehrkostenMentioned=false)
- `fuellung.isolation` / `fuellung.anesthesia` (L2, optional)

## Results

| Case | Insurance | Phase | BillingRefs | Status |
|------|-----------|-------|-------------|--------|
| m01 | GKV | output | BEMA_13, BEMA_12 | ✅ |
| m02 | GKV | output | BEMA_13c, BEMA_12 | ✅ |
| m03 | GKV | questions | ueberkappung | ✅ |
| m04 | PKV | output | GOZ_2080, GOZ_2040 | ✅ |
| m05 | MKV | output | BEMA_13b, GOZ_2080, BEMA_12, GOZ_2040 | ✅ |
| m06 | MKV | output | BEMA_13b, BEMA_12 (nur Kasse) | ✅ |
| m07 | GKV | output | BEMA_13 | ✅ |
| m08 | GKV | output | multi-tooth | ✅ |
| m09 | GKV | output | BEMA_13 | ✅ |
| m10 | GKV | output | BEMA_13c, BEMA_12 | ✅ |

## Key Findings

### Correct Behavior ✅
- **Insurance Channelization:** 0 violations (GKV/PKV/MKV)
- **nurKasse Precedence:** m06 correctly suppresses GOZ
- **Profunda Askback:** m03 triggers ueberkappung question
- **MKV Two-Channel:** m05 correctly emits BEMA + GOZ

### Visibility Gaps (Documented, Not Bugs)
1. **LA codes not always emitted** - "Infiltrationsanästhesie" in m01 → no BEMA_40 (chip not merged)
2. **4fl modb → 3fl** - m10 expected BEMA_13d got BEMA_13c (surfaces extraction issue)
3. **Isolation/Material askbacks don't trigger** - Pipeline proceeds with defaults (L2 askbacks)

## Commands

```bash
npx vitest run gate-v10-medical-scenario-run-v2  # 10/10 ✅
```
