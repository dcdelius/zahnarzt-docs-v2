# Files Runtime Classification

> Classification of files by runtime usage with evidence.

---

## Legend

| Category | Description |
|----------|-------------|
| **Runtime** | Imported and executed in production app |
| **Test-only** | Only imported by test files |
| **Legacy** | In `_legacy/` folder, may or may not be dead |
| **Dead** | No imports from active code paths |

---

## Runtime Files

| Path | Why | Evidence |
|------|-----|----------|
| `src/main.jsx` | Entry point | ReactDOM.createRoot L13 |
| `src/App.jsx` | Router + routes | L124-148 Routes |
| `src/docudent/v7/pages/DocudentV7Page.tsx` | V7 route target | App.jsx L140 |
| `src/docudent/v7/hooks/useV7Pipeline.ts` | V7 state container | DocudentV7Page import |
| `src/docudent/v7/pipeline/index.ts` | V7 orchestrator | useV7Pipeline L15 import |
| `src/docudent/v6/services/extractionService.ts` | Extraction | pipeline/index.ts L20 |
| `src/docudent/v6/services/questionService.ts` | Questions | pipeline/index.ts L21 |
| `src/docudent/v6/services/outputService.ts` | Output | pipeline/index.ts L22 |
| `src/docudent/v5/hooks/useBillingV5Controller.ts` | V5 controller | DocudentV5Page import |
| `src/docudent/core/billing/knowledgeBase/logic/treatmentEngine.ts` | Billing core | outputService.ts import |
| `src/docudent/core/billing/knowledgeBase/logic/outputComposer.ts` | Text render | outputService.ts L53-59 |
| `src/docudent/core/billing/knowledgeBase/logic/chipResolver.ts` | Chip resolve | outputService.ts L34 |
| `src/docudent/core/billing/knowledgeBase/logic/billingRegistry.ts` | Billing dispatch | useBillingV5Controller L17 |
| `src/firebase.js` | Firebase init | L26-28 exports db, auth |

---

## Test-Only Files

| Path | Why | Evidence |
|------|-----|----------|
| `src/test/*` | Test directory | vitest imports only |
| `src/docudent/__tests__/*` | Gate tests | vitest imports only |
| `src/__tests__/*` | Root tests | vitest imports only |

---

## Legacy Files (Dead)

| Path | Size | Why Dead | Evidence |
|------|------|----------|----------|
| `src/_legacy/Dashboard.jsx` | 78KB | No route in App.jsx | grep 'from.*_legacy' = 0 |
| `src/_legacy/Settings.jsx` | 55KB | No route in App.jsx | grep 'from.*_legacy' = 0 |
| `src/_legacy/TemplateBuilder.jsx` | 83KB | No route | — |
| `src/_legacy/TemplateBuilderV2.jsx` | 7KB | No route | — |
| `src/_legacy/MedicalKnowledgeDashboard.jsx` | 27KB | No route | — |
| `src/_legacy/AssistantDashboard.jsx` | 7KB | No route | — |
| `src/_legacy/pages/SoniaDesigner.jsx` | 34KB | No route | — |
| `src/_legacy/pages/SoniaV3.jsx` | 8KB | Redirected | App.jsx L144 |
| `src/_legacy/pages/SoniaV3Flow.jsx` | 22KB | Redirected | App.jsx L145 |
| `src/_legacy/sonia/*` | ~45 files | Legacy hooks | — |

---

## Summary

- **Runtime:** ~15 core files in active import chain
- **Test-only:** All files under `test/`, `__tests__/`
- **Dead/Legacy:** ~60+ files in `_legacy/` folder
