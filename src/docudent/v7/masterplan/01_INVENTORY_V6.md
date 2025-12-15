# V6 Inventory

## Purpose
Key V6 files that V7 depends on or should learn from.

---

## Services (Backend)

| File | Purpose | V7 Dependency |
|------|---------|---------------|
| `v6/services/extractionService.ts` | LLM/Regex extraction | ✅ Used by V7 pipeline |
| `v6/services/questionService.ts` | Question generation | ✅ Used by V7 pipeline |
| `v6/services/outputService.ts` | Output orchestration | ✅ Used by V7 pipeline |
| `v6/services/toothNormalizer.ts` | Tooth number normalization | ✅ Used by extraction |

## Hooks

| File | Purpose | V7 Dependency |
|------|---------|---------------|
| `v6/hooks/useDocudentV6.ts` | V6 state management | ❌ Not used (V7 has own hook) |

## Components

| File | Purpose | V7 Parity |
|------|---------|-----------|
| `v6/components/QuestionsStep.tsx` | Question UI | ✅ Similar to QuestionsLayout |
| `v6/components/SummaryCard.tsx` | Extracted data display | ✅ Similar to SummaryChips |
| `v6/components/ChipsGrid.tsx` | Chip selection | ❌ N/A in V7 |

---

## Key V6 Patterns to Preserve

### 1. Question Display
- Emoji prefix for visual hierarchy
- Category grouping (forensic, mkv, upsell)
- Glass card styling

### 2. Summary Display
- Tooth number as hero
- Surfaces as chips
- Insurance type indicator

### 3. Answer Strategy
- Direct mutation of `mentioned` object (anti-pattern)
- V7 improves with immutable Map

---

## V6 Type Definitions (Legacy)

```typescript
// From useDocudentV6.ts — NOT contracts SSOT
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

**Migration Path**: V6 services should import from `contracts/extraction.ts`
