# V10 UI Render Audit (M52 Phase 1)

## State Variables Affecting Render

| Variable | Source | Purpose |
|----------|--------|---------|
| `currentState` | `useV7Pipeline()` | Primary state: idle/running/questions/output/error/unsupported/multi_output |
| `isProcessing` | `useV7Pipeline()` | Shows spinner, **checked BEFORE currentState** |
| `questions` | `useV7Pipeline()` | Questions array for QuestionsFlow |
| `output` | `useV7Pipeline()` | Output object for OutputFlow |
| `result` | `useV7Pipeline()` | Raw pipeline result (contains questionBundle) |
| `error` | `useV7Pipeline()` | Error message string |
| `multiResult` | `useV7Pipeline()` | Multi-treatment result |

## Render Decision Logic (renderContent)

[DocudentV10Page.tsx:131-388](file:///Users/david/dokumaster-ui/src/docudent/v10/pages/DocudentV10Page.tsx#L131-L388)

```
if (isProcessing)           → Spinner            // L142
if (currentState === 'unsupported')  → Unsupported panel  // L173
if (currentState === 'error' && error)  → Error panel    // L203
if (currentState === 'questions') {
    if (result?.questionBundle)  → QuestionsFlowV2      // L252
    if (questions?.length > 0)   → QuestionsFlow        // L265
    else                         → ⚠️ FALLBACK WARNING  // L287
}
if (currentState === 'multi_output' && multiResult)  → MultiOutput  // L329
if (currentState === 'output' && output)  → OutputFlow              // L338
```

## ⚠️ SSOT Violations Found

### 1. Double-Gate on Questions State (L242-325)
**Problem:** `currentState === 'questions'` then checks `questions.length > 0`
- If `questions.length === 0`, shows warning fallback instead of error state
- This is a **heuristic** not strict SSOT

### 2. isProcessing Checked Before State (L142)
**Problem:** `isProcessing` bypasses `currentState` logic
- Could cause race: spinner shown even when state is already 'output'

### 3. Output Gate Double-Checks (L338)
**Problem:** `currentState === 'output' && output`
- If state is 'output' but `output` object is null, nothing renders

## "Keine abrechnungsrelevanten" Source

[OutputFlow.tsx:348](file:///Users/david/dokumaster-ui/src/docudent/v7/components/OutputFlow.tsx#L348)

```tsx
// No billing codes - show calm message with diagnostics
Keine abrechnungsrelevanten Positionen ermittelt.
```

This is NOT a fallback bug - it appears when `output.billingCodes.length === 0` in valid output state.

## Overlay/Fixed Layers

| Line | Type | Z-Index | PointerEvents |
|------|------|---------|---------------|
| L400 | HeroSculpture wrapper | 0 | **none** ✅ |
| L445 | Top controls cluster | 50 | not set ⚠️ |
| L494 | Content container | 10 | relative |
| L537 | Content area | 10 | relative |
| L589 | Debug drawer | 90 | fixed |

**Risk:** L445 (controls cluster) at z-index 50 without pointer-events restriction could block content below.

## "Bearbeiten" Wiring Issue

[DocudentV10Page.tsx:344](file:///Users/david/dokumaster-ui/src/docudent/v10/pages/DocudentV10Page.tsx#L344)

```tsx
<OutputFlow
    onEdit={goToQuestions}  // ← NOT Review step!
/>
```

**Problem:** `goToQuestions` sets `result.state = 'questions'`, not navigating to Review step.
- V10Stepper exists but is NOT used on this page
- V10ReviewStep exists but is NOT integrated

## Summary of Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| Questions double-gate | Medium | Normalize to UiModel single state |
| isProcessing bypass | Low | State machine should be primary |
| onEdit→goToQuestions not Review | High | Wire to V10Stepper/ReviewStep |
| Controls z-index 50 | Low | Verify doesn't block content |
| No UiModel SSOT | High | Create normalized render model |
