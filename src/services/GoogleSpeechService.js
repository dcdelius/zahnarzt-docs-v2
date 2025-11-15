import { getAllDentalPhrases } from '../utils/dentalDictionary.js';

/**
 * Google Cloud Speech-to-Text API Service
 * Besser für medizinische Terminologie als Web Speech API
 * Unterstützt benutzerdefinierte Wörterbücher und medizinische Modelle
 */
export class GoogleSpeechService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Google Cloud Speech-to-Text API Endpoint
    this.apiEndpoint = 'https://speech.googleapis.com/v1/speech:recognize';
    this.streamingEndpoint = 'https://speech.googleapis.com/v1/speech:streamingrecognize';
  }

  /**
   * Transkribiert Audio mit medizinischem Modell
   * @param {Blob} audioBlob - Audio-Datei als Blob
   * @returns {Promise<string>} - Transkribierter Text
   */
  async transcribe(audioBlob) {
    try {
      // Konvertiere Blob zu Base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      // Bestimme Audio-Format
      const audioFormat = this.getAudioFormat(audioBlob);
      
      // Umfassendes zahnmedizinisches Wörterbuch aus zentraler Quelle
      const medicalPhrases = getAllDentalPhrases();

      const requestBody = {
        config: {
          encoding: audioFormat.encoding,
          sampleRateHertz: audioFormat.sampleRate || 16000,
          languageCode: 'de-DE',
          // Enhanced model für bessere Genauigkeit (ohne medical_dictation, da das nicht gut funktioniert)
          useEnhanced: true,
          // Benutzerdefiniertes Wörterbuch für zahnmedizinische Begriffe
          speechContexts: [{
            phrases: medicalPhrases,
            boost: 40.0 // Sehr hohe Priorität für medizinische Begriffe
          }],
          // Zusätzliche Einstellungen für bessere Erkennung
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false, // Nicht benötigt, spart Tokens
        },
        audio: {
          content: base64Audio
        }
      };

      console.log('🎤 Starte Google Cloud Speech-to-Text Transkription...');
      
      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Google Speech API Fehler:', errorData);
        throw new Error(`Google Speech API Fehler: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error('Keine Transkription erhalten von Google Speech API');
      }

      // Kombiniere alle Alternativen
      let transcript = '';
      for (const result of data.results) {
        if (result.alternatives && result.alternatives.length > 0) {
          transcript += result.alternatives[0].transcript + ' ';
        }
      }

      const finalTranscript = transcript.trim();
      console.log('✅ Google Speech Transkription:', finalTranscript);
      
      return finalTranscript;
    } catch (error) {
      console.error('Google Speech Service Fehler:', error);
      throw error;
    }
  }

  /**
   * Konvertiert Blob zu Base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Entferne Data-URL Präfix (data:audio/webm;base64,)
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Bestimmt Audio-Format für Google Speech API
   */
  getAudioFormat(audioBlob) {
    const mimeType = audioBlob.type;
    
    if (mimeType.includes('webm') || mimeType.includes('opus')) {
      return { encoding: 'WEBM_OPUS', sampleRate: 48000 };
    } else if (mimeType.includes('wav')) {
      return { encoding: 'LINEAR16', sampleRate: 16000 };
    } else if (mimeType.includes('flac')) {
      return { encoding: 'FLAC', sampleRate: 16000 };
    } else if (mimeType.includes('mp3')) {
      return { encoding: 'MP3', sampleRate: 16000 };
    } else {
      // Default: WebM Opus (häufigster Fall)
      return { encoding: 'WEBM_OPUS', sampleRate: 48000 };
    }
  }

  /**
   * Prüft ob der Service verfügbar ist (API-Key vorhanden)
   */
  get isAvailable() {
    return !!this.apiKey;
  }
}

