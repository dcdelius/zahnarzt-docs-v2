import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiMic, FiSend, FiLogOut } from "react-icons/fi";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, OPENAI_API_KEY } from "./firebase";
import { AudioRecorder } from "./services/AudioRecorder";
import { WhisperService } from "./services/WhisperService";
import Sidebar from "./components/Sidebar";
import DocumentationModal from "./components/DocumentationModal";

// Animation variants für konsistente Übergänge
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const hoverScale = {
  scale: 1.02,
  transition: { duration: 0.2 }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedUser, setSelectedUser] = useState(() => {
    return localStorage.getItem('selectedUser') || "";
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [whisperService] = useState(() => new WhisperService(import.meta.env.VITE_OPENAI_API_KEY));
  const [processedText, setProcessedText] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Speichere Behandler-Auswahl
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem('selectedUser', selectedUser);
    }
  }, [selectedUser]);

  // Lade Benutzer und Vorlagen aus Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Benutzer laden
        const userSnap = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
        const userList = userSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            role: data.role || data.Rolle || "Behandler",
            avatarColor: data.avatarColor || "#94a3b8"
          };
        });
        setUsers(userList);

        // Vorlagen laden
        const templateSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
        const templateList = templateSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTemplates(templateList);

        // Dokumentationen laden
        const docSnap = await getDocs(collection(db, "Praxen", "1", "Dokumentationen"));
        const docList = docSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        const sortedDocs = docList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        setHistory(sortedDocs);
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
      }
    };
    fetchData();
  }, []);

  // Filtere Behandlungen nach ausgewählter Kategorie und Benutzer
  const treatments = templates.filter((t) => {
    const matchesCategory = t.Kategorie === selectedCategory;
    const matchesUser = !selectedUser || t.users?.includes("all") || t.users?.includes(selectedUser);
    return matchesCategory && matchesUser;
  });

  // Extrahiere eindeutige Kategorien aus den Vorlagen
  const categories = [...new Set(
    templates
      .filter(t => !selectedUser || t.users?.includes("all") || t.users?.includes(selectedUser))
      .map((t) => t.Kategorie)
      .filter(Boolean)
  )];

  // Wenn sich der Benutzer ändert, setze die Kategorie zurück
  useEffect(() => {
    setSelectedCategory("");
    setSelectedTreatment("");
  }, [selectedUser]);

  // Wenn sich die Kategorie ändert, setze die Behandlung zurück
  useEffect(() => {
    setSelectedTreatment("");
  }, [selectedCategory]);

  const handleRecordingToggle = async () => {
    if (isRecording) {
      try {
        setIsProcessing(true);
        const audioBlob = await audioRecorder.stopRecording();
        setIsRecording(false);
        
        // Transcribe the audio
        const transcription = await whisperService.transcribe(audioBlob);
        setInputValue(transcription);

        // Automatische Verarbeitung mit der ausgewählten Vorlage
        if (selectedTreatment) {
          const selectedTemplate = templates.find(t => t.id === selectedTreatment);
          
          if (!selectedTemplate) {
            throw new Error('Vorlage nicht gefunden');
          }

          // Verarbeitung mit ChatGPT
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content: selectedTemplate.Prompt
                },
                {
                  role: "user",
                  content: `Verwende diese Vorlage als Basis: ${selectedTemplate.Text}\n\nHier ist das Transkript der Behandlung: ${transcription}`
                }
              ]
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
          }

          const data = await response.json();
          const processedText = data.choices[0].message.content;
          setProcessedText(processedText);
          setShowModal(true);

          // Reset Eingabefeld und Auswahl
          setInputValue("");
          setSelectedTreatment("");
          setSelectedCategory("");
          setIsProcessing(false);

          // Speichern in Firebase
          await setDoc(doc(db, "Praxen", "1", "Dokumentationen", Date.now().toString()), {
            behandlung: selectedTemplate.id,
            transkript: transcription,
            dokumentation: processedText,
            timestamp: new Date(),
            user: selectedUser
          });

          // Aktualisiere den Verlauf
          const docSnap = await getDocs(collection(db, "Praxen", "1", "Dokumentationen"));
          const docList = docSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
          }));
          const sortedDocs = docList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
          setHistory(sortedDocs);
        }
      } catch (err) {
        console.error('Processing error:', err);
        alert('Fehler bei der Verarbeitung: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        await audioRecorder.startRecording();
        setIsRecording(true);
        setProcessedText(""); // Reset processed text when starting new recording
      } catch (err) {
        console.error('Recording error:', err);
        alert('Fehler beim Starten der Aufnahme: ' + err.message);
      }
    }
  };

  const handleTextSubmit = async () => {
    if (!inputValue.trim() || !selectedTreatment) return;

    try {
      setIsProcessing(true);
      const selectedTemplate = templates.find(t => t.id === selectedTreatment);
      
      if (!selectedTemplate) {
        throw new Error('Vorlage nicht gefunden');
      }

      // Verarbeitung mit ChatGPT
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: selectedTemplate.Prompt
            },
            {
              role: "user",
              content: `Verwende diese Vorlage als Basis: ${selectedTemplate.Text}\n\nHier ist das Transkript der Behandlung: ${inputValue}`
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
      }

      const data = await response.json();
      const processedText = data.choices[0].message.content;
      setProcessedText(processedText);
      setShowModal(true);

      // Reset Eingabefeld und Auswahl
      setInputValue("");
      setSelectedTreatment("");
      setSelectedCategory("");
      setIsProcessing(false);

      // Speichern in Firebase
      await setDoc(doc(db, "Praxen", "1", "Dokumentationen", Date.now().toString()), {
        behandlung: selectedTemplate.id,
        transkript: inputValue,
        dokumentation: processedText,
        timestamp: new Date(),
        user: selectedUser
      });

      // Aktualisiere den Verlauf
      const docSnap = await getDocs(collection(db, "Praxen", "1", "Dokumentationen"));
      const docList = docSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      const sortedDocs = docList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
      setHistory(sortedDocs);
    } catch (error) {
      console.error('Error processing text:', error);
      alert('Fehler bei der Verarbeitung: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">EVIDENTIA</h1>
              </div>
              <nav className="ml-6 flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-3 py-2 rounded-md text-sm font-medium text-blue-600 bg-blue-50"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/knowledge')}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Wissensdatenbank
                </button>
                <button
                  onClick={() => navigate('/email')}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  E-Mail-Responder
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Einstellungen
                </button>
              </nav>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                <FiLogOut className="mr-2" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <motion.div
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full max-w-[1200px] h-[700px] bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
        >
          {/* Sidebar */}
          <Sidebar
            users={users}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            treatments={treatments}
            selectedTreatment={selectedTreatment}
            setSelectedTreatment={setSelectedTreatment}
            history={history}
            setProcessedText={setProcessedText}
            setShowModal={setShowModal}
          />

          {/* Hauptbereich */}
          <div className="flex-1 p-6 md:p-12">
            <div className="space-y-8">
              <motion.div 
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <img src="/inverted_logo.png" alt="EVIDENT A.I." className="w-32 h-32 md:w-48 md:h-48 mb-8" />
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">EVIDENT A.I.</h2>
                <p className="text-gray-500 text-sm mt-3">Dokumentation beginnt hier</p>
              </motion.div>

              {/* Trennlinie mit Fade */}
              <div className="relative w-full max-w-2xl mx-auto">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-2xl mx-auto mt-12"
              >
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Spracheingabe oder Text hier eingeben..."
                    className="w-full px-6 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm bg-white/90 shadow-sm transition-all placeholder-gray-400"
                  />
                </motion.div>
              </motion.div>

              <motion.div 
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRecordingToggle}
                  disabled={isProcessing || !selectedTreatment || inputValue.trim()}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium shadow-md ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600" 
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white transition-all ${(isProcessing || !selectedTreatment || inputValue.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FiMic className={`text-base ${isRecording ? "animate-pulse" : ""}`} />
                  {isProcessing ? "Verarbeite..." : isRecording ? "Aufnahme läuft..." : "Aufnahme starten"}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTextSubmit}
                  disabled={!inputValue.trim() || !selectedTreatment || isProcessing || isRecording}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-all shadow-md ${
                    (!inputValue.trim() || !selectedTreatment || isProcessing || isRecording) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FiSend className="text-base" />
                  {isProcessing ? "Verarbeite..." : "Text verarbeiten"}
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal für den fertigen Text */}
      <DocumentationModal
        showModal={showModal}
        setShowModal={setShowModal}
        processedText={processedText}
        selectedUser={selectedUser}
        users={users}
      />
    </div>
  );
}