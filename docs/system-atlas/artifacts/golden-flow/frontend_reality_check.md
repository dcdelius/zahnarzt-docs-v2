# G104-G108 — Frontend Reality Checks (Code Analysis)

**Note:** Browser testing skipped per user request. Findings based on code analysis.

---

## G104 — Askbacks UI Visibility Analysis

### Finding: Askbacks WILL render when present

**QuestionsFlowV2 Component** (`v7/components/QuestionsFlowV2.tsx`):
```typescript
// Line 94-122: REQUIRED section renders when allRequired.length > 0
{allRequired.length > 0 && (
    <section data-testid="required-section">
        <div className="v7-kicker">ERFORDERLICH</div>
        {allRequired.map(question => (
            <QuestionRow key={question.id} question={question} ... />
        ))}
    </section>
)}
```

### Issue: Stub Extraction Doesn't Trigger Askbacks

**CLI Test Result:**
```
STATE: output
QUESTIONS: undefined
QUESTION_BUNDLE: ABSENT
```

**Root Cause:**
1. LLM extraction fails in CLI (no VITE_OPENAI_API_KEY)
2. Fallback stub extraction runs
3. Stub doesn't populate `cariesDepth: 'profunda'`
4. Medical KB rule `rule-profunda-requires-ueberkappung-askback` doesn't fire
5. No askbacks → state goes directly to `output`

### In Production (with LLM):
- LLM extraction DOES populate `cariesDepth` from dictation
- Askback rules SHOULD fire
- QuestionsFlowV2 SHOULD render them

---

## G105 — Askback → Chip Activation

### Code Path Analysis

**Step 1: User answers → useV10Pipeline.answerQuestion()**
```typescript
// useV10Pipeline.ts:117-125
const answerQuestion = useCallback((questionId: string, value: unknown) => {
    setState(s => {
        const newAnswers = new Map(s.answers);
        newAnswers.set(questionId, value);
        return { ...s, answers: newAnswers };
    });
}, []);
```

**Step 2: onComplete → runPipeline() calls runV10 with answers**
```typescript
// useV10Pipeline.ts:180-187
const v10Result = await runV10({
    ...
    answers: current.answers,  // ← Answers included!
});
```

**Step 3: runV10 applies answers to facts**
```typescript
// runV10.ts:123-125
const scopedAnswers = tooth ? getScopedAnswers(answers, tooth) : answers;
facts = applyAnswersToFacts(facts, Object.fromEntries(scopedAnswers));
```

**Step 4: Medical KB evaluates with new facts → different chips**

### Chip-Delta Mechanics (from medical_kb.v1.json):

| Answer | Fact Change | Rule Fires | Chip Emitted |
|--------|-------------|------------|--------------|
| `capping.performed = yes` | facts.capping.performed = 'yes' | `rule-ueberkappung-yes-emits-cp` | `cp` |
| `capping.performed = no` | facts.capping.performed = 'no' | `rule-ueberkappung-no-emits-cp-not-required` | `cp_not_required` |

### ✅ Verdict: Answer → Chip wiring IS CORRECT

The code path from answer to chip is complete:
1. User answers in UI → Map updated
2. runPipeline() passes answers → runV10
3. applyAnswersToFacts() updates facts
4. applyMedicalKb() re-evaluates rules with new facts
5. Different chips are emitted

---

## G106 — Output & Billing Live Check

### Code Path Analysis

**Chips → Renderer:**
```typescript
// runV10.ts:421-423
let allChips = testOverrides.chips ?? results.flatMap(r => r.chips);
const uniqueChips = [...new Set(allChips)];
```

**Renderer → Output:**
```typescript
// Calls renderFromKbChips() with chips
// Each chip has billingRef in unified.json
```

**Output → UI:**
```typescript
// DocudentV10Page.tsx:436-461
if (currentState === 'output' && output) {
    return (
        <OutputFlow output={output} ... />
        <div data-testid="v10-billing-codes">
            {output.billingCodes?.map((code) => <span>{code}</span>)}
        </div>
    );
}
```

### ✅ Verdict: Output/Billing updates with new chips

When chips change (due to askback answer), output.billingCodes changes.
UI re-renders with new billing codes.

---

## G107 — Multi-Treatment UI Smoke Test

### Code Analysis

**Multi-Instance Creation:**
```typescript
// useV10Pipeline.ts:241-262
const createInstancesAndRun = useCallback(async (instances) => {
    const results = await Promise.all(instances.map(async (inst) => {
        return runV10({
            ...
            answers: current.instanceAnswers[inst.instanceId] || new Map(),
        });
    }));
    // Combine results per instance
});
```

### Potential Issues Identified:

| Issue | Severity | Location |
|-------|----------|----------|
| InstanceAnswers keyed by instanceId, not tooth | ⚠️ MEDIUM | useV10Pipeline.ts |
| QuestionsFlowV2 doesn't scope by tooth | ⚠️ MEDIUM | QuestionsFlowV2.tsx |
| Multi-output shows combined, not per-tooth | ⚠️ LOW | MultiOutputRenderer |

### ⚠️ Verdict: Multi-treatment needs scoping work

The basic multi-instance run works, but:
- Askbacks should show tooth context
- Answers should be scoped to tooth
- Output should be clearly per-tooth

---

## G108 — Decision: What's Really Missing?

### ❌ What's MISSING in Backend:

| Gap | Impact | Fix Effort |
|-----|--------|------------|
| Stub extraction doesn't trigger profunda | DEV/TEST only | LOW |
| Medical KB has limited askback rules | MEDIUM | MEDIUM |
| No explicit adhesive_technique askback | HIGH | MEDIUM |

### ❌ What's MISSING in Frontend:

| Gap | Impact | Fix Effort |
|-----|--------|------------|
| Chips not visible in main UI (only Debug) | MEDIUM | LOW |
| No chip-delta preview on askback | LOW | MEDIUM |
| Multi-tooth askbacks not scoped visually | MEDIUM | MEDIUM |

### ❌ What's MISSING in Medical Structure:

| Gap | Impact | Fix Effort |
|-----|--------|------------|
| `adhesive_technique` askback not in KB | HIGH | LOW |
| No tooth-based LA derivation | MEDIUM | LOW |

---

## Prioritized Roadmap

### Phase 1: Dictation → Clean Result (NOW)
1. **Add `adhesive_technique` askback to medical_kb.v1.json** ← CRITICAL
2. Ensure stub extraction sets `adhesive_mentioned` marker
3. Verify askbacks appear in production (with LLM)

### Phase 2: UI Polish
1. Show chips in main UI (not just Debug)
2. Add chip-delta feedback on askback answer
3. Multi-tooth visual scoping

### Phase 3: Settings Integration
1. Default materials from settings
2. DocMode configuration
3. Practice-specific defaults

---

## Summary

| Question | Answer |
|----------|--------|
| Askbacks appear when generated? | ✅ YES (code correct) |
| Issue why askbacks absent in test? | Stub extraction doesn't populate facts |
| Answer → Chip wiring correct? | ✅ YES |
| Output/Billing updates? | ✅ YES |
| Multi-treatment works? | ⚠️ PARTIAL (scoping needed) |

**Next Concrete Step:** Add `adhesive_technique` askback rule to medical_kb.v1.json (see G99).
