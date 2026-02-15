# M35 Multi-Instance UX

## Summary

| Metric | Value |
|--------|-------|
| UI Components | 3 |
| Hooks | 1 |
| E2E Tests | 3 |

---

## Components

### V10MultiQuestionsPanel

[V10MultiQuestionsPanel.tsx](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10MultiQuestionsPanel.tsx)

Per-instance question grouping:
- Each instance (Endo/Füllung) shown as separate section
- Instance badge with treatment color
- Per-instance submit button
- "Submit All" for multi-treatment

Data test IDs:
- `v10-multi-questions-panel`
- `v10-instance-card-endo`, `v10-instance-card-fuellung`
- `v10-question-<id>-instance-<id>`
- `v10-submit-answers-instance-<id>`

### V10InstanceSummary

[V10InstanceSummary.tsx](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10InstanceSummary.tsx)

Mini-cards showing:
- Treatment type + tooth
- State (idle/questions/output/error)
- Chips count
- Billing count

### V10InstanceFilter

[V10InstanceFilter.tsx](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10InstanceFilter.tsx)

Debug drawer filter:
- All / Endo / Füllung buttons
- `v10-debug-instance-filter` testid

---

## State Contract

```typescript
type AnswersByInstance = Record<string, Record<string, unknown>>;

// Single mode: instanceId = "single"
// Multi mode: instanceId = "endo" | "fuellung" | "endo:14" etc.
```

[useInstanceAnswers.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/hooks/useInstanceAnswers.ts)

---

## E2E Tests

[v10-multiinstance.e2e.spec.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/__e2e__/v10-multiinstance.e2e.spec.ts)

1. `multitreatment_same_tooth_routes_answers_correctly`
2. `multitreatment_negation_does_not_leak_in_ui`
3. `debug_drawer_filters_by_instance`

---

## Files

```
src/docudent/v10/components/V10MultiQuestionsPanel.tsx
src/docudent/v10/components/V10MultiQuestionsPanel.css
src/docudent/v10/components/V10InstanceSummary.tsx
src/docudent/v10/components/V10InstanceSummary.css
src/docudent/v10/components/V10InstanceFilter.tsx
src/docudent/v10/components/V10InstanceFilter.css
src/docudent/v10/hooks/useInstanceAnswers.ts
src/docudent/v10/__e2e__/v10-multiinstance.e2e.spec.ts
docs/audit/m35-multi-instance-ux.md
```
