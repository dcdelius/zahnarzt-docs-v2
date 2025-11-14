# Material & GPT-Konfiguration - Erklärung

## ✅ Was wurde implementiert:

### 1. **Material-Feld wird jetzt automatisch verwendet**

**Vorher:** Material wurde nur gespeichert, aber nicht an GPT übergeben.

**Jetzt:**
- Material wird automatisch aus der Vorlage extrahiert
- Wird in den GPT User-Prompt eingefügt
- GPT erhält Anweisung: "Wenn [MATERIAL] in der Vorlage steht, verwende [Material aus Vorlage]"
- Wenn im Diktat andere Materialien erwähnt werden, werden diese bevorzugt

**Beispiel:**
- Vorlage hat Material: "Komposit, Gaenial Flow A2"
- In Vorlage steht: "Füllung mit [MATERIAL]"
- GPT füllt automatisch: "Füllung mit Komposit, Gaenial Flow A2"
- Wenn Diktat sagt: "Tetric EvoCeram verwendet", dann wird das verwendet

### 2. **GPT-Prompt Feld verbessert**

**Verwendung:**
- Wird in den **System-Prompt** integriert
- Erscheint als "Template-Anweisungen" in GPT's System-Prompt
- Ideal für spezifische Anweisungen, wie GPT mit der Vorlage umgehen soll

**Empfohlener Inhalt:**
```
Halte dich strikt an die Vorlagen-Struktur und die System-Anweisungen. 
Wenn im Diktat zusätzliche Behandlungen oder Informationen erwähnt werden, 
die nicht in der Vorlage stehen, füge diese trotzdem hinzu. 
Verwende die Materialien aus der Vorlage, es sei denn, im Diktat werden 
andere Materialien genannt.
```

### 3. **System-Anweisungen (systemInstructions)**

**Verwendung:**
- Wird in den **System-Prompt** integriert
- Definiert die Format-Struktur (z.B. zweiteilige Struktur: Leistungsübersicht + Behandlungsdokumentation)
- Enthält strenge Regeln für Konsistenz
- Wenn leer, werden Standard-Anweisungen verwendet

**Standard-Inhalt (Fallback):**
- Format-Struktur (Leistungsübersicht + Behandlungsdokumentation)
- Strenge Regeln für Konsistenz
- Anweisungen für Formulierungen

### 4. **Beispiel-Output (exampleOutput)**

**Verwendung:**
- Wird in den **System-Prompt** integriert
- Zeigt GPT das erwartete Format und die Struktur
- Dient als Referenz für die Ausgabe
- Wenn leer, wird ein Standard-Beispiel verwendet

**Standard-Inhalt (Fallback):**
- Beispiel-Dokumentation für Füllungstherapie
- Zeigt die zweiteilige Struktur
- Zeigt Format und Stil

## 📊 Datenfluss:

```
Settings (Vorlage bearbeiten)
  ↓
Firebase (Vorlage speichern)
  ├── Material: "Komposit, Gaenial Flow A2"
  ├── Prompt: "Halte dich an die Struktur..."
  ├── systemInstructions: "FORMAT-STRUKTUR..."
  └── exampleOutput: "**1) Leistungsübersicht...**"
  ↓
Dashboard (Vorlage laden)
  ↓
GPT-Verarbeitung
  ├── System-Prompt:
  │   ├── Template-Anweisungen (aus Prompt)
  │   ├── System-Anweisungen (aus systemInstructions)
  │   └── Beispiel-Output (aus exampleOutput)
  │
  └── User-Prompt:
      ├── Vorlagen-Struktur (aus Text)
      ├── Material (aus Material-Feld) ← NEU!
      ├── Bausteine (aus aktiven Bausteinen)
      ├── Diktat (aus Whisper/Input)
      └── Anweisungen:
          - Zusätzliche Informationen einbeziehen ← NEU!
          - Material aus Vorlage verwenden ← NEU!
```

## 🎯 Empfehlungen:

### GPT-Prompt Feld:
**Verwenden für:**
- Spezifische Anweisungen, wie GPT mit zusätzlichen Informationen umgehen soll
- Template-spezifische Regeln
- Hinweise zur Material-Verwendung

**Nicht verwenden für:**
- Format-Struktur (dafür: systemInstructions)
- Beispiel-Output (dafür: exampleOutput)
- Allgemeine Regeln (dafür: systemInstructions)

### System-Anweisungen:
**Verwenden für:**
- Format-Struktur (z.B. zweiteilige Struktur)
- Strenge Konsistenz-Regeln
- Allgemeine Formatierungsregeln

### Beispiel-Output:
**Verwenden für:**
- Konkrete Beispiele der erwarteten Ausgabe
- Format-Referenz
- Stil-Referenz

## ✅ Zusammenfassung:

1. **Material** → Wird jetzt automatisch verwendet, kann im Diktat überschrieben werden
2. **GPT-Prompt** → Für spezifische Anweisungen, wie mit zusätzlichen Informationen umgegangen werden soll
3. **System-Anweisungen** → Für Format-Struktur und allgemeine Regeln
4. **Beispiel-Output** → Für Format- und Stil-Referenz

Alle Felder sind jetzt vollständig integriert und werden korrekt an GPT übergeben! 🎉

