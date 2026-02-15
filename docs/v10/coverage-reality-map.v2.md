# V10 Coverage Reality Map v2

**Date:** 2026-01-01  
**Status:** ✅ MOST MEASURES IMPLEMENTED

---

## Executive Summary (10 Bullets)

1. ✅ **21 chips** defined in unified.json for Füllung
2. ✅ **Kofferdam** complete: chip `kofferdam`, billingRef GKV:BEMA_12, PKV:GOZ_2040
3. ✅ **Überkappung (Cp)** complete: chip `cp`, billingRef GKV:BEMA_25, PKV:GOZ_2330
4. ✅ **Fluoridierung** complete: chip `fluor`, billingRef GKV:BEMA_IP4, PKV:GOZ_1020
5. ✅ **LA Infiltration** complete: chip `la_infiltr`, billingRef GKV:BEMA_40, PKV:GOZ_0090
6. ✅ **Politur/Finishing** complete: chip `finishing`, no billing (included in F-code)
7. ✅ **Surfaces 1-4+** complete: surface_mapping → BEMA_13/13b/13c/13d
8. ✅ **MKV Two-Channel** complete: BillingIntent with allowGozAddon
9. ⚠️ **Blutstillung** not in chips (may not be billable for Füllung)
10. ⚠️ **Missing askbacks** for LA and isolation selection

---

## Complete Coverage Table

| Maßnahme | ChipId | BillingRef GKV | BillingRef PKV | TextSnippet | Askback | Status |
|----------|--------|----------------|----------------|-------------|---------|--------|
| **Füllung Grundleistung** | fuellung_grundleistung | surface_mapping | surface_mapping | ✅ | - | ✅ PASS |
| **Füllungsflächen 1fl** | (via mapping) | BEMA_13 | GOZ_2060 | ✅ | fuellung.surfaces | ✅ PASS |
| **Füllungsflächen 2fl** | (via mapping) | BEMA_13b | GOZ_2080 | ✅ | fuellung.surfaces | ✅ PASS |
| **Füllungsflächen 3fl** | (via mapping) | BEMA_13c | GOZ_2100 | ✅ | fuellung.surfaces | ✅ PASS |
| **Füllungsflächen 4fl+** | (via mapping) | BEMA_13d | GOZ_2120 | ✅ | fuellung.surfaces | ✅ PASS |
| **Kofferdam** | kofferdam | BEMA_12 | GOZ_2040 | ✅ | ❌ | ⚠️ PARTIAL |
| **Rel. Trockenlegung** | rel_trocken | - | - | ✅ | ❌ | ⚠️ PARTIAL |
| **LA Infiltration** | la_infiltr | BEMA_40 | GOZ_0090 | ✅ | ❌ | ⚠️ PARTIAL |
| **LA Leitung** | la_leitung | BEMA_41 | GOZ_0100 | ✅ | ❌ | ⚠️ PARTIAL |
| **Oberflächenanästhesie** | oberflaeche_la | - | GOZ_0080 | ✅ | ❌ | ⚠️ PARTIAL |
| **Überkappung (Cp)** | cp | BEMA_25 | GOZ_2330 | ✅ | fuellung.capping | ✅ PASS |
| **Direkte Überkappung (P)** | p | BEMA_26 | GOZ_2340 | ✅ | fuellung.capping | ✅ PASS |
| **Exkavation** | exkavation | - | - | ✅ | - | ✅ PASS |
| **Komposit** | komposit_basic | - | - | ✅ | fuellung.material | ✅ PASS |
| **Mehrschicht** | mehrschicht | - | - | ✅ | fuellung.layering | ✅ PASS |
| **Politur/Finishing** | finishing | - | - | ✅ | - | ✅ PASS |
| **Fluoridierung** | fluor | BEMA_IP4 | GOZ_1020 | ✅ | ❌ | ⚠️ PARTIAL |
| **Adhäsivtechnik** | (via rule) | BEMA_12 | GOZ_2197 | ❌ | fuellung.adhesive | ⚠️ PARTIAL |
| **Mehrkosten/MKV** | (via intent) | addon | GOZ_* | ✅ | fuellung.mehrkosten | ✅ PASS |
| **Blutstillung** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ MISSING |

---

## Evidence

| Chip | File:Line |
|------|-----------|
| fuellung_grundleistung | unified.json:18 |
| kofferdam | unified.json:258 |
| la_infiltr | unified.json:154 |
| la_leitung | unified.json:191 |
| cp | unified.json:347 |
| fluor | unified.json:571 |
| finishing | unified.json:545 |

---

## P0 vs P1 Classification

### P0 (MVP Blocker) - NONE REMAINING
All critical billing measures have chips + billingRefs.

### P1 (Nice-to-Have)

| Item | Missing | Files |
|------|---------|-------|
| Kofferdam askback | L2 askback for isolation choice | fuellung.askbacks.ts |
| LA askback | L2 askback for LA type choice | fuellung.askbacks.ts |
| Fluorid askback | L3 askback for fluorid confirmation | fuellung.askbacks.ts |
| Blutstillung | Entire chain (rarely billed for Füllung) | unified.json |
| Adhäsiv chip | standalone chip with textSnippet | unified.json |

---

## Existing Tests

| Test | Coverage |
|------|----------|
| gate-insurance-channelization-no-lookup | 13/13 ✅ |
| gate-mkv-billing-contract | 12/12 ✅ |
| gate-askback-surface-ambiguity | 3/3 ✅ |
| gate-askback-mehrkosten-mkv | 6/6 ✅ |
| v10:practice-check | 8/8 ✅ |
