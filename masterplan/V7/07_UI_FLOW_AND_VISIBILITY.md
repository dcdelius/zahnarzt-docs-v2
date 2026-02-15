# V7 UI Flow and Visibility

## Purpose
Documents state machine and which controls are visible in each state.

---

## State Machine

```
idle ─────┬───► processing ─────► questions ─────► output
          │                              │
          ▼                              ▼
       error ◄─────────────────────── error
```

| State | Trigger | Exit Condition |
|-------|---------|----------------|
| `idle` | Initial | User submits dictation |
| `processing` | Submit | Extraction complete |
| `questions` | Questions generated | All questions answered |
| `output` | Output generated | Reset or new input |
| `error` | Any failure | Reset |

---

## Control Visibility Matrix

| Control | idle | processing | questions | output | error |
|---------|------|------------|-----------|--------|-------|
| **Textarea** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Send Button** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Treatment Selector** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Insurance Selector** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **TextLength Selector** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **ActionDock** | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Processing Spinner** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **QuestionsLayout** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **OutputRenderer** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **WarningCard** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **StepDots** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **HeroSculpture** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Error Message** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Questions State Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [ StepDots: ● ● ○ ]                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │  LEFT COLUMN (55%)  │    │    RIGHT COLUMN (45%)           │ │
│  │                     │    │                                 │ │
│  │  Step Label         │    │  ┌─────────────────────────────┐│ │
│  │  "Schritt 2 von 3"  │    │  │    QuestionsCard           ││ │
│  │                     │    │  │    (glass card)             ││ │
│  │  Hero Tooth         │    │  │                             ││ │
│  │  "Zahn 36"          │    │  │  Header: "Rückfragen"      ││ │
│  │                     │    │  │  Count: "5 von 5 offen"    ││ │
│  │  Summary Chips      │    │  │                             ││ │
│  │  [m o d]            │    │  │  Section: "Befund"         ││ │
│  │  [Versicherung GKV] │    │  │  - Sensibilitätsprobe?    ││ │
│  │                     │    │  │  - Perkussionsprobe?      ││ │
│  │  Primary CTA        │    │  │                             ││ │
│  │  [Weiter]           │    │  │  Section: "Prozess"        ││ │
│  │                     │    │  │  - Trockenlegung?          ││ │
│  │                     │    │  │                             ││ │
│  └─────────────────────┘    │  └─────────────────────────────┘│ │
│                              └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Output State Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [ StepDots: ● ● ● ]                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  OutputRenderer                                              ││
│  │                                                              ││
│  │  Sections:                                                   ││
│  │  - DOKUMENTATION                                             ││
│  │  - ABRECHNUNG                                                ││
│  │  - HINWEISE                                                  ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Controls                                                    ││
│  │  [Insurance: GKV | PKV]  [TextLength: Kurz | Mittel | Lang] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  WarningCards (if any)                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ActionDock: [Copy] [Reset] [Export]                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (>768px)
- Questions: Two-column grid (55%/45%)
- Output: Single column, full width

### Mobile (<768px)
- Questions: Single column, stacked (Hero Block → Card)
- Output: Single column, full width
