# Medical Layer Audit After Reject-All

**Date**: 2025-12-22T20:19:00+01:00  
**Branch**: `feature/gpt5-optimization-firebase-instructions` (ahead 7)  
**Build**: ✅ SUCCESS (5.14s)

---

## VERDICT: 🟡 PARTIAL

The Medical Layer is **PARTIALLY INTACT**:
- ✅ KB/DB layer (question_bank, answer_map, unified) — INTACT
- ✅ V7 Pipeline (normalizeAnswers, mappings) — INTACT  
- ❌ V7/medical/ directory — **EMPTY (0 files)**
- ❌ Chip IDs (CAPPING_DIRECT/INDIRECT) — NOT FOUND
- ❌ Deep filling gate tests — NOT FOUND

---

## Step 0: Safety Snapshot

| Item | Value |
|------|-------|
| Branch | `feature/gpt5-optimization-firebase-instructions` |
| Ahead/Behind | ahead 7 |
| Working Tree | Modified (37 files) |
| Stashes | 2 (`stash@{0}`: Backup before v3.1) |
| Tag Created | (pending user approval) |

---

## Step 1: Timeline (Last 15 Commits)

```
910f189 feat(v7): Post-foundation sprint - Team, Invites, Cases UX
9ab034c feat(auth): Auth Invites & Self-Serve Practice V1
c67b289 feat(ssot): Add SSOT wiring audit for settings
501ec79 feat(analog): Implement analog justification flow
87bebc3 V6 SSOT Complete: QuestionBank, strict types
a2536a9 feat: rebrand to docudent, improve UI/UX
a96e680 feat: Redesign Wissensdatenbank
a732588 Switch to GPT-5-mini (origin)
e28c62f feat: Optimize GPT-5 processing
fa8f095 (tag: v3.1) feat: Bausteine in Vorlagenverwaltung
```

**No "V10 Primary Switch" or "Phase5" commits found in history.**

---

## Step 2: Existence Check

| Path | File Count | Status |
|------|------------|--------|
| `src/docudent/v7/medical/` | **0** | ❌ EMPTY |
| `src/docudent/v7/pipeline/` | 9 | ✅ INTACT |
| `src/docudent/core/billing/knowledgeBase/treatments/fuellung/` | 6 | ✅ INTACT |
| `src/docudent/v7/__tests__/gates/` | 4 | ✅ EXISTS |

### KB Fuellung Files (INTACT)
```
template.json
answer_map.json
unified.json
question_bank.json
question_bank.json.backup
finding_map.json
```

### V7 Pipeline Files (INTACT)
```
index.ts
mappings.ts
normalizeAnswers.ts
types.ts
applyUserDefaults.ts
testOnly.ts
traceCollector.ts
trace.ts
traceStages.ts
```

---

## Step 3: Content/Signature Check

| Signature | Found | Location |
|-----------|-------|----------|
| `medical_ueberkappung` | ❌ NOT FOUND | - |
| `counsel_pulpitis_risk` | ❌ NOT FOUND | - |
| `CAPPING_INDIRECT` | ❌ NOT FOUND | - |
| `CAPPING_DIRECT` | ❌ NOT FOUND | - |
| `capping_direct` | ❌ NOT FOUND | - |
| `capping_indirect` | ❌ NOT FOUND | - |
| `profunda` | ✅ FOUND | mappings.ts:153, normalizeAnswers.ts:300, stubExtractor |
| `ueberkappung` (KB) | ✅ FOUND | question_bank.json:77,81,225,229,232 |
| `pulpitisRisk` | ❌ NOT FOUND | - |

### Ueberkappung in question_bank.json (INTACT)
```json
{
  "key": "ueberkappung",
  "dataField": "mentioned.ueberkappung",
  ...
}
{
  "key": "ueberkappung_material",
  "dataField": "mentioned.ueberkappung_material",
  "depends": { "ueberkappung": true }
}
```

---

## Step 4: Tests/Gates Check

| Gate | Found |
|------|-------|
| `gate-p14-deep-filling-*` | ❌ NOT FOUND in v7/__tests__ |
| `gate-chip-billing-*` | ❌ NOT FOUND |
| `gate-combinability-rules-lock` | ✅ EXISTS |
| `gate-treatment-isolation` | ✅ EXISTS |
| `gate-output-coverage` | ✅ EXISTS |
| `gate-no-patient-fields-in-output` | ✅ EXISTS |

**Note**: Some deep-filling gates may exist in `src/docudent/__tests__/gates/` (untracked).

---

## Step 5: Build/Test Reality

| Check | Result |
|-------|--------|
| `npm run build` | ✅ SUCCESS (5.14s) |
| Large chunks warning | Yes (TreatmentSelector 2.8MB) |

---

## Step 6: What's Missing vs What's Intact

### ❌ DEFINITIV WEG

1. **`src/docudent/v7/medical/`** — 0 files
   - Expected: `facts.ts`, `chipsFromFacts.ts`, `textFromChips.ts`
   - Expected: `askbackCatalog.v1.ts`, `askbackMatrix.v1.ts`
   - Expected: `chipRegistry.v1.ts`, `chipBillingMap.v1.ts`

2. **Chip IDs** — No CAPPING_DIRECT/CAPPING_INDIRECT
   - These were the "Deep Filling" chip constants

3. **Medical Askback IDs** — Not in codebase
   - `medical_ueberkappung`, `counsel_pulpitis_risk`

4. **Deep filling gate tests** — Not in `v7/__tests__/gates/`

### ✅ DEFINITIV NOCH DA

1. **V7 Pipeline** — Fully intact (index.ts, mappings.ts, normalizeAnswers.ts)
2. **KB Fuellung** — All JSON files present (question_bank, answer_map, unified)
3. **Profunda/Tiefe logic** — Exists in mappings.ts & normalizeAnswers.ts
4. **Ueberkappung questions** — Defined in question_bank.json
5. **Build** — Works, no TypeScript errors

### 🟡 UNTRACKED / LOKAL

- `src/docudent/v8/` (4 files)
- Many gate tests in `src/docudent/__tests__/gates/`
- Architecture docs

---

## Step 7: Recovery Options

### Option 1: Check Stash
```bash
git stash show -p stash@{0} | grep -A5 "v7/medical"
git stash show -p stash@{1} | grep -A5 "v7/medical"
```
**Likelihood**: Low (stashes are old, pre-V7 medical)

### Option 2: Check Reflog for Lost Commits
```bash
git reflog | grep -i "medical\|chips\|facts"
git fsck --lost-found
```
**Likelihood**: Low (no "medical layer" commits visible in log)

### Option 3: Rebuild Minimal Medical Layer
If recovery fails, create new minimal files:

1. `src/docudent/v7/medical/facts.ts` — Define Facts interface
2. `src/docudent/v7/medical/chipsFromFacts.ts` — Facts → Chips mapper
3. `src/docudent/v7/medical/chipRegistry.v1.ts` — Chip ID constants (CAPPING_DIRECT etc)
4. Wire into V7 pipeline

**This is the most likely path forward.**

---

## Conclusion

The Medical Layer **was never fully committed** or was developed in a session that didn't persist.  
The KB/DB layer provides the questions, but the **Facts → Chips → Billing transformation layer is missing**.

**Next Step**: If you want to proceed, we need to rebuild the minimal Medical Layer (~4 files).
