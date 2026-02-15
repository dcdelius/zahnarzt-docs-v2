export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.onStatusChange = null;
  }

  setStatusCallback(callback) {
    this.onStatusChange = callback;
  }

  async startRecording() {
    try {
      if (this.isRecording) {
        throw new Error('Aufnahme läuft bereits');
      }

      // Optimierte Audio-Einstellungen für schnellere Verarbeitung
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Reduzierte Sample-Rate für kleinere Dateien (ausreichend für Whisper)
          channelCount: 1 // Mono statt Stereo
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      
      // Verwende webm oder opus für bessere Komprimierung
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/wav';
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 16000 // Niedrigere Bitrate für kleinere Dateien
      });
      this.audioChunks = [];

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        this.audioChunks.push(event.data);
      });

      this.mediaRecorder.addEventListener('stop', () => {
        this.isRecording = false;
        if (this.onStatusChange) {
          this.onStatusChange(false);
        }
      });

      this.mediaRecorder.start();
      this.isRecording = true;
      
      if (this.onStatusChange) {
        this.onStatusChange(true);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      this.isRecording = false;
      if (this.onStatusChange) {
        this.onStatusChange(false);
      }
      throw new Error('Mikrofonzugriff nicht möglich: ' + error.message);
    }
  }

  async stopRecording() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.isRecording) {
          throw new Error('Keine aktive Aufnahme');
        }

        this.mediaRecorder.addEventListener('stop', () => {
          // Verwende das tatsächliche MIME-Type für bessere Komprimierung
          const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.audioChunks = [];
          
          // Stop all tracks in the stream
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
          
          resolve(audioBlob);
        });

        this.mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping recording:', error);
        this.isRecording = false;
        if (this.onStatusChange) {
          this.onStatusChange(false);
        }
        reject(new Error('Fehler beim Stoppen der Aufnahme: ' + error.message));
      }
    });
  }

  isRecording() {
    return this.isRecording;
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isRecording = false;
    if (this.onStatusChange) {
      this.onStatusChange(false);
    }
  }
} 