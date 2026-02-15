# V7 Pipeline — Contracts & SSOT Analysis

## Contract Locations

### 1. Question IDs

| Source | Location | SSOT? | Notes |
|--------|----------|-------|-------|
| QuestionBank | `core/.../questions/questionBank.ts` | ✅ YES | Runtime source |
| fuellung_questions.json | `core/.../questions/fuellung_questions.json` | ✅ YES | Data file |
| V7 CANONICAL_QUESTION_IDS | `contracts/canonicalIds.ts` | ❌ NO | Enum for type safety only |
| V7 QUESTION_ID_ALIASES | `v7/pipeline/mappings.ts` | ❌ NO | Unused at runtime |

**Duplication**: V7 defines canonical IDs in TypeScript, but runtime uses JSON.

---

### 2. Option IDs

| Source | Location | SSOT? | Notes |
|--------|----------|-------|-------|
| QuestionBank options | `fuellung_questions.json` | ✅ YES | "kofferdam", "relativ", etc. |
| AnswerMap answers | `fuellung_answer_map.json` | ✅ YES | "yes", "no", "cp", etc. |
| V7 CANONICAL_OPTION_IDS | `contracts/canonicalIds.ts` | ❌ NO | Enum only |
| V7 OPTION_ID_ALIASES | `v7/pipeline/mappings.ts` | ❌ NO | Unused at runtime |

**Duplication**: Option translations defined in both V6 JSON and V7 TypeScript.

---

### 3. Chip IDs

| Source | Location | SSOT? | Notes |
|--------|----------|-------|-------|
| fuellung_unified.json | `core/.../behandlungen/fuellung_unified.json` | ✅ YES | Chip definitions |
| fuellung_answer_map.json | `core/.../mappings/fuellung_answer_map.json` | ✅ YES | Answer → Chip mapping |
| V7 CANONICAL_CHIP_IDS | `contracts/canonicalIds.ts` | ❌ NO | Type safety only |
| V7 ANSWER_TO_CHIP | `contracts/canonicalIds.ts` | ❌ NO | Unused at runtime |

**SSOT**: Chip IDs defined in `fuellung_unified.json`, mappings in `fuellung_answer_map.json`.

---

### 4. Output Section Structure

| Source | Location | SSOT? | Notes |
|--------|----------|-------|-------|
| fuellung_template.json | `core/.../templates/fuellung_template.json` | ✅ YES | Section order, labels |
| ComposedOutput type | `outputComposer.ts` | ✅ YES | Type definition |
| V7 types | `v7/pipeline/types.ts` | ❌ NO | Re-exports |

**SSOT**: Template JSON is authoritative for structure.

---

### 5. Warning Rules

| Source | Location | SSOT? | Notes |
|--------|----------|-------|-------|
| Chip auditWarnings | `fuellung_unified.json` | ✅ YES | Per-chip warnings |
| Finding map auditNotes | `fuellung_finding_map.json` | ✅ YES | Missing field warnings |
| treatmentEngine rules | `treatmentEngine.ts` | PARTIAL | Combination rules |

**SSOT**: Distributed across JSON files + engine.

---

## Summary Table

| Contract | SSOT Location | Duplication Exists? |
|----------|--------------|---------------------|
| Question IDs | `fuellung_questions.json` | ✅ V7 has unused aliases |
| Option IDs | `fuellung_answer_map.json` | ✅ V7 has unused aliases |
| Chip IDs | `fuellung_unified.json` | ✅ V7 has unused mapping |
| Answer→Chip | `fuellung_answer_map.json` | ✅ V7 ANSWER_TO_CHIP unused |
| Section structure | `fuellung_template.json` | ❌ None |
| Warning rules | JSON + engine | ❌ None |

---

## Duplication Cleanup Priority

1. **HIGH**: Remove or wire V7 `normalizeAnswers.ts` output
2. **MEDIUM**: Consolidate `contracts/canonicalIds.ts` with JSON sources
3. **LOW**: V7 `mappings.ts` can be deleted if normalizeAnswers is deleted
