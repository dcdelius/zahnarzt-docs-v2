# Gears — V10 System Architecture

**G120: 10+ Gears für Extraction → Output**

---

## Gear 1: Extraction

**Input:** Raw dictation text  
**Output:** Structured facts (TreatmentFacts)

| Contract | Value |
|----------|-------|
| Input Type | string (dictation) |
| Output Type | TreatmentFacts |
| Invariants | No PII in output, all enums valid |

**Failure Modes:**
- LLM hallucination → Invalid enum values
- Missing tooth/surface → Empty extraction

**Tests:** `extraction.test.ts`, `extraction-edge-cases.test.ts`

---

## Gear 2: Facts Validation

**Input:** TreatmentFacts  
**Output:** ValidatedFacts + errors

| Contract | Value |
|----------|-------|
| Input Type | TreatmentFacts |
| Output Type | { facts: ValidatedFacts, errors: string[] } |
| Invariants | Invalid facts flagged, not silently dropped |

**Failure Modes:**
- Unknown enum value → Error
- Invalid tooth number → Error

**Tests:** `facts-validation.test.ts`

---

## Gear 3: Apply Medical KB

**Input:** ValidatedFacts  
**Output:** Askbacks + Chips (preliminary)

| Contract | Value |
|----------|-------|
| Input Type | ValidatedFacts |
| Output Type | { askbacks: Askback[], chips: Chip[] } |
| Invariants | Concepts evaluate deterministically, no billing codes |

**Failure Modes:**
- Concept condition syntax error → No match
- Missing fact field → Concept doesn't fire

**Tests:** `applyMedicalKb.test.ts`, `medical-kb-rules.test.ts`

---

## Gear 4: Askbacks

**Input:** Preliminary chips + unanswered questions  
**Output:** Questions for user

| Contract | Value |
|----------|-------|
| Input Type | { chips: Chip[], facts: Facts } |
| Output Type | Askback[] (with options) |
| Invariants | Every answer → 1-2 chip deltas |

**Failure Modes:**
- No askback options → Empty array
- Missing chip delta → Informational-only (violation)

**Tests:** `askbacks.test.ts`, `askback-chip-delta.test.ts`

---

## Gear 5: Answer Processing

**Input:** User answers to askbacks  
**Output:** Updated facts + chip deltas

| Contract | Value |
|----------|-------|
| Input Type | { answers: Map<string, unknown> } |
| Output Type | { facts: UpdatedFacts, chipDeltas: ChipDelta[] } |
| Invariants | Answers persist, chip state updates |

**Failure Modes:**
- Invalid answer → Rejected
- Missing answer for blocking askback → Block

**Tests:** `answer-processing.test.ts`

---

## Gear 6: Chip Resolution

**Input:** Chip deltas + precedence rules  
**Output:** Final chip state

| Contract | Value |
|----------|-------|
| Input Type | ChipDelta[] |
| Output Type | Map<string, ChipState> |
| Invariants | Dictation > Manual > Askback > Settings > Default |

**Failure Modes:**
- Conflicting chips → Precedence violation
- Missing precedence rule → Undefined behavior

**Tests:** `chip-resolution.test.ts`, `chip-precedence.test.ts`

---

## Gear 7: SSOT Renderer

**Input:** Final chips + Treatment KB  
**Output:** Text blocks + BillingRefs

| Contract | Value |
|----------|-------|
| Input Type | { chips: ChipState, treatmentKb: TreatmentKB } |
| Output Type | { textBlocks: string[], billingRefs: BillingRef[] } |
| Invariants | No text without chip, no billing without chip |

**Failure Modes:**
- Missing chip mapping → No output
- Invalid chip ID → Error

**Tests:** `ssot-renderer.test.ts`, `render-trace.test.ts`

---

## Gear 8: Billing Resolution

**Input:** BillingRefs (chip-derived)  
**Output:** Resolved billing codes

| Contract | Value |
|----------|-------|
| Input Type | BillingRef[] |
| Output Type | ResolvedBillingCode[] |
| Invariants | All codes exist in catalog |

**Failure Modes:**
- Missing code in catalog → Error
- Phantom reference → Error

**Tests:** `billing-resolution.test.ts`, `catalog-closure.test.ts`

---

## Gear 9: Combinability Check

**Input:** Resolved billing codes  
**Output:** Combinability verdict (OK/WARN/BLOCK)

| Contract | Value |
|----------|-------|
| Input Type | ResolvedBillingCode[] |
| Output Type | { verdict: Verdict, violations: Violation[] } |
| Invariants | Exclusions fire deterministically |

**Failure Modes:**
- Missing exclusion rule → False OK
- Cascade failure → Multiple violations

**Tests:** `combinability.test.ts`, `exclusion-rules.test.ts`

---

## Gear 10: Output Assembly

**Input:** Text blocks + Billing + Combinability  
**Output:** Final V10Result

| Contract | Value |
|----------|-------|
| Input Type | { text, billing, combinability } |
| Output Type | V10Result |
| Invariants | State is 'output' only if complete |

**Failure Modes:**
- Missing required data → State stays 'questions'
- Combinability BLOCK → Warning in output

**Tests:** `output-assembly.test.ts`

---

## Gear 11: Per-Instance Output Derivation

**Input:** Per-instance chips from scoping  
**Output:** Per-instance text + billing (SSOT)

| Contract | Value |
|----------|-------|
| Input Type | { instanceResults: InstanceResult[], allowedChipIds: string[] } |
| Output Type | Record<instanceId, { text, billingRefs, chips }> |
| Invariants | Global output derived from perInstance only |

**Key Rules:**
- Each instance rendered separately via SSOT renderer
- No global `renderResult` - perInstance is single source of truth
- Global `fullText` = concat of perInstance texts
- Global `billingCodes` = union of perInstance billingRefs

**Failure Modes:**
- Dual rendering (old + new) → SSOT violation
- Fallback to global → Contract F test fails

**Tests:** `v10.per-instance-output.contract.test.ts` (Contract F: SSOT Derivation)

---

## Gear 12: Surface Billing Resolver

**Input:** Chip with `billingRef:null` + surfaces from context  
**Output:** Resolved F-code (BEMA_13/GOZ_2060)

| Contract | Value |
|----------|-------|
| Input Type | { chip, context: { surfaces }, insuranceType } |
| Output Type | { billingCode: string, mappingKey: '1'\|'2'\|'3'\|'4+' } |
| Invariants | Codes from KB surface_mapping only, no hardcodes |

**Decision Logic:**
1. Get `surfaceCount` from `context.surfaces.length`
2. If surfaces empty/missing → **cannot resolve** (return null + reason)
3. Map to key: `1`, `2`, `3`, or `4+`
4. Look up `surface_mapping[key][insuranceType]`
5. MKV → falls back to GKV

**No Silent Defaults:** If surfaces missing, resolver must NOT guess.

**Module:** [`surfaceBillingResolver.ts`](file:///Users/david/dokumaster-ui/src/docudent/v10/billing/surfaceBillingResolver.ts)

**Tests:** `gate-f-code-surface-truthcases.test.ts`

---

## Gear 13: Surface Normalization (SSOT)

**Input:** Extraction surfaces OR raw dictation  
**Output:** Canonical surfaces + source + ambiguity flag

| Contract | Value |
|----------|-------|
| Input Type | { extracted?: string\|string[], dictation?: string } |
| Output Type | { surfaces: CanonicalSurface[], source, hasAmbiguity, warnings } |
| Invariants | No guessing on ambiguous terms |

**SSOT Rule:** This is the ONLY module that may parse surfaces.

**No-Guessing Rule:** Ambiguous terms (`approximal`, `seitlich`, `großflächig`) result in:
- `surfaces = []`
- `hasAmbiguity = true`
- L1 askback required

**Canonical Mapping:**
- `palatinal` → `l`
- `labial` → `b`
- `vestibulär` → `b`

**Module:** [`v10/extraction/surfaces/normalizeSurfaces.ts`](file:///Users/david/dokumaster-ui/src/docudent/v10/extraction/surfaces/normalizeSurfaces.ts)

**Tests:** `gate-f-code-surface-truthcases.test.ts`

---

## Diagram

```
Dictation
    │
    ▼
[Gear 1: Extraction]
    │
    ▼
[Gear 2: Facts Validation]
    │
    ▼
[Gear 3: Apply Medical KB] ─────────┐
    │                               │
    ▼                               │
[Gear 4: Askbacks] ◄────────────────┘
    │                               (loop until answered)
    ▼
[Gear 5: Answer Processing]
    │
    ▼
[Gear 6: Chip Resolution]
    │
    ▼
[Gear 7: SSOT Renderer]
    │
    ├──► [Gear 8: Billing Resolution]
    │            │
    │            ▼
    │    [Gear 9: Combinability]
    │            │
    ▼            ▼
[Gear 10: Output Assembly]
    │
    ▼
V10Result
```
