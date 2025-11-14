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

      const prompt = `Analysiere die zahnärztliche Dokumentation und gib KURZ mögliche Abrechnungsziffern und fehlende Leistungen.

${extraInfo ? extraInfo + '\n\n' : ''}Dokumentation:
${documentationText}

Antworte KURZ im Format:
- GOZ/BEMA-Codes: [Liste der Codes, z.B. "2100, 2040"]
- Fehlende Leistungen: [Kurze Fragen, z.B. "Mehrschichttechnik durchgeführt?"]

Maximal 5 Zeilen.`;

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
            maxOutputTokens: 300, // Stark reduziert für schnellere, kürzere Antworten
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

  /**
   * Füllt eine Vorlage mit diktierte Informationen
   * Optimiert für präzise Template-Füllung mit minimalen Halluzinationen
   */
  async fillTemplate({ template, inputText, bausteine, allBausteine }) {
    try {
      // Extract template fields
      const templatePrompt = template.prompt || template.Prompt || "";
      const templateText = template.Text || template.text || "";
      const templateMaterial = template.Material || template.material || "";
      const templateName = template.id || "";
      const templateCategory = template.Kategorie || "";
      const systemInstructions = template.systemInstructions || "";

      // Build baustein texts
      const aktiveBausteineData = (bausteine || [])
        .map(id => (allBausteine || []).find(b => b.id === id))
        .filter(Boolean);
      const bausteinTexte = aktiveBausteineData
        .map(b => typeof b.standardText === 'string' ? b.standardText : '')
        .filter(Boolean)
        .join("\n");

      // Build Gemini prompt (single prompt, no system/user separation)
      const prompt = `Du bist ein zahnärztlicher Dokumentationsassistent. Deine Aufgabe ist es, eine Vorlage mit diktierte Informationen zu füllen.

WICHTIG - VORLAGE VOLLSTÄNDIG VERWENDEN:
- Verwende die KOMPLETTE Vorlagen-Struktur - ALLE Teile der Vorlage müssen verwendet werden
- Fülle Platzhalter ([ZAHL], [ja/nein], [BETRAG], [MATERIAL], etc.) mit Informationen aus dem Diktat
- Wenn ein Platzhalter im Diktat nicht erwähnt wird, lasse den Platzhalter WEG, aber behalte den Rest des Textes
- Verwende ALLEN Text aus der Vorlage, auch wenn Platzhalter nicht gefüllt werden können
- Verwende die Materialien aus der Vorlage automatisch
- KEINE Halluzinationen - nur diktierte Informationen für Platzhalter verwenden
- Die gesamte Vorlagen-Struktur muss erhalten bleiben - NICHTS weglassen
- ZAHNNUMMERN: Verwende IMMER das FDI-Schema OHNE Punkt (z.B. "27" statt "2.7", "36" statt "3.6", "11" statt "1.1")

${templatePrompt ? `Template-Anweisungen:
${templatePrompt}

` : ''}${systemInstructions ? `System-Anweisungen:
${systemInstructions}

` : ''}VORLAGEN-STRUKTUR (verwende diese KOMPLETTE Struktur und fülle Platzhalter mit diktierte Informationen):
${templateText}

${templateMaterial ? `VERWENDETES MATERIAL (aus Vorlage - SMART verwenden):
${templateMaterial}

WICHTIG - SMART MATERIAL-VERWENDUNG:
- Verwende die Materialien aus der Vorlage automatisch und intelligent
- Wenn [MATERIAL] in der Vorlage steht, ersetze es mit "${templateMaterial}"
- Wenn im Diktat andere Materialien genannt werden, verwende diese stattdessen
- Materialien SMART verwenden:
  * In "Leistungsübersicht": Materialien in der richtigen Form erwähnen (z.B. "Mehrschichttechnik bei Komposit-Füllung")
  * In "Behandlungsdokumentation": Materialien im richtigen Kontext verwenden (z.B. "Füllung mit ${templateMaterial.split(',')[0].trim()} schichtweise gelegt")
  * Erkenne automatisch, zu welchem Teil der Vorlage das Material gehört und verwende es entsprechend
  * Wenn Materialien im Diktat erwähnt werden, verwende diese mit vollständigen Produktnamen (z.B. "Gaenial Flow A3, Tetric EvoCeram A3")

` : ''}${bausteinTexte ? `VERFÜGBARE FORMULIERUNGEN (verwende diese exakten Formulierungen):
${bausteinTexte}

WICHTIG: Verwende diese exakten Formulierungen aus den Bausteinen, wenn sie zur Vorlage passen.

` : ''}DIKTIERTER TEXT (verwende diese Informationen zum Füllen der Platzhalter):
${inputText}

KRITISCHE REGELN:
1. Verwende die KOMPLETTE Vorlagen-Struktur - ALLE Teile der Vorlage müssen verwendet werden
2. Fülle Platzhalter mit diktierte Informationen
3. Wenn Platzhalter nicht im Diktat stehen, lasse nur den Platzhalter WEG, aber behalte ALLEN anderen Text aus der Vorlage
4. Verwende ALLEN Text aus der Vorlage, auch Abschnitte ohne Platzhalter
5. Exakt die gleichen Formulierungen aus Bausteinen verwenden
6. Gleiche Struktur und Reihenfolge wie in der Vorlage - NICHTS weglassen
7. Gleiche Fachbegriffe
8. KEINE Synonyme
9. KEINE Halluzinationen - nur diktierte Informationen in Platzhalter einsetzen
10. ZAHNNUMMERN: Verwende IMMER das FDI-Schema OHNE Punkt (z.B. "27" statt "2.7", "36" statt "3.6", "11" statt "1.1")

Erstelle die Dokumentation für "${templateName}" (${templateCategory}) mit:
- KOMPLETTER Struktur wie in der Vorlage - ALLE Teile der Vorlage müssen verwendet werden
- Platzhalter ([ZAHL], [ja/nein], [BETRAG], [MATERIAL], etc.) mit Diktat-Informationen füllen
- ALLEN Text aus der Vorlage verwenden, auch wenn Platzhalter nicht gefüllt werden können
- Exakte Formulierungen aus Bausteinen
- Gleiche Fachbegriffe
- KEINE Synonyme
- KEINE zusätzlichen Informationen, die nicht im Diktat stehen
- WICHTIG: Wenn ein Platzhalter nicht gefüllt werden kann, lasse nur den Platzhalter weg, aber behalte ALLEN anderen Text aus der Vorlage`;

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
            temperature: 0.2, // Sehr niedrig für maximale Präzision und Konsistenz
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
      console.error('Gemini Template-Filling Fehler:', error);
      throw error;
    }
  }

  /**
   * Beantwortet medizinische/zahnmedizinische Fragen
   * Optimiert für medizinische Wissensdatenbank
   */
  async answerMedicalQuestion(question, conversationHistory = []) {
    try {
      // Baue Kontext aus Konversationshistorie
      let contextHistory = "";
      if (conversationHistory.length > 0) {
        contextHistory = "\n\nVorherige Konversation:\n";
        conversationHistory.forEach((msg, idx) => {
          if (msg.role === 'user') {
            contextHistory += `Frage: ${msg.content}\n`;
          } else if (msg.role === 'assistant') {
            contextHistory += `Antwort: ${msg.content}\n\n`;
          }
        });
      }

      const prompt = `Du bist ein Experte für Zahnmedizin und Medizin. Beantworte die folgende Frage KURZ und präzise.

${contextHistory}

Aktuelle Frage: ${question}

WICHTIG - KURZE, PRÄGNANTE ANTWORT:
- Maximal 3-4 Sätze oder 5-6 Bullet Points
- Präzise und evidenzbasiert
- Basierend auf aktuellen Leitlinien
- Nur die wichtigsten Informationen
- KEINE langen Erklärungen oder Hintergrundinformationen
- KEIN einleitender Satz wie "Als Experte..." - direkt zur Antwort
- KEINE Markdown-Formatierung (keine **, keine #, keine Listen-Symbole)
- Normale Sätze oder kurze Absätze, einfach und klar formuliert
- Wenn du dir nicht sicher bist, gib dies kurz an

Antworte jetzt KURZ und direkt, ohne Einleitung:`;

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
            temperature: 0.3, // Niedriger für präzisere, kürzere Antworten
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 500, // Stark reduziert für kurze, prägnante Antworten
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
      console.error('Gemini Medical Question Fehler:', error);
      throw error;
    }
  }
}

