# Golden Dictation Mode — Dokumentation

**Ziel:** Askbacks deterministisch triggern, auch ohne LLM-Extraction

---

## Aktivierung

### Im Code
```typescript
const result = await runV10({
    dictation: "Füllung Zahn 36 okklusal Komposit...",
    treatmentId: "fuellung",
    insuranceType: "GKV",
    testOnly: {
        enabled: true,
        goldenMode: true,  // ← Aktiviert Golden Mode
    }
});
```

### Was passiert?
1. `applyGoldenFacts()` wird auf das Extraction-Ergebnis angewendet
2. Bestimmte Facts werden auf `'unknown'` gesetzt
3. Medical KB Rules matchen → Askbacks werden erzeugt
4. `result.state === 'questions'`

---

## Garantierte Askbacks

| Askback ID | Trigger | Regel |
|------------|---------|-------|
| `medical_mkv_confirmed` | GKV + Seitenzahn + Komposit + MKV=unknown | rule-mkv-required-for-side-composite |
| `medical_ueberkappung` | cariesDepth=profunda + capping=unknown | rule-profunda-requires-ueberkappung-askback |
| `medical_kofferdam` (optional) | kofferdamMentioned=true + used=unknown | rule-kofferdam-askback |

---

## Forced Facts

```typescript
// src/docudent/v10/golden/golden_dictation_facts.ts
export const GOLDEN_UNKNOWN_FACTS = {
    insuranceTrack: 'gkv',
    toothRegion: 'side',
    material: 'komposit',
    mkvPresent: 'unknown',
    cariesDepth: 'profunda',
    'capping.performed': 'unknown',
    adhesiveTechnique: 'unknown',
    kofferdamMentioned: true,
    kofferdamUsed: 'unknown',
};
```

---

## Invarianten

1. **Nur DEV/Test:** Kein Effekt auf Production
2. **Deterministisch:** Gleiche Eingabe → gleiche Askbacks
3. **Keine LLM-Abhängigkeit:** Funktioniert mit Stub-Extraction
4. **Mind. 2 Askbacks:** `getMinAskbackCount() >= 2`

---

## Smoke Test

```typescript
// __tests__/golden-mode-smoke.test.ts
describe('Golden Mode Smoke Test', () => {
  it('triggers at least 2 askbacks', async () => {
    const result = await runV10({
      dictation: "Füllung Zahn 36 okklusal",
      treatmentId: "fuellung",
      insuranceType: "GKV",
      testOnly: { enabled: true, goldenMode: true }
    });
    
    expect(result.state).toBe('questions');
    expect(result.questions?.length).toBeGreaterThanOrEqual(2);
  });
});
```
