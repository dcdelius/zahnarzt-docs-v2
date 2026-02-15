# V10 Atlas Audit - 6 Prompts

**Date**: 2025-12-31T15:28  
**Status**: Complete

---

## Prompt 1: F-Code Surface Resolution

### Issue

**surfaceCount always defaults to 1** → all GKV cases get BEMA_13 regardless of actual surface count.

| Case | Dictation | Surfaces | Expected | Actual |
|------|-----------|----------|----------|--------|
| gkv_01 | okklusal | 1 | BEMA_13 | BEMA_13 ✅ |
| gkv_02 | okklusal distal | 2 | BEMA_13b | BEMA_13 ❌ |
| gkv_04 | mod | 3 | BEMA_13c | BEMA_13 ❌ |

### Root Cause

| Location | Issue |
|----------|-------|
| `buildFactsFromExtraction.ts` | `surfaces` array not extracted from dictation |
| `surfaceBillingResolver.ts:54` | Defaults to `surfaceCount = 1` if not in context |
| `renderFromKbChips.ts:212` | Passes context, but context lacks surfaces |

### Minimal Fix

```typescript
// In buildFactsFromExtraction.ts, add:
const surfaces = extracted.surfaces ?? [];
facts.surfaces = surfaces;
```

Then pass to renderer context.

---

## Prompt 2: DB-Referenzen Closure

**Status**: ✅ PASS

| Metric | Value |
|--------|-------|
| Gate | `gate-billingref-closure.test.ts` |
| Tests | 7/7 pass |
| All refs in catalog | Yes |
| Missing references | 0 |

---

## Prompt 3: Gear Design Review

**Status**: ✅ CLEAN

### surfaceBillingResolver Responsibilities

1. **Input**: chip with `billingRef:null`, context with surfaces, insuranceType
2. **Output**: resolved billing code from `surface_mapping`
3. **Source**: KB only, no hardcodes

### 3 Rules for Surface Mapping

1. **Surface mapping lives in `unified.json` only** - never in code
2. **Resolver reads from KB** - uses `surface_mapping[key][insuranceType]`
3. **Renderer calls resolver** - doesn't duplicate logic or bypass

### Anti-Patterns Checked

- ❌ Dual rendering: Not found
- ❌ Hardcoded codes: Not found
- ❌ Fallback shadow logic: Not found

---

## Prompt 4: Insurance Rules

**Status**: ✅ PASS (with recommendations)

### Gates

| Contract | Gate | Status |
|----------|------|--------|
| No GOZ in GKV | `gate-no-hardcoded-billing-codes.test.ts` | ✅ |
| No BEMA in PKV | `gate-f-code-surface-truthcases.test.ts` | ✅ |

### 5 New Truthcases Needed

1. **GKV profunda + MKV upsell refusal** → stays GKV, no GOZ
2. **MKV without explicit marker** → defaults to GKV behavior
3. **PKV downgrade** → patient chooses BEMA (rare but valid)
4. **GKV multi-surface + Kofferdam + GIZ** → BEMA_13b + BEMA_12
5. **Mixed insurance multi-tooth** → per-instance correct

---

## Prompt 5: Askbacks Zero Analysis

### Why 0 Questions in MVP Truth Run

**Reason**: Extraction provides sufficient facts for standard cases.

### Flow

```
Dictation
    ↓
Extraction (LLM/Stub)
    ↓
Facts = { tooth, material: 'komposit', ... }  ← Filled
    ↓
applyMedicalKb (rules evaluate with filled facts)
    ↓
Askbacks = []  ← No unknowns to ask about
```

### When Questions Appear

| Trigger | Question | Askback ID |
|---------|----------|------------|
| `profunda` in dictation | Überkappung? | `medical_ueberkappung` |
| Material unclear | Material? | `fuellung_material` |
| Kariestiefe missing | Tiefe? | `karies_tiefe` |

---

## Prompt 6: MVP Go/No-Go

### Must Before First Practice Day

| Gap | Priority | Effort |
|-----|----------|--------|
| **surfaceCount extraction** | P0 | Medium |
| Error logging + repro bundle | P0 | Low |
| UI copy button for output | P1 | Low |

### Can Defer

| Gap | Priority | Notes |
|-----|----------|-------|
| Full Endo support | P2 | Fuellung MVP first |
| Export to PVS | P2 | Manual copy-paste works |
| Settings persistence | P3 | Defaults sufficient |
| Dark mode | P4 | Nice to have |

### Launch Checklist

- [ ] Fix surfaceCount extraction
- [ ] Add error logging with repro bundle
- [ ] Add copy-to-clipboard button
- [ ] Run `npm run v10:mvp-smoke` → 12/12 pass
- [ ] Test 5 real dictations from practice
- [ ] Verify billing codes match PVS expectations
