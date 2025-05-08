import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiSend, FiLogOut, FiUser, FiHelpCircle, FiEdit2, FiChevronLeft, FiCircle } from "react-icons/fi";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, OPENAI_API_KEY } from "./firebase";
import { AudioRecorder } from "./services/AudioRecorder";
import { WhisperService } from "./services/WhisperService";
import DocumentationModal from "./components/DocumentationModal";
import CustomDropdown from "./components/CustomDropdown";
import TopNavigation from "./components/TopNavigation";
import BausteinSelector from './components/BausteinSelector';

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
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);
  const [sidebarStep, setSidebarStep] = useState(1); // 1: Kategorie, 2: Behandlung
  const [billingSuggestions, setBillingSuggestions] = useState("");
  const [confirmedExtras, setConfirmedExtras] = useState([]);
  const [pendingExtras, setPendingExtras] = useState([]); // Von GPT vorgeschlagene, aber noch nicht bestätigte Leistungen
  const [aktiveBausteine, setAktiveBausteine] = useState([]);
  const [bausteine, setBausteine] = useState([]);

  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem('selectedUser', selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        const templateSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
        const templateList = templateSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTemplates(templateList);

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

  useEffect(() => {
    const fetchBausteine = async () => {
      const snap = await getDocs(collection(db, "Praxen", "1", "Bausteine"));
      setBausteine(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchBausteine();
  }, []);

  const treatments = templates.filter((t) => {
    const matchesCategory = t.Kategorie === selectedCategory;
    const matchesUser = !selectedUser || t.users?.includes("all") || t.users?.includes(selectedUser);
    return matchesCategory && matchesUser;
  });

  const categories = [...new Set(
    templates
      .filter(t => !selectedUser || t.users?.includes("all") || t.users?.includes(selectedUser))
      .map((t) => t.Kategorie)
      .filter(Boolean)
  )];

  const handleTextSubmit = async () => {
    if (!inputValue.trim() || !selectedTreatment) return;
    try {
      setIsProcessing(true);
      const selectedTemplate = templates.find(t => t.id === selectedTreatment);
      if (!selectedTemplate) throw new Error('Vorlage nicht gefunden');
      const systemPrompt = selectedTemplate?.prompt || "Erstelle eine strukturierte Dokumentation für die gewählten Bausteine und den eingegebenen Text.";
      const aktiveBausteineData = aktiveBausteine
        .map(id => bausteine.find(b => b.id === id))
        .filter(Boolean);
      const bausteinTexte = aktiveBausteineData
        .map(b => typeof b.standardText === 'string' ? b.standardText : '')
        .filter(Boolean)
        .join("\n");
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Verwende diese Bausteine als Basis:\n${bausteinTexte}\n\nHier ist der individuelle Text:\n${inputValue}` }
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
      setInputValue("");
      setSelectedTreatment("");
      setSelectedCategory("");
      setIsProcessing(false);
      await setDoc(doc(db, "Praxen", "1", "Dokumentationen", Date.now().toString()), {
        behandlung: selectedTemplate.id,
        transkript: inputValue,
        dokumentation: processedText,
        timestamp: new Date(),
        user: selectedUser
      });
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

  // Angepasstes Prompt-Template für GPT
  const buildBillingPrompt = (documentationText, extras = []) => {
    let extraInfo = "";
    if (extras.length > 0) {
      extraInfo = `Folgende Leistungen wurden nach Rückfrage tatsächlich erbracht, aber nicht dokumentiert: ${extras.join(", ")}. Bitte berücksichtige dies bei der Analyse und Abrechnungsoptimierung.`;
    }
    return [
      { role: 'system', content: 'Du bist ein Experte für zahnärztliche Abrechnung. Analysiere die folgende Behandlungsdokumentation und identifiziere potenzielle Abrechnungsmöglichkeiten. Gib Vorschläge für zusätzliche GOZ/BEMA-Codes, die anwendbar sein könnten. Für jeden Vorschlag: Leistung, Bezeichnung, Begründung, und optional Verbesserungsvorschlag. Wenn typische Leistungen wie Mehrschichttechnik, Kofferdamm, Matrize, Anästhesie etc. nicht erwähnt werden, gib sie als Liste von "offenen Fragen" zurück, z.B. "Mehrschichttechnik wurde nicht dokumentiert. Wurde sie durchgeführt?".' },
      { role: 'user', content: `${extraInfo}\n\nDokumentation: ${documentationText}` }
    ];
  };

  // Angepasste Funktion zur Abrechnungsoptimierung
  const performBillingOptimization = async (documentationText, extras = []) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: buildBillingPrompt(documentationText, extras)
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
      }
      const data = await response.json();
      const suggestions = data.choices[0].message.content;
      setBillingSuggestions(suggestions);
      // Extrahiere offene Fragen (z.B. Zeilen mit "?" am Ende)
      const pending = suggestions.split(/\n/).filter(l => l.trim().endsWith("?"));
      setPendingExtras(pending);
    } catch (error) {
      console.error('Fehler bei der Abrechnungsoptimierung:', error);
    }
  };

  // Nach der Textverarbeitung Abrechnungsoptimierung durchführen
  useEffect(() => {
    if (processedText) {
      performBillingOptimization(processedText, confirmedExtras);
    }
    // eslint-disable-next-line
  }, [processedText, confirmedExtras]);

  // Handler für Klick auf Zusatzleistung
  const handleConfirmExtra = (extra) => {
    setConfirmedExtras(prev => [...prev, extra]);
    setPendingExtras(prev => prev.filter(e => e !== extra));
  };

  // Hilfsfunktion zum Parsen der GPT-Ausgabe in strukturierte Vorschläge
  function parseBillingSuggestions(suggestions) {
    // Einfache Heuristik: Trenne an \n\n oder an "Leistung:"-Vorkommen
    const blocks = suggestions.split(/\n\n|(?=Leistung:)/g).map(block => block.trim()).filter(Boolean);
    return blocks.map(block => {
      const leistung = block.match(/Leistung: ?(.+?)(\n|$)/i)?.[1] || "";
      const bezeichnung = block.match(/Bezeichnung: ?(.+?)(\n|$)/i)?.[1] || "";
      const begruendung = block.match(/Begründung: ?(.+?)(\n|$)/i)?.[1] || "";
      const verbesserung = block.match(/Verbesserungsvorschlag: ?(.+?)(\n|$)/i)?.[1] || "";
      return { leistung, bezeichnung, begruendung, verbesserung };
    });
  }

  // Hilfsfunktion für die schöne Formatierung des fertigen Textes
  function renderProcessedText(text) {
    if (!text) return null;
    const lines = text.split(/\n/);
    const elements = [];
    let currentList = [];
    lines.forEach((line, idx) => {
      // Überschrift (### ...)
      if (/^### ?(.+)/.test(line)) {
        if (currentList.length) {
          elements.push(<ul className="list-disc ml-6 mb-2" key={elements.length}>{currentList.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          currentList = [];
        }
        elements.push(<div className="font-bold text-xl mb-2 mt-4" key={elements.length}>{line.replace(/^### ?/, "")}</div>);
      }
      // Listenpunkt
      else if (/^- /.test(line)) {
        currentList.push(line.replace(/^- /, ""));
      }
      // Leere Zeile = Absatzende
      else if (line.trim() === "") {
        if (currentList.length) {
          elements.push(<ul className="list-disc ml-6 mb-2" key={elements.length}>{currentList.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          currentList = [];
        }
        // Absatzumbruch
        elements.push(<div className="h-2" key={elements.length}></div>);
      }
      // Normaler Absatz
      else {
        if (currentList.length) {
          elements.push(<ul className="list-disc ml-6 mb-2" key={elements.length}>{currentList.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          currentList = [];
        }
        elements.push(<p className="mb-1" key={elements.length}>{line}</p>);
      }
    });
    if (currentList.length) {
      elements.push(<ul className="list-disc ml-6 mb-2" key={elements.length}>{currentList.map((item, i) => <li key={i}>{item}</li>)}</ul>);
    }
    return elements;
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-gradient-to-br from-[#e6f7c1] via-[#ffe6a7] to-[#ffb36b]" style={{background: 'radial-gradient(circle at 20% 30%, #b6e3c6 0%, #ffe6a7 40%, #ffb36b 100%)'}} />
      </div>
      <TopNavigation />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-[320px] flex flex-col justify-start py-16 px-12 min-h-screen relative">
          {/* Branding */}
          <div className="mb-20">
            <span className="text-5xl font-extrabold tracking-tight text-[#ff9900] block mb-2">evident.</span>
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">AI DOCS</span>
          </div>
          {/* Zweistufiges Auswahlmenü */}
          <div className="mb-16 relative min-h-[180px]">
            <motion.div
              initial={false}
              animate={{ x: sidebarStep === 1 ? 0 : -340, opacity: sidebarStep === 1 ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 80, damping: 18 }}
              className="absolute top-0 left-0 w-full"
            >
              <div className="flex flex-col gap-0">
                {categories.map(category => (
                  <motion.div
                    key={category}
                    className="w-full py-1 text-2xl font-semibold font-sans tracking-tight cursor-pointer select-none px-2 text-left text-white"
                    whileHover={{ scale: 1.08 }}
                    animate={{ color: '#fff' }}
                    transition={{ duration: 0.16 }}
                    onClick={() => { setSelectedCategory(category); setSidebarStep(2); }}
                  >
                    {category}
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={false}
              animate={{ x: sidebarStep === 2 ? 0 : 340, opacity: sidebarStep === 2 ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 80, damping: 18 }}
              className="absolute top-0 left-0 w-full"
            >
              <AnimatePresence>
                {selectedTreatment ? (
                  <div className="flex flex-row items-center gap-2 h-40">
                    <motion.div
                      key={selectedTreatment}
                      initial={{ opacity: 0, scale: 0.7, rotate: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 2.2, rotate: -90, y: 140 }}
                      exit={{ opacity: 0, scale: 0.7, rotate: 0, y: 0 }}
                      transition={{ type: 'spring', stiffness: 100, damping: 18 }}
                      className="origin-left text-white font-extrabold cursor-pointer select-none"
                      style={{ fontSize: '2.2rem', minWidth: '120px', letterSpacing: '0.01em' }}
                      onClick={() => { setSelectedTreatment(""); setSidebarStep(2); }}
                      title="Behandlung ändern"
                    >
                      {treatments.find(t => t.id === selectedTreatment)?.id}
                    </motion.div>
                  </div>
                ) : (
                  <div className="flex flex-row items-start gap-2">
                    <button onClick={() => setSidebarStep(1)} className="p-2 mt-1 rounded-full hover:bg-gray-100 transition-colors"><FiChevronLeft className="text-2xl text-[#ff9900]" /></button>
                    <div className="flex flex-col gap-0 pl-1">
                      {treatments.map(treatment => (
                        <motion.div
                          key={treatment.id}
                          className="w-full py-1 text-2xl font-semibold font-sans tracking-tight cursor-pointer select-none px-2 text-left text-white"
                          whileHover={{ scale: 1.08 }}
                          animate={{ color: '#fff' }}
                          transition={{ duration: 0.16 }}
                          onClick={() => setSelectedTreatment(treatment.id)}
                        >
                          {treatment.id}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          <div className="flex-1" />
          {/* Avatar und Behandler-Auswahl ganz unten */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#ff9900] flex items-center justify-center text-white text-2xl font-extrabold">
              <FiUser />
            </div>
            <div className="flex-1">
              <CustomDropdown
                label="Behandler"
                value={selectedUser}
                options={[
                  ...users.map(u => ({ value: u.id, label: u.name })),
                  { value: "__logout__", label: "Abmelden" }
                ]}
                onChange={val => {
                  if (val === "__logout__") handleLogout();
                  else setSelectedUser(val);
                }}
                color="#22223b"
                size="small"
              />
              <div className="text-xs text-gray-500 mt-1">{selectedUser ? users.find(u => u.id === selectedUser)?.role : ""}</div>
            </div>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-24 py-24">
          <div className="max-w-4xl mx-auto w-full">
            <AnimatePresence initial={false}>
              {!processedText ? (
                <motion.div
                  key="eingabe"
                  initial={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                >
                  <h2 className="text-6xl font-extrabold text-[#22223b] mb-12 tracking-tight">Dokumentation beginnt hier</h2>
                  {selectedTreatment && (
                    <BausteinSelector
                      currentUserId={selectedUser}
                      selectedVorlage={templates.find(t => t.id === selectedTreatment)}
                      onBausteineChange={setAktiveBausteine}
                    />
                  )}
                  <motion.input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Spracheingabe oder Text hier eingeben..."
                    className="w-full px-0 py-6 border-0 border-b-2 border-[#ff9900] bg-transparent text-4xl font-light focus:outline-none focus:ring-0 placeholder-gray-400 mb-12"
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                  />
                  <motion.div
                    className="flex gap-8 w-full"
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                  >
                    <button
                      onClick={() => setIsRecording(!isRecording)}
                      disabled={isProcessing || !selectedTreatment || inputValue.trim()}
                      className={`flex-1 flex items-center justify-center gap-3 ${selectedCategory && selectedTreatment ? 'px-0 py-3 text-xl' : 'px-0 py-6 text-3xl'} font-extrabold uppercase tracking-wide transition-colors rounded-full ${
                        isRecording 
                          ? "bg-red-500 text-white" 
                          : "bg-[#ff9900] text-white hover:bg-orange-600"
                      } ${(isProcessing || !selectedTreatment || inputValue.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <FiMic className={`text-3xl ${isRecording ? "animate-pulse" : ""}`} />
                      {isProcessing ? "Verarbeite..." : isRecording ? "Aufnahme läuft..." : "Aufnahme starten"}
                    </button>
                    <button
                      onClick={handleTextSubmit}
                      disabled={!inputValue.trim() || !selectedTreatment || isProcessing || isRecording}
                      className={`flex-1 flex items-center justify-center gap-3 ${selectedCategory && selectedTreatment ? 'px-0 py-3 text-xl' : 'px-0 py-6 text-3xl'} font-extrabold uppercase tracking-wide transition-colors rounded-full ${
                        (!inputValue.trim() || !selectedTreatment || isProcessing || isRecording)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <FiSend className="text-3xl" />
                      {isProcessing ? "Verarbeite..." : "Text verarbeiten"}
                    </button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="ergebnis"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                >
                  <div className="flex flex-row gap-12 items-start">
                    <div className="flex-[2] pr-8 text-lg text-gray-800">
                      {renderProcessedText(processedText)}
                    </div>
                    {billingSuggestions && (
                      <div className="flex-1 pl-8 border-l border-gray-200">
                        <h3 className="text-lg font-bold text-blue-900 mb-4">Abrechnungsoptimierung</h3>
                        <div className="flex flex-col gap-6">
                          {parseBillingSuggestions(billingSuggestions).map((v, idx) => (
                            <div key={idx} className="flex flex-col gap-1 text-base text-blue-900">
                              {v.leistung && <div><span className="font-bold text-[#ff9900] mr-2">Leistung:</span><span className="font-semibold">{v.leistung}</span></div>}
                              {v.bezeichnung && <div><span className="font-bold text-blue-700 mr-2">Bezeichnung:</span>{v.bezeichnung}</div>}
                              {v.begruendung && <div><span className="font-bold text-blue-700 mr-2">Begründung:</span>{v.begruendung}</div>}
                              {v.verbesserung && <div><span className="font-bold text-blue-700 mr-2">Verbesserungsvorschlag:</span>{v.verbesserung}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {pendingExtras.length > 0 && (
                    <div className="mb-6">
                      <div className="font-semibold text-orange-700 mb-2">Möglicherweise vergessene Leistungen:</div>
                      <div className="flex flex-col gap-2">
                        {pendingExtras.map((extra, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span>{extra}</span>
                            <button
                              className="px-3 py-1 rounded bg-[#ff9900] text-white font-bold hover:bg-orange-600 transition-colors"
                              onClick={() => handleConfirmExtra(extra.replace(/ wurde nicht dokumentiert\. Wurde sie durchgeführt\?/, ""))}
                            >
                              Ja, war Teil der Behandlung
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}