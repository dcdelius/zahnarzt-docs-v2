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
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'de');
        formData.append('prompt', 'Dies ist eine zahnärztliche Dokumentation. Bitte transkribiere die Aufnahme mit besonderem Fokus auf zahnmedizinische Fachbegriffe, Zahlen und Behandlungsdetails.');

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI API Fehler: ${errorData.error?.message || response.statusText}`);
      }

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