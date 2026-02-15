# V7 Debug Tracing

## Purpose
Documents what to log in DEV mode for debugging, and where to hook in.

---

## Logging Strategy

### Environment Guard
All debug logs MUST be guarded:
```typescript
if (import.meta.env.DEV) {
    console.debug('[Module] Message', data);
}
```

### Log Prefix Convention
| Module | Prefix |
|--------|--------|
| Extraction | `[V6 Extract]` |
| Question Gen | `[QuestionService]` |
| Answer Translator | `[AnswerTranslator]` |
| Chip Resolver | `[ChipResolver]` |
| Output Composer | `[OutputComposer]` |
| Pipeline | `[V7 Pipeline]` |

---

## Reality Trace Points

### 1. Post-Extraction
**Location**: `extractionService.ts:50-51`
```typescript
console.log('[V6 Extract] Original:', dictation);
console.log('[V6 Extract] Normalized:', normalizedText);
console.log('[V6 Extract] LLM result:', llmResult);
```

**What to check**:
- `tooth` extracted correctly
- `surfaces` parsed as array
- `mentioned.*` fields populated

### 2. Post-Question Generation
**Location**: `questionService.ts` (add if missing)
```typescript
if (import.meta.env.DEV) {
    console.log('[QuestionService] Generated:', questions.map(q => q.id));
}
```

**What to check**:
- Question IDs match QuestionBank keys
- Category distribution (forensic, mkv, upsell)

### 3. Post-Answer Translation
**Location**: `answerIdTranslator.ts:194`
```typescript
if (import.meta.env.DEV) {
    console.debug('[AnswerTranslator] Translated:', {
        original: Object.fromEntries(answers),
        canonical: Object.fromEntries(canonicalAnswers)
    });
}
```

**What to check**:
- Question IDs translated correctly
- Option IDs translated correctly
- No "unmapped" warnings

### 4. Pre-Chip Resolution
**Location**: `chipResolver.ts` (in resolveActiveChipIds)
```typescript
console.log('[ChipResolver] Resolved chip IDs:', activeChipIds);
```

**What to check**:
- Expected chips present (kofferdam, cp, etc.)
- No unexpected chips

### 5. Pre-Output Composition
**Location**: `outputService.ts:66-72`
```typescript
console.log('[V6 Output] Input:', {
    extracted,
    answers: Object.fromEntries(answers),
    insuranceType,
    textLength,
    hasMKV
});
console.log('[V6 Output] Resolved chip IDs:', activeChipIds);
```

**What to check**:
- All inputs populated
- Chip IDs match expectations

---

## Debug Snapshot Function

For comprehensive debugging, add this helper:

```typescript
// src/docudent/v7/pipeline/debugSnapshot.ts

export function debugSnapshot(
    label: string,
    data: {
        treatmentId?: string;
        currentState?: string;
        dictation?: string;
        extracted?: unknown;
        answers?: Map<string, unknown>;
        canonicalAnswers?: Map<string, unknown>;
        chips?: string[];
        warnings?: unknown[];
    }
) {
    if (!import.meta.env.DEV) return;

    console.group(`[V7 Snapshot] ${label}`);
    if (data.treatmentId) console.log('treatmentId:', data.treatmentId);
    if (data.currentState) console.log('state:', data.currentState);
    if (data.dictation) console.log('dictation:', data.dictation.slice(0, 80));
    if (data.extracted) console.log('extracted:', data.extracted);
    if (data.answers) console.log('answers:', Object.fromEntries(data.answers));
    if (data.canonicalAnswers) console.log('canonical:', Object.fromEntries(data.canonicalAnswers));
    if (data.chips) console.log('chips:', data.chips);
    if (data.warnings) console.log('warnings:', data.warnings);
    console.groupEnd();
}
```

---

## Common Debug Scenarios

### Scenario: "Zahnangabe fehlt" despite input
1. Check `[V6 Extract]` logs → `tooth` should be set
2. If null, extraction failed → check regex/LLM
3. If set, check it flows to `outputComposer` → `extractedDataForComposer.tooth`

### Scenario: Answers don't affect chips
1. Check `[AnswerTranslator]` → semantic→canonical mapping
2. Check `[ChipResolver]` → canonical answers reach `applyAnswersToChipSelection`
3. Check AnswerMap JSON → `questionIdPatterns` must include the canonical ID

### Scenario: Missing billing codes
1. Check `chips[]` in output log
2. Check chip definitions in `fuellung_unified.json`
3. Check `treatmentEngine.processChipsToBilling()` output
