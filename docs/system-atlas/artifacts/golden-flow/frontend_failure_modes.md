# G119 — Frontend Failure Modes: Warum "nichts gefragt wurde"

**Ziel:** Analysieren, warum Askbacks in Tests/UI nicht erschienen

---

## Failure Mode 1: Stub Extraction → Keine Unknown Facts

### Problem
```
Stub-Extractor liefert:
{
  "tooth": "36",
  "surfaces": ["o"],
  "material": "komposit"
}

→ cariesDepth NICHT gesetzt
→ adhesiveMentioned NICHT gesetzt
→ hasMKV NICHT gesetzt
```

### Konsequenz
- Askback-Regeln matchen nicht
- `cariesDepth === 'profunda'` → false
- `adhesiveMentioned !== true && hasMKV === true` → false
- Keine Rückfragen, direkt Output

### Root Cause
Stub-Extraction ist für schnelle Tests optimiert, nicht für Vollständigkeit.

### Fix
```typescript
// golden_dictation_facts.ts
export const GOLDEN_EXTRACTION = {
  cariesDepth: 'unknown',  // → triggers capping askback
  adhesiveMentioned: true,
  adhesiveApplied: undefined,  // → triggers adhesive askback
  hasMKV: undefined,  // → triggers MKV askback
};
```

**Status:** ✅ `goldenMode` in V10TestOnlyOptions implementiert

---

## Failure Mode 2: LLM Extraction fehlt → Fallback auf Stub

### Problem
```
[Core Extract] LLM failed, using fallback: TypeError: 
  Cannot read properties of undefined (reading 'VITE_OPENAI_API_KEY')
```

### Konsequenz
- Im CLI-Test: Kein API-Key → Stub
- In Browser mit API-Key: LLM funktioniert → Askbacks erscheinen
- Diskrepanz zwischen Test und Prod

### Fix
```bash
# .env.local
VITE_OPENAI_API_KEY=sk-...
```

Oder: Explizit `testOnly.forceExtraction` verwenden.

---

## Failure Mode 3: Facts ohne Askback-Trigger

### Problem
Medical KB Regeln matchen nur bei bestimmten Kombinationen:

| Regel | Benötigt | Tatsächlich |
|-------|----------|-------------|
| `rule-profunda-capping` | `cariesDepth === 'profunda'` | `cariesDepth === undefined` |
| `rule-adhesive-unclear` | `adhesiveMentioned === true && adhesiveApplied === undefined` | `adhesiveMentioned === undefined` |

### Konsequenz
Regeln feuern nicht → keine Askbacks

### Fix
Extraction muss `unknown` setzen, nicht `undefined`:
```typescript
// buildFactsFromExtraction.ts
if (extracted.adhesive === undefined) {
  facts.adhesiveMentioned = extracted.dictation.includes('adhäsiv');
}
```

---

## Failure Mode 4: Chips existieren, aber UI zeigt sie nicht

### Problem
```javascript
// DocudentV10Page.tsx
result.chips  // ← existiert im Debug
// aber:
<OutputFlow output={output} />  // ← zeigt nur fullText, billingCodes
```

### Konsequenz
- Backend: Chips korrekt emittiert
- Frontend: Chips nur im V10DebugDrawer sichtbar
- User sieht keine Chip-Information

### Fix
```typescript
// Option A: Chips inline zeigen
<OutputFlow output={output} chips={result.chips} />

// Option B: V10ChipsPanel im Haupt-Flow
{currentState === 'output' && <V10ChipsPanel chips={result.chips} />}
```

---

## Failure Mode 5: hasAnyUnanswered false obwohl Fragen offen

### Problem
```typescript
// runV10.ts:380
if (hasAnyUnanswered) {
    // Questions state
} else {
    // Output state
}
```

`hasAnyUnanswered` berechnet sich aus `compiledBundle.required`.

Wenn keine Askbacks generiert wurden → `required = []` → `hasAnyUnanswered = false`

### Konsequenz
State geht direkt zu `output`, nie zu `questions`.

### Root Cause
Upstream: Extraction liefert keine `unknown` Facts.

---

## Failure Mode 6: Multi-Treatment → Askbacks gemischt

### Problem
```typescript
// Bei 2 Zähnen:
createInstancesAndRun([
  { instanceId: "tooth:36", ... },
  { instanceId: "tooth:14", ... }
])
```

Aber `QuestionsFlowV2` zeigt Fragen ohne Tooth-Kontext:
```
"Wurde Adhäsivtechnik angewendet?"
// Welcher Zahn?? 36 oder 14?
```

### Konsequenz
User beantwortet für falschen Zahn.

### Fix
```typescript
// Tooth-Kontext in Frage:
question.label = `Zahn ${tooth}: ${question.label}`;
```

---

## Zusammenfassung: Warum "nichts gefragt wurde"

| # | Failure Mode | Symptom | Root Cause |
|---|--------------|---------|------------|
| 1 | Stub → keine unknown | Direkt Output | Stub setzt keine medizinischen Facts |
| 2 | LLM fehlt | Fallback zu Stub | Kein API-Key in Umgebung |
| 3 | Facts ohne Trigger | Keine Askbacks | Extraction setzt `undefined` statt `unknown` |
| 4 | Chips nicht sichtbar | UI zeigt nichts | V10ChipsPanel nicht im Haupt-Flow |
| 5 | hasAnyUnanswered = false | Direkt Output | Keine required Questions generiert |
| 6 | Multi-Treatment | Falscher Kontext | Kein Tooth-Scope in UI |

---

## Konkrete Fix-Empfehlungen

### Sofort (G109 bereits umgesetzt)
- [x] `goldenMode` in V10TestOnlyOptions
- [x] `golden_dictation_facts.ts` mit expliziten unknown Values

### Nächste Schritte
- [ ] Extraction: `unknown` statt `undefined` für fehlende medizinische Facts
- [ ] V10ChipsPanel in Haupt-Flow integrieren
- [ ] Tooth-Kontext in Askback-Labels

### Test-Verifikation
```typescript
const result = await runV10({
  dictation: "Füllung Zahn 36 okklusal Komposit",
  treatmentId: "fuellung",
  testOnly: { enabled: true, goldenMode: true }
});

expect(result.state).toBe('questions');
expect(result.questions.length).toBeGreaterThanOrEqual(2);
```
