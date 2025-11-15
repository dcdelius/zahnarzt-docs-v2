// Google Gemini Service für präzise Abrechnungsanalyse
// Gemini ist speziell für medizinische Dokumentation und Faktenprüfung optimiert

export class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Verwende gemini-2.5-flash (stabile Version, unterstützt generateContent)
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  /**
   * Globaler Basis-Prompt für alle Gemini-Aufrufe
   * Enthält grundlegende Regeln für deutsche Zahnmedizin
   */
  getGlobalPrompt() {
    return `Du arbeitest grundsätzlich im Kontext der deutschen Zahnmedizin.

KRITISCH - ZAHNFLÄCHEN (IMMER KLEINBUCHSTABEN, OHNE PUNKTE):
- mesial → m (NIEMALS "M" oder "M." oder "mesial")
- distal → d (NIEMALS "D" oder "D." oder "distal")
- bukkal/buccal → b (NIEMALS "B" oder "B." oder "bukkal")
- palatinal → p (NIEMALS "P" oder "P." oder "palatinal")
- lingual → l (NIEMALS "L" oder "L." oder "lingual")
- okklusal → o (NIEMALS "O" oder "O." oder "okklusal")
- inzisal → i (NIEMALS "I" oder "I." oder "inzisal")
- vestibulär → v (NIEMALS "V" oder "V." oder "vestibulär")

Beispiel: "mesial okklusal distal" → "mod" (NIEMALS "M.O.D." oder "M O D" oder "MOD")

KRITISCH - ZAHNNUMMERN (FDI-SCHEMA OHNE PUNKT):
- "Zahn siebenundzwanzig" → "27" (NIEMALS "2.7" oder "2,7" oder "2 7")
- "Zahn sechsunddreißig" → "36" (NIEMALS "3.6" oder "3,6" oder "3 6")
- "Zahn eins eins" → "11" (NIEMALS "1.1" oder "1,1" oder "1 1")

KRITISCH - MEDIZINISCHE BEGRIFFE (korrekt schreiben):
- Ultracain (nicht Ultrakain, Ultracainforte, Ultracain Forte → "Ultracain Forte")
- Articain (nicht Artikain)
- Lidocain (nicht Lidokain)
- Mepivacain (nicht Mepivakain)
- Vivapen (nicht Vivaphen)
- Gaenial Flow (nicht Genial Flow)
- Tetric EvoCeram (nicht Tetric Evo Ceram)
- Kofferdamm (nicht Kofferdam)
- Komposit (nicht Komposid)
- Anästhesie (korrekt mit "ä")

Nutze ausschließlich fachlich korrekte, präzise zahnmedizinische Terminologie. Keine Erfindungen, keine Synonyme, keine Ausschmückungen. Dokumentationen sind sachlich, knapp, medizinisch korrekt und folgen üblichen zahnärztlichen Standards.`;
  }

  async analyzeBilling(documentationText, extras = []) {
    try {
      let extraInfo = "";
      if (extras.length > 0) {
        extraInfo = `Folgende Leistungen wurden nach Rückfrage tatsächlich erbracht, aber nicht dokumentiert: ${extras.join(", ")}. Bitte berücksichtige dies bei der Analyse.`;
      }

      const globalPrompt = this.getGlobalPrompt();
      const prompt = `${globalPrompt}

⸻

Analysiere die zahnärztliche Dokumentation und gib KURZ mögliche Abrechnungsziffern und fehlende Leistungen.

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
      const templateGeminiPrompt = template.GeminiPrompt || template.geminiPrompt || "";
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
      // WICHTIG: Nur template-spezifischer Prompt aus Firebase wird verwendet - kein globaler Fallback
      if (!templateGeminiPrompt || !templateGeminiPrompt.trim()) {
        throw new Error(`Kein Gemini-Prompt für Vorlage "${templateName}" gefunden. Bitte legen Sie einen Prompt in den Einstellungen für diese Vorlage an.`);
      }

      // Globaler Basis-Prompt + template-spezifischer Prompt
      const globalPrompt = this.getGlobalPrompt();
      const basePrompt = `${globalPrompt}

⸻

${templateGeminiPrompt}

⸻

VORLAGEN-STRUKTUR (unveränderlicher Kern - nur explizit genannte Inhalte überschreiben):
${templateText}`;

      const prompt = `${basePrompt}

${templateMaterial ? `VERWENDETES MATERIAL:
${templateMaterial}

MATERIAL-ZUORDNUNG (generisch, skaliert für alle Behandlungen):
Analysiere jedes Material aus der Liste oben und kategorisiere es anhand von Schlüsselwörtern:
- Anästhesie: Enthält "Ultracain", "Articain", "Lidocain", "Mepivacain", "Anästhesie" → NUR in Felder mit "Anästhesie" im Namen
- Bonding: Enthält "Vivapen", "Adhese", "OptiBond", "Prime", "Bond" → NUR in Felder mit "Bonding" im Namen
- Flow: Enthält "Flow" im Namen → NUR in Felder mit "Flow" im Namen
- Komposit: Enthält "Tetric", "Filtek", "Grandio", "Venus", "Komposit" → NUR in Felder mit "Komposit" im Namen
- Isolation: Enthält "Kofferdamm", "OptiDam", "Dam", "Isolation" → NUR in Felder mit "Isolation" im Namen
- Polier: Enthält "Sof-Lex", "OptiShine", "Polier" → NUR in Felder mit "Polier" oder "Politur" im Namen

KRITISCH: Jedes Material erscheint NUR EINMAL im gesamten Text, NUR in seinem richtigen Feld. Materialien werden NIEMALS in falsche Felder eintragen (z.B. Anästhesie nicht in "Kompositmaterial").

` : ''}${bausteinTexte ? `VERFÜGBARE FORMULIERUNGEN:
${bausteinTexte}

` : ''}DIKTIERTER TEXT (korrigiere medizinische Begriffe und Flächen):
${inputText}

KRITISCH - TEXT-KORREKTUR:
1. Korrigiere medizinische Begriffe:
   - "Ultrakainforte" → "Ultracain Forte"
   - "Ultrakain" → "Ultracain"
   - "Artikain" → "Articain"
   - "Lidokain" → "Lidocain"
   - "Vivaphen" → "Vivapen"
   - "Genial Flow" → "Gaenial Flow"
   - "Tetric Evo Ceram" → "Tetric EvoCeram"
   - "Kofferdam" → "Kofferdamm"
   - "Komposid" → "Komposit"

2. Korrigiere Zahnflächen (IMMER Kleinbuchstaben, ohne Punkte):
   - "M.O.D." → "mod"
   - "M O D" → "mod"
   - "MOD" → "mod"
   - "mesial okklusal distal" → "mod"
   - "bukkal" → "b"
   - "distal" → "d"
   - etc.

3. Korrigiere Zahnnummern (FDI ohne Punkt):
   - "2.7" → "27"
   - "2,7" → "27"
   - "3.6" → "36"
   - "1.1" → "11"
   - etc.

WICHTIG:
- Alles was nicht im Diktat steht, bleibt exakt wie in der Vorlage
- Nur explizit genannte Inhalte überschreiben
- Flächenanzahl automatisch in die Vorlage eintragen
- Zusätzliche Informationen am Ende in "ZUSÄTZLICHE MASSNAHMEN / BEFUNDE"
- Nur den fertigen Text ausgeben, keine Erklärungen`;

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
            temperature: 0.1, // Sehr niedrig für maximale Präzision und schnellere Antworten
            topK: 20, // Reduziert für schnellere Verarbeitung
            topP: 0.9, // Reduziert für schnellere Verarbeitung
            maxOutputTokens: 1000, // Reduziert für schnellere Verarbeitung
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
   * Schnelle Korrektur von medizinischen Begriffen, Flächen und Zahnnummern
   * Optimiert für schnelle Post-Processing von Transkriptionen
   */
  async quickCorrection(transcribedText) {
    try {
      // Schritt 1: Direkte Korrekturen für häufig falsch erkannte Begriffe (schneller als Gemini)
      let correctedText = transcribedText;
      
      // Häufige Fehler bei medizinischen Begriffen (Web Speech API erkennt diese oft falsch)
      const commonCorrections = [
        // Zahnflächen - häufige Fehler
        { pattern: /\b(messial|mesial|messial)\b/gi, replacement: 'mesial' },
        { pattern: /\b(distel|distal)\b/gi, replacement: 'distal' },
        { pattern: /\b(okklusiv|okklusal)\b/gi, replacement: 'okklusal' },
        { pattern: /\b(bukal|bukkal)\b/gi, replacement: 'bukkal' },
        // Zahnnummern - häufige Fehler
        { pattern: /\bsans\b/gi, replacement: 'Zahn' },
        { pattern: /\b(\d+)\.(\d+)\b/g, replacement: '$1$2' }, // "2.7" → "27"
        { pattern: /\b(\d+),(\d+)\b/g, replacement: '$1$2' }, // "2,7" → "27"
        // Medikamente
        { pattern: /\bUltrakainforte\b/gi, replacement: 'Ultracain Forte' },
        { pattern: /\bUltrakain\b/gi, replacement: 'Ultracain' },
        { pattern: /\bArtikain\b/gi, replacement: 'Articain' },
        { pattern: /\bLidokain\b/gi, replacement: 'Lidocain' },
        { pattern: /\bVivaphen\b/gi, replacement: 'Vivapen' },
        { pattern: /\bGenial Flow\b/gi, replacement: 'Gaenial Flow' },
        { pattern: /\bTetric Evo Ceram\b/gi, replacement: 'Tetric EvoCeram' },
        { pattern: /\bKofferdam\b/gi, replacement: 'Kofferdamm' },
        { pattern: /\bKomposid\b/gi, replacement: 'Komposit' },
      ];
      
      for (const correction of commonCorrections) {
        correctedText = correctedText.replace(correction.pattern, correction.replacement);
      }
      
      // Wenn keine Änderungen vorgenommen wurden, verwende Originaltext
      if (correctedText === transcribedText) {
        // Trotzdem Gemini für komplexere Korrekturen verwenden
      }
      
      // Schritt 2: Gemini für komplexere Korrekturen (Flächen-Abkürzungen, Kontext-Korrekturen)
      const prompt = `Korrigiere zahnmedizinischen Text:

${correctedText}

KRITISCHE KORREKTUREN:

1. MEDIZINISCHE BEGRIFFE:
- Anästhesie: "Anästhesie", "Anästhesie", "Anästhesie" (nicht "Anästhesie", "Anästhesie")
- Medikamente: "Ultrakainforte"→"Ultracain Forte", "Ultrakain"→"Ultracain", "Artikain"→"Articain", "Lidokain"→"Lidocain", "Vivaphen"→"Vivapen", "Genial Flow"→"Gaenial Flow", "Tetric Evo Ceram"→"Tetric EvoCeram", "Kofferdam"→"Kofferdamm", "Komposid"→"Komposit"

2. ZAHNFLÄCHEN (Web Speech API erkennt diese oft falsch - korrigiere alle Varianten):
- "messial", "mesial", "messial", "mesial", "messial" → "mesial" (oder "m" wenn Abkürzung)
- "distal", "distel", "distal", "distel", "distal" → "distal" (oder "d" wenn Abkürzung)
- "okklusal", "okklusiv", "okklusal", "okklusiv", "okklusal", "okklusiv" → "okklusal" (oder "o" wenn Abkürzung)
- "bukkal", "bukal", "bukkal", "bukal", "bukkal" → "bukkal" (oder "b" wenn Abkürzung)
- "palatinal", "palatinal", "palatinal" → "palatinal" (oder "p" wenn Abkürzung)
- "lingual", "lingual", "lingual" → "lingual" (oder "l" wenn Abkürzung)
- "inzisal", "inzisal", "inzisal" → "inzisal" (oder "i" wenn Abkürzung)
- "vestibulär", "vestibulär", "vestibulär" → "vestibulär" (oder "v" wenn Abkürzung)
- Wenn mehrere Flächen genannt werden (z.B. "mesial okklusal distal"), in Abkürzung umwandeln: "mod"

3. ZAHNFLÄCHEN-ABKÜRZUNGEN (IMMER Kleinbuchstaben ohne Punkte):
- "M.O.D."→"mod", "MOD"→"mod", "M O D"→"mod"
- "mesial okklusal distal"→"mod"
- "bukkal okklusal"→"bo"
- "distal okklusal"→"do"
- "palatinal okklusal"→"po"
- Vollständige Wörter → Kleinbuchstaben (z.B. "mesial"→"m", "distal"→"d", "okklusal"→"o")

4. ZAHNNUMMERN (FDI ohne Punkt):
- "2.7"→"27", "2,7"→"27", "zwei sieben"→"27"
- "3.6"→"36", "3,6"→"36", "drei sechs"→"36"
- "1.1"→"11", "1,1"→"11", "eins eins"→"11"
- "sans 27"→"Zahn 27", "sans"→"Zahn"
- "Zahn siebenundzwanzig"→"Zahn 27"
- "Zahn sechsunddreißig"→"Zahn 36"

5. WEITERE KORREKTUREN:
- "flächenmäßiger"→"flächenmäßig" oder entfernen wenn nicht nötig
- "den" vor Zahnnummern entfernen wenn falsch platziert
- "eines der sie"→korrigieren basierend auf Kontext

WICHTIG:
- Gib NUR den korrigierten Text aus, keine Erklärungen
- Behalte die ursprüngliche Struktur und Satzzeichen bei
- Korrigiere nur Fehler, ändere nichts am Inhalt
- Wenn unsicher, behalte Original bei`;

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
            temperature: 0.1,
            topK: 20,
            topP: 0.9,
            maxOutputTokens: 1000, // Erhöht für längere Texte
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

      // Lese Response als Text (kann nur einmal gelesen werden)
      const responseText = await response.text();
      console.log('📥 Gemini Quick-Correction Raw Response:', responseText);
      
      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          console.error('❌ Gemini API Fehler:', errorData);
          throw new Error(`Google Gemini API Fehler: ${errorData.error?.message || response.statusText}`);
        } catch (e) {
          console.error('❌ Gemini API Fehler (kein JSON):', responseText);
          throw new Error(`Google Gemini API Fehler: ${response.status} ${response.statusText}`);
        }
      }

      // Parse JSON-Antwort
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Fehler beim Parsen der Gemini-Antwort:', e);
        console.error('❌ Response Text:', responseText);
        throw new Error('Ungültige JSON-Antwort von Gemini API');
      }
      
      // Debug: Vollständige API-Antwort loggen
      console.log('📥 Gemini Quick-Correction API-Antwort:', JSON.stringify(data, null, 2));
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error('❌ Keine candidates in API-Antwort:', data);
        throw new Error('Keine Antwort von Gemini erhalten');
      }
      
      const candidate = data.candidates[0];
      
      // Prüfe finishReason (kann "SAFETY" sein, wenn blockiert)
      // Bei MAX_TOKENS versuchen wir trotzdem, vorhandenen Text zu extrahieren
      if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
        console.warn('⚠️ Gemini finishReason:', candidate.finishReason);
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Gemini hat die Antwort aus Sicherheitsgründen blockiert. Bitte versuchen Sie es mit anderem Text.');
        } else {
          throw new Error(`Gemini Antwort beendet mit Grund: ${candidate.finishReason}`);
        }
      }
      
      // Bei MAX_TOKENS warnen, aber trotzdem versuchen, Text zu extrahieren
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('⚠️ Gemini Antwort wurde wegen Token-Limit abgeschnitten, versuche vorhandenen Text zu extrahieren');
      }
      
      if (!candidate.content) {
        console.error('❌ Kein content in candidate:', candidate);
        // Fallback: Wenn MAX_TOKENS und kein content, verwende Originaltext
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('⚠️ MAX_TOKENS ohne content, verwende Originaltext');
          return transcribedText;
        }
        throw new Error('Ungültige Antwort-Struktur von Gemini: Kein content');
      }
      
      if (!candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('❌ Keine parts in content:', candidate.content);
        // Fallback: Wenn MAX_TOKENS und keine parts, verwende Originaltext
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('⚠️ MAX_TOKENS ohne parts, verwende Originaltext');
          return transcribedText;
        }
        throw new Error('Ungültige Antwort-Struktur von Gemini: Keine parts');
      }
      
      const firstPart = candidate.content.parts[0];
      
      // Prüfe ob es Text ist (kann auch functionCall sein)
      if (!firstPart) {
        console.error('❌ Kein firstPart gefunden');
        console.error('❌ Parts:', candidate.content.parts);
        throw new Error('Ungültige Antwort-Struktur von Gemini: Kein firstPart');
      }
      
      // Prüfe verschiedene mögliche Strukturen
      let text = null;
      if (firstPart.text) {
        text = firstPart.text;
      } else if (typeof firstPart === 'string') {
        text = firstPart;
      } else if (firstPart.functionCall) {
        console.error('❌ Gemini hat functionCall zurückgegeben statt Text:', firstPart);
        throw new Error('Gemini hat functionCall zurückgegeben, erwartet wurde Text');
      } else {
        console.error('❌ Unbekannte Part-Struktur:', firstPart);
        console.error('❌ Vollständiger candidate:', JSON.stringify(candidate, null, 2));
        throw new Error('Ungültige Antwort-Struktur von Gemini: Unbekannte Part-Struktur');
      }

      if (!text) {
        console.error('❌ Kein text gefunden in part:', firstPart);
        throw new Error('Ungültige Antwort-Struktur von Gemini: Kein text in part');
      }

      return text.trim();
    } catch (error) {
      console.error('Gemini Quick-Correction Fehler:', error);
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

      const globalPrompt = this.getGlobalPrompt();
      const prompt = `${globalPrompt}

⸻

Du bist ein Experte für Zahnmedizin und Medizin. Beantworte die folgende Frage KURZ und präzise.

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

