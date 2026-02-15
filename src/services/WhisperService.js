export class WhisperService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiEndpoint = 'https://api.openai.com/v1/audio/transcriptions';
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 Sekunde
  }

  async transcribe(audioBlob) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
    try {
      const formData = new FormData();
      // Dateiname basierend auf MIME-Type
      const fileName = audioBlob.type.includes('webm') ? 'audio.webm' : 'audio.wav';
      formData.append('file', audioBlob, fileName);
      formData.append('model', 'whisper-1');
      formData.append('language', 'de');
      formData.append('response_format', 'text'); // Direkt Text statt JSON für schnellere Verarbeitung
      formData.append('prompt', `Dies ist eine zahnärztliche Dokumentation. Bitte transkribiere die Aufnahme mit besonderem Fokus auf zahnmedizinische Fachbegriffe, Zahlen und Behandlungsdetails.

WICHTIGE ZAHNMEDIZINISCHE BEGRIFFE (korrekt schreiben):
- Ultracain (nicht Ultrakain)
- Articain (nicht Artikain)
- Lidocain (nicht Lidokain)
- Mepivacain (nicht Mepivakain)
- Vivapen (nicht Vivaphen)
- Gaenial Flow (nicht Genial Flow)
- Tetric EvoCeram (nicht Tetric Evo Ceram)
- Kofferdamm (nicht Kofferdam)
- Komposit (nicht Komposid)
- Anästhesie (nicht Anästhesie)

ZAHNFLÄCHEN (immer Kleinbuchstaben, ohne Punkte):
- mesial → m
- distal → d
- bukkal/buccal → b
- palatinal → p
- lingual → l
- okklusal → o
- inzisal → i
- vestibulär → v

Beispiel: "mesial okklusal distal" → "mod" (nicht "M.O.D." oder "M O D")

ZAHNNUMMERN (FDI-Schema ohne Punkt):
- Beispiel: "Zahn siebenundzwanzig" → "27" (nicht "2.7" oder "2,7")
- Beispiel: "Zahn sechsunddreißig" → "36" (nicht "3.6" oder "3,6")`);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
          // Versuche JSON-Fehler zu parsen, falls vorhanden
          try {
            const errorData = await response.json();
            throw new Error(`OpenAI API Fehler: ${errorData.error?.message || response.statusText}`);
          } catch (e) {
            // Falls kein JSON, verwende Status-Text
            throw new Error(`OpenAI API Fehler: ${response.statusText || 'Unbekannter Fehler'}`);
          }
      }

      // Wenn response_format=text, ist die Antwort direkt Text, nicht JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/plain')) {
        const text = await response.text();
        if (!text || !text.trim()) {
          throw new Error('Keine Transkription erhalten');
        }
        return text.trim();
      }
      
      // Fallback für JSON-Format
      const data = await response.json();
      if (!data.text) {
        throw new Error('Keine Transkription erhalten');
      }

      return data.text;
    } catch (error) {
        console.error(`Transkriptionsfehler (Versuch ${retries + 1}/${this.maxRetries}):`, error);
        
        if (retries === this.maxRetries - 1) {
          throw new Error(`Transkription fehlgeschlagen nach ${this.maxRetries} Versuchen: ${error.message}`);
        }
        
        retries++;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
      }
    }
  }
} 