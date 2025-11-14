# Google Gemini API Setup für Abrechnungsoptimierung

## Warum Google Gemini?

Google Gemini ist speziell für medizinische Dokumentation und Faktenprüfung optimiert und hat **weniger Halluzinationen** bei Abrechnungsziffern (GOZ/BEMA-Codes) als GPT-Modelle.

## API Key erhalten

1. Gehe zu [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Erstelle einen neuen API Key
3. Kopiere den API Key

## Konfiguration

Füge den API Key zu deiner `.env` Datei hinzu:

```env
VITE_GOOGLE_GEMINI_API_KEY=dein-api-key-hier
```

## Funktionsweise

- **Priorität 1**: Google Gemini wird für Abrechnungsoptimierung verwendet (wenn API Key vorhanden)
- **Fallback**: GPT-5 wird verwendet, wenn kein Google API Key vorhanden ist oder Gemini einen Fehler hat

## Vorteile von Gemini

- ✅ Weniger Halluzinationen bei GOZ/BEMA-Codes
- ✅ Präzisere Faktenprüfung
- ✅ Speziell für medizinische Dokumentation optimiert
- ✅ Niedrigere Temperatur (0.3) für konsistentere Ergebnisse

## Kosten

Google Gemini API hat ein kostenloses Kontingent. Siehe [Google AI Studio Pricing](https://ai.google.dev/pricing) für Details.

