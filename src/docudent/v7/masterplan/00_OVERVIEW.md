# V7 Pipeline — Executive Overview

## What V7 Is Today

V7 is a **thin UI shell and orchestrator** that calls V6 services for all real work:

```
DocudentV7Page (UI) → useV7Pipeline (state) → v7/pipeline/index.ts (orchestrator)
    ↓
V6 extractionService → V6 questionService → V6 outputService
    ↓
Core: chipResolver → treatmentEngine → outputComposer
```

**V7 DOES NOT contain fachliche Logik.**  
**V6 services are authoritative for extraction, questions, and output.**

---

## What Is Authoritative

| Concern | Authoritative Location | V7 Role |
|---------|----------------------|---------|
| Extraction | `v6/services/extractionService.ts` | Passthrough |
| Questions | `v6/services/questionService.ts` | Passthrough |
| ID Translation | `core/.../answerIdTranslator.ts` | **V7 normalizeAnswers exists but is NOT authoritative at runtime** |
| Chip Resolution | `core/.../chipResolver.ts` | Passthrough |
| Billing | `core/.../treatmentEngine.ts` | Passthrough |
| Output Text | `core/.../outputComposer.ts` | Passthrough |
| Warnings | `outputComposer.ts` | Passthrough |

---

## Why Semantics Feel Broken Despite Passing Tests

1. **Duplicate translation layers**: V7 has `normalizeAnswers.ts` but V6's `answerIdTranslator.ts` is what actually runs
2. **Tests mock V6 services**: Many V7 tests don't exercise real V6 code paths
3. **Placeholders in snippets**: Chip textSnippets contain `{material}` that wasn't substituted (now fixed)
4. **Warnings use raw extracted**: Not merged facts, causing "Zahnangabe fehlt" when tooth exists

---

## Critical Statement

> **V7 `normalizeAnswers` exists but is NOT authoritative at runtime.**  
> The actual translation happens in `answerIdTranslator.translateAnswers()` called by `chipResolver.resolveActiveChipIds()`.

---

## Acceptance Criteria for "Pipeline Is Correct"

1. ✅ No placeholders in output (`{material}`, `{tooth}`, `{surfaces}`)
2. ✅ Tooth number preserved correctly (36 stays 36, not 35)
3. ✅ MKV amount preserved (120€ stays 120€)
4. ⬜ Warnings reflect merged facts, not just extraction
5. ⬜ Single authoritative ID translation layer
6. ✅ All golden cases pass
7. ⬜ Engine gating prevents cross-treatment pollution

---

## STOP Conditions (Do NOT Work on UI Until)

1. ❌ Any golden test fails
2. ❌ Placeholders appear in output
3. ❌ Warnings contradict known facts
4. ❌ Test count drops below 97
5. ❌ ZE/FZ codes appear in fuellung output
