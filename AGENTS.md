# AGENTS.md — Docudent Project Guide

> **For:** AI coding agents working on the Docudent codebase  
> **Project:** Docudent — Dental Documentation Platform for German Practices  
> **Language:** Code and docs in English, UI in German  
> **Last Updated:** 2026-02-01

---

## 1. Project Overview

Docudent is a modern dental documentation platform that transforms dictated treatment descriptions into structured patient records and billing codes (BEMA/GOZ/BEL) for German dental practices.

### Core Value Proposition
- **Voice-to-Document:** Dentists dictate treatments, system generates structured documentation
- **Automated Billing:** Extracts and validates billing codes with legal references
- **Compliance Guardrails:** Combinability checking prevents regress (illegal code combinations)
- **Multi-Treatment Support:** Handles multiple treatments in a single session (e.g., 2 fillings on 2 teeth)

### Current State
- **V10:** Active development version with direct pipeline access (production target)
- **V7:** UI layer being deprecated, migration to V10 in progress
- **V6:** FROZEN since 2024-12-30 — no new code allowed, facades only

---

## 2. Technology Stack

### Core Technologies
| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 18.2.0 |
| Build Tool | Vite | 5.1.4 |
| Language | TypeScript | ES2020 |
| Styling | Tailwind CSS | 3.4.1 |
| Animation | Framer Motion | 11.0.8 |
| Backend | Firebase | 10.14.1 |
| Auth | Firebase Auth | - |
| Database | Firestore | - |

### Key Dependencies
- **UI Primitives:** Radix UI (Dialog, Popover, Select, Switch, etc.)
- **3D Rendering:** React Three Fiber + Drei
- **Icons:** Heroicons, Lucide React
- **LLM Integration:** OpenAI SDK, Google Gemini API
- **PDF Processing:** pdf-parse, pdf2json

### Dev Dependencies
- **Testing:** Vitest (unit), Playwright (E2E)
- **Linting:** ESLint with React Hooks/Refresh plugins
- **Utilities:** Zod (validation), Lodash

---

## 3. Project Structure

```
src/
├── docudent/
│   ├── contracts/          # SSOT Type Definitions
│   │   ├── pipeline.ts     # PipelineInput, PipelineResult
│   │   ├── compose.ts      # ComposedDocumentV1, BillingRef
│   │   ├── questions.ts    # QuestionBundle, DynamicQuestion
│   │   └── canonicalIds.ts # Shared identifiers
│   │
│   ├── core/               # Business Logic (NO UI)
│   │   ├── billing/        # Billing engine & knowledge base
│   │   │   ├── knowledgeBase/
│   │   │   │   ├── logic/  # treatmentEngine, outputComposer
│   │   │   │   ├── registry/ # SSOT loaders (loadUnifiedConfig, etc.)
│   │   │   │   ├── treatments/ # Per-treatment configs (fuellung, endo, etc.)
│   │   │   │   └── rules/  # kombinationen.json, comment_rules_v1.json
│   │   │   └── combinability/
│   │   ├── case/           # Case management (Draft → Finalized → Amended)
│   │   ├── extraction/     # LLM extraction normalization
│   │   ├── playbooks/      # Treatment-specific logic (endo/, filling/)
│   │   ├── questionEngine/ # Question generation & validation
│   │   └── settings/       # User settings resolution
│   │
│   ├── v10/                # ACTIVE UI VERSION
│   │   ├── app/V10Router.tsx
│   │   ├── components/     # V10-specific UI components
│   │   ├── pages/          # DocudentV10Page, SettingsPageV10
│   │   ├── __tests__/      # V10-specific tests
│   │   └── __e2e__/        # Playwright E2E tests
│   │
│   ├── v7/                 # DEPRECATED UI (migration to V10 in progress)
│   │   ├── app/V7Router.tsx
│   │   ├── components/     # QuestionsFlowV2, OutputFlow
│   │   ├── hooks/useV7Pipeline.ts
│   │   ├── pipeline/index.ts # Pipeline orchestrator
│   │   └── multitreatment/ # Multi-instance orchestrator
│   │
│   ├── v6/                 # FROZEN — DO NOT MODIFY
│   │
│   └── __tests__/          # Gate tests (invariant enforcement)
│       └── gates/          # 150+ gate tests
│
├── components/             # Shared UI components (Shadcn-based)
├── contexts/               # AuthContext, UserContext
├── pages/                  # HomePage, legacy pages
└── _legacy/                # Legacy code (archival)

e2e/                        # Playwright E2E tests
scripts/                    # Build & validation scripts
functions/                  # Firebase Cloud Functions
```

---

## 4. Architecture Patterns

### 4.1 Pipeline Flow (The Core)

All document processing follows a deterministic pipeline:

```
Dictation Input
    ↓
[EXTRACTION]    → Parse tooth, surfaces, diagnosis from dictation
    ↓
[QUESTIONS]     → Generate QuestionBundle from question_bank.json
    ↓
[TRANSLATION]   → answerIdTranslator maps answers to canonical IDs
    ↓
[CHIPS]         → chipResolver converts answers to billing chips
    ↓
[ENGINE]        → treatmentEngine resolves billing codes from unified.json
    ↓
[COMPOSE]       → outputComposer assembles final document
    ↓
PipelineResult  → {state: 'questions' | 'output', ...}
```

### 4.2 SSOT (Single Source of Truth) Invariant

**Critical Rule:** The `copyText` field is ALWAYS derived from blocks:

```typescript
// contracts/compose.ts
interface ComposedDocumentV1 {
    copyText: string;   // INVARIANT: === blocks.map(b => b.text).join('\n\n')
    blocks: ComposedBlock[];
    billingRefs: BillingRef[];
}
```

Never construct copyText separately — always derive it from blocks.

### 4.3 Strict Boundary Rules

**V7/V10 UI Layer Rules:**
- ❌ NEVER import from `core/billing/**` directly in UI code
- ❌ NEVER define billing logic or semantic rules in UI
- ❌ NEVER use string literals for Canonical IDs (use constants from contracts/)
- ✅ ONLY receive "Ready-to-Render" ViewModels from pipeline
- ✅ ONLY map Canonical IDs to German display labels

**Enforcement:** `gate-v7-ssot-boundaries.test.ts` fails build on violation.

### 4.4 Treatment Config Structure (SSOT)

Each treatment has a directory under `core/billing/knowledgeBase/treatments/{treatmentId}/`:

```
treatments/fuellung/
├── unified.json        # Billing rules & template references
├── answer_map.json     # Answer ID → canonical chip mapping
├── question_bank.json  # Dynamic questions configuration
├── template.json       # Output text templates
└── finding_map.json    # Finding → chip mappings
```

Loaders in `registry/loaders.ts` provide type-safe access.

### 4.5 Chip Cohesion Mantra (NO Fragmentation)

Every setting, dictation signal, chip, and output section must be tightly linked:
- If a material is configured in treatment settings and mentioned in dictation, the output must show that exact material name.
- Chips are cohesive bundles: documentation text, billing implications, and disclosures must be driven together by the same chip.
- Never emit partial chips that only affect text or only billing when they should drive both.

---

## 5. Build and Development Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Testing
```bash
# Run all unit tests (Vitest)
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/docudent/__tests__/gates/gate-v10-ssot-boundaries.test.ts

# Run all gate tests
npm test -- --run src/docudent/__tests__/gates/

# Run E2E tests (Playwright)
npm run test:e2e

# Run V10-specific E2E tests
npm run e2e:v10:wiring

# Run proof-pack (comprehensive validation)
npm run proof-pack
```

### Validation Scripts
```bash
# SSOT compliance check
npm run ssot-check

# V6 SSOT pipeline audit
npm run audit:v6-ssot

# Red team testing
npm run red-team
```

### Utility Scripts
```bash
# Seed Firestore with treatment KB
npm run kb:seed:firestore

# Atlas system checks
npm run atlas:check
npm run atlas:refresh

# V10 checks
npm run v10:mvp-check
npm run v10:practice-check
```

---

## 6. Testing Strategy

### Gate Tests (Invariant Enforcement)
Gate tests enforce architectural invariants and fail loudly on violations:

| Gate File | Purpose |
|-----------|---------|
| `gate-v7-ssot-boundaries.test.ts` | UI never imports from core/billing |
| `gate-fragmentation-sentinel.test.ts` | No V7-only options affecting billing |
| `gate-combinability-block-means-error.test.ts` | BLOCK verdict creates error state |
| `gate-no-v6-mutation.test.ts` | V6 code remains frozen |
| `gate-treatment-isolation.test.ts` | No cross-treatment leakage |

**Rule:** Any code change that breaks a gate test is an architectural violation.

### Unit Tests
- Located in `__tests__/` subdirectories near code under test
- Use Vitest with JSDOM environment
- Mock framer-motion for JSDOM tests

### E2E Tests (Playwright)
- Located in `e2e/` and `src/docudent/v10/__e2e__/`
- Auth bypass for stability: `VITE_E2E_BYPASS_AUTH=1`
- Run against built app on preview server

### Determinism Tests
Multiple gate tests verify deterministic output:
- Same input → identical output
- No timestamps in core types
- Fixed separators for multi-treatment

---

## 7. Code Style Guidelines

### TypeScript
- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode: DISABLED (`"strict": false` in tsconfig.json)
- Path alias: `@/*` maps to `./src/*`

### Naming Conventions
- **Canonical IDs:** `CANONICAL_MATERIAL_COMPOSITE`, `CANONICAL_ENDO_STEP_PREP`
- **Components:** PascalCase (e.g., `QuestionsFlowV2.tsx`)
- **Utilities:** camelCase (e.g., `answerIdTranslator.ts`)
- **Constants:** UPPER_SNAKE_CASE for true constants

### Import Order
```typescript
// 1. React/External libraries
import React from 'react';
import { motion } from 'framer-motion';

// 2. Internal absolute imports (@/)
import { PipelineInput } from '@/docudent/contracts/pipeline';

// 3. Relative imports
import { useV7Pipeline } from '../hooks/useV7Pipeline';
```

### Comments
- Use German for UI-facing text
- Use English for code comments and documentation
- Prefix legacy code with deprecation notices

---

## 8. Security Considerations

### Environment Variables
Sensitive configuration in `.env`:
```bash
VITE_OPENAI_API_KEY=          # LLM extraction
VITE_FIREBASE_*=              # Firebase configuration
VITE_GOOGLE_GEMINI_API_KEY=   # Gemini LLM
```

**Important:** Never commit `.env` to version control.

### Authentication
- Firebase Authentication for user management
- Claims-based role mapping (`core/auth/mapClaimsToRole.ts`)
- E2E auth bypass available for testing (`VITE_E2E_BYPASS_AUTH`)

### Data Handling
- No PII in pipeline output (enforced by gate tests)
- Firestore rules control data access
- Patient data isolated per practice

### Billing Data Integrity
- Combinability checking prevents illegal code combinations
- All billing codes have provenance tracking
- Regress protection via WARN/BLOCK system

---

## 9. Deployment

### Firebase Hosting
```bash
# Build and deploy
npm run build
firebase deploy
```

Configuration in `firebase.json`:
- Public directory: `dist/`
- SPA routing: All routes → `index.html`
- Firestore rules: `firestore.rules`

### Firestore Indexes
Defined in `firestore.indexes.json` for query optimization.

### Emulator Suite
```bash
# Start Firebase emulators
firebase emulators:start

# Firestore emulator: localhost:8080
# Emulator UI: localhost:4000
```

---

## 10. Common Tasks

### Adding a New Treatment
1. Create directory: `core/billing/knowledgeBase/treatments/{treatmentId}/`
2. Create required files: `unified.json`, `answer_map.json`, `question_bank.json`, `template.json`
3. Add to `treatmentRegistry.ts`
4. Write gate tests for treatment-specific invariants
5. Update `contracts/canonicalIds.ts` with new canonical IDs

### Adding a New Gate Test
1. Create file: `src/docudent/__tests__/gates/gate-{description}.test.ts`
2. Import from actual source (not mocks)
3. Test should fail on invariant violation
4. Run `npm test -- gate-{description}` to verify

### Modifying Pipeline Flow
1. Changes must be in `core/` (never in `v7/` or `v10/`)
2. Update contracts if types change
3. Run `npm run proof-pack` to validate
4. Update architecture docs if flow changes

### Adding E2E Tests
1. Create file: `e2e/{feature}.e2e.spec.ts`
2. Use auth bypass for stability
3. Test user-facing behavior, not implementation
4. Run with: `npm run test:e2e`

---

## 11. Key Architectural Decisions

### Why V7 is a Pure Renderer
The V7 UI layer contains NO billing logic to prevent:
- Circular dependencies between UI and Core
- Domain leakage (UI "inventing" business rules)
- Drift between UI behavior and billing engine

### Why V6 is Frozen
V6 code was reaching unmaintainable complexity. Freezing allows:
- Clean migration path to V10
- No new technical debt in legacy code
- Facade pattern for gradual migration

### Why Gate Tests Exist
Gate tests are architecture enforcement as code:
- Catch violations at test time, not runtime
- Self-documenting architectural rules
- Prevent regression of critical invariants

### Why Determinism Matters
Medical documentation must be reproducible:
- Same input → identical output (always)
- Enables proper testing and debugging
- Required for legal/regulatory compliance

---

## 12. Troubleshooting

### Common Issues

**Build fails with "Cannot import large commentary JSON"**
→ Large JSON files are blocked from client bundles. Use thin indexes or server-side loading.

**Gate test fails on boundary check**
→ Check if UI code is importing from `core/billing/**`. Use pipeline outputs instead.

**E2E tests flaky on login**
→ Use auth bypass: `VITE_E2E_BYPASS_AUTH=1`

**TypeScript path alias not resolving**
→ Ensure `@/*` imports use correct base path. Check `tsconfig.json` paths config.

### Debug Tools
- **V10 Debug Drawer:** In-app debug panel with payload inspection
- **Repro Capture:** Auto-captures reproduction bundles for issues
- **System Atlas:** Runtime architecture validation (`npm run atlas:check`)

---

## 13. Resources

### Documentation
- `src/docudent/ARCHITECTURE.md` — Runtime pipeline flow
- `src/docudent/v7/ARCHITECTURE.md` — V7 boundary rules
- `src/docudent/V6_FREEZE.md` — V6 freeze contract
- `ONBOARDING.md` — Comprehensive onboarding guide

### External References
- BEMA/GOZ/BEL: German dental billing catalogs
- KZV: German Dental Association (regulatory body)
- Analog services: Special billing category for non-catalog services

---

> **Remember:** This codebase prioritizes correctness over convenience. When in doubt, add a gate test.
