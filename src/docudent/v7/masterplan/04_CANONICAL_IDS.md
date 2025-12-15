# Canonical IDs

## Purpose
Define ONE canonical naming scheme for all IDs in the system.

---

## ID Types

| ID Type | Definition | Example |
|---------|------------|---------|
| `treatmentId` | Treatment type identifier | `fuellung`, `krone` |
| `questionId` | Unique question identifier | `vitality`, `isolation` |
| `optionId` | Answer option identifier | `pos`, `neg`, `kofferdam` |
| `chipId` | Chip activation identifier | `kofferdam`, `cp`, `mehrschicht` |
| `dataField` | Path in ExtractedData | `mentioned.vitality`, `mentioned.kofferdam` |

---

## Canonical Naming Rules

### treatmentId
- **Format**: lowercase, no spaces, no special chars
- **Examples**: `fuellung`, `krone`, `wurzelbehandlung`
- **Used in**: file names, loader keys, function params

### questionId
- **Format**: lowercase, underscores allowed
- **Semantic → Canonical mapping**:
  | Semantic (QuestionBank) | Canonical |
  |------------------------|-----------|
  | `vitality` | `vitality` |
  | `percussion` | `percussion` |
  | `isolation` | `kofferdam` |
  | `tiefe` | `cavity_depth` |
  | `material` | `capping` |

### optionId
- **Format**: lowercase, underscores allowed
- **Semantic → Canonical mapping**:
  | Question | Semantic Option | Canonical |
  |----------|----------------|-----------|
  | isolation | `kofferdam` | `yes` |
  | isolation | `relativ` | `no` |
  | tiefe | `tief` | `deep` |
  | tiefe | `normal` | `normal` |
  | vitality | `pos` | `pos` |
  | vitality | `neg` | `neg` |
  | material | `caoh` | `cp` |
  | material | `mta` | `cp` |

### chipId
- **Format**: lowercase, underscores allowed
- **Examples**: `kofferdam`, `cp`, `mehrschicht`, `vipr_pos`, `la_infiltr`
- **Source**: `fuellung_unified.json` chip definitions

### dataField
- **Format**: dot-separated path
- **Examples**: `mentioned.vitality`, `mentioned.kofferdam`, `tooth`, `surfaces`
- **Used in**: QuestionBank `dataField` property

---

## Füllung Examples

### Question: Vitality
```json
{
  "key": "vitality",           // questionId (semantic = canonical)
  "dataField": "mentioned.vitality",
  "options": [
    { "id": "pos", "label": "ViPr +", "dataValue": "+" },
    { "id": "neg", "label": "ViPr −", "dataValue": "-" }
  ]
}
```
- `questionId`: `vitality`
- `optionIds`: `pos`, `neg`
- Answer mapping: `pos` → chip `vipr_pos`

### Question: Isolation (Translation Required)
```json
{
  "key": "isolation",          // semantic questionId
  "dataField": "mentioned.kofferdam",
  "options": [
    { "id": "kofferdam", "label": "Kofferdam", "dataValue": true },
    { "id": "relativ", "label": "Relative", "dataValue": false }
  ]
}
```
- Semantic `questionId`: `isolation`
- Canonical `questionId`: `kofferdam`
- Semantic `optionId`: `kofferdam`, `relativ`
- Canonical `optionId`: `yes`, `no`
- Answer mapping: `yes` → chip `kofferdam`

### Question: Tiefe (Translation Required)
```json
{
  "key": "tiefe",              // semantic questionId
  "dataField": "mentioned.tiefe",
  "options": [
    { "id": "normal", "label": "Normale Tiefe", "dataValue": "normal" },
    { "id": "tief", "label": "Pulpanah", "dataValue": "tief" }
  ]
}
```
- Semantic `questionId`: `tiefe`
- Canonical `questionId`: `cavity_depth`
- Semantic `optionId`: `tief`, `normal`
- Canonical `optionId`: `deep`, `normal`
- Answer mapping: `deep` → chip `cp`

---

## Translation Layer

**File**: `logic/answerIdTranslator.ts`

```typescript
// Question ID translation
translateQuestionId('fuellung', 'isolation') → 'kofferdam'
translateQuestionId('fuellung', 'tiefe') → 'cavity_depth'

// Option ID translation
translateOptionId('fuellung', 'isolation', 'kofferdam') → 'yes'
translateOptionId('fuellung', 'tiefe', 'tief') → 'deep'

// Full answers Map translation
translateAnswers('fuellung', answers) → canonicalAnswers
```

---

## ID Flow Diagram

```
QuestionBank.key (semantic)
    ↓ used as
question.id in DynamicQuestion
    ↓ stored in
answers Map (key = semantic questionId)
    ↓ translated by
answerIdTranslator.translateAnswers()
    ↓ becomes
canonicalAnswers Map (key = canonical questionId)
    ↓ matched by
answer_map.questionIdPatterns
    ↓ activates
chipId from answer_map.answers
    ↓ processed by
treatmentEngine/outputComposer
```
