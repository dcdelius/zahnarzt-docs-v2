# V10 Golden UI — Wiring Map

## Architecture

```
DocudentV10Page
  └── useV7Pipeline()
        ├── runPipeline()     → pipeline.run() → runV10()
        └── createInstancesAndRun() → runMultiTreatment() → runV10Bundle()
```

---

## Files Created/Modified

### New V10 Files
| File | Purpose |
|------|---------|
| `v10/pages/DocudentV10Page.tsx` | Main page (V8 copy + extensions) |
| `v10/components/V10TreatmentSelector.tsx` | Pack registry dropdown |
| `v10/components/V10InsuranceSelector.tsx` | GKV/MKV/PKV toggle |
| `v10/components/V10TextLengthSelector.tsx` | Kurz/Mittel/Lang |
| `v10/components/V10DebugDrawer.tsx` | Debug panel (5 tabs) |
| `v10/app/V10Router.tsx` | Route definitions |
| `v10/__e2e__/v10-ui.e2e.spec.ts` | E2E tests |

### Modified Files
| File | Change |
|------|--------|
| `App.jsx:19` | Import V10Router |
| `App.jsx:158` | Route `/docudent/v10/*` |

---

## UI Event → Pipeline Call

| UI Event | Hook Action | Pipeline Call |
|----------|-------------|---------------|
| Dictation input | `setDictation(text)` | — |
| Treatment select | `setTreatmentId(id)` | — |
| Insurance toggle | `setInsuranceType()` | — |
| "Dokumentieren" click | `runPipeline()` | `runV10()` |
| "Multi-Zahn" click | `createInstancesAndRun()` | `runV10Bundle()` |
| Answer question | `answerQuestion(id, val)` | — |
| "Weiter" click | `runPipeline()` (rerun) | `runV10()` |

---

## State Rendering

| State | UI Component |
|-------|--------------|
| `idle` | Jeton Hero + textarea |
| `running` | Spinner |
| `questions` | QuestionsFlow/V2 |
| `output` | OutputFlow + billing codes |
| `multi_output` | MultiOutputRenderer |
| `error` | Error card + conflicts |
| `unsupported` | Warning card |

---

## data-testid Selectors

| Selector | Element |
|----------|---------|
| `v10-dictation-input` | Main textarea |
| `v10-run-button` | "Dokumentieren" button |
| `v10-multi-button` | "Multi-Zahn" button |
| `v10-mode-toggle` | Single/Multi toggle |
| `v10-debug-toggle` | Debug drawer toggle |
| `v10-treatment-select` | Treatment dropdown |
| `v10-insurance-select` | Insurance toggle |
| `v10-textlength-select` | Text length toggle |
| `v10-questions-panel` | Questions container |
| `v10-submit-answers` | "Weiter" button |
| `v10-output-panel` | Output container |
| `v10-output-text` | Text copy button |
| `v10-billing-codes` | Billing codes list |
| `v10-multi-output-panel` | Multi output |
| `v10-multi-panel` | Multi instance modal |
| `v10-error-panel` | Error state |
| `v10-unsupported-panel` | Unsupported state |
| `v10-combinability-conflicts` | Conflict list |
| `v10-debug-trace` | Trace tab |
| `v10-debug-kb` | KB tab |
| `v10-debug-combinability` | Combinability tab |
| `v10-debug-provenance` | Provenance tab |
| `v10-debug-explain` | Explain tab |

---

## Debug Drawer Tabs

| Tab | Content |
|-----|---------|
| Trace | `meta.traceLines` viewer |
| KB | medical/treatment/combinability hashes |
| Kombi | verdict + conflicts |
| Provenance | questions/billing counts |
| Explain | Full JSON + copy |

---

## Test Commands

```bash
# Dev server
npm run dev
# → http://localhost:5173/docudent/v10

# E2E tests
npm run test:e2e -- --grep "V10"

# Gate tests
npm test -- --grep "gate-m"
```

---

## TODOs

1. **Combinability BLOCK test**: Needs testOnly fixture
2. **Determinism test**: Compare explain hash across runs
3. **Multi-tooth E2E**: Full panel interaction test
4. **Pack version in debug**: Show version from pack.meta
