# V10 MVP Reality Snapshot

**Date**: 2025-12-31T13:15
**Status**: ✅ **ALL BLOCKERS RESOLVED**

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Total Cases | 12 | 12 |
| Passing | 12 ✅ | 12 ✅ |
| MVP Blockers | 7 🔴 | **0** ✅ |
| Output with billing | 2 | 9 |
| Questions pending | 3 | 3 |

---

## Reality Matrix

| ID | Dictation | State | Billing | Status |
|----|-----------|-------|---------|--------|
| gkv_01 | Füllung 36 okklusal | questions(1) | - | ⏳ |
| gkv_02 | Füllung 36 okklusal distal Komposit | output | BEMA_13 | ✅ |
| gkv_03 | Füllung 14 distal GIZ | output | 3 codes | ✅ |
| gkv_04 | Füllung 36 und 37 okklusal Komposit | output | 2× BEMA_13 | ✅ |
| gkv_05 | Füllung 46 mod Komposit mit Kofferdam | output | BEMA_13, BEMA_12 | ✅ |
| gkv_06 | Füllung 36 profunda Ca(OH)2 | questions(2) | - | ⏳ |
| pkv_01 | Füllung 36 okklusal Komposit adhäsiv | output | GOZ_2060 | ✅ |
| pkv_02 | Füllung 14 mod Komposit Mehrschicht Kofferdam | output | GOZ_2060, GOZ_2040 | ✅ |
| pkv_03 | Füllung 24 und 25 okklusal Komposit | output | 2× GOZ_2060 | ✅ |
| mkv_01 | MKV Mehrschichttechnik | output | BEMA_13 | ✅ |
| mkv_02 | MKV Adhäsivtechnik | output | BEMA_13 | ✅ |
| edge_01 | Füllung 36 okklusal ohne Kofferdam | questions(1) | - | ⏳ |

---

## Fix Applied

**Surface Billing Resolver** implemented in [surfaceBillingResolver.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/billing/surfaceBillingResolver.ts):

- Chips with `billingRef: null` + `hinweis` containing "surface_mapping" now resolve billing via `surface_mapping` in unified.json
- GKV: BEMA_13/13b/13c/13d based on surface count
- PKV: GOZ_2060/2080/2100/2120 based on surface count
- MKV falls back to GKV billing

---

## Gate Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| gate-mvp-reality-snapshot.test.ts | 13 | ✅ |
| gate-mvp-surface-billing.test.ts | 11 | ✅ |
| gate-mvp-baseline-chip.test.ts | 3 | ✅ |
| gate-mvp-pipeline-chip-flow.test.ts | 3 | ✅ |
