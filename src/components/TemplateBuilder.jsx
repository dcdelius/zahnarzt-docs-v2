import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiX } from 'react-icons/fi';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const STANDARD_PHRASES = [
  'Klinische Untersuchung zeigt',
  'Patient berichtet über',
  'Röntgenologisch zeigt sich',
  'Bei der Inspektion fällt auf',
  'Nach Lokalanästhesie erfolgte',
  'Unter sterilen Bedingungen wurde',
  'Die Behandlung erfolgte mit',
  'Es wurde schonend präpariert',
  'Kontrolltermin in einer Woche',
  'Bis zur vollständigen Abheilung',
  'Patient wurde instruiert',
  'Regelmäßige Kontrollen empfohlen'
];

const MATERIALS = [
  'Komposit',
  'Glasionomerzement',
  'Amalgam',
  'Keramik',
  'Titan',
  'Zirkonoxid'
];

export default function TemplateBuilder({ template, onChange }) {
  const [content, setContent] = useState(template?.Text || '');
  const [showPreview, setShowPreview] = useState(true);
  const [bausteine, setBausteine] = useState([]);
  const [selectedBausteine, setSelectedBausteine] = useState(template?.bausteine || []);
  
  // Lade Bausteine aus Firebase
  useEffect(() => {
    const fetchBausteine = async () => {
      try {
        const bausteineSnap = await getDocs(collection(db, "Praxen", "1", "Bausteine"));
        const bausteineData = bausteineSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBausteine(bausteineData);
      } catch (error) {
        console.error("Fehler beim Laden der Bausteine:", error);
      }
    };
    fetchBausteine();
  }, []);

  const handleContentChange = (newContent) => {
    setContent(newContent);
    onChange?.({ ...template, Text: newContent, bausteine: selectedBausteine });
  };

  const handleAddPhrase = (phrase) => {
    const textArea = document.getElementById('template-textarea');
    const cursorPos = textArea.selectionStart;
    const textBefore = content.substring(0, cursorPos);
    const textAfter = content.substring(cursorPos);
    
    const newContent = textBefore + phrase + textAfter;
    handleContentChange(newContent);
    
    // Cursor nach dem eingefügten Text positionieren
    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(cursorPos + phrase.length, cursorPos + phrase.length);
    }, 0);
  };

  const handleAddBaustein = (baustein) => {
    if (!selectedBausteine.includes(baustein.id)) {
      const newSelectedBausteine = [...selectedBausteine, baustein.id];
      setSelectedBausteine(newSelectedBausteine);
      handleAddPhrase(baustein.standardText + "\n");
      onChange?.({ ...template, bausteine: newSelectedBausteine });
    }
  };

  const handleRemoveBaustein = (bausteinId) => {
    const newSelectedBausteine = selectedBausteine.filter(id => id !== bausteinId);
    setSelectedBausteine(newSelectedBausteine);
    onChange?.({ ...template, bausteine: newSelectedBausteine });
  };

  return (
    <div className="space-y-6">
      {/* Ausgewählte Bausteine */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm p-4">
        <h3 className="font-medium text-gray-700 mb-3">Ausgewählte Bausteine</h3>
        <div className="flex flex-wrap gap-2">
          {selectedBausteine.map(bausteinId => {
            const baustein = bausteine.find(b => b.id === bausteinId);
            if (!baustein) return null;
            return (
              <div 
                key={baustein.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm"
              >
                <span>{baustein.titel}</span>
                <button 
                  onClick={() => handleRemoveBaustein(baustein.id)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <FiX />
                </button>
              </div>
            );
          })}
          {selectedBausteine.length === 0 && (
            <p className="text-gray-400 text-sm italic">Keine Bausteine ausgewählt</p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Vorlage bearbeiten</h3>
            <div className="flex gap-2">
              {/* Bausteine Dropdown */}
              <select
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white/80"
                onChange={(e) => {
                  if (e.target.value) {
                    const baustein = bausteine.find(b => b.id === e.target.value);
                    if (baustein) {
                      handleAddBaustein(baustein);
                    }
                    e.target.value = '';
                  }
                }}
              >
                <option value="">+ Baustein hinzufügen</option>
                {bausteine
                  .filter(baustein => !selectedBausteine.includes(baustein.id))
                  .map(baustein => (
                    <option key={baustein.id} value={baustein.id}>
                      {baustein.titel}
                    </option>
                  ))
                }
              </select>
              
              {/* Phrases Dropdown */}
              <select
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white/80"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPhrase(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">+ Textbaustein einfügen</option>
                {STANDARD_PHRASES.map(phrase => (
                  <option key={phrase} value={phrase}>{phrase}</option>
                ))}
              </select>
              
              {/* Materials Dropdown */}
              <select
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white/80"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPhrase(`Verwendetes Material: ${e.target.value}`);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">+ Material hinzufügen</option>
                {MATERIALS.map(material => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white/80 hover:bg-white"
              >
                {showPreview ? "Vorschau ausblenden" : "Vorschau einblenden"}
              </button>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm p-4">
            <textarea
              id="template-textarea"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Geben Sie hier Ihre Vorlage ein..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/90 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[500px] font-mono text-sm"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-[400px] sticky top-0 h-fit"
          >
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6">
              <h3 className="font-medium text-gray-700 mb-4 pb-2 border-b">Vorschau</h3>
              <div className="prose prose-sm max-w-none">
                {content ? (
                  <div className="bg-white/60 rounded-lg p-3 shadow-sm">
                    <p className="whitespace-pre-wrap text-gray-600">{content}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">Noch keine Vorlage eingegeben...</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 