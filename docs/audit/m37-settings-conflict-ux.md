# M37 Settings Conflict UX

## Summary

| Metric | Value |
|--------|-------|
| Backend Logic | conflictResolution.ts |
| UI Components | 2 |
| Gates | 3 |

---

## Conflict Rules

[conflictResolution.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/settings/conflictResolution.ts)

### Priority Order

1. **Dictation negation** ("ohne/kein") → always wins
2. **Explicit dictation value** → wins over settings
3. **User edit** → wins over settings
4. **Settings value** → fills ambiguous
5. **Default** → fallback

### Example: "ohne Betäubung" with defaultLAType

```typescript
resolveFactValue({
    dictationNegated: true,
    settingsValue: 'infiltration',
    defaultValue: 'none',
})
// → { value: 'none', source: 'dictation', reason: 'negation_overrides_default' }
```

---

## Critical Askbacks

Cannot be skipped by settings:

| Askback ID | Why Critical |
|------------|--------------|
| endo_canal_count | Must know count |
| endo_tooth | Must know tooth |
| fuellung_tooth | Must know tooth |
| fuellung_surface | Must know surface |

---

## UI Components

### V10SegmentPreview

[V10SegmentPreview.tsx](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10SegmentPreview.tsx)

- Shows 1-3 cards with treatment + tooth + negations
- `v10-segment-preview`, `v10-segment-card-<id>`

### V10AskbackExplain

[V10AskbackExplain.tsx](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10AskbackExplain.tsx)

- "?" tooltip per question with whyAsked
- `V10SkippedAskbacksList` in debug drawer

---

## Provenance

```typescript
interface AskbackProvenance {
    id: string;
    whyAsked?: string;      // "No value in dictation or settings"
    whySkipped?: string;    // "Filled from settings: infiltration"
    sourceRefs?: string[];  // ['settings']
    scope?: TreatmentType;  // 'endo' | 'fuellung'
}
```

---

## Gates

| Gate | Tests |
|------|-------|
| gate-m37-negation-overrides-settings | Negation wins |
| gate-m37-skipaskbacks-cannot-skip-critical | Critical protected |
| gate-m37-provenance-has-whyAsked-whySkipped | Reasons tracked |

---

## Commands

```bash
# M37 only
npx vitest run src/docudent/__tests__/gates/gate-m37*.test.ts --reporter=verbose

# All M-gates
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot
```

---

## Files

```
src/docudent/v10/settings/conflictResolution.ts
src/docudent/v10/components/V10SegmentPreview.tsx + .css
src/docudent/v10/components/V10AskbackExplain.tsx + .css
src/docudent/__tests__/gates/gate-m37-*.test.ts (3 files)
docs/audit/m37-settings-conflict-ux.md
```
