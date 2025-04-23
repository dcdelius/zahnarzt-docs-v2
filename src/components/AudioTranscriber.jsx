import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AudioRecorder } from '../services/AudioRecorder';
import { WhisperService } from '../services/WhisperService';

const AudioTranscriber = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [whisperService] = useState(() => new WhisperService(process.env.REACT_APP_OPENAI_API_KEY));

  const startRecording = async () => {
    try {
      setError('');
      await audioRecorder.startRecording();
      setIsRecording(true);
    } catch (err) {
      setError('Mikrofon konnte nicht aktiviert werden');
      console.error('Recording error:', err);
    }
  };

  const stopRecording = async () => {
    try {
      const audioBlob = await audioRecorder.stopRecording();
      setIsRecording(false);
      
      // Start transcription
      const text = await whisperService.transcribe(audioBlob);
      setTranscription(text);
      if (onTranscriptionComplete) {
        onTranscriptionComplete(text);
      }
    } catch (err) {
      setError('Fehler bei der Aufnahme oder Transkription');
      console.error('Stop recording/transcription error:', err);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 bg-red-100 p-3 rounded-lg"
        >
          {error}
        </motion.div>
      )}
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`px-6 py-3 rounded-full font-medium text-white shadow-lg transition-colors ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}
      </motion.button>

      {transcription && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-lg mt-4"
        >
          <h3 className="text-lg font-semibold mb-2">Transkription:</h3>
          <p className="p-4 bg-gray-50 rounded-lg">{transcription}</p>
        </motion.div>
      )}
    </div>
  );
};

export default AudioTranscriber; 