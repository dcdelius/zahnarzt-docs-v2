# V7 Pipeline — Tracing & Debug

## Current Debug Capabilities

### 1. V7 Debug Flag

**Enable**: 
```javascript
localStorage.setItem('V7_DEBUG', 'true');
```

**Location**: `v7/pipeline/index.ts`

**Checkpoints**:
```
CHECKPOINT 1 - Extracted summary: tooth, surfaces, diagnosis, costs, gaps
CHECKPOINT 2 - Questions generated: questionIds, count
CHECKPOINT 3 - Answer Mapping summary: rawAnswers, canonicalAnswers, unmappedCount
CHECKPOINT 4 - Output summary: sectionCount, warningCount, hasPlaceholders, placeholders
```

---

### 2. V6 Service Logs

These always log (not gated):

| Log Prefix | File | What It Shows |
|------------|------|---------------|
| `[V6 Extract]` | `extractionService.ts` | Raw + normalized dictation |
| `[V6 Output]` | `outputService.ts` | Input params, resolved chips, engine result |
| `[QuestionService V2]` | `questionService.ts` | Treatment, active chips, generated question IDs |
| `[ChipResolver]` | `chipResolver.ts` | Warnings when map not found |
| `[AnswerTranslator]` | `answerIdTranslator.ts` | Original → canonical translation (DEV only) |

---

### 3. What Traces Are Missing

| Missing Trace | Why Needed | Proposed Location |
|---------------|------------|-------------------|
| `translateAnswers` input/output | To verify ID translation | `chipResolver.ts` line 214 |
| Chip matching details | Why a chip was/wasn't activated | `applyAnswersToChipSelection` |
| Placeholder substitution | Confirm `{material}` → "MTA" | `renderBehandlung` |
| Warning generation reasons | Why "Zahnangabe fehlt" fired | `outputComposer.ts` |
| Engine gate decisions | Why engine was/wasn't run | `treatmentEngine.ts` (future) |

---

## Full Debug Snapshot Definition

A complete debug snapshot should contain:

```typescript
interface DebugSnapshot {
    // Input
    dictation: string;
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    
    // Extraction
    extracted: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
        costs: number | null;
        mentioned: Record<string, any>;
        gaps: string[];
    };
    
    // Questions
    questions: Array<{
        id: string;
        category: string;
        options: string[];
    }>;
    
    // Answers
    rawAnswers: Record<string, unknown>;
    translatedAnswers: Record<string, unknown>;  // From answerIdTranslator
    
    // Chips
    inferredChipIds: string[];       // From extraction
    answeredChipIds: string[];       // From answers
    finalActiveChipIds: string[];    // After deduplication
    
    // Output
    sections: Array<{
        id: string;
        content: string;
        hasPlaceholders: boolean;
    }>;
    billingCodes: string[];
    warnings: Array<{
        id: string;
        description: string;
        reason: string;  // WHY this warning fired
    }>;
    
    // Meta
    timestamp: string;
    testCase?: string;  // If from golden test
}
```

---

## How to Capture a Snapshot

Currently: Manual console inspection.

Future: Add `captureDebugSnapshot()` function that returns the above structure.

---

## Console Commands for Debugging

```javascript
// Enable V7 debug (summary logs)
localStorage.setItem('V7_DEBUG', 'true');

// Check current state
console.log(localStorage.getItem('V7_DEBUG'));

// Disable
localStorage.removeItem('V7_DEBUG');

// Force re-run (if using React)
// Manually trigger dictation input change
```

---

## V7_TRACE — Full Pipeline Trace (NEW)

### Enable

```javascript
localStorage.setItem('V7_TRACE', 'true');
```

### Where to Look

Browser DevTools → Console. Logs appear as collapsible groups:

```
▶ [V7 TRACE] PIPELINE_INPUT
▶ [V7 TRACE] EXTRACTED
▶ [V7 TRACE] QUESTIONS
▶ [V7 TRACE] NORMALIZED_ANSWERS
▶ [V7 TRACE] OUTPUT_INPUT
▶ [V7 TRACE] OUTPUT_RESULT
```

### Trace Stages

| Stage | Shows |
|-------|-------|
| `PIPELINE_INPUT` | dictation, insuranceType, hasMKV, textLength, answers |
| `EXTRACTED` | tooth, surfaces, diagnosis, costs, mentioned, gaps |
| `QUESTIONS` | count, ids[], categories[] |
| `NORMALIZED_ANSWERS` | canonicalAnswers, unmapped questions/options |
| `OUTPUT_INPUT` | extracted (full), answers (raw), insuranceType, hasMKV, mkvBetrag |
| `OUTPUT_RESULT` | sectionCount, billingCodeCount, warningCount, sections[], warnings[], hasPlaceholders |

### How to Copy Trace Output

1. Enable trace: `localStorage.setItem('V7_TRACE', 'true')`
2. Run a dictation
3. In Console, right-click → "Save as..." to export log
4. Or expand each group, right-click → "Copy object"

### Disable

```javascript
localStorage.removeItem('V7_TRACE');
```
