# Docudent Architecture — V7 Jeton + Canonical Code Framework

**Last Updated**: 2024-12-18  
**Status**: Production-ready V7 shell + Endo/Filling canonical framework

---

## Executive Summary

Docudent is a dental documentation system with:
- **V7 Jeton UI**: Premium shell with sidebar navigation, motion, and role-based routing
- **Canonical Code Framework**: Domain-agnostic system for deterministic documentation
- **Zero LLM Runtime**: All processing is deterministic regex/keyword parsing

### Key Principles
1. **Codes are SSOT** — German labels are derived, never stored
2. **Deterministic parsing** — No LLM in critical path
3. **Playbook-driven questions** — Questions have code options, not label strings
4. **Golden vector testing** — Regression-locked by real-world test cases

---

## 1. Frontend Entrypoint & Routing

### Entrypoint Chain

```
main.jsx
  └── BrowserRouter
        └── AuthProvider
              └── UserProvider
                    └── App.jsx (routing)
```

### Routing Architecture

```
App.jsx Routes
├── /docudent        → V7ShellEntry (OUTSIDE legacy Layout)
├── /docudent/*      → V7ShellEntry (catches all V7 routes)
│
└── <Layout>         → Legacy wrapper (green/orange gradient)
    ├── /            → Login
    ├── /home        → HomePage  
    ├── /docudent/v6 → DocudentV6Page
    └── /docudent/v5 → DocudentV5Page
```

**Critical**: V7 routes are mounted **OUTSIDE** the legacy `<Layout>` component to avoid style conflicts.

### Files
| File | Role |
|------|------|
| `src/main.jsx` | React entrypoint, mounts App with providers |
| `src/App.jsx` | Root router, V7 outside Layout |
| `src/components/Layout.jsx` | Legacy layout with gradient (V5/V6 only) |

---

## 2. V7 Jeton Shell System

### Architecture

```
V7ShellEntry.tsx
├── MockAuthProvider (dev auth context)
├── Sidebar (260px, glass effect, motion)
│   ├── Logo
│   ├── Navigation.tsx (grouped nav from routes.ts)
│   └── Footer (version badge, role)
├── Header (64px, practice ID, user avatar)
└── Content (Routes from routes.ts)
```

### SSOT Files

| File | Purpose |
|------|---------|
| `v7/app/routes.ts` | **SSOT** for all V7 routes (paths, components, visibility, nav groups) |
| `v7/app/Navigation.tsx` | Renders nav from routes.ts with groups and badges |
| `v7/app/designTokens.ts` | Jeton tokens: colors, gradients, motion, typography |
| `v7/app/V7ShellEntry.tsx` | Shell integration with main router |

### Route Registry (routes.ts)

```typescript
// WORKFLOW group
/dashboard    → DashboardPage
/dictation    → DictationPage  
/cases        → CasesPage

// ORGANISATION group
/settings     → SettingsPage
/team         → TeamPage

// FINANCE group  
/billing      → BillingBetaPage (badge: 'beta')

// SYSTEM group
/admin        → AdminPage (software_admin only)
```

### V7 Pages

| Page | File | Purpose |
|------|------|---------|
| Dashboard | `pages/DashboardPage.tsx` | Hero + quick actions + activity |
| Dictation | `pages/DictationPage.tsx` | Dictation input |
| Cases | `pages/CasesPage.tsx` | Case list/pipeline |
| Settings | `pages/SettingsPage.tsx` | User/practice settings |
| Team | `pages/TeamPage.tsx` | Team management |
| Billing | `pages/BillingBetaPage.tsx` | Billing beta |

### Recipe: Adding a New V7 Page

1. **Create page component**
   ```bash
   src/docudent/v7/pages/NewFeaturePage.tsx
   ```

2. **Register in routes.ts**
   ```typescript
   // In ROUTES array:
   {
       path: '/new-feature',
       label: 'New Feature',
       component: lazy(() => import('../pages/NewFeaturePage')),
       visibleTo: ['org_admin', 'practice_admin'],
       navGroup: 'workflow',
       order: 3,
       badge: 'beta',  // optional
   }
   ```

3. **Navigation auto-updates** (reads from routes.ts)

4. **Verify**: Visit `/docudent/new-feature`

---

## 3. Canonical Code Framework

### Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│  CODES are SSOT → Labels are derived at render time             │
│  Parser extracts signals → Playbook asks questions → Codes out  │
│  Renderer maps codes → German labels → Never stored             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
RAW DICTATION
    │
    ▼
┌─────────────────────┐
│ Signal Parser       │  ← Deterministic: regex/keywords only
│ (endoSignalParser,  │     NO LLM
│  fillingSignal...)  │
└─────────────────────┘
    │
    ▼ Signals (booleans, hints)
┌─────────────────────┐
│ Playbook            │  ← Questions have CODE options
│ (endoPlaybookV1,    │     e.g., options: ['DEVIATION_PAIN', 'DEVIATION_SWELLING']
│  fillingPlaybook)   │
└─────────────────────┘
    │
    ▼ Answers (codes)
┌─────────────────────┐
│ answerNormalization │  ← Maps questionId → field name
└─────────────────────┘
    │
    ▼ Normalized Fields (codes)
┌─────────────────────┐
│ fieldValidation     │  ← REJECTS label strings
│ (validateNormalized │     REJECTS invalid codes
│  Fields)            │     Uses vocabRegistry
└─────────────────────┘
    │
    ▼ Validated Fields (codes)
┌─────────────────────┐
│ Text Renderer       │  ← Maps codes → German labels via vocab
│ (endoTextRenderer,  │     Output: clean German documentation
│  fillingTextRender) │
└─────────────────────┘
    │
    ▼
GERMAN DOCUMENTATION (labels only, no codes visible)
```

### Domain Structure

```
core/
├── endo/
│   └── vocab/
│       └── endoCanonicalVocab.ts    ← SSOT: Endo codes + German labels
├── filling/
│   ├── vocab/
│   │   └── fillingCanonicalVocab.ts ← SSOT: Filling codes + labels
│   ├── fillingSignalParser.ts       ← Deterministic signal extraction
│   ├── fillingPlaybookV1.ts         ← Questions with code options
│   ├── fillingTextRenderer.ts       ← Code → label rendering
│   └── __tests__/
│       ├── fillingSignalParser.test.ts
│       └── fillingGoldenVectors.test.ts
├── playbooks/
│   └── endo/
│       ├── endoSignalParser.ts
│       ├── endoPlaybookV1.ts
│       ├── endoPlaybookT2Deviation.ts
│       ├── endoTextRenderer.ts
│       └── __tests__/
│           ├── endoSignalParser.test.ts
│           └── endoGoldenVectors.test.ts
└── questionEngine/
    ├── vocabRegistry.ts             ← Domain-agnostic vocab registration
    ├── answerNormalization.ts       ← Answer → field mapping
    └── fieldValidation.ts           ← Validation + sanitization
```

### Vocabulary Registry

```typescript
// vocabRegistry.ts - Domain-agnostic vocabulary system

// Registration (done by each domain)
registerVocab('endo', 'deviationReason', DEVIATION_REASON_CODES);
registerVocab('filling', 'material', MATERIAL_CODES);

// Lookup
isValidCode('endo', 'deviationReason', 'DEVIATION_PAIN')  // true
isValidCode('endo', 'deviationReason', 'Schmerzen')       // false (label!)
getLabel('filling', 'material', 'COMPOSITE')              // "Komposit"
```

### Canonical Vocabulary Example

```typescript
// fillingCanonicalVocab.ts
export const MATERIAL_CODES = ['COMPOSITE', 'GIC', 'AMALGAM', 'TEMPORARY'] as const;

export const MATERIAL_LABELS: Record<MaterialCode, string> = {
    COMPOSITE: 'Komposit',
    GIC: 'Glasionomer', 
    AMALGAM: 'Amalgam',
    TEMPORARY: 'provisorische Füllung',
};

export function getMaterialLabel(code: MaterialCode): string {
    return MATERIAL_LABELS[code];
}
```

### Recipe: Adding a New Domain (e.g., PAR)

1. **Create vocab file**
   ```bash
   core/par/vocab/parCanonicalVocab.ts
   # Define codes, labels, helper functions
   ```

2. **Register with vocabRegistry**
   ```typescript
   registerVocab('par', 'pocketDepth', POCKET_DEPTH_CODES);
   ```

3. **Create signal parser**
   ```bash
   core/par/parSignalParser.ts
   # Regex/keyword extraction, NO LLM
   ```

4. **Create playbook**
   ```bash
   core/par/parPlaybookV1.ts
   # Questions with CODE options
   ```

5. **Create renderer**
   ```bash
   core/par/parTextRenderer.ts
   # Map codes → German labels
   ```

6. **Add golden vectors**
   ```bash
   core/par/__tests__/parGoldenVectors.test.ts
   ```

---

## 4. LLM Usage Policy

### Current State: **ZERO LLM IN RUNTIME**

```
┌─────────────────────────────────────────────────────────────────┐
│  NO LLM calls in:                                               │
│  • Signal parsers (regex only)                                  │
│  • Playbooks (deterministic)                                    │
│  • Validation (code lookup)                                     │
│  • Rendering (label lookup)                                     │
│                                                                 │
│  LLM is ONLY used for:                                          │
│  • Extraction service (optional, gated)                         │
│  • Suggestions (never SSOT)                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Extraction Service (if used)

| File | Role | LLM? |
|------|------|------|
| `v6/services/extractionService.ts` | Initial text extraction | Optional |
| `core/questionEngine/*` | Question/answer processing | **NO** |
| `core/*/vocab/*` | Code/label definitions | **NO** |
| `core/*TextRenderer.ts` | Final output | **NO** |

### Hard Gates

1. **fieldValidation.ts** — Rejects any label-like strings
2. **Golden vector tests** — Lock expected codes, not labels
3. **Renderer tests** — Assert labels appear in output, codes don't

---

## 5. Test Architecture

### Gate Tests

| Gate | File | Purpose |
|------|------|---------|
| Endo Canonical | `gate-endo-canonical-alignment.test.ts` | Vocab alignment |
| Endo Medical | `gate-endo-medical-golden.test.ts` | Clinical logic |
| V7 Boundary | `gate-v7-no-core-imports.test.ts` | Import isolation |
| Pipeline | `gate4-pipeline-snapshot-endo.test.ts` | Full pipeline |

### Golden Vectors

```typescript
// Golden vector structure
{
    id: 'FILL_01_SIMPLE',
    rawDictation: 'Zahn 36, okklusale Füllung...',
    answersByQuestionId: { ... },       // Codes as answers
    expectedFieldCodes: { ... },        // Codes in fields
    expectedNoteContains: ['Komposit'], // German labels in note
    expectedNoteNotContains: ['COMPOSITE'], // Codes NOT in note
}
```

---

## 6. Debug Playbooks

### "I still see old UI at /docudent"

**Checklist:**
1. Check `App.jsx` — Is `/docudent` route pointing to `V7ShellEntry`?
2. Check `Layout.jsx` — Is `isDarkPage` check including `/docudent`?
3. Check browser dev tools — Is there a gradient overlay?
4. Hard refresh: `Cmd+Shift+R`

**Files to inspect:**
```
src/App.jsx                    # Line ~125: V7 route definition
src/components/Layout.jsx      # Line ~17: isDarkPage check
src/docudent/v7/app/V7ShellEntry.tsx
```

### "Codes leaking into German note"

**Checklist:**
1. Check renderer — Is it calling `getXxxLabel(code)` for each field?
2. Check golden vectors — Are `expectedNoteNotContains` assertions present?
3. Run: `npm test -- --run golden`

**Files to inspect:**
```
src/docudent/core/*/vocab/*CanonicalVocab.ts   # Label mappings
src/docudent/core/*TextRenderer.ts             # Label lookups
src/docudent/core/*/__tests__/*GoldenVectors.test.ts
```

### "Labels accidentally stored in DB / fields"

**Checklist:**
1. Check `fieldValidation.ts` — Is `looksLikeLabel()` rejecting German?
2. Check playbook options — Are they codes or labels?
3. Run: `npm test -- --run fieldValidation`

**Files to inspect:**
```
src/docudent/core/questionEngine/fieldValidation.ts
src/docudent/core/questionEngine/__tests__/fieldValidation.test.ts
src/docudent/core/*/playbook*.ts   # Check options arrays
```

### "Navigation links don't work in V7"

**Checklist:**
1. Check `routes.ts` — Is route registered?
2. Check route path prefix — Should be relative (no `/docudent` prefix in routes.ts)
3. Check Navigation.tsx imports — Using `routes.ts`?

**Files to inspect:**
```
src/docudent/v7/app/routes.ts
src/docudent/v7/app/Navigation.tsx
src/docudent/v7/app/V7ShellEntry.tsx
```

---

## 7. Folder Map

```
src/
├── main.jsx                    # Entrypoint
├── App.jsx                     # Router (V7 outside Layout)
├── components/
│   └── Layout.jsx              # Legacy layout (V5/V6 only)
│
└── docudent/
    ├── ARCHITECTURE.md         # This file
    │
    ├── v7/                     # V7 JETON SHELL
    │   ├── app/
    │   │   ├── V7ShellEntry.tsx   # Shell integration
    │   │   ├── routes.ts          # SSOT: all routes
    │   │   ├── Navigation.tsx     # Sidebar nav
    │   │   ├── designTokens.ts    # Jeton tokens
    │   │   └── AuthContext.mock.tsx
    │   ├── pages/
    │   │   ├── DashboardPage.tsx
    │   │   ├── SettingsPage.tsx
    │   │   ├── TeamPage.tsx
    │   │   ├── BillingBetaPage.tsx
    │   │   ├── CasesPage.tsx
    │   │   └── DictationPage.tsx
    │   ├── components/
    │   └── styles/
    │
    ├── core/                   # CANONICAL CODE FRAMEWORK
    │   ├── endo/
    │   │   └── vocab/
    │   │       └── endoCanonicalVocab.ts
    │   ├── filling/
    │   │   ├── vocab/
    │   │   │   └── fillingCanonicalVocab.ts
    │   │   ├── fillingSignalParser.ts
    │   │   ├── fillingPlaybookV1.ts
    │   │   ├── fillingTextRenderer.ts
    │   │   └── __tests__/
    │   ├── playbooks/
    │   │   └── endo/
    │   │       ├── endoSignalParser.ts
    │   │       ├── endoPlaybookV1.ts
    │   │       ├── endoTextRenderer.ts
    │   │       └── __tests__/
    │   └── questionEngine/
    │       ├── vocabRegistry.ts
    │       ├── answerNormalization.ts
    │       ├── fieldValidation.ts
    │       └── __tests__/
    │
    ├── v6/                     # Legacy V6
    ├── v5/                     # Legacy V5
    └── __tests__/
        └── gates/              # Gate tests
```

---

## 8. SSOT Reference

| What | SSOT File | Consumers |
|------|-----------|-----------|
| V7 Routes | `v7/app/routes.ts` | V7ShellEntry, Navigation |
| V7 Design Tokens | `v7/app/designTokens.ts` | All V7 components |
| Endo Codes | `core/endo/vocab/endoCanonicalVocab.ts` | Parser, Playbook, Renderer |
| Filling Codes | `core/filling/vocab/fillingCanonicalVocab.ts` | Parser, Playbook, Renderer |
| Vocab Registry | `core/questionEngine/vocabRegistry.ts` | Validation |
| Field Validation | `core/questionEngine/fieldValidation.ts` | Pipeline |

---

## 9. Verification Commands

```bash
# Run all tests
npm test -- --run

# Run specific domain tests
npm test -- --run endo
npm test -- --run filling

# Run gate tests only
npm test -- --run gates

# Start dev server
npm run dev

# Verify V7 routes
# http://localhost:5173/docudent           → Dashboard
# http://localhost:5173/docudent/settings  → Settings
# http://localhost:5173/docudent/team      → Team
# http://localhost:5173/docudent/v5        → Legacy V5
```
