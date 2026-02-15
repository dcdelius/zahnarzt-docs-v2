# V8 Frontend Wiring Plan

**Goal**: Wire V8 frontend to V10 pipeline (minimal-invasive)

---

## Current State (Already Done ✅)

| Layer | Status | Evidence |
|-------|--------|----------|
| V7 shim | ✅ | `v7/pipeline/index.ts` → `runV10` |
| Adapters | ✅ | `toV10Input.ts`, `fromV10Output.ts` |
| Single run | ✅ | `runPipeline()` → `runV10()` |
| Multi run | ✅ | `createInstancesAndRun()` → `runV10Bundle()` |
| Questions | ✅ | `QuestionsFlowV2` + bundle support |
| Output | ✅ | `OutputFlow` + combinability |

---

## Gap Analysis

### A) Bundle Gaps
| Gap | Status | Fix |
|-----|--------|-----|
| Scoped billing dedup | ⚠️ Backend | Already in runV10Bundle |
| UI per-instance billing | ✅ | MultiOutputRenderer |

### B) Scoped Questions Gaps
| Gap | Status | Fix |
|-----|--------|-----|
| Tooth-scope questions | ✅ | QuestionsFlowV2 |
| Instance answers | ✅ | `instanceAnswers` map |

### C) Error State Gaps
| Gap | Status | Fix |
|-----|--------|-----|
| Combinability BLOCK | ⚠️ Partial | Shows error, needs conflict display |
| Unsupported treatment | ✅ | `state === 'unsupported'` |

### D) Debug/Explainability Gaps
| Gap | Status | Fix |
|-----|--------|-----|
| TraceLines viewer | ❌ | New component needed |
| KB meta viewer | ❌ | New component needed |
| ExplainRun viewer | ❌ | New component needed |

---

## 3-Stage Wiring Plan

### Stage 1: Minimal (Already Complete)
**Status**: ✅ Done

```
dictation → runV10 → questions → answers → output
```

No changes needed.

---

### Stage 2: Bundle Polish
**Status**: ⚠️ Minor refinements

#### 2.1 Combinability Conflict Display
**File**: `v7/components/OutputFlow.tsx`

```diff
+ import { CombinabilityConflictCard } from './CombinabilityConflictCard';

  {combinability?.verdict === 'block' && (
-   <div>Conflict</div>
+   <CombinabilityConflictCard conflicts={combinability.conflicts} />
  )}
```

**New Component**: `v7/components/CombinabilityConflictCard.tsx`
- Props: `{ conflicts: CombinabilityConflict[] }`
- Shows: ruleId, codesInvolved, scope, reason

---

### Stage 3: Debug/Explainability
**Status**: ❌ Not started

#### 3.1 Trace Viewer
**New File**: `v7/components/debug/TraceViewer.tsx`

```typescript
interface Props {
    traceLines: Array<{ key: string; value: unknown }>;
}

export function TraceViewer({ traceLines }: Props) {
    return (
        <div data-testid="trace-viewer">
            {traceLines.map((line, i) => (
                <div key={i}>{line.key}: {JSON.stringify(line.value)}</div>
            ))}
        </div>
    );
}
```

#### 3.2 ExplainRun Viewer
**New File**: `v7/components/debug/ExplainRunViewer.tsx`

```typescript
import { explainRunV10 } from '@/docudent/v10/qa/explainRunV10';

// Calls explainRunV10 and displays report
```

#### 3.3 Integration
**File**: `DocudentV7Page.tsx`

```diff
+ const [showDebug, setShowDebug] = useState(false);

  {currentState === 'output' && (
+   <button onClick={() => setShowDebug(!showDebug)}>Debug</button>
+   {showDebug && <TraceViewer traceLines={result.debug?.v10TraceLines} />}
  )}
```

---

## E2E Tests (Playwright)

### Test 1: Profunda Filling → Output
```typescript
test('fuellung profunda flow', async ({ page }) => {
    await page.goto('/docudent/v7');
    await page.fill('[data-testid="dictation-input"]', 'Füllung Zahn 36 mo Komposit Caries profunda');
    await page.click('[data-testid="submit-button"]');
    await page.waitForSelector('[data-testid="questions-panel"]');
    // Answer questions
    await page.click('[data-testid="question-profunda"] [data-testid="answer-ja"]');
    await page.click('[data-testid="complete-questions"]');
    await page.waitForSelector('[data-testid="output-panel"]');
    await expect(page.locator('[data-testid="billing-codes"]')).toContainText('BEMA');
});
```

### Test 2: Endo Core Flow
```typescript
test('endo core flow', async ({ page }) => {
    await page.goto('/docudent/v7');
    await page.click('[data-testid="treatment-selector"] >> text=Endo');
    await page.fill('[data-testid="dictation-input"]', 'Wurzelkanalbehandlung Zahn 46');
    await page.click('[data-testid="submit-button"]');
    await page.waitForSelector('[data-testid="output-panel"]');
});
```

### Test 3: Combinability BLOCK
```typescript
test('combinability block shows error', async ({ page }) => {
    // Setup: fixture with conflicting codes
    await page.waitForSelector('[data-testid="error-panel"]');
    await expect(page.locator('[data-testid="error-panel"]')).toContainText('Konflikt');
});
```

### Test 4: Multi-Tooth Questions
```typescript
test('multi-tooth scoped questions', async ({ page }) => {
    await page.fill('[data-testid="dictation-input"]', 'Füllung Zahn 36 und 46');
    await page.click('[data-testid="submit-button"]');
    await page.waitForSelector('[data-testid="multiinstance-questions-screen"]');
    await expect(page.locator('[data-testid="instance-questions-fuellung-36"]')).toBeVisible();
    await expect(page.locator('[data-testid="instance-questions-fuellung-46"]')).toBeVisible();
});
```

### Test 5: Insurance Toggle
```typescript
test('insurance toggle affects billing', async ({ page }) => {
    await page.click('[data-testid="insurance-selector"] >> text=PKV');
    await page.fill('[data-testid="dictation-input"]', 'Füllung Zahn 36');
    await page.click('[data-testid="submit-button"]');
    await page.waitForSelector('[data-testid="output-panel"]');
    await expect(page.locator('[data-testid="billing-codes"]')).toContainText('GOZ');
});
```

---

## Selector Strategy

| Element | Selector |
|---------|----------|
| Dictation input | `[data-testid="dictation-input"]` |
| Submit button | `[data-testid="submit-button"]` |
| Questions panel | `[data-testid="questions-panel"]` |
| Output panel | `[data-testid="output-panel"]` |
| Error panel | `[data-testid="error-panel"]` |
| Billing codes | `[data-testid="billing-codes"]` |
| Insurance selector | `[data-testid="insurance-selector"]` |
| Treatment selector | `[data-testid="treatment-selector"]` |
| Question answer | `[data-testid="question-{id}"] [data-testid="answer-{value}"]` |
| Instance questions | `[data-testid="instance-questions-{treatmentId}-{tooth}"]` |

---

## Summary

| Stage | Effort | Files |
|-------|--------|-------|
| 1: Minimal | ✅ Done | 0 |
| 2: Bundle Polish | ~2h | 2 new, 1 modify |
| 3: Debug | ~4h | 3 new, 1 modify |
| E2E Tests | ~3h | 1 new spec file |
