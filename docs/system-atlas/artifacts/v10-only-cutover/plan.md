# V10-Only Cutover Plan

**Date:** 2025-12-30  
**Goal:** V10 runs 100% without V7 runtime dependencies

---

## 3-Wave Cutover

### Wave 1: V10 Pipeline Internalization (Business Logic)

**Risk:** High — Core orchestration changes  
**Rollback:** Git revert to pre-wave commit

| Task | Files | Action |
|------|-------|--------|
| 1.1 | v10/pipeline/runV10.ts | Remove v7/medical imports |
| 1.2 | v10/extraction/ | Copy buildFactsFromExtraction |
| 1.3 | v10/facts/ | Copy applyAnswersToFacts |
| 1.4 | v10/askbacks/ | Copy askback functions |
| 1.5 | v10/render/ | Copy renderFromKbChips |
| 1.6 | v10/pipeline/runV10Bundle.ts | Update imports |

**Verification:**
```bash
grep -r "from.*v7" src/docudent/v10/pipeline → 0 hits
npm run build
npx vitest run
```

---

### Wave 2: UI/Types Migration (Shared Layer)

**Risk:** Medium — UI refactoring  
**Rollback:** Git revert wave 2 commits

| Task | From | To |
|------|------|-----|
| 2.1 | v7/medical/types → TreatmentFacts | contracts/types.ts |
| 2.2 | v7/multitreatment/types | contracts/types.ts |
| 2.3 | v7/components/SoftGradientBackground | ui/shared/ |
| 2.4 | v7/components/HeroSculpture | ui/shared/ |
| 2.5 | v7/components/QuestionsFlow* | ui/shared/ |
| 2.6 | v7/components/OutputFlow | ui/shared/ |
| 2.7 | v7/components/Multi* | ui/shared/ |

**Verification:**
```bash
grep -r "from.*v7" src/docudent/v10/components → 0 hits
grep -r "from.*v7" src/docudent/v10/types.ts → 0 hits
npm run build
npx vitest run
```

---

### Wave 3: V7 Unreachable (Gate Enforcement)

**Risk:** Low — Test/tooling only  
**Rollback:** Remove gate

| Task | Action |
|------|--------|
| 3.1 | Add gate: v10 cannot import from v7 at build time |
| 3.2 | Add tsconfig path restriction (optional) |
| 3.3 | Document policy in contracts.md |
| 3.4 | Remove misleading comments ("useV7Pipeline") |

**Verification:**
```bash
# Intentionally add fake import, confirm build fails
npm run build (must pass after revert)
npx vitest run gate-v10-no-v7-imports
```

---

## Definition of Done (DoD)

| Check | Command | Expected |
|-------|---------|----------|
| ✅ V7 imports in v10 runtime | `grep -r "from.*v7" src/docudent/v10/pipeline src/docudent/v10/types.ts src/docudent/v10/components/index.ts` | 0 hits |
| ✅ Build passes | `npm run build` | PASS |
| ✅ Tests pass | `npx vitest run` | PASS |
| ✅ Gate enforces | `npx vitest run gate-v10-no-v7-imports` | PASS |
| ✅ V10 page works | `/docudent/v10` loads, dictation → output | Manual OK |

---

## Execution Order

```
Wave 1 (Day 1)
├── 1.1-1.5: Copy business logic to v10/*
├── 1.6: Update runV10.ts imports
└── Verify: grep + build + tests

Wave 2 (Day 1-2)
├── 2.1-2.2: Create contracts/types.ts
├── 2.3-2.7: Move UI components to ui/shared
└── Verify: grep + build + tests

Wave 3 (Day 2)
├── 3.1-3.2: Add gates
├── 3.3: Document policy
└── Verify: intentional break + gate
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Runtime breakage | Vitest + E2E before merge |
| Bundle size increase | Check Vite bundle analyzer |
| Duplicate code | Mark V7 versions as deprecated |
| Regression | Full test suite + manual check |
