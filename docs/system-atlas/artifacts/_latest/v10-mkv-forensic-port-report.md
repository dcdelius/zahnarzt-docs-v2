# V10 MKV/GOZ Addon Forensic Port - Complete Report

**Date**: 2026-01-12  
**Status**: ✅ COMPLETE (230 tests pass)

---

## TASK 1: Reality Proof — UI → V10 Pipeline

### Route Chain
| Step | Location | Evidence |
|------|----------|----------|
| Route | `/docudent/v10` | [App.jsx](file:///Users/david/dokumaster-ui/src/App.jsx) |
| Page | `DocudentV10Page` | [DocudentV10Page.tsx:48](file:///Users/david/dokumaster-ui/src/docudent/v10/pages/DocudentV10Page.tsx#L48) |
| Hook | `useV10Pipeline` | [useV10Pipeline.ts:82](file:///Users/david/dokumaster-ui/src/docudent/v10/hooks/useV10Pipeline.ts#L82) |
| Pipeline | `runV10` | [runV10.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/pipeline/runV10.ts) |

### Insurance Flow
```
UI checkbox "hasMKV" 
  → useState(hasMKV: false) [line 88]
  → effectiveInsuranceType = hasMKV ? 'MKV' : insuranceType [line 180]
  → runV10({ insuranceType: effectiveInsuranceType }) [line 204]
```

### DEV Boundary Logs (ALREADY EXIST)

| Boundary | Location | Fields Logged |
|----------|----------|---------------|
| UI → Pipeline | [useV10Pipeline.ts:184-195](file:///Users/david/dokumaster-ui/src/docudent/v10/hooks/useV10Pipeline.ts#L184-L195) | dictation, treatmentId, insuranceType, hasMKV, answers |
| V10 Raw Output | [useV10Pipeline.ts:216-219](file:///Users/david/dokumaster-ui/src/docudent/v10/hooks/useV10Pipeline.ts#L216-L219) | v10Result.output, billingCodes |

### Reality Proof Table

| Field | UI Value | runV10 Input | Facts | Chips | BillingRefs |
|-------|----------|--------------|-------|-------|-------------|
| insuranceType | 'GKV' checkbox | `insuranceType: 'GKV'` | - | - | BEMA only |
| insuranceType | 'PKV' checkbox | `insuranceType: 'PKV'` | - | - | GOZ only |
| insuranceType | 'MKV' checkbox | `insuranceType: 'MKV'` | `mehrkostenConfirmed=true` | `mehrschicht` | BEMA + GOZ |
| hasMKV | true | `insuranceType: 'MKV'` | Derived via `detectMehrkostenMentioned` | `mehrschicht` | GOZ addon |
| mkvAmount | "120€" | dictation | `detectMkvAmount` → MKV section | - | - |
| nurKasse | "nur Kasse" | dictation | `nurKasse=true`, `mehrkostenConfirmed=false` | NO `mehrschicht` | BEMA only |

---

## TASK 2: Legacy Forensics

### Evidence Table (Git Blame)

| Code | File:Lines | Hash | Date | Classification |
|------|------------|------|------|----------------|
| `mehrschicht` chip | unified.json:497-543 | `501ec79` | 2025-12-15 | ✅ LEGACY |
| `billingRef.MKV: GOZ_2197` | unified.json:507-509 | `501ec79` | 2025-12-15 | ✅ LEGACY |
| `rule-mkv-mehrschicht-addon` | medical_kb.v1.json:139-175 | `00000000` | 2026-01-12 | ❌ NEW |
| `BillingIntent` type | v10/types.ts:33-60 | `00000000` | 2026-01-12 | ❌ NEW |
| `mehrkostenConfirmed` fact | v10/facts/*.ts | untracked | 2026-01-12 | ❌ NEW |
| V10 directory (entire) | src/docudent/v10/** | untracked | - | ❌ NEW |

### Semantic Diff: Legacy vs V10

| Semantic Rule | Legacy Status | V10 Status |
|---------------|---------------|------------|
| `mehrschicht` chip exists | ✅ Present (unified.json) | ✅ Used |
| GOZ_2197 billingRef for MKV | ✅ Present | ✅ Used |
| KB rule to emit chip | ❌ None | ✅ Added (`rule-mkv-mehrschicht-addon`) |
| `mehrkostenConfirmed` fact | ❌ None | ✅ Added |
| `detectNurKasse` | ❌ None | ✅ Added |

**Conclusion**: New V10 implementation using **existing legacy scaffolding** (`mehrschicht` chip) with **new wiring** (KB rule, facts, BillingIntent).

---

## TASK 3: Port/Fix Status

### Already Implemented ✅

| Component | Location | Status |
|-----------|----------|--------|
| `mehrkostenConfirmed` fact | [buildFactsFromExtraction.ts:367-369](file:///Users/david/dokumaster-ui/src/docudent/v10/facts/buildFactsFromExtraction.ts#L367-L369) | ✅ |
| `detectMehrkostenMentioned` | [buildFactsFromExtraction.ts:177-194](file:///Users/david/dokumaster-ui/src/docudent/v10/facts/buildFactsFromExtraction.ts#L177-L194) | ✅ |
| `detectNurKasse` | [buildFactsFromExtraction.ts:200-218](file:///Users/david/dokumaster-ui/src/docudent/v10/facts/buildFactsFromExtraction.ts#L200-L218) | ✅ |
| `rule-mkv-mehrschicht-addon` | [medical_kb.v1.json:139-175](file:///Users/david/dokumaster-ui/src/docudent/medical_kb/medical_kb.v1.json#L139-L175) | ✅ |
| `BillingIntent.allowGozAddon` | [types.ts:33-59](file:///Users/david/dokumaster-ui/src/docudent/v10/types.ts#L33-L59) | ✅ |
| MKV section in composer | [composeDocumentationV10.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/output/composeDocumentationV10.ts) | ✅ |
| MKV amount detection | [composeDocumentationV10.ts:detectMkvAmount](file:///Users/david/dokumaster-ui/src/docudent/v10/output/composeDocumentationV10.ts) | ✅ |

### MKV Default Semantics

```typescript
// MKV Praxis-Default (line 367-369):
mehrkostenConfirmed: detectMehrkostenMentioned(extracted) && !detectNurKasse(extracted)
```

This means:
- MKV + (komposit/mehrschicht/adhäsiv keyword) + NOT "nur Kasse" → `mehrkostenConfirmed=true`
- KB rule then emits `mehrschicht` chip → GOZ addon billing

---

## TASK 4: Tests

### Existing Tests ✅

| Test File | Tests | Status |
|-----------|-------|--------|
| [v10.mkv-addon-billing.test.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__tests__/pipeline/v10.mkv-addon-billing.test.ts) | 5 | ✅ PASS |
| [v10.perfect-output.contract.test.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__tests__/pipeline/v10.perfect-output.contract.test.ts) | 6 | ✅ PASS |
| [scoping.phantom-teeth.test.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__tests__/multitreatment/scoping.phantom-teeth.test.ts) | 11 | ✅ PASS |
| [gate-no-hardcoded-billing.test.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__tests__/gates/gate-no-hardcoded-billing.test.ts) | 2 | ✅ PASS |
| [v10-output-contract.e2e.spec.ts](file:///Users/david/dokumaster-ui/e2e/v10-output-contract.e2e.spec.ts) | 3 | ✅ Created |

### Test Commands

```bash
# Run all V10 tests
npm test -- --run src/docudent/v10/__tests__
# 230 tests pass

# Run MKV addon tests specifically
npm test -- --run src/docudent/v10/__tests__/pipeline/v10.mkv-addon-billing.test.ts

# Run E2E output contract
npm run e2e -- --grep "V10 Output Contract"
```

---

## TASK 5: Atlas Documentation

### Updated Gear

[gear.output-composer.md](file:///Users/david/dokumaster-ui/docs/system-atlas/gears/gear.output-composer.md)

### Where to Change What

| Change | Location |
|--------|----------|
| Insurance UI selection | [DocudentV10Page.tsx:59-64](file:///Users/david/dokumaster-ui/src/docudent/v10/pages/DocudentV10Page.tsx#L59-L64) |
| MKV checkbox derivation | [useV10Pipeline.ts:180](file:///Users/david/dokumaster-ui/src/docudent/v10/hooks/useV10Pipeline.ts#L180) |
| Mehrkosten keywords | [buildFactsFromExtraction.ts:188](file:///Users/david/dokumaster-ui/src/docudent/v10/facts/buildFactsFromExtraction.ts#L188) |
| nurKasse keywords | [buildFactsFromExtraction.ts:204-211](file:///Users/david/dokumaster-ui/src/docudent/v10/facts/buildFactsFromExtraction.ts#L204-L211) |
| MKV addon KB rule | [medical_kb.v1.json:139-175](file:///Users/david/dokumaster-ui/src/docudent/medical_kb/medical_kb.v1.json#L139-L175) |
| GOZ addon billingRef | [unified.json:507-509](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json#L507-L509) |
| MKV section text | [composeDocumentationV10.ts:buildMkvSection](file:///Users/david/dokumaster-ui/src/docudent/v10/output/composeDocumentationV10.ts) |

---

## Verification Commands

```bash
# Full test suite
npm test -- --run src/docudent/v10/__tests__
# Expected: 230 tests pass

# Specific MKV tests
npm test -- --run src/docudent/v10/__tests__/pipeline/v10.mkv-addon-billing.test.ts
# Expected: 5 tests pass
```
