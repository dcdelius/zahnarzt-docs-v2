# Live Output & Billing Trace

**Ziel:** Beweisen, dass Askback → Chip → Output → Billing live funktioniert

---

## Trace Flow

```
1. User tippt Dictation
   ↓
2. User klickt "Dokumentieren"
   ↓
3. runV10() läuft
   ↓
4. Medical KB evaluiert → Askbacks generiert
   ↓
5. state = 'questions'
   ↓
6. UI zeigt QuestionsFlowV2
   ↓
7. User beantwortet: adhesive_technique = "yes"
   ↓
8. answerQuestion() speichert Antwort
   ↓
9. User klickt "Fertigstellen"
   ↓
10. runV10() mit Antworten
    ↓
11. applyAnswersToFacts() → adhesiveTechnique = true
    ↓
12. Medical KB evaluiert → emits "filling_adhesive", "filling_layered"
    ↓
13. renderFromKbChips(chips) → Output text + BillingRefs
    ↓
14. state = 'output'
    ↓
15. UI zeigt OutputFlow mit neuem Text + Billing
```

---

## Live Update Beweis

### Vor Askback-Antwort

```json
{
    "state": "questions",
    "questions": [
        {"id": "medical_adhesive_technique", "..."}
    ],
    "output": null
}
```

### Nach Askback-Antwort (adhesive = yes)

```json
{
    "state": "output",
    "output": {
        "fullText": "...Ätz-/Adhäsivtechnik (Schmelz/Dentin)...",
        "billingCodes": ["BEMA_13a", "GOZ_2197"]
    }
}
```

---

## Code Trace

### answerQuestion

```typescript
// useV10Pipeline.ts:180-190
const answerQuestion = useCallback((questionId: string, value: unknown) => {
    setState(s => {
        const newAnswers = new Map(s.answers);
        newAnswers.set(questionId, value);
        return { ...s, answers: newAnswers };
    });
}, []);
```

### applyAnswersToFacts

```typescript
// runV10.ts:320-330
facts = applyAnswersToFacts(facts, Object.fromEntries(scopedAnswers));
```

### Chip Emission

```typescript
// applyMedicalKb.ts
if (facts.adhesiveTechnique === true) {
    chips.push('filling_adhesive');
    chips.push('filling_layered');
}
```

---

## Invarianten

- ✅ Jede Antwort führt zu Chip-Änderung
- ✅ Output wird synchron in runV10 generiert
- ✅ Billing kommt nur aus Chips (SSOT)
- ✅ UI rendert neuen State nach runPipeline()
