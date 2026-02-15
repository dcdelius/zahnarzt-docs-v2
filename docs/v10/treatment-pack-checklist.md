# Treatment Pack Checklist

Complete checklist for adding a new treatment to the V10 pack system.

## Step 0: ID & Scope

- [ ] **Define TreatmentId** (e.g., `extraction`, `pzr`, `crown_prep`)
- [ ] **Insurance types**: GKV, PKV, MKV support
- [ ] **Text lengths**: kurz, mittel, lang variants
- [ ] **Multi-instance behavior**: per-tooth, per-session, segmented

```typescript
// Example scope definition
TreatmentId: 'extraction'
InsuranceTypes: ['GKV', 'PKV']
TextLengths: ['kurz', 'mittel', 'lang']
MultiInstance: 'per-tooth' // or 'per-session'
```

---

## Step 1: Treatment KB

**Path**: `src/docudent/core/billing/knowledgeBase/treatments/<id>/unified.json`

- [ ] Create `unified.json` with SSOT structure
- [ ] Define `_meta` with `id` and `version`
- [ ] Add all treatment chips with:
  - [ ] `id` (unique within treatment)
  - [ ] `label` (human-readable)
  - [ ] `phase` (treatment phase)
  - [ ] `category` (`leistung` | `befund` | `material`)
  - [ ] `textSnippets` (`kurz`, `mittel`, `lang`)
  - [ ] `billingRef` (GKV/PKV codes) or `null` with `hinweis` if non-billable
  - [ ] `forensicNotes` (audit/documentation hints)
  - [ ] `ruleRefs` (references to combinability rules)

```json
{
  "_meta": { "id": "extraction", "version": "v1" },
  "chips": [
    {
      "id": "extr_einfach",
      "label": "Einfache Extraktion",
      "phase": "eingriff",
      "category": "leistung",
      "textSnippets": {
        "kurz": "Ex {zahn}",
        "mittel": "Extraktion Zahn {zahn}",
        "lang": "Zahnextraktion Zahn {zahn} komplikationslos durchgeführt"
      },
      "billingRef": { "GKV": "BEMA_45", "PKV": "GOZ_3000" },
      "forensicNotes": ["BEMA 45 / GOZ 3000 je Zahn"]
    }
  ]
}
```

---

## Step 2: Medical KB

**Path**: `src/docudent/medical_kb/` (rules, askbacks, chips)

- [ ] Define treatment-specific medical rules
- [ ] Add askback triggers with `sourceRefs`
- [ ] Map askback IDs to QuestionBank adapter IDs
- [ ] Ensure chips emit correctly based on answers

```typescript
// Example askback trigger
{
  keyword: 'schwierig',
  triggersAskback: 'extraction_difficulty',
  sourceRef: 'medical_extraction_v1'
}
```

---

## Step 3: Extraction → Facts

**Path**: `src/docudent/v7/medical/extractionToFacts/maps/<treatment>.v1.ts` (or V10 equivalent)

- [ ] Define token/regex tables for entity extraction
- [ ] Handle common typos and synonyms
- [ ] Map extracted entities to fact keys

```typescript
export const extractionTokens = {
  treatmentKeywords: ['extrakt', 'ziehen', 'entfernt', 'gezogen'],
  entityPatterns: {
    tooth: /\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/,
    difficulty: /\b(einfach|schwierig|verlagert|retiniert)\b/i
  }
};
```

---

## Step 4: Golden Clinical Scenarios

**Path**: `src/docudent/v10/packs/<id>/pack.ts` → `getGoldenClinicalScenarios()`

- [ ] Create **minimum 7-10 scenarios** covering:
  - [ ] Simple/standard cases (3-4)
  - [ ] Edge cases with askbacks (2-3)
  - [ ] Multi-tooth scenarios (1-2)
  - [ ] Insurance variants (GKV/PKV) (1-2)

Each scenario must have:
- [ ] Unique `id` (prefixed with treatment, e.g., `EX_01`)
- [ ] `description` explaining what it tests
- [ ] `dictation` (realistic German text)
- [ ] `answers` (if testing output state)
- [ ] Assertions: `expectedAskbacks`, `expectedChips`, `expectedBillingPresent`, `expectedBillingAbsent`, `expectedTextPresent`

```typescript
{
  id: 'EX_01-simple-extraction',
  description: 'Simple single-tooth extraction',
  treatmentId: 'extraction',
  insuranceType: 'GKV',
  textLength: 'mittel',
  dictation: 'Zahn 36 extrahiert, komplikationslos',
  expectedBillingPresent: ['BEMA_45']
}
```

---

## Step 5: Combinability Goldens

**Path**: `src/docudent/v10/packs/<id>/pack.ts` → `getCombinabilityGoldens()`

- [ ] Create **minimum 5 PASS cases** (valid billing combinations)
- [ ] Create **minimum 3 BLOCK cases** (invalid combinations that trigger rules)
- [ ] Each case must have:
  - [ ] `id` (unique)
  - [ ] `description`
  - [ ] `codes` (array of BEMA_/GOZ_ prefixed codes)
  - [ ] `expectedVerdict` (`PASS` | `WARN` | `BLOCK`)
  - [ ] `expectedRuleId` (for BLOCK/WARN cases)

```typescript
{
  id: 'EX_BLOCK_01',
  description: 'Extraction not with implant same tooth',
  codes: ['GOZ_3000', 'GOZ_9010'],
  expectedVerdict: 'BLOCK',
  expectedRuleId: 'regel_extr_nicht_neben_impl'
}
```

---

## Step 6: Pack Wiring

### 6a. Create Pack File

**Path**: `src/docudent/v10/packs/<id>/pack.ts`

- [ ] Implement `create<Treatment>Pack()` factory function
- [ ] Return object implementing `TreatmentPack` interface
- [ ] Wire `getTreatmentKb()` to jsonTreatmentKbProvider
- [ ] Add all scenarios from Step 4
- [ ] Add all combinability goldens from Step 5

### 6b. Register in Registry

**Path**: `src/docudent/v10/packs/registry.ts`

- [ ] Import pack factory
- [ ] Add to `PACKS` constant
- [ ] Type will auto-update via `keyof typeof PACKS`

```typescript
import { createExtractionPack } from './extraction/pack';

export const PACKS = {
  fuellung: createFuellungPack(),
  endo: createEndoPack(),
  extraction: createExtractionPack(), // NEW
} as const;
```

---

## Step 7: Gates

Run all relevant gate tests:

```bash
# M18 pack gates
npx vitest run src/docudent/__tests__/gates/gate-m18*.test.ts --reporter=verbose

# M19 checklist + generator gates
npx vitest run src/docudent/__tests__/gates/gate-m19*.test.ts --reporter=verbose

# M20 coverage gates
npx vitest run src/docudent/__tests__/gates/gate-m20*.test.ts --reporter=verbose

# Full regression (M10-M20)
npx vitest run src/docudent/__tests__/gates/gate-m17*.test.ts src/docudent/v7/__tests__/gates/gate-m1*.test.ts --reporter=dot
```

- [ ] All M18 gates pass
- [ ] All M19 gates pass
- [ ] All M20 gates pass
- [ ] No regression in M10-M17

---

## Step 8: Debug/Audit

Verify in pipeline output:

- [ ] `meta.kb.treatments.<id>.hash` is stable
- [ ] `traceLines` include `kb_treatment:<id>` entries
- [ ] Combinability conflicts are correctly reported
- [ ] `billing_guard` blocks unconfirmed billing appropriately

```typescript
// Example audit checks
expect(output.meta.kb?.treatments?.extraction?.hash).toBeDefined();
expect(output.meta.traceLines).toContainEqual(expect.stringContaining('kb_treatment:extraction'));
```

---

## Definition of Done

A treatment pack is complete when:

- [ ] `unified.json` exists with all chips, billingRefs, and textSnippets
- [ ] Medical KB rules/askbacks are defined (if treatment has medical logic)
- [ ] Extraction-to-facts mapping exists (if treatment uses extraction)
- [ ] Pack file implements `TreatmentPack` interface
- [ ] Pack is registered in `registry.ts`
- [ ] **≥7 golden clinical scenarios** defined
- [ ] **≥5 PASS + ≥3 BLOCK combinability goldens** defined
- [ ] All M18 gates pass for this pack
- [ ] All M20 coverage gates pass (or allowlist is explicit + justified)
- [ ] No forbidden imports (v7, v6, _legacy, core/services)
- [ ] Deterministic output verified (chip ordering, billing codes, text)

---

## Quick Reference: File Locations

| Asset | Path |
|-------|------|
| Treatment KB | `core/billing/knowledgeBase/treatments/<id>/unified.json` |
| Pack implementation | `v10/packs/<id>/pack.ts` |
| Pack registry | `v10/packs/registry.ts` |
| Medical KB | `medical_kb/` |
| Extraction maps | `v7/medical/extractionToFacts/maps/` |
| Clinical harness | `v10/qa/runClinicalSuite.ts` |
| Coverage helper | `v10/qa/packCoverage.ts` |

---

## Generator Usage

To scaffold a new pack:

```bash
npx tsx scripts/packs/newTreatmentPack.ts --id extraction
```

This creates the skeleton files with TODOs but does **not** auto-modify `registry.ts`.
