# Performance-Analyse: Gemini Template-Filling Workflow

## Aktueller Prompt-Aufbau (SEHR LANG!)

### 1. Globaler Prompt (~200 Zeichen)
```
Du arbeitest grundsätzlich im Kontext der deutschen Zahnmedizin.
Verwende das FDI-Zahnschema (z. B. 14, 36, 21).
Zahnflächen immer als Kleinbuchstaben nach deutscher Konvention: b, m, d, p, l, o, i, v.
Nutze ausschließlich fachlich korrekte, präzise zahnmedizinische Terminologie.
Keine Erfindungen, keine Synonyme, keine Ausschmückungen.
Dokumentationen sind sachlich, knapp, medizinisch korrekt und folgen üblichen zahnärztlichen Standards.
```

### 2. Template-spezifischer Prompt aus Firebase (~2000+ Zeichen)
- Enthält: MATERIAL-REGELN, FLÄCHEN-ERKENNUNG, KAVITÄTENKLASSEN, etc.
- **PROBLEM:** Enthält bereits Material-Regeln!

### 3. Material-Zuordnungsregeln in GeminiService (~1500+ Zeichen)
- SCHRITT 1: Kategorisierung
- SCHRITT 2: Feld-Zuordnung
- SCHRITT 3: Strenge Regeln
- BEISPIELE
- **PROBLEM:** Doppelt sich mit template-spezifischem Prompt!

### 4. WICHTIG-Sektion (~500 Zeichen)
- Wiederholt: FDI-Schema, Flächen-Konvention, Material-Regeln
- **PROBLEM:** Doppelt sich mit globalem Prompt und Material-Regeln!

### 5. Weitere Inhalte
- Vorlagen-Struktur: variabel (kann sehr lang sein)
- Material-Liste: variabel
- Bausteine: variabel
- Diktat: variabel

## GESAMT-PROMPT: ~5000-8000+ Zeichen! 🐌

## IDENTIFIZIERTE PROBLEME:

### ❌ Problem 1: Doppelte Material-Regeln
- Im template-spezifischen Prompt (Firebase): "MATERIAL-REGELN" + "INTELLIGENTE MATERIAL-ZUORDNUNG"
- In GeminiService: "KRITISCH - MATERIAL-ZUORDNUNG" (sehr detailliert)
- In WICHTIG-Sektion: "MATERIALIEN - KRITISCH" (wiederholt)
- **→ 3x Material-Regeln!**

### ❌ Problem 2: Doppelte Flächen-Erkennung
- Im template-spezifischen Prompt: "FLÄCHEN-ERKENNUNG" (detailliert)
- Im globalen Prompt: "Zahnflächen immer als Kleinbuchstaben..."
- In WICHTIG-Sektion: "Flächen automatisch in Kleinbuchstaben-Konvention umwandeln"
- **→ 3x Flächen-Regeln!**

### ❌ Problem 3: Doppelte FDI-Regeln
- Im globalen Prompt: "Verwende das FDI-Zahnschema"
- In WICHTIG-Sektion: "ZAHNNUMMERN: Verwende IMMER das FDI-Schema OHNE Punkt"
- **→ 2x FDI-Regeln!**

### ❌ Problem 4: Sehr langer Material-Block
- Material-Zuordnungsregeln sind extrem detailliert (~1500 Zeichen)
- Könnte kompakter sein

### ❌ Problem 5: maxOutputTokens zu hoch
- Aktuell: 1500
- Könnte reduziert werden auf 1200-1000

## OPTIMIERUNGSPLAN:

### ✅ Lösung 1: Material-Regeln konsolidieren
- Entferne Material-Regeln aus GeminiService (wenn im template-Prompt vorhanden)
- Oder: Entferne aus template-Prompt, behalte nur in GeminiService
- **Ersparnis: ~1500 Zeichen**

### ✅ Lösung 2: Flächen-Erkennung konsolidieren
- Entferne aus WICHTIG-Sektion (bereits im globalen Prompt)
- **Ersparnis: ~100 Zeichen**

### ✅ Lösung 3: FDI-Regeln konsolidieren
- Entferne aus WICHTIG-Sektion (bereits im globalen Prompt)
- **Ersparnis: ~50 Zeichen**

### ✅ Lösung 4: Material-Zuordnungsblock kompakter machen
- Reduziere Beispiele und Wiederholungen
- **Ersparnis: ~500-800 Zeichen**

### ✅ Lösung 5: maxOutputTokens reduzieren
- Von 1500 auf 1200 oder 1000
- **Schnellere Verarbeitung**

### ✅ Lösung 6: Template-Prompt prüfen
- Wenn Material-Regeln bereits im template-Prompt sind, nicht nochmal in GeminiService
- **Ersparnis: ~1500 Zeichen**

## GESAMT-ERSPARNIS: ~3000-4000 Zeichen (40-50% Reduktion!)

## ERWARTETE VERBESSERUNG:
- **Vorher:** ~5000-8000 Zeichen → langsam
- **Nachher:** ~2000-4000 Zeichen → deutlich schneller
- **Geschwindigkeit:** 2-3x schneller


