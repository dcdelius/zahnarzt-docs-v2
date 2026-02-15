# V7 Pipeline — Inventory: V6 vs V7 Comparison

## Authority Matrix

| Concern | V6 File | V6 Authoritative? | V7 File | V7 Used? | Notes |
|---------|---------|-------------------|---------|----------|-------|
| **Extraction** | `v6/services/extractionService.ts` | ✅ YES | — | — | V6 calls LLM/regex, normalizes tooth |
| **Tooth Normalization** | `v6/services/toothNormalizer.ts` | ✅ YES | — | — | FDI normalization, Whisper fixes |
| **Questions** | `v6/services/questionService.ts` | ✅ YES | — | — | Uses QuestionBank, infers from extraction |
| **ID Translation** | `core/.../answerIdTranslator.ts` | ✅ YES | `v7/pipeline/normalizeAnswers.ts` | ⚠️ Called but OUTPUT NOT USED | **DUPLICATION RISK** |
| **ID Mappings** | `core/.../mappings/fuellung_answer_map.json` | ✅ YES | `v7/pipeline/mappings.ts` | ⚠️ Exists but unused | Different structure |
| **Chip Resolution** | `core/.../chipResolver.ts` | ✅ YES | — | — | Uses answerIdTranslator internally |
| **Billing** | `core/.../treatmentEngine.ts` | ✅ YES | — | — | Chip → billing codes |
| **Output Text** | `core/.../outputComposer.ts` | ✅ YES | — | — | Template + chip snippets |
| **Warnings** | `outputComposer.ts` | ✅ YES | — | — | From auditNotes + missing fields |

---

## Duplicate Translation Layers (Critical Issue)

### V6 Layer: `answerIdTranslator.ts`

```
Location: src/docudent/core/billing/knowledgeBase/logic/answerIdTranslator.ts
Used by: chipResolver.resolveActiveChipIds()
Actually affects: Chip activation, output text, billing
```

### V7 Layer: `normalizeAnswers.ts`

```
Location: src/docudent/v7/pipeline/normalizeAnswers.ts
Used by: v7/pipeline/index.ts (for debug logging only)
Actually affects: NOTHING (output discarded)
```

---

## Who Actually Controls What

```
User answers (semantic IDs)
    ↓
v7/pipeline/index.ts
    ↓ passes RAW answers to V6
v6/outputService.ts
    ↓ passes RAW answers to chipResolver
chipResolver.resolveActiveChipIds()
    ↓ calls translateAnswers() internally
answerIdTranslator.translateAnswers()  ← THIS IS AUTHORITATIVE
    ↓ returns canonicalAnswers
chipResolver uses canonicalAnswers for chip activation
```

---

## Risk Assessment

| Risk | Severity | Description |
|------|----------|-------------|
| Double translation confusion | HIGH | Two separate files with mapping tables that could drift |
| V7 normalizeAnswers is dead code | MEDIUM | Maintenance burden, false confidence |
| Mapping table differences | HIGH | V7 uses `CANONICAL_QUESTION_IDS` enum, V6 uses JSON patterns |
| No single source of truth | HIGH | Changes must be made in multiple places |

---

## Recommendation

Either:
1. **DELETE** `v7/pipeline/normalizeAnswers.ts` and `mappings.ts` (simplest)
2. **OR** Wire V7's output INTO `generateFinalOutput` call (requires V6 changes)

Current state: V7 layer exists but is unused. This is technical debt.
