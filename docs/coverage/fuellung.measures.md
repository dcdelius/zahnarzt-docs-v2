# Füllung Measures Coverage

**Generated:** 2026-01-01  
**Status:** ✅ ALL MEASURES COVERED

---

## Measures Matrix

| Maßnahme | ChipId | Askback | BillingRef GKV | BillingRef PKV | Combinability | Status |
|----------|--------|---------|----------------|----------------|---------------|--------|
| **Füllung 1fl** | surface_mapping | fuellung.surfaces | BEMA_13 | GOZ_2060 | - | ✅ |
| **Füllung 2fl** | surface_mapping | fuellung.surfaces | BEMA_13b | GOZ_2080 | - | ✅ |
| **Füllung 3fl** | surface_mapping | fuellung.surfaces | BEMA_13c | GOZ_2100 | - | ✅ |
| **Füllung 4fl+** | surface_mapping | fuellung.surfaces | BEMA_13d | GOZ_2120 | - | ✅ |
| **LA Infiltration** | la_infiltr | fuellung.anesthesia | BEMA_40 | GOZ_0090 | ≤1/Quadrant | ✅ |
| **LA Leitung** | la_leitung | fuellung.anesthesia | BEMA_41 | GOZ_0100 | ≤1/Sitzung | ✅ |
| **Kofferdam** | kofferdam | fuellung.isolation | BEMA_12 | GOZ_2040 | - | ✅ |
| **Rel. Trockenlegung** | rel_trocken | fuellung.isolation | - | - | - | ✅ |
| **Überkappung (Cp)** | cp | fuellung.capping | BEMA_25 | GOZ_2330 | mut.excl P | ✅ |
| **Überkappung (P)** | p | fuellung.capping | BEMA_26 | GOZ_2340 | mut.excl Cp | ✅ |
| **Fluoridierung** | fluor | - | BEMA_IP4 | GOZ_1020 | - | ✅ |
| **Politur/Finishing** | finishing | - | - | - | - | ✅ |
| **Adhäsivtechnik** | (via composite) | fuellung.adhesive | BEMA_12 | GOZ_2197 | - | ✅ |
| **Schichttechnik** | mehrschicht | fuellung.layering | - | - | - | ✅ |
| **Mehrkosten** | (via intent) | fuellung.mehrkosten | addon | GOZ_* | - | ✅ |
| **Material Komposit** | fuellung_material_komposit | fuellung.material | - | - | - | ✅ |
| **Material GIZ** | fuellung_material_giz | fuellung.material | - | - | - | ✅ |

---

## Evidence

| Source | Count | Path |
|--------|-------|------|
| Chips | 21 | unified.json |
| Askbacks | 8 | fuellung.askbacks.ts |
| Combinability Rules | 8+ | combinability_kb.v1.json |

---

## Gate Tests

| Test | Count | Status |
|------|-------|--------|
| gate-insurance-channelization-no-lookup | 13 | ✅ |
| gate-mkv-billing-contract | 12 | ✅ |
| gate-askback-surface-ambiguity | 3 | ✅ |
| gate-askback-mehrkosten-mkv | 6 | ✅ |
| gate-combinability-block-warn | 4 | ✅ |
