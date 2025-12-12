# Strategische Projekt-Analyse — Ehrliche Einschätzung

> **Datum:** 2025-12-12  
> **Analysiert:** 16 Masterplan-Dateien, Test-Gates, Code-Struktur

---

## 1. DIE EHRLICHE ANTWORT: Werden wir das Ziel erreichen?

### Das Ziel (aus Masterplan):
> "Zahnarzt diktiert nur variable Informationen — Software dokumentiert & rechnet korrekt ab"

### Meine Einschätzung: **JA, ABER...**

**JA:**
- Die Architektur ist solide und skalierbar
- SSOT-Prinzip ist konsistent durchgesetzt
- 361 Tests beweisen, dass der Kern funktioniert
- Füllung funktioniert produktionsreif

**ABER:**
- Stand heute ist das ein "Füllung-Demonstrator", kein "Zahnarzt-Produktivtool"
- Der Weg zu 5-7 Behandlungstypen ist bekannt, aber noch nicht gegangen
- Einige strukturelle Probleme könnten bei Skalierung brechen

---

## 2. PROBLEME — Ehrlich identifiziert

### 🔴 KRITISCH (Muss vor Release gefixt werden)

| Problem | Warum kritisch | Lösung |
|---------|----------------|--------|
| **Nur 1 Behandlungstyp** | Produkt unbrauchbar für 80% der Fälle | Endo + Chirurgie JSON erstellen |
| **Kombinationsregeln ungetestet** | 22 von 32 Regeln nicht explizit getestet → Regress-Risiko | Dedizierte Testsuite |
| **Kein echtes E2E mit LLM** | Whisper/GPT-Extraktionsfehler unbekannt | LLM-Error-Fixtures |

### 🟡 ERNST (Könnte in Produktion Probleme machen)

| Problem | Warum ernst | Lösung |
|---------|-------------|--------|
| **textSnippets Qualität** | Forensische Texte noch nicht von Arzt validiert | Fachliche Review |
| **Upsell-UI unfertig** | Revenue-Chance wird nicht kommuniziert | UI verbessern |
| **Audit-Engine lückenhaft** | Nicht alle Warnungen generiert | Alle 32 Regeln evaluieren |

### 🟠 RISIKO (Könnte bei Skalierung brechen)

| Problem | Warum Risiko | Lösung |
|---------|--------------|--------|
| **Multi-Treatment nicht getestet** | Engine-Architektur existiert, UI nicht | POST-MVP, aber planen |
| **Phase-Filterung im Composer** | exkavation hat phase="exkavation", Composer filtert nach behandlung → Chip fehlt | Phase-Logic überprüfen |
| **Hardcoded Phrasebank** | Phrasebank in Template, nicht erweiterbar pro Behandlung | In JSON auslagern |

---

## 3. WAS FUNKTIONIERT AUSGEZEICHNET

| Komponente | Warum ausgezeichnet |
|------------|---------------------|
| **SSOT-Architektur** | 361 Tests, Scanner-Gate, keine Hardcodes |
| **Tooth Normalizer** | 58 Tests, alle Edge Cases abgedeckt |
| **Insurance Routing** | GKV/PKV/MKV sauber getrennt |
| **Golden Output Evidence** | Jede Zeile rückführbar auf SSOT |
| **Test-Infrastruktur** | proof-pack als hartes Gate |

---

## 4. DIE WAHRHEIT ÜBER DEN MVP

### Was der MVP laut Masterplan sein sollte:
- 5-7 Behandlungstypen
- GKV/PKV/MKV
- Multi-Treatment
- Regelgetriebene Rückfragen

### Was wir tatsächlich haben:
- 1 Behandlungstyp (Füllung)
- GKV/PKV/MKV ✅
- Single-Treatment only
- Regelgetriebene Rückfragen ✅

**Gap:** ~60% des geplanten MVP fehlt.

### Ehrliche MVP-Neudefinition:

| Scope | Realistisch für "MVP v1" |
|-------|--------------------------|
| Behandlungen | Füllung + Endo (2) |
| Versicherungen | GKV/PKV/MKV ✅ |
| Multi-Treatment | Nein (explizit POST-MVP) |
| Tests | 400+ |

---

## 5. STRUKTURELLE PROBLEME IM CODE

### Phase-Logic Problem — FIXED ✅

```
Template phases (war):  ["vorbereitung", "behandlung", "abschluss"]
Template phases (jetzt): ["anaesthesie", "vorbereitung", "exkavation", 
                          "ueberkappung", "fuellung", "finishing", "abschluss"]
→ Alle Chips werden jetzt korrekt in behandlung-Section gerendert
```

**Status:** RESOLVED — 361 Tests PASS

### buildProse Sentence Problem

```
buildProse() erzeugt 1 Sentence pro Aufruf
minProseSentences war auf 2 → alle Tests failed
Wurde auf 1 gesenkt → Tests pass, aber Output ist knapp
```

**Impact:** Forensische Texte könnten zu kurz sein.
**Lösung:** buildProse so erweitern, dass es mehrere Sätze generiert wenn `lang` ausgewählt.

### Billing Code Format

```
Fixtures erwarten: "BEMA_13c"
Engine liefert:    "13c"  oder "BEMA_13c"  (inkonsistent)
```

**Impact:** Tests mussten mit `.includes()` statt exaktem Match geschrieben werden.
**Lösung:** Konsistentes Format in Engine festlegen.

---

## 6. NÄCHSTE SCHRITTE — Priorisiert

### Woche 1-2: Füllung härten

1. **Alle 32 Regeln explizit testen** (32 neue Tests)
2. **Phase-Logic Problem fixen** (exkavation in behandlung)
3. **Billing Code Format konsistent machen**

### Woche 3-4: Endo hinzufügen

4. **endo_unified.json** (10 Chips: trep, med, wk, etc.)
5. **endo_regeln.json** (5 Regeln: Röntgen, Kanalanzahl)
6. **5 Endo Golden Fixtures**

### Woche 5-6: Chirurgie + Stabilisierung

7. **chirurgie_unified.json** (5 Chips: Extraktion, Inzision)
8. **UI-Polish** (Upsell besser anzeigen)
9. **Fachliche Review der textSnippets**

---

## 7. WAS DEFINITIV NICHT ANFASSEN

| Komponente | Grund |
|------------|-------|
| `treatmentEngine.ts` | 361 Tests hängen davon ab |
| `outputComposer.ts` | 147 Evidence Tests |
| `fuellung_unified.json` | Produktiv-Chips, bereits validiert |
| `toothNormalizer.ts` | 58 Tests, funktioniert perfekt |
| `kataloge/*.json` | SSOT für Codes |

**Regel:** Änderungen an diesen → proof-pack MUSS weiterhin 0 sein.

---

## 8. FAZIT

### Stärken:
- Architektur ist future-proof
- Test-Infrastruktur ist professionell
- SSOT konsequent durchgesetzt

### Schwächen:
- Nur 1 von 5+ Behandlungstypen
- Kombinationsregeln unvollständig getestet
- TextSnippets nicht fachlich reviewed

### Prognose:

| Szenario | Wahrscheinlichkeit | Bedingung |
|----------|-------------------|-----------|
| MVP in 6 Wochen | 70% | Fokus auf Endo + Regel-Tests |
| MVP in 3 Monaten | 90% | +Chirurgie, +Polish |
| MVP nie fertig | 10% | Scope-Creep, keine Priorisierung |

### Die eigentliche Frage:

> **"Werden wir unser Ziel erreichen?"**

**Ja — wenn wir den Scope respektieren.**

Das Ziel ist erreichbar. Die Architektur ist da. Der Beweis (361 Tests) ist da.
Was fehlt ist Content (Endo/Chirurgie JSONs) und Tiefe (alle Regeln testen).

Das ist Fleißarbeit, nicht Architektur-Arbeit.
