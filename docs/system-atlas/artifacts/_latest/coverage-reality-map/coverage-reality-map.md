# Maßnahmen Coverage Reality Map

**Date:** 2026-01-01  
**Status:** PARTIAL COVERAGE

---

## Coverage Table

| Maßnahme | ChipId | AskbackId | Facts | BillingRef | TextSnippet | Combi | Status |
|----------|--------|-----------|-------|------------|-------------|-------|--------|
| **Füllungsflächen 1-4+** | fuellung_grundleistung | fuellung.surfaces | surfaces[] | surface_mapping→13/13b/13c/13d | ✅ | - | ✅ PASS |
| **Überkappung** | capping_direkt/indirekt | fuellung.capping | cariesDepth,capping | ❌ Missing | ✅ | - | ⚠️ PARTIAL |
| **Adhäsivtechnik** | adhesive_technique | fuellung.adhesive | adhesive,material | ❌ Missing | ✅ | - | ⚠️ PARTIAL |
| **Mehrkosten/MKV** | mehrkosten_confirmed | fuellung.mehrkosten | mehrkostenMentioned | addon via BillingIntent | ✅ | - | ✅ PASS |
| **Schichttechnik** | layering_technique | fuellung.layering | layering | ❌ Missing | ✅ | - | ⚠️ PARTIAL |
| **Material** | material_komposit/giz/amalgam | fuellung.material | material | ❌ Missing | ✅ | - | ⚠️ PARTIAL |
| **Kofferdam** | ❌ Missing | ❌ Missing | ❌ | ❌ | ❌ | - | ❌ MISSING |
| **Blutstillung** | ❌ Missing | ❌ Missing | ❌ | ❌ | ❌ | - | ❌ MISSING |
| **Fluoridierung** | ❌ Missing | ❌ Missing | ❌ | ❌ | ❌ | - | ❌ MISSING |
| **Politur** | ❌ Missing | ❌ Missing | ❌ | ❌ | ❌ | - | ❌ MISSING |
| **Lokalanästhesie** | ❌ Missing | ❌ Missing | ❌ | ❌ | ❌ | - | ❌ MISSING |

---

## P0 Bugs (Silent Billing Risk)

| Issue | File | Fix Required |
|-------|------|--------------|
| No silent defaults detected | surfaceBillingResolver.ts | ✅ Already guarded |

---

## P1 Missing Items

| Priority | Maßnahme | Missing | Files to Add |
|----------|----------|---------|--------------|
| P1 | Kofferdam | Chip + Askback + BillingRef | unified.json, fuellung.askbacks.ts |
| P1 | Blutstillung | Chip + Askback + BillingRef | unified.json, fuellung.askbacks.ts |
| P1 | Fluoridierung | Chip + Askback + BillingRef | unified.json, fuellung.askbacks.ts |
| P1 | Politur | Chip + Askback + BillingRef | unified.json, fuellung.askbacks.ts |
| P1 | Lokalanästhesie | Chip + Askback + BillingRef | unified.json, common.askbacks.ts |
| P2 | Überkappung | BillingRef in chip defs | unified.json chips |
| P2 | Adhäsivtechnik | BillingRef in chip defs | unified.json chips |

---

## Evidence

| Item | File:Line |
|------|-----------|
| fuellung.capping askback | fuellung.askbacks.ts:12-31 |
| fuellung.adhesive askback | fuellung.askbacks.ts:33-50 |
| fuellung.surfaces askback | fuellung.askbacks.ts:93-113 |
| fuellung.mehrkosten askback | fuellung.askbacks.ts:115-134 |
| surface_mapping resolver | surfaceBillingResolver.ts:50-160 |
| BillingIntent computation | types.ts:45-56 |
| fuellung_grundleistung chip | unified.json:17-36 |
