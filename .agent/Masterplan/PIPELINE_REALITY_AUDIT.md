# PIPELINE REALITY AUDIT v2 — VERBINDLICH

> **Datum:** 2025-12-12  
> **Fehler:** `Objects are not valid as React child (found: object with keys {id, type, title, description, affectedCodes})`  
> **Status:** ROOT CAUSE GEFUNDEN UND BEWIESEN

---

## 🔴 EXAKTER CRASH-LOCATION (BEWIESEN)

### Datei: `DocudentV6Page.tsx`

**Zeile 1143-1145:**
```tsx
{output.warnings.map((w: string, i: number) => (
    <li key={i}>
        • {w}   // ❌ CRASH: w ist ValidationWarning{}, nicht string!
    </li>
))}
```

### Beweis des Type-Mismatch:

| Stelle | Erwartet | Tatsächlich |
|--------|----------|-------------|
| `DocudentV6Page.tsx:1143` | `w: string` | `w: ValidationWarning` |
| `useDocudentV6.ts:92` | Interface definiert | `warnings: ValidationWarning[]` |
| `ValidationWarning` (Zeile 74-81) | - | `{id, type, title, description, affectedCodes}` |

---

## 🔍 1. PIPELINE-WAHRHEITSMAP (VOLLSTÄNDIG)

| Step | Datei | Funktion | Datentyp rein | Datentyp raus | Getestet? | UI nutzt? |
|------|-------|----------|---------------|---------------|-----------|-----------|
| 1 | `DocudentV6Page.tsx` | User Input | `void` | `dictation: string` | ❌ | ✅ |
| 2 | `extractionService.ts` | `extractFromDictation()` | `string` | `ExtractedData` | ❌ | ✅ |
| 3 | `questionService.ts` | `generateQuestions()` | `ExtractedData` | `DynamicQuestion[]` | ❌ | ✅ |
| 4 | `useDocudentV6.ts` | `answerQuestion()` | `click event` | `Map<qId, answerId>` | ❌ | ✅ |
| 5 | `outputService.ts` | `generateFinalOutput()` | `ExtractedData, Map` | `FinalOutput` | ❌ | ✅ |
| 6 | `outputService.ts` | `determineActiveChips()` | `ExtractedData, Map` | `string[]` | ❌ | ✅ |
| 7 | `treatmentEngine.ts` | `processChipsToBilling()` | `chipIds, insurance` | `ProcessingResult` | ✅ 36 Tests | ✅ via outputService |
| 8 | `treatmentEngine.ts` | `generateAuditNotes()` | `chipIds, context` | `{warnings[], optimizations[]}` | ✅ | ✅ via outputService |
| 9 | `outputComposer.ts` | `composeOutput()` | `template, chips` | `ComposedOutput` | ✅ 147 Tests | ❌ NIEMALS |
| 10 | `DocudentV6Page.tsx` | `OutputSection` | `FinalOutput` | `React.ReactNode` | ❌ | ✅ |

### ⚠️ KRITISCH:

- **Getestet aber nie genutzt:** `outputComposer.composeOutput()` (147 Tests!)
- **Genutzt aber nie getestet:** `outputService.generateFinalOutput()`, `determineActiveChips()`, `buildTextWithSettings()`

---

## 🔍 2. TEST-REALITÄTS-ABGLEICH

### Was Tests aufrufen vs UI aufruft:

| Funktion | Tests | UI | Status |
|----------|-------|-----|--------|
| `composeOutput()` | 147 Tests | ❌ NIE | **TOTER CODE für UI** |
| `processChipsToBilling()` | 36 Tests | ✅ via outputService | OK |
| `generateAuditNotes()` | indirekt | ✅ via outputService | OK |
| `generateFinalOutput()` | ❌ NIE | ✅ | **UNGETESTET** |
| `determineActiveChips()` | ❌ NIE | ✅ | **UNGETESTET** |
| `buildTextWithSettings()` | ❌ NIE | ✅ | **UNGETESTET** |
| `extractFromDictation()` | ❌ NIE | ✅ | **UNGETESTET** |
| `generateQuestions()` | ❌ NIE | ✅ | **UNGETESTET** |

### Kernlogik zweifach implementiert:

| Logik | Engine-Ort | UI-Duplikat |
|-------|-----------|-------------|
| Chip-Inferenz | `inferChipsFromDictation()` | `determineActiveChips()` in outputService |
| Text-Generierung | `composeOutput()` | `buildTextWithSettings()` in outputService |
| Question→Chip Mapping | (nicht vorhanden) | `answerToChipMap` hardcoded |

---

## 🔍 3. UI-RENDERING-VERTRAG (ALLE TYPE-MISMATCHES)

| Datei | Zeile | UI erwartet | Tatsächlich geliefert | Crash? |
|-------|-------|-------------|----------------------|--------|
| `DocudentV6Page.tsx` | 1143 | `w: string` | `w: ValidationWarning` | **JA** |
| `DocudentV6Page.tsx` | 1165 | `o: string` | `o: string` | Nein |

### ValidationWarning Interface (Zeile 74-80):
```typescript
interface ValidationWarning {
    id: string;
    type: 'regress' | 'warning' | 'info';
    title: string;
    description: string;
    affectedCodes: string[];
}
```

---

## 🔍 4. ROOT-CAUSE-ERKLÄRUNG

### Warum 147 Golden-Output-Tests diesen Crash nicht finden:

1. Tests rufen `composeOutput()` auf — UI ruft das **NIE** auf
2. Tests prüfen `ComposedOutput.sections[]` — UI verwendet `FinalOutput.warnings[]`
3. Keine Tests für `generateFinalOutput()` oder `OutputSection` Rendering
4. **Es gibt KEINEN Test der prüft was die UI tatsächlich rendert**

### Warum outputComposer perfekt getestet aber UI-irrelevant:

```
TESTS:  composeOutput() → 147 Tests → PASS
UI:     outputService.generateFinalOutput() → processChipsToBilling() → UNGETESTET
```

Die beiden Pipelines sind **disjunkt**. Tests beweisen nur dass der nicht-genutzte Code funktioniert.

### Warum parallele Text-Generierung existiert:

1. `outputComposer.buildProse()` — Template-basiert, SSOT-compliant, NIEMALS von UI aufgerufen
2. `outputService.buildTextWithSettings()` — Hardcoded Templates, UI nutzt dies
3. Beide existieren weil UI **refactored wurde ohne Tests anzupassen**

---

## �️ FIX-STRATEGIE (VERBINDLICH, PRIORISIERT)

### PFLICHT-FIX 1: Crash sofort beheben (10 min)

**Datei:** `DocudentV6Page.tsx`, Zeile 1143-1145

```diff
- {output.warnings.map((w: string, i: number) => (
-     <li key={i}>• {w}</li>
+ {output.warnings.map((w, i) => (
+     <li key={i}>• {w.title}</li>
```

### PFLICHT-FIX 2: Error-State anzeigen (15 min)

**Datei:** `useDocudentV6.ts`, Zeile 466-469

```diff
  } catch (error) {
      console.error('[V6] Output generation failed:', error);
-     setState(s => ({ ...s, isProcessing: false }));
+     setState(s => ({
+         ...s,
+         isProcessing: false,
+         error: String(error),  // NEW: Error-State für UI
+         step: 'output'  // Trotzdem zu output gehen
+     }));
  }
```

### PFLICHT-FIX 3: Integration Test (30 min)

Erstelle Test der echten Pipeline:

```typescript
// test/v6-integration.test.ts
it('full flow: dictation → output render', async () => {
    const result = await generateFinalOutput({
        extracted: { tooth: '36', surfaces: ['m','o','d'], ...},
        answers: new Map(),
        insuranceType: 'GKV',
        textLength: 'mittel'
    });
    
    // Prüfe dass warnings renderbar sind
    expect(result.warnings.every(w => typeof w.title === 'string')).toBe(true);
    // Prüfe dass React-Rendering nicht crasht
    expect(() => render(<OutputSection output={result} />)).not.toThrow();
});
```

### PIPELINE-FIX (2h, nach MVP):

**Option A:** UI auf `composeOutput()` umstellen
- (+) 147 Tests werden relevant
- (-) Größerer Umbau

**Option B:** Tests auf `generateFinalOutput()` umstellen
- (+) Tests testen produktiven Code
- (-) 147 Tests werden obsolet

→ **Empfehlung: Option A** (SSOT bleibt erhalten)

---

## ✅ VERBINDLICHE CHECKLISTE

| # | Fix | Status | Blockiert MVP? |
|---|-----|--------|---------------|
| 1 | `w.title` statt `w` in Zeile 1143 | TODO | **JA** |
| 2 | Error-State in catch-Block | TODO | **JA** |
| 3 | Integration Test für echten Flow | TODO | **JA** |
| 4 | Pipeline-Alignment (Option A oder B) | TODO | Nein (Post-MVP) |

---

## Fazit

> **Die Tests lügen nicht — sie testen den falschen Code.**

Der Crash passiert weil:
1. `FinalOutput.warnings` ist `ValidationWarning[]` (Objekte)
2. UI rendert `{w}` direkt statt `{w.title}`
3. React crashed bei Objekt-Rendering

**147 Tests konnten das nicht finden weil sie `composeOutput()` testen, welches von der UI NIE aufgerufen wird.**
