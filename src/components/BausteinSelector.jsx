import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function BausteinSelector({ currentUserId, selectedVorlage, onBausteineChange }) {
  const [bausteine, setBausteine] = useState([]);
  const [aktiveBausteine, setAktiveBausteine] = useState([]);
  const [favoriten, setFavoriten] = useState([]);
  const [vorlagenBausteine, setVorlagenBausteine] = useState([]);

  // Bausteine und Favoriten laden
  useEffect(() => {
    const loadBausteine = async () => {
      const snapshot = await getDocs(collection(db, "Praxen", "1", "Bausteine"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBausteine(data);
      
      // Favoriten filtern
      const userFavoriten = data.filter(b => b.favoritenVon?.includes(currentUserId));
      setFavoriten(userFavoriten);
      
      // Vorlagen-Bausteine filtern
      if (selectedVorlage?.bausteine) {
        const vorlagenData = data.filter(b => selectedVorlage.bausteine.includes(b.id));
        setVorlagenBausteine(vorlagenData);
        // Vorlagen-Bausteine automatisch aktivieren
        setAktiveBausteine(selectedVorlage.bausteine);
      }
    };
    loadBausteine();
  }, [currentUserId, selectedVorlage]);

  // Aktivierte Bausteine nach außen melden
  useEffect(() => {
    onBausteineChange(aktiveBausteine);
  }, [aktiveBausteine, onBausteineChange]);

  // Baustein aktivieren/deaktivieren
  const toggleBaustein = (bausteinId) => {
    setAktiveBausteine(prev =>
      prev.includes(bausteinId)
        ? prev.filter(id => id !== bausteinId)
        : [...prev, bausteinId]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {/* Favoriten */}
      {favoriten.length > 0 && (
        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-2">Favoriten:</div>
          <div className="flex flex-wrap gap-2">
            {favoriten.map(baustein => (
              <motion.button
                key={baustein.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleBaustein(baustein.id)}
                className={`px-3 py-1 rounded-full border transition-colors ${
                  aktiveBausteine.includes(baustein.id)
                    ? 'bg-[#ff9900] text-white border-[#ff9900]'
                    : 'bg-white text-[#ff9900] border-[#ff9900] hover:bg-orange-50'
                } font-semibold text-sm`}
              >
                {baustein.titel}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Vorlagen-Bausteine */}
      {vorlagenBausteine.length > 0 && (
        <div>
          <div className="text-sm text-gray-500 mb-2">Behandlungsschritte:</div>
          <div className="flex flex-wrap gap-2">
            {vorlagenBausteine.map(baustein => (
              <motion.button
                key={baustein.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleBaustein(baustein.id)}
                className={`px-3 py-1 rounded-full border transition-colors ${
                  aktiveBausteine.includes(baustein.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                } font-semibold text-sm`}
              >
                {baustein.titel}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Aktive Bausteine als Text anzeigen */}
      <AnimatePresence>
        {aktiveBausteine.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 text-sm text-gray-600"
          >
            <div className="font-medium mb-1">Gewählte Bausteine:</div>
            <div className="pl-2 border-l-2 border-gray-200">
              {aktiveBausteine.map(id => {
                const baustein = bausteine.find(b => b.id === id);
                return baustein ? (
                  <div key={id} className="mb-1">
                    • {baustein.titel}
                    {baustein.abrechnung?.length > 0 && (
                      <span className="text-blue-600 ml-2">
                        ({baustein.abrechnung.join(', ')})
                      </span>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 