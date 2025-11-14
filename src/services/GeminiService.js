// Google Gemini Service für präzise Abrechnungsanalyse
// Gemini ist speziell für medizinische Dokumentation und Faktenprüfung optimiert

export class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Verwende gemini-2.5-flash (stabile Version, unterstützt generateContent)
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  async analyzeBilling(documentationText, extras = []) {
    try {
      let extraInfo = "";
      if (extras.length > 0) {
        extraInfo = `Folgende Leistungen wurden nach Rückfrage tatsächlich erbracht, aber nicht dokumentiert: ${extras.join(", ")}. Bitte berücksichtige dies bei der Analyse.`;
      }

      const prompt = `Du bist ein Experte für deutsche zahnärztliche Abrechnung (GOZ/BEMA). Analysiere die folgende Behandlungsdokumentation und identifiziere potenzielle Abrechnungsmöglichkeiten.

WICHTIG: 
- Verwende NUR tatsächlich existierende GOZ/BEMA-Codes
- Erfinde KEINE Codes oder Leistungen
- Wenn du dir nicht sicher bist, gib an "Unklar - bitte manuell prüfen"
- Gib für jeden Vorschlag an: GOZ/BEMA-Nummer, Bezeichnung, Begründung

${extraInfo ? extraInfo + '\n\n' : ''}Dokumentation:
${documentationText}

Analysiere und gib strukturierte Vorschläge zurück. Wenn typische Leistungen wie Mehrschichttechnik, Kofferdamm, Matrize, Anästhesie etc. nicht erwähnt werden, gib sie als Liste von "offenen Fragen" zurück, z.B. "Mehrschichttechnik wurde nicht dokumentiert. Wurde sie durchgeführt?".

Format:
Leistung: [GOZ/BEMA-Nummer oder "Unklar"]
Bezeichnung: [Offizielle Bezeichnung]
Begründung: [Warum diese Leistung abgerechnet werden könnte]
Verbesserungsvorschlag: [Optional]`;

      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3, // Niedrigere Temperatur für präzisere, weniger halluzinierte Antworten
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Gemini API Fehler: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]) {
        throw new Error('Keine Antwort von Gemini erhalten');
      }
      
      const candidate = data.candidates[0];
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        throw new Error('Ungültige Antwort-Struktur von Gemini');
      }

      const text = candidate.content.parts[0].text;
      return text;
    } catch (error) {
      console.error('Gemini Fehler:', error);
      throw error;
    }
  }
}

