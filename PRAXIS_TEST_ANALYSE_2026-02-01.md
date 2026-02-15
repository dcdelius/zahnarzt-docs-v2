# 🦷 Docudent V10 - Realistischer Praxis-Test Analyse

> DEPRECATED (2026-02-01): Dieses Dokument basiert auf einem veralteten/fehlverdrahteten Testlauf.
> Bitte nicht mehr als Referenz verwenden. Aktueller Stand ist der Scenario-Run:
> `docs/system-atlas/artifacts/_latest/v10-scenario-run/summary.md`

**Datum:** 2026-02-01  
**Tester:** Kimi Code CLI  
**Test-Szenario:** Doppelte Füllungstherapie (Zahn 26 MOD + Zahn 36 Okklusal)

---

## 📋 Zusammenfassung

Ein realistischer Praxis-Test wurde durchgeführt mit einem typischen Zahnarzt-Diktat:
- **Zahn 26:** MOD (3-flächig), Komposit, Kofferdam, Leitungsanästhesie
- **Zahn 36:** Okklusal (1-flächig), Bulk-Fill, Infiltrationsanästhesie
- **Versicherung:** GKV mit Mehrkostenvereinbarung (MKV)

### Ergebnis: 4/7 Checks (57%)

| Check | Status | Bemerkung |
|-------|--------|-----------|
| Zahn 26 erwähnt | ✅ | OK |
| Zahn 36 erwähnt | ✅ | OK |
| Komposit erwähnt | ✅ | OK |
| Kofferdam erwähnt | ❌ | Fehlt im Output |
| Mehrkosten erwähnt | ❌ | Fehlt im Output |
| BEMA-Codes vorhanden | ✅ | BEMA_13c für beide |
| GOZ-Codes vorhanden | ❌ | MKV-Addon fehlt |

---

## 🐘 Gefundene Fehler

### Fehler 1: GOZ-Codes fehlen trotz MKV (🔴 KRITISCH)

**Beschreibung:**  
Trotz `insuranceType: 'MKV'`, `mehrkostenActive: true` und `hasMKV: true` werden keine GOZ-Addon-Codes generiert. Die Pipeline gibt nur BEMA_13c für beide Zähne aus.

**Erwartet:**
- Zahn 26 (MOD): BEMA_13c + GOZ_2100 (Mehrkosten)
- Zahn 36 (Okklusal): BEMA_13a + GOZ_2060 (Mehrkosten)

**Tatsächlich:**
- Zahn 26: BEMA_13c (nur Basis)
- Zahn 36: BEMA_13c (falsch - sollte 13a sein)

**Ursache:**  
Die `surfaceBillingResolver.ts` kann zwar MKV_addon auflösen, aber die `processChipsToBilling`-Funktion in `treatmentEngine.ts` erhält keinen korrekten `BillingIntent`.

**Code-Location:**
```
src/docudent/v10/pipeline/runV10.ts (ca. Zeile 1495-1505)
src/docudent/core/billing/knowledgeBase/logic/treatmentEngine.ts (Zeile 287+)
```

**Fix-Vorschlag:**
```typescript
// In runV10.ts vor processChipsToBilling:
const billingIntent: BillingIntent = insuranceType === 'MKV' 
    ? { 
        mode: 'MKV', 
        allowBema: true, 
        allowGoz: false, 
        allowGozAddon: hasMKV  // hasMKV = mkvSignal && !facts.nurKasse
      }
    : insuranceType === 'PKV'
      ? { mode: 'PKV', allowBema: false, allowGoz: true, allowGozAddon: false }
      : { mode: 'GKV', allowBema: true, allowGoz: false, allowGozAddon: false };

// Und an processChipsToBilling übergeben
```

---

### Fehler 2: Kofferdam fehlt im Output-Text (🟡 MITTEL)

**Beschreibung:**  
Obwohl im Diktat "Kofferdam angelegt" explizit erwähnt wird, erscheint es nicht im generierten Text.

**Diktat:** "Kofferdam angelegt"  
**Output:** "Relative Trockenlegung" (statt "absolute Trockenlegung mit Kofferdam")

**Ursache:**  
Der Chip `kofferdam` hat `billingRef: null` mit Hinweis "F-Code aus surface_mapping". Er sollte Text generieren, aber die Text-Generierung scheint ihn zu überspringen oder der Chip wird nicht korrekt aktiviert.

**Code-Location:**
```
src/docudent/v10/renderer/renderFromKbChips.ts
src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json (Chip "kofferdam")
```

**Fix-Vorschlag:**
Prüfen, ob Chips mit `billingRef: null` trotzdem in die Text-Generierung einbezogen werden:

```typescript
// In renderFromKbChips.ts oder treatmentEngine.ts:
// Chips ohne billingRef sollten trotzdem Text generieren
if (!chip.billingRef && chip.textSnippets) {
    // Text generieren, kein Billing-Code
    textLines.push(chip.textSnippets[textLength]);
}
```

---

### Fehler 3: Mehrkostenvereinbarung fehlt (🟡 MITTEL)

**Beschreibung:**  
Trotz expliziter Erwähnung "Mehrkostenvereinbarung liegt vor" im Diktat erscheint sie nicht im Output.

**Diktat:** "Mehrkostenvereinbarung für Komposit liegt vor."

**Erwartet:** Ein Abschnitt wie:
```
[Mehrkostenvereinbarung]
Mehrkostenvereinbarung für Kompositfüllung liegt vor.
```

**Ursache:**  
Die MKV-Erkennung funktioniert (`detectMehrkostenMentioned` liefert `true`), aber der Text wird nicht in den Output-Sections eingefügt.

**Code-Location:**
```
src/docudent/v10/output/composeDocumentationV10.ts
src/docudent/v10/output/outputComposerV10.ts
```

**Fix-Vorschlag:**
```typescript
// In composeDocumentationV10.ts:
if (hasMKV && (facts.mehrkostenConfirmed || facts.mehrkostenMentioned)) {
    sections.push({
        id: 'mkv',
        label: 'Mehrkostenvereinbarung',
        content: `Mehrkostenvereinbarung für ${material} liegt vor.`
    });
}
```

---

### Fehler 4: Zahn 36 als MOD statt Okklusal (🟡 MITTEL)

**Beschreibung:**  
Zahn 36 sollte "okklusal" (1-flächig, BEMA_13a) sein, wird aber als MOD (3-flächig, BEMA_13c) erkannt.

**Diktat:** "An Zahn 36 okklusal eine kleine Karies"

**Erwartet:**  
- surfaces: ['o']
- BEMA_13a (1-flächig)
- GOZ_2060 (Mehrkosten)

**Tatsächlich:**  
- surfaces: ['m', 'o', 'd'] (MOD)
- BEMA_13c (3-flächig)

**Ursache:**  
Die Extraktion erkennt "okklusal" nicht korrekt und fällt auf Default/MOD zurück.

**Code-Location:**
```
src/docudent/v10/facts/buildFactsFromExtraction.ts (surface detection)
src/docudent/v10/extraction/
```

**Fix-Vorschlag:**
```typescript
// In buildFactsFromExtraction.ts:
if (rawDictation.match(/\bokklusal\b|\bokklusale\b|\bokklusaler\b/i)) {
    facts.surfaces = ['o'];  // Nur okklusal
} else if (rawDictation.match(/\bMOD\b|\bmod\b|\bmesial\b.*\bokklusal\b.*\bdistal\b/i)) {
    facts.surfaces = ['m', 'o', 'd'];  // MOD
}
```

---

## 🔧 Bereits Implementierte Fixes

### Fix 1: BillingIntent Default-Wert (surfaceBillingResolver.ts)

**Problem:**  
`Cannot read properties of undefined (reading 'allowBema')` - billingIntent war undefined.

**Fix:**  
Zeile 114-117 in `src/docudent/v10/billing/surfaceBillingResolver.ts`:

```typescript
// Vorher:
const intent: BillingIntent = typeof billingIntent === 'string'
    ? { mode: billingIntent, ... }
    : billingIntent;  // ← War undefined!

// Nachher:
const intent: BillingIntent = typeof billingIntent === 'string'
    ? { mode: billingIntent, ... }
    : billingIntent ?? { mode: 'GKV', allowBema: true, allowGoz: false, allowGozAddon: false };
```

**Status:** ✅ Implementiert

---

## 📊 Vergleich mit Offiziellem Testkatalog

### Offizieller Katalog (`docs/system-atlas/artifacts/_latest/v10-test-catalog.md`)

Der offizielle Katalog definiert:
1. **Füllung (Fuellung) – Kernfälle**
   - 1fl / 2fl / 3fl (MOD) jeweils mit/ohne LA, mit/ohne Kofferdam
   - Material: Komposit, Bulk, Flowable, GIZ
   - Versicherungen: GKV, MKV, PKV

2. **Erwartungen**
   - Text: Material wird fließend eingebaut, LA/Kofferdam/Cp/P korrekt erwähnt
   - Billing: BEMA 13/13b/13c + 12/40/IP4/25/26 je nach Logik
   - MKV/PKV: passende GOZ-Komponenten (2060/2080/2100 etc.)

3. **Settings-Propagation (kritisch)**
   - Facts: Defaults landen in `facts`
   - Text: Material-Defaults fließend integriert
   - Billing: Defaults beeinflussen Codes korrekt (z.B. MKV bei Mehrkosten-Setup)

4. **MKV / Mehrkosten-Details**
   - MKV explizit genannt
   - MKV Betrag + Begründung
   - Billing: GOZ-Addon korrekt, keine GOZ bei „nur Kasse“

### Offizielle Testergebnisse (`v10-scenario-run/summary.md`)

**29 Tests - 100% PASS**

Beispiele für MKV-Tests:
| ID | Szenario | BillingRefs | Status |
|----|----------|-------------|--------|
| 05 | MKV Mehrkosten explizit + Maßnahmen | BEMA_13, GOZ_2060, BEMA_12, BEMA_40... | PASS |
| 06 | MKV nur Kasse (Addon muss aus) | BEMA_13, BEMA_40, BEMA_IP4 | PASS |
| 17 | MKV 1fl + Mehrkosten | BEMA_13, GOZ_2060 | PASS |
| 19 | MKV 3fl + Cp | BEMA_13c, GOZ_2100, BEMA_25, BEMA_40 | PASS |

**Mein Test vs. Offiziell:**
- Mein komplexes Multi-Tooth-Szenario wird nicht explizit getestet
- Die offiziellen Tests sind isolierte Einzel-Fälle
- Mein Test deckt Integration mehrerer Features auf (Multi-Tooth + MKV)

---

## 🎯 Prioritären für Fixes

| Priorität | Fehler | Aufwand | Impact |
|-----------|--------|---------|--------|
| 🔴 P0 | GOZ-Codes fehlen | Mittel | KRITISCH - MKV funktioniert nicht |
| 🟡 P1 | Kofferdam-Text fehlt | Niedrig | Mittel - Dokumentation unvollständig |
| 🟡 P1 | Mehrkosten-Text fehlt | Niedrig | Mittel - Juristisch relevant |
| 🟡 P2 | Falsche Flächen | Mittel | Mittel - Falsche Abrechnung |

---

## 🧪 Test-Dateien

### Erstellte Test-Dateien:

1. **E2E Test:**
   ```
   e2e/v10-realistic-praxis-test.e2e.spec.ts
   ```

2. **Unit Test (Pipeline):**
   ```
   src/docudent/v10/__tests__/pipeline-realistic-praxis.test.ts
   ```

3. **Dieses Dokument:**
   ```
   PRAXIS_TEST_ANALYSE_2026-02-01.md
   ```

### Test-Ausführung:

```bash
# Unit Test (schnell, zuverlässig)
npx vitest run src/docudent/v10/__tests__/pipeline-realistic-praxis.test.ts

# E2E Test (langsam, braucht Build)
npm run build
npx playwright test e2e/v10-realistic-praxis-test.e2e.spec.ts

# Alle Gates
npm test -- --run src/docudent/v10/__tests__/gates
```

---

## 📁 Relevante Code-Dateien

### Pipeline & Orchestration:
- `src/docudent/v10/pipeline/runV10.ts` - Haupt-Pipeline
- `src/docudent/v10/pipeline/billingEligibilityGuard.ts` - Billing Guard

### Billing & Abrechnung:
- `src/docudent/v10/billing/surfaceBillingResolver.ts` - F-Code Auflösung
- `src/docudent/core/billing/knowledgeBase/logic/treatmentEngine.ts` - Engine

### Extraktion & Fakten:
- `src/docudent/v10/facts/buildFactsFromExtraction.ts` - Fakten-Builder
- `src/docudent/v10/extraction/` - Extraktions-Module

### Output & Text:
- `src/docudent/v10/output/composeDocumentationV10.ts` - Dokumentation
- `src/docudent/v10/renderer/renderFromKbChips.ts` - Renderer

### Knowledge Base:
- `src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json` - Füllung-Konfig

---

## 💡 Empfehlungen

1. **Sofort fixen:** GOZ-Codes für MKV (P0)
   - Die Surface-Mapping-Auflösung muss korrekte BillingIntents erhalten
   - Test mit Szenario 05, 17, 19 aus dem offiziellen Katalog

2. **Als Nächstes:** Kofferdam- und Mehrkosten-Text (P1)
   - Text-Generierung für non-billing Chips prüfen
   - MKV-Section in Output-Composer hinzufügen

3. **Danach:** Extraktions-Verbesserung (P2)
   - "Okklusal" als explizite Surface-Erkennung
   - Test mit verschiedenen Flächen-Kombinationen

4. **Langfristig:** Integrationstests
   - Mehr Multi-Tooth-Szenarien im offiziellen Katalog
   - Automatisierte Regression-Tests für MKV

---

**Ende der Analyse**
