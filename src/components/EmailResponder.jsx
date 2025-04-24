import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSend, FiMail, FiEdit2, FiClock, FiPlus, FiCalendar, FiUser, FiMessageSquare, FiCopy } from "react-icons/fi";
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import Navigation from "./Navigation";

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

// Vordefinierte Antwortbausteine
const responseTemplates = [
  {
    title: "Terminbestätigung",
    icon: <FiCalendar />,
    content: "Vielen Dank für Ihre Terminanfrage. Wir bestätigen Ihnen hiermit Ihren Termin am [Datum] um [Uhrzeit].",
    fields: [
      { name: "Datum", type: "date" },
      { name: "Uhrzeit", type: "time" }
    ]
  },
  {
    title: "Terminabsage",
    icon: <FiCalendar />,
    content: "Leider müssen wir Ihren Termin am [Datum] absagen. Wir bitten um Ihr Verständnis und schlagen Ihnen gerne einen neuen Termin vor.",
    fields: [
      { name: "Datum", type: "date" }
    ]
  },
  {
    title: "Gute Besserung",
    icon: <FiUser />,
    content: "Wir wünschen Ihnen eine gute Besserung und hoffen, dass Sie sich bald wieder wohlfühlen."
  },
  {
    title: "Rezeptanfrage",
    icon: <FiMessageSquare />,
    content: "Wir haben Ihre Rezeptanfrage erhalten und werden diese umgehend bearbeiten. Das Rezept wird Ihnen in den nächsten Tagen per Post zugesendet."
  },
  {
    title: "Allgemeine Information",
    icon: <FiMessageSquare />,
    content: "Vielen Dank für Ihre Anfrage. Wir möchten Sie darüber informieren, dass [Information].",
    fields: [
      { name: "Information", type: "text" }
    ]
  }
];

export default function EmailResponder() {
  const [patientEmail, setPatientEmail] = useState("");
  const [responseInstructions, setResponseInstructions] = useState("");
  const [generatedResponse, setGeneratedResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateFields, setTemplateFields] = useState({});
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const historySnap = await getDocs(
          query(collection(db, "Praxen", "1", "EmailVerlauf"), orderBy("timestamp", "desc"))
        );
        const historyList = historySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHistory(historyList);
      } catch (error) {
        console.error("Fehler beim Laden des Verlaufs:", error);
      }
    };

    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientEmail.trim() || !responseInstructions.trim()) return;

    setIsLoading(true);
    try {
      // Hier würde die Integration mit der KI-API erfolgen
      // Für jetzt simulieren wir eine Antwort
      const response = await new Promise(resolve => 
        setTimeout(() => resolve({
          text: `Sehr geehrte Patientin, sehr geehrter Patient,\n\n${responseInstructions}\n\nMit freundlichen Grüßen\nIhr Praxisteam`
        }), 1000)
      );

      setGeneratedResponse(response.text);

      // Speichern im Verlauf
      await addDoc(collection(db, "Praxen", "1", "EmailVerlauf"), {
        patientEmail,
        responseInstructions,
        generatedResponse: response.text,
        timestamp: serverTimestamp()
      });

      // Verlauf aktualisieren
      const historySnap = await getDocs(
        query(collection(db, "Praxen", "1", "EmailVerlauf"), orderBy("timestamp", "desc"))
      );
      const historyList = historySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(historyList);

    } catch (error) {
      console.error('Fehler bei der Verarbeitung:', error);
      setGeneratedResponse('Es tut mir leid, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedResponse);
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setTemplateFields({});
    let content = template.content;
    
    // Ersetze Platzhalter mit leeren Feldern
    if (template.fields) {
      template.fields.forEach(field => {
        content = content.replace(`[${field.name}]`, `[${field.name}]`);
      });
    }
    
    setResponseInstructions(content);
  };

  const handleFieldChange = (fieldName, value) => {
    setTemplateFields(prev => ({
      ...prev,
      [fieldName]: value
    }));

    let content = selectedTemplate.content;
    Object.entries({ ...templateFields, [fieldName]: value }).forEach(([name, val]) => {
      content = content.replace(`[${name}]`, val);
    });

    setResponseInstructions(content);
  };

  const handleHistorySelect = (item) => {
    setPatientEmail(item.patientEmail);
    setResponseInstructions(item.responseInstructions);
    setGeneratedResponse(item.generatedResponse);
    setSelectedTemplate(null);
    setTemplateFields({});
  };

  return (
    <div className="min-h-screen bg-[url('/background.jpg')] bg-cover bg-center">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex w-full max-w-7xl h-[780px] bg-white/40 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Sidebar mit Verlauf */}
          <div className="w-64 bg-black/60 backdrop-blur-lg text-white p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <FiClock className="text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Verlauf</h3>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto">
              {history.map((item, index) => (
                <motion.button
                  key={item.id}
                  whileHover={{ backgroundColor: "#FFFFFF15" }}
                  onClick={() => handleHistorySelect(item)}
                  className="w-full text-left p-2 rounded-lg text-sm transition-colors hover:bg-white/10"
                >
                  <div className="truncate">{item.patientEmail}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(item.timestamp?.toDate()).toLocaleDateString()}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Hauptbereich */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <FiMail className="text-blue-400" />
                  E-Mail-Responder
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Letzte Aktualisierung:</span>
                  <span className="text-sm text-white">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Hauptbereich */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* E-Mail-Eingabe */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  <FiUser className="text-blue-400" />
                  Patientene-Mail
                </label>
                <textarea
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="Fügen Sie hier die E-Mail des Patienten ein..."
                  className="w-full h-32 px-4 py-3 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/10 text-white placeholder-gray-400 backdrop-blur-sm resize-none"
                />
              </div>

              {/* Antwortbausteine */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  <FiMessageSquare className="text-blue-400" />
                  Antwortbausteine
                </label>
                <div className="flex flex-wrap gap-2">
                  {responseTemplates.map((template, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ backgroundColor: "#FFFFFF15" }}
                      onClick={() => handleTemplateSelect(template)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedTemplate === template ? "bg-white/20" : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {template.icon}
                      {template.title}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Template-Felder */}
              {selectedTemplate?.fields && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white flex items-center gap-2">
                    <FiEdit2 className="text-blue-400" />
                    Details
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedTemplate.fields.map((field, index) => (
                      <div key={index} className="space-y-1">
                        <label className="text-sm text-gray-300">{field.name}</label>
                        <input
                          type={field.type}
                          value={templateFields[field.name] || ""}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/10 text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Antwortanweisungen */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  <FiMessageSquare className="text-blue-400" />
                  Antwortanweisungen
                </label>
                <textarea
                  value={responseInstructions}
                  onChange={(e) => setResponseInstructions(e.target.value)}
                  placeholder="Beschreiben Sie hier, was geantwortet werden soll..."
                  className="w-full h-32 px-4 py-3 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/10 text-white placeholder-gray-400 backdrop-blur-sm resize-none"
                />
              </div>

              {/* Generierte Antwort */}
              {generatedResponse && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white flex items-center gap-2">
                    <FiMail className="text-blue-400" />
                    Generierte Antwort
                  </label>
                  <div className="relative">
                    <textarea
                      value={generatedResponse}
                      readOnly
                      className="w-full h-48 px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur-sm resize-none"
                    />
                    <button
                      onClick={handleCopyToClipboard}
                      className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white transition-colors"
                      title="In Zwischenablage kopieren"
                    >
                      <FiCopy />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer mit Submit-Button */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleSubmit}
                disabled={!patientEmail.trim() || !responseInstructions.trim() || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Wird generiert...
                  </>
                ) : (
                  <>
                    <FiSend />
                    Antwort generieren
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Kopier-Benachrichtigung */}
      <AnimatePresence>
        {showCopyNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <FiCopy />
            In Zwischenablage kopiert
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 