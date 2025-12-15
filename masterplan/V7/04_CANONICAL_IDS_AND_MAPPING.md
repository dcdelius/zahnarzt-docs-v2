# V7 Canonical IDs and Mapping

## Purpose
Defines canonical IDs for questions and options, plus the translation layer from semantic to canonical.

---

## Core Principle

> **UI uses semantic IDs** (human-readable, matches QuestionBank)  
> **Engine uses canonical IDs** (machine-readable, matches AnswerMap)

---

## Translation Layer SSOT

| File | Purpose |
|------|---------|
| `logic/answerIdTranslator.ts` | Semantic → Canonical translation |

### Functions
- `translateQuestionId(treatmentId, questionId)` → canonical questionId
- `translateOptionId(treatmentId, questionId, optionId)` → canonical optionId
- `translateAnswers(treatmentId, answers)` → Map with canonical keys/values

---

## Mapping Tables

### Question ID Mapping (fuellung)

| Semantic (QuestionBank) | Canonical (AnswerMap) |
|------------------------|----------------------|
| `isolation` | `kofferdam` |
| `tiefe` | `cavity_depth` |
| `material` | `capping` |
| `vitality` | `vitality` (no change) |
| `percussion` | `percussion` (no change) |
| `mkv_betrag` | `mkv_betrag` (no change) |

### Option ID Mapping (fuellung)

| Question | Semantic Option | Canonical Option |
|----------|----------------|-----------------|
| isolation | `kofferdam` | `yes` |
| isolation | `relativ` | `no` |
| tiefe | `tief` | `deep` |
| tiefe | `pulpanah` | `deep` |
| tiefe | `normal` | `normal` |
| material | `caoh` | `cp` |
| material | `mta` | `cp` |
| material | `biodentine` | `cp` |
| vitality | `pos` | `pos` (no change) |
| vitality | `neg` | `neg` (no change) |

---

## Examples

### Example 1: Isolation Question

```
QuestionBank (semantic):
  key: "isolation"
  options: [{ id: "kofferdam" }, { id: "relativ" }]

User selects: "kofferdam"
Answers Map: { "isolation" → "kofferdam" }

Translation:
  questionId: "isolation" → "kofferdam"
  optionId: "kofferdam" → "yes"

Canonical: { "kofferdam" → "yes" }

AnswerMap lookup:
  questionIdPatterns: ["isolation", "kofferdam"]  ← matches
  answers: { "yes": "kofferdam" }  ← chip activated
```

### Example 2: Tiefe Question

```
QuestionBank (semantic):
  key: "tiefe"
  options: [{ id: "normal" }, { id: "tief" }]

User selects: "tief"
Answers Map: { "tiefe" → "tief" }

Translation:
  questionId: "tiefe" → "cavity_depth"
  optionId: "tief" → "deep"

Canonical: { "cavity_depth" → "deep" }

AnswerMap lookup:
  questionIdPatterns: ["tiefe", "cavity_depth"]
  answers: { "deep": "cp" }  ← chip activated
```

---

## Rules

1. **QuestionBank is semantic** — use descriptive IDs like `isolation`, `kofferdam`
2. **AnswerMap is canonical** — use abstract IDs like `yes`, `no`, `deep`
3. **Translation happens once** — in `resolveActiveChipIds()` before chip selection
4. **Add new treatments** — extend maps in `answerIdTranslator.ts`

---

## Adding New Treatments

1. Create `{treatment}_question_bank.json` with semantic IDs
2. Create `{treatment}_answer_map.json` with canonical patterns
3. Add treatment to `QUESTION_ID_MAP` and `OPTION_ID_MAP` in `answerIdTranslator.ts`
