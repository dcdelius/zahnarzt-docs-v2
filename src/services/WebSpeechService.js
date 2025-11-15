export class WebSpeechService {
  constructor() {
    this.recognition = null;
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.transcriptionPromise = null;
    this.transcriptionResolve = null;
    this.transcriptionReject = null;
    this.finalTranscript = ''; // Instanzvariable, damit sie zwischen Events erhalten bleibt
    this.interimTranscript = ''; // Für Zwischenergebnisse
    this.hasReceivedResult = false;
    this.onTranscriptUpdate = null; // Callback für Live-Updates
    
    if (this.isSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'de-DE';
      this.recognition.continuous = true; // Kontinuierliche Erkennung
      this.recognition.interimResults = true; // Zeige Zwischenergebnisse
      this.recognition.maxAlternatives = 1;
      
      // Hinweis: Web Speech API unterstützt keine benutzerdefinierten Wörterbücher
      // Medizinische Begriffe werden daher oft falsch erkannt
      // Die Gemini Quick-Correction korrigiert diese Fehler nachträglich
      
      this.setupEventHandlers();
    }
  }

  setupEventHandlers() {
    this.recognition.onresult = (event) => {
      console.log('🎤 Web Speech API: Ergebnis erhalten', event.results.length, 'Ergebnisse');
      
      // Reset interim transcript für neue Ergebnisse
      this.interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        
        console.log(`  - Ergebnis ${i}: "${transcript}" (${isFinal ? 'FINAL' : 'INTERIM'})`);
        
        if (isFinal) {
          this.finalTranscript += transcript + ' ';
          this.hasReceivedResult = true;
          console.log('✅ Finaler Text bisher:', this.finalTranscript.trim());
        } else {
          this.interimTranscript += transcript;
          console.log('⏳ Interim Text:', this.interimTranscript);
        }
      }
      
      // Live-Update an Dashboard senden
      if (this.onTranscriptUpdate) {
        const combinedText = (this.finalTranscript + this.interimTranscript).trim();
        this.onTranscriptUpdate(combinedText, this.finalTranscript.trim(), this.interimTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('❌ Web Speech API Fehler:', event.error);
      
      // "no-speech" ist ein häufiger Fehler, wenn der Benutzer zu schnell stoppt
      // oder wenn keine Sprache erkannt wurde - wir behandeln das als leeres Ergebnis
      if (event.error === 'no-speech') {
        console.warn('⚠️ Keine Sprache erkannt. Finaler Text bisher:', this.finalTranscript.trim());
        console.warn('⚠️ Interim Text:', this.interimTranscript);
        
        // Wenn wir bereits Ergebnisse haben (auch interim), verwenden wir diese
        const combinedText = (this.finalTranscript + this.interimTranscript).trim();
        if (combinedText) {
          console.log('✅ Verwende vorhandene Ergebnisse trotz no-speech Fehler');
          if (this.transcriptionResolve) {
            this.transcriptionResolve(combinedText);
            this.transcriptionResolve = null;
            this.transcriptionReject = null;
          }
        } else {
          // Behandle "no-speech" nicht als Fehler, sondern als leeres Ergebnis
          if (this.transcriptionResolve) {
            this.transcriptionResolve('');
            this.transcriptionResolve = null;
            this.transcriptionReject = null;
          }
        }
        return;
      }
      
      // Andere Fehler werden weitergegeben
      if (this.transcriptionReject) {
        let errorMessage = `Spracherkennungsfehler: ${event.error}`;
        
        // Benutzerfreundliche Fehlermeldungen
        if (event.error === 'audio-capture') {
          errorMessage = 'Kein Mikrofon gefunden oder Mikrofon nicht verfügbar.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Mikrofon-Berechtigung wurde verweigert. Bitte erlauben Sie den Zugriff.';
        } else if (event.error === 'network') {
          errorMessage = 'Netzwerkfehler bei der Spracherkennung.';
        } else if (event.error === 'aborted') {
          errorMessage = 'Spracherkennung wurde abgebrochen.';
        }
        
        this.transcriptionReject(new Error(errorMessage));
        this.transcriptionReject = null;
        this.transcriptionResolve = null;
      }
    };

    this.recognition.onend = () => {
      console.log('🛑 Web Speech API: onend aufgerufen');
      console.log('📝 Finaler Text:', this.finalTranscript.trim());
      console.log('📝 Interim Text:', this.interimTranscript);
      
      if (this.transcriptionResolve) {
        // Kombiniere final und interim Ergebnisse
        // Wenn wir nur interim Ergebnisse haben, verwenden wir diese auch
        const combinedText = (this.finalTranscript + this.interimTranscript).trim();
        console.log('✅ Kombinierter Text:', combinedText);
        
        this.transcriptionResolve(combinedText);
        this.transcriptionResolve = null;
        this.transcriptionReject = null;
      }
    };
  }

  setTranscriptCallback(callback) {
    this.onTranscriptUpdate = callback;
  }

  start() {
    if (!this.isSupported) {
      throw new Error('Web Speech API wird von diesem Browser nicht unterstützt');
    }

    if (this.recognition && this.recognition.state === 'running') {
      console.warn('Web Speech Recognition läuft bereits');
      return;
    }

    // Reset für neue Aufnahme
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.hasReceivedResult = false;

    // Reset Live-Update
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate('', '', '');
    }

    return new Promise((resolve, reject) => {
      this.transcriptionPromise = new Promise((innerResolve, innerReject) => {
        this.transcriptionResolve = innerResolve;
        this.transcriptionReject = innerReject;
      });

      try {
        console.log('🎤 Starte Web Speech API...');
        this.recognition.start();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    if (!this.recognition) {
      throw new Error('Web Speech Recognition nicht initialisiert');
    }

    if (this.recognition.state === 'stopped' || this.recognition.state === 'inactive') {
      console.warn('Web Speech Recognition ist bereits gestoppt');
      // Gebe vorhandene Ergebnisse zurück, auch wenn bereits gestoppt
      const combinedText = (this.finalTranscript + this.interimTranscript).trim();
      return combinedText || (this.transcriptionPromise ? await this.transcriptionPromise : '');
    }

    console.log('⏹️ Stoppe Web Speech API...');
    console.log('📝 Aktueller finaler Text:', this.finalTranscript.trim());
    console.log('📝 Aktueller interim Text:', this.interimTranscript);
    
    this.recognition.stop();
    
    // Warte auf das Ergebnis mit einem kleinen Timeout-Fallback
    if (this.transcriptionPromise) {
      try {
        // Warte maximal 2 Sekunden auf das Ergebnis
        const result = await Promise.race([
          this.transcriptionPromise,
          new Promise((resolve) => setTimeout(() => {
            console.warn('⏱️ Timeout: Verwende vorhandene Ergebnisse');
            const combinedText = (this.finalTranscript + this.interimTranscript).trim();
            resolve(combinedText);
          }, 2000))
        ]);
        return result;
      } catch (error) {
        console.error('Fehler beim Warten auf Transkription:', error);
        // Fallback: Verwende vorhandene Ergebnisse
        const combinedText = (this.finalTranscript + this.interimTranscript).trim();
        return combinedText;
      }
    }
    
    // Fallback: Gebe vorhandene Ergebnisse zurück
    const combinedText = (this.finalTranscript + this.interimTranscript).trim();
    return combinedText;
  }
}

