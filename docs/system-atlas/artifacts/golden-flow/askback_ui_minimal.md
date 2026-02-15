# G110 — Askback UX Minimal Contract

**Purpose:** Define the minimal askback UI — no design, just function

---

## Askback Display Contract

### Required Elements

| Element | Purpose | Implementation |
|---------|---------|----------------|
| **Question Text** | What we're asking | `question.label` or `question.question` |
| **Status Badge** | answered / unanswered | Visual indicator (dot, icon, text) |
| **Answer Options** | User choices | Buttons from `question.options` |
| **Chip Effect** | What this answer does | "→ aktiviert Chip X" |

### Status States

| State | Visual | Meaning |
|-------|--------|---------|
| `unanswered` | Red/amber indicator | Required, not yet answered |
| `answered` | Green indicator | User has responded |
| `skipped` | Grey/muted | Optional, user skipped |

---

## Answer Options Contract

### For Single-Choice Questions

```tsx
<div className="askback-options">
    {question.options.map(opt => (
        <button 
            key={opt.id}
            onClick={() => onAnswer(opt.dataValue)}
            className={currentValue === opt.dataValue ? 'active' : ''}
        >
            {opt.label}
        </button>
    ))}
</div>
```

### Default Fallback (Ja/Nein)

If no options provided:
- "Ja" → `true`
- "Nein" → `false`
- "Überspringen" (optional) → `null`

---

## Chip-Effect Feedback

### Display Format

```
Frage: "Wurde Adhäsivtechnik angewendet?"
├── [Ja] → aktiviert: mehrschicht
└── [Nein] → aktiviert: komposit_basic
```

### Implementation Location

`QuestionsFlowV2.tsx` or new `AskbackRow` component.

### Data Source

From `askbacks.reference.json`:
```json
{
    "id": "adhesive_technique",
    "answers": {
        "yes": { "chips_add": ["mehrschicht"] },
        "no": { "chips_add": ["komposit_basic"] }
    }
}
```

---

## Not In Scope

- ❌ New design system
- ❌ Animations
- ❌ Refactoring existing components
- ❌ Shadcn or other UI libraries

---

## Acceptance Criteria

1. Zahnarzt sees: "Warum werde ich das gefragt?"
2. Zahnarzt understands: "Was passiert wenn ich X klicke?"
3. Status is visually clear
