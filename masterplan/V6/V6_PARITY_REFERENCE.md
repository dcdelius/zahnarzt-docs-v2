# V6 Parity Reference

## Purpose
Documents V6 patterns worth preserving in V7. Reference only — no implementation here.

---

## V6 Questions State Layout

V6 displayed the following elements during questions:
- **Tooth Number** as hero headline (e.g., "Zahn 36")
- **Surfaces** as chips (e.g., "m o d")
- **Extracted Summary** showing what was detected
- **Questions** in a card/list format
- **Step indicator** ("Schritt 2 von 3")

### V7 Parity Status
| Element | V6 | V7 | Status |
|---------|----|----|--------|
| Tooth headline | ✅ | ✅ QuestionsLayout | ✅ Done |
| Surface chips | ✅ | ✅ SummaryChips | ✅ Done |
| Step label | ✅ | ✅ QuestionsLayout | ✅ Done |
| Glass card | ✅ | ✅ QuestionsCard | ✅ Done |
| Step dots | ✅ | ✅ StepDots | ✅ Done |

---

## V6 Case Data Shape

V6 used `useDocudentV6` hook with this shape:
```typescript
interface ExtractedData {
    tooth: string | null;
    surfaces: string[];
    diagnosis: string | null;
    costs: number | null;
    mentioned: {
        anesthesia?: { type: 'infiltr' | 'leitung' | 'keine' };
        kofferdam?: boolean;
        capping?: { type: 'cp' | 'p' };
        vitality?: '+' | '-';
        percussion?: '+' | '-';
        material?: string;
    };
    gaps: string[];
}
```

### V7 Contracts Alignment
- `contracts/extraction.ts` defines `ExtractedData` with `Field<T>` wrappers
- V6 shape is simpler (no Field wrapper)
- **Gap**: V6 services still use V6 shape, not contracts

---

## V6 Answer Strategy

V6 answers were stored differently:
- Direct mutation of `mentioned` object
- No intermediate answers Map

V7 uses:
- `answers: Map<string, unknown>` in useV7Pipeline
- Translation layer for chipResolver

---

## Must-Keep from V6

1. **Question prompts** — emoji prefixes for visual hierarchy
2. **Option labels** — descriptive German labels
3. **Extraction patterns** — regex fallbacks work well
4. **Chip definitions** — fuellung_unified.json structure

---

## Don't Copy from V6

1. **Direct state mutation** — use answers Map
2. **Inline types** — use contracts
3. **Hardcoded billing logic** — use treatmentEngine
4. **Mixed concerns in hooks** — separate UI/logic
