# Analyse-Bericht: Prompt-Architektur "Zwiebel-Prinzip"

## Zusammenfassung
Das "Zwiebel-Prinzip" (Layered Prompting) ist im Kern eine sehr leistungsfähige Architektur. Es erlaubt maximale Flexibilität bei gleichzeitiger Kontrolle. Allerdings hat die Analyse **zwei kritische Schwachstellen** aufgedeckt, die zu Halluzinationen oder Inkonsistenzen führen können, sowie Verbesserungspotenzial bei der Effizienz.

## 1. Kritische Schwachstellen (Bugs)

### A. Der "Blueprint-Konflikt" (Schwerwiegend)
**Problem:** Wenn ein Nutzer eine **eigene Struktur** (Custom Blueprint) definiert (z.B. "1. Diagnose, 2. Therapie"), injiziert das System zwar diese Anweisung, zeigt der KI aber im "One-Shot Learning" (Beispiel-Output) weiterhin die **Standard-Struktur** (Modern 2-Block).
**Folge:** Die KI ist verwirrt. Sie erhält den Befehl "Folge Struktur A", sieht aber ein Beispiel in "Struktur B". Das führt oft dazu, dass sie das Beispiel kopiert und die Anweisung ignoriert -> **Struktur-Bruch**.
**Lösung:** Wenn ein Custom Blueprint aktiv ist, muss das Beispiel entweder:
1.  Dynamisch an die neue Struktur angepasst werden (schwierig).
2.  Oder ausgeblendet/neutralisiert werden (einfacher & sicherer).

### B. Die "Sicherheits-Lücke" (Reihenfolge)
**Problem:** Die "Sicherheits-Polizei" (Layer 5, Absolute Regeln) wird **vor** dem "Medizinischen Herz" (Layer 4, Template-Logik) in den Prompt eingefügt.
**Code-Realität:**
1.  Global Context
2.  Safety Rules (Layer 5)
3.  Template Logic (Layer 4)
**Folge:** Durch den "Recency Bias" (das Letzte wiegt schwerer) könnte eine ungünstig formulierte Vorlage die Sicherheitsregeln überschreiben. Wenn im Template steht "Schreibe immer mod", könnte die Regel "Schreibe nur mod wenn 3 Flächen" ausgehebelt werden.
**Lösung:** Die "Absolute Regeln" müssen zwingend **ganz am Ende** des System-Prompts stehen, nach der Template-Logik.

## 2. Antworten auf Ihre Fragen

### "Haben wir zu viele Schritte?"
**Nein.** Die Schritte (Layer) sind notwendig, um die gewünschte Granularität (Länge, Forensik, Struktur) zu erreichen. Das Problem sind nicht die Schritte an sich, sondern wie sie zusammengesetzt werden. Der Prompt ist teilweise redundant (doppelte Erwähnung von Zahnflächen-Regeln in Layer 1 und Layer 5).

### "Sollte man dem Zahnarzt streng nach Vorlage arbeiten lassen?"
**Ja, aber intelligent.**
Anstatt den Arzt zu zwingen, sollte das System die **Struktur im Output** härter erzwingen.
**Empfehlung:** Nutzen Sie **XML-Tags** im Prompt, um der KI die Struktur "einzuprügeln".
Statt nur Text-Beschreibungen, sagen Sie der KI:
*"Antworte im Format:*
`<billing>...</billing>`
`<medical>...</medical>`
`<forensic>...</forensic>`"
Das reduziert Halluzinationen massiv, da die KI genau weiß, wo welcher Inhalt hingehört.

## 3. Detail-Analyse der Layer

| Layer | Status | Bewertung |
| :--- | :--- | :--- |
| **1. Input (Zutaten)** | ✅ Gut | Die Trennung von Vorlage, Settings und Diktat ist sauber. |
| **2. Struktur (Blueprint)** | ⚠️ Risiko | Funktioniert für Standards, bricht bei Custom-Blueprints (siehe oben). |
| **3. Stil (Länge/Forensik)** | ✅ Sehr Gut | Die Textbausteine für "Ultra-Kurz" bis "Forensik-Max" sind exzellent und effektiv. |
| **4. Medizin (Template)** | ⚠️ Position | Steht im Prompt an der falschen Stelle (nach den Sicherheitsregeln). |
| **5. Sicherheit (Police)** | ⚠️ Position | Inhaltlich stark ("Erfinde keine Preise"), aber positionell zu schwach. |
| **6. Beispiel (One-Shot)** | ❌ Kritisch | Statisch. Passt sich nicht an Custom-Blueprints an. Hauptquelle für Inkonsistenzen. |

## 4. Konkrete Handlungsempfehlungen

1.  **Fix Blueprint-Mismatch:** Im Code (`buildGPTPrompts.js`) prüfen: Wenn `templateCustomBlueprint` aktiv ist, darf `getExampleOutput` kein Standard-Beispiel zurückgeben, sondern ein generisches oder passendes.
2.  **Reorder Prompt:** Verschieben Sie den Block `ABSOLUTE REGELN` im Code ganz nach unten, direkt vor den User-Prompt.
3.  **Redundanz entfernen:** Entfernen Sie die Zahnflächen-Regeln aus dem `GERMAN_DENTAL_CONTEXT` (Layer 1) und lassen Sie sie nur in den `ABSOLUTE REGELN` (Layer 5). Das spart Token und schärft den Fokus.
4.  **XML-Struktur:** Führen Sie XML-Tags für die Output-Struktur ein (z.B. `<abrechnung>`, `<behandlung>`). Das macht das Parsen und die Darstellung im Dashboard viel robuster.

## Fazit
Das System ist **architektonisch gesund**, leidet aber an **Integrations-Fehlern** (Reihenfolge, Beispiel-Konsistenz). Mit den oben genannten Korrekturen (ohne großen Umbau) lässt sich die Zuverlässigkeit deutlich steigern.
