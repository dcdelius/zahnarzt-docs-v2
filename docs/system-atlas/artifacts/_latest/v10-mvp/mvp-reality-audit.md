# V10 MVP Reality Audit

**Date**: 2025-12-31
**Status**: 🔴 **"noch Quatsch, weil Y fundamental fehlt"**

## A) MVP Assessment

### Category: 3 - "noch Quatsch, weil Y fundamental fehlt"

**Fundamental Issue**: The medical KB engine emits **zero chips** for standard fuellung dictations, causing:
- Empty `perInstance.text` for all cases
- Empty `perInstance.billingRefs` for all cases
- Output technically "works" but produces nothing useful

**Root Cause**: `applyMedicalKb` → chip emission logic is not firing for standard facts.

---

## B) Dictation Results Table

| ID | Dictation | Instances | Instance IDs | Q L1 | Q L2 | Output? | Text? | Billing? | Deviation |
|----|-----------|-----------|--------------|------|------|---------|-------|----------|-----------|
| 01 | Füllung 36 okklusal | 1 | fuellung-36-1 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |
| 02 | Füllung 14 distal | 1 | fuellung-14-1 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |
| 03 | Füllung 36 okklusal Komposit adhäsiv | 1 | fuellung-36-1 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |
| 04 | Füllung 24 mesial GIZ | 1 | fuellung-24-1 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |
| 05 | 36 okklusal Komposit; 14 distal GIZ | 2 | fuellung-36-1, fuellung-14-2 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |
| 06 | Füllung 36 und 37 okklusal Komposit adhäsiv | 2 | fuellung-36-1, fuellung-37-2 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |
| 07 | Füllung 36 okklusal Komposit mit Kofferdam | 1 | fuellung-36-1 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |
| 08 | Füllung 46 mesial Komposit ohne Kofferdam | 1 | fuellung-46-1 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |
| 09 | Füllung 36 profunda Ca(OH)2 Unterfüllung | 1 | fuellung-36-1 | 1 | 0 | ⏳ | - | - | Questions pending (expected) |
| 10 | Füllung 36 okklusal Komposit adhäsiv (PKV) | 1 | fuellung-36-1 | 0 | 0 | ✅ | ❌ | ❌ | Empty text/billing |

**Summary**: 9/10 reached output, but **all output is empty**.

---

## C) Root Cause Analysis

| Deviation | Count | Root Cause Module | Evidence |
|-----------|-------|-------------------|----------|
| Empty text/billing | 9 | `medical_kb/engine/applyMedicalKb` | No chips emitted despite valid facts |
| L1 questions triggered | 1 | askbacks registry | Only profunda triggers (correct) |
| Multi-instance works | 2/2 | scoping | ✅ fuellung-36-1, fuellung-14-2 correct |

### Primary Root Cause: Medical KB Engine

The `applyMedicalKb` engine is not emitting chips for standard fuellung treatments. This means:
1. Rules are not firing (conditions not met?)
2. Or rules fire but emit no chips
3. Or rules don't exist for standard cases

### Secondary Issues

1. **TreatmentKB loading**: `require is not defined` error suggests ESM/CJS mismatch in jsonProvider
2. **LLM extraction**: Falls back correctly when API key missing (expected in CLI)

---

## D) v10:mvp-check Result (cited)

```
═══════════════════════════════════════════════════
       V10 MVP CHECK RUNNER
═══════════════════════════════════════════════════

🔍 Build...        ✅ PASS (4139ms)
🔍 V10 UI Tests... ✅ PASS (1095ms)
🔍 V10/V7 Gate...  ✅ PASS (536ms)
🔍 Atlas Refresh.. ✅ PASS (715ms)
🔍 Atlas Check...  ✅ PASS (618ms)

       RESULTS: 5/5 PASS
       TOTAL TIME: 7.10s
✅ V10 MVP CHECK PASSED
```

**Note**: Tests pass because they check structure, not content quality.

---

## E) Top 3 Next Actions (MVP Blockers)

### 1. 🔴 FIX: Medical KB not emitting base chips

**Module**: `medical_kb/engine/applyMedicalKb.ts`
**Issue**: Standard fuellung facts don't trigger any chip emission
**Action**: Add base chip rules that always fire for `treatmentId=fuellung` (e.g., `fuellung_base`, `fuellung_text_intro`)

### 2. 🟡 FIX: Renderer needs chips to render

**Module**: `v10/renderer/renderFromKbChips.ts`
**Issue**: Empty chips → empty output (correct behavior, but exposed by #1)
**Action**: After #1, verify renderer produces text with chips

### 3. 🟡 VERIFY: Askback-to-chip delta works

**Module**: `v10/askbacks/registry.ts`
**Issue**: Unknown if `rule.chipDelta()` actually adds chips
**Action**: Add tracing or test that proves `chipDelta` mutations reach renderer

---

## SSOT Verification

| Component | Status |
|-----------|--------|
| perInstance is SSOT | ✅ |
| instanceIds from scoping | ✅ |
| Global derived from perInstance | ✅ |
| Chips → Text works (when chips exist) | ❓ Untested |
| Medical KB → Chips | ❌ **BROKEN** |

---

## Verdict

**V10 is architecturally sound but functionally empty.**

The pipeline flows correctly, but no chips emit, so no output is produced. This is a **content problem in the medical KB**, not an architecture problem.
