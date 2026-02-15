# Medical Layer Ownership Policy

> **SSOT**: `core/medical/` is the Single Source of Truth for medically-required askbacks.

## Layer Responsibilities

### SANITIZE
- **Purpose**: Clean raw dictation input
- **Forbidden**: Any medical logic, askback decisions, question triggers

### EXTRACT
- **Purpose**: Parse dictation into structured facts (ExtractedDataV2)
- **Forbidden**: Deciding which questions to ask, medical validation

### MEDICAL (SSOT for Askbacks)
- **Purpose**: Derive medically-required askbacks + findings from extracted facts
- **Owns**: `minimalDatasetMet`, `hardAskbacks`, `softAskbacks`, `findings`
- **Input**: `ExtractedDataV2`
- **Output**: `MedicalResult`
- **Forbidden**: Rendering questions, billing decisions, patient data

### ASK
- **Purpose**: Render question IDs into UI-ready question objects
- **Input**: Askback IDs from MEDICAL + rule-triggered questions
- **Forbidden**: Deciding medical necessity (that's MEDICAL's job)
- **Rule**: MedicalAskbacks ALWAYS render; `question_bank.when` does NOT suppress them

### GATE
- **Purpose**: Validate output before rendering
- **Forbidden**: Generating askbacks, modifying medical decisions

### BILLING
- **Purpose**: Calculate billing codes from structured facts + answers
- **Input**: Finalized answers, extracted data
- **Forbidden**: Triggering medical questions, modifying medical askbacks

### COMPOSE
- **Purpose**: Generate final documentation text
- **Forbidden**: Any question/askback logic

---

## Override Rules

### Medical Askbacks Override `question_bank.when`

The `when` clause in question banks (e.g., `noneKeywords`, `requiresAnswers`, `anyKeywords`) is for **UI hints and heuristics only**.

**When MEDICAL says ask, we ask.**

```typescript
// ❌ WRONG: Checking when-clause for medical askbacks
if (askback.id && !evaluateWhenClause(def.when, dictation)) {
    skip(); // WRONG!
}

// ✅ CORRECT: Medical askbacks always render
if (askback.id) {
    questions.push(definitionToQuestion(def));
}
```

### Exception: `settingsSkip`

User settings can suppress questions (e.g., default spuelprotokoll value). This is the ONLY override allowed.

```json
{
    "settingsSkip": {
        "settingsPath": "endo.defaults.spuelprotokoll",
        "skipIfNot": "fragen"
    }
}
```

---

## Examples

| Question ID | Source | Can `when` suppress? | Can `settingsSkip` suppress? |
|-------------|--------|---------------------|------------------------------|
| `endo.endo_step` | MEDICAL hardAskback | ❌ NO | ❌ NO (core question) |
| `endo.kanalzahl` | MEDICAL hardAskback | ❌ NO | ❌ NO (core question) |
| `endo.spuelprotokoll` | MEDICAL softAskback | ❌ NO | ✅ YES (user default) |
| `endo.isolation` | MEDICAL softAskback | ❌ NO | ✅ YES (if configured) |
| `fuellung.mehrschicht` | Rule-triggered | ✅ YES (heuristic) | ✅ YES |

---

## Invariants

1. **No duplicate askback logic** outside `core/medical/`
2. **Medical IDs are namespaced**: `{treatmentId}.*`
3. **Zero patient data** in MEDICAL layer
4. **Deterministic**: Pure functions, no LLM calls
5. **Tests lock behavior**: `gate-medical-*.test.ts`

---

## P7: Presentation Policy (Progressive Disclosure)

### Purpose

The Presentation Policy (`questionPresentationPolicy.ts`) controls **how** questions are displayed, not **which** questions exist. It lives in the ASK/UI layer.

### Allowed

- Grouping questions into `required` / `optionalVisible` / `optionalHidden`
- Respecting `docMode`: fast/balanced/forensic
- Soft cap (`softAskbacksMaxVisible`) for UX optimization

### Forbidden

- Deleting questions (set equality must hold)
- Making medical necessity decisions
- Filtering based on `question_bank.when`
- Suppressing HARD askbacks under any circumstance

### DocMode Behavior

| Mode | HARD | SOFT |
|------|------|------|
| `fast` | Always visible | All hidden (collapsed) |
| `balanced` | Always visible | All hidden (collapsed) |
| `forensic` | Always visible | All visible (expanded) |

### Set Equality Invariant

```
(optionalVisible ∪ optionalHidden) === original soft askbacks
```

The policy NEVER removes questions — only regroups them.

### Tracing

Presentation counts (no PII):
- `requiredCount`, `optionalVisibleCount`, `optionalHiddenCount`, `docMode`

---

## P10: Value Normalization

### Endo Step Normalization

The `question_bank` uses UI-friendly values (`endo_start`, `endo_complete`) while the medical matrix expects canonical values (`start`, `complete`).

**Normalization is handled in `buildEndoCtx()` via `normalizeEndoStep()`.**

| Source | Raw Value | Canonical |
|--------|-----------|-----------|
| question_bank | `endo_start` | `start` |
| question_bank | `endo_interim` | `interim` |
| question_bank | `endo_complete` | `complete` |
| extraction | `trepanation` | `start` |
| extraction | `wurzelfüllung` | `complete` |

### Gate Protection

- `gate-endo-step-normalization.test.ts` — ensures normalization works
- `gate-question-bundle-integration.test.ts` — ensures bundle structure is correct

**INVARIANT:** Unknown values normalize to `null`, not silent pass-through.
