# V10 Coverage Index

**Generated:** 2026-01-30  
**Status:** ✅ COMPLETE FOR FUELLUNG

---

## Fuellung Chips

| ChipId | Category | BillingRef GKV | BillingRef PKV | TextSnippet | Line |
|--------|----------|----------------|----------------|-------------|------|
| fuellung_grundleistung | leistung | surface_mapping | surface_mapping | ✅ | :18 |
| vipr_pos | befund | - | - | ✅ | :38 |
| vipr_neg | befund | - | - | ✅ | :67 |
| perk_neg | befund | - | - | ✅ | :97 |
| perk_pos | befund | - | - | ✅ | :124 |
| la_infiltr | leistung | BEMA_40 | GOZ_0090 | ✅ | :154 |
| la_leitung | leistung | BEMA_41 | GOZ_0100 | ✅ | :191 |
| oberflaeche_la | leistung | - | GOZ_0080 | ✅ | :228 |
| kofferdam | leistung | BEMA_12 | GOZ_2040 | ✅ | :258 |
| rel_trocken | leistung | - | - | ✅ | :294 |
| exkavation | leistung | - | - | ✅ | :319 |
| cp | leistung | BEMA_25 | GOZ_2330 | ✅ | :347 |
| cp_not_required | leistung | - | - | ✅ | :397 |
| p | leistung | BEMA_26 | GOZ_2340 | ✅ | :423 |
| komposit_basic | leistung | - | - | ✅ | :471 |
| mehrschicht | leistung | - | - | ✅ | :498 |
| finishing | leistung | - | - | ✅ | :545 |
| fluor | leistung | BEMA_IP4 | GOZ_1020 | ✅ | :571 |
| fuellung_material_giz | leistung | - | - | ✅ | :603 |
| fuellung_material_komposit | leistung | - | - | ✅ | :628 |
| insurance_gkv_mkv | marker | - | - | ✅ | :653 |

---

## Fuellung Askbacks

| AskbackId | Level | FactDeps | ChipDelta | Line |
|-----------|-------|----------|-----------|------|
| fuellung.capping | L1 | cariesDepth,capping | capping_direkt/indirekt | :12 |
| fuellung.adhesive | L1 | adhesive,material | adhesive_technique | :33 |
| fuellung.layering | L2 | layering,material | layering_technique | :52 |
| fuellung.material | L1 | material | material_* | :72 |
| fuellung.surfaces | L1 | surfaces,surfaceAmbiguous | - | :93 |
| fuellung.mehrkosten | L1 | insuranceType,mehrkostenMentioned | mehrkosten_confirmed | :115 |
| fuellung.isolation | L2 | isolation | kofferdam/rel_trocken | :136 |
| fuellung.anesthesia | L2 | anesthesia | la_infiltr/la_leitung | :157 |

---

## Surface Mapping

| Key | GKV | PKV | MKV | MKV_addon |
|-----|-----|-----|-----|-----------|
| 1 | BEMA_13 | GOZ_2060 | BEMA_13 | GOZ_2060 |
| 2 | BEMA_13b | GOZ_2080 | BEMA_13b | GOZ_2080 |
| 3 | BEMA_13c | GOZ_2100 | BEMA_13c | GOZ_2100 |
| 4+ | BEMA_13d | GOZ_2120 | BEMA_13d | GOZ_2120 |

---

## BillingRef Closure

All BillingRefs verified against catalogs:
- bema.json: ✅
- goz.json: ✅

---

## PZR Chips

| ChipId | Category | BillingRef GKV | BillingRef PKV | TextSnippet | Line |
|--------|----------|----------------|----------------|-------------|------|
| pzr_vollstaendig | leistung | BEMA_107 | GOZ_1040 | ✅ | - |
| zahnstein_entfernung | leistung | BEMA_107a | GOZ_1040 | ✅ | - |
| fluoridierung | leistung | - | GOZ_1020 | ✅ | - |

---

## Extraction Chips

| ChipId | Category | BillingRef GKV | BillingRef PKV | TextSnippet | Line |
|--------|----------|----------------|----------------|-------------|------|
| extraktion_einfach | leistung | BEMA_41a | GOZ_3000 | ✅ | - |
| anaesthesie_infiltr | leistung | BEMA_40 | GOZ_0090 | ✅ | - |
| wundversorgung | leistung | - | - | ✅ | - |

---

## Crown Prep Chips

| ChipId | Category | BillingRef GKV | BillingRef PKV | TextSnippet | Line |
|--------|----------|----------------|----------------|-------------|------|
| praeparation | leistung | - | GOZ_2210 | ✅ | - |
| abformung | leistung | - | GOZ_5000 | ✅ | - |
| provisorium | leistung | - | GOZ_2260 | ✅ | - |
