import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSend, FiMessageSquare, FiPlus, FiTrash2, FiChevronLeft } from "react-icons/fi";
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db, GOOGLE_GEMINI_API_KEY } from "./firebase";
import { GeminiService } from "./services/GeminiService";
import TopNavigation from "./components/TopNavigation";

export default function MedicalKnowledgeDashboard() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isNewConversation, setIsNewConversation] = useState(true);
  const [geminiService] = useState(() => GOOGLE_GEMINI_API_KEY ? new GeminiService(GOOGLE_GEMINI_API_KEY) : null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const conversationsSnap = await getDocs(
          query(collection(db, "Praxen", "1", "Konversationen"), orderBy("timestamp", "desc"))
        );
        const conversationsList = conversationsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        setConversations(conversationsList);
      } catch (error) {
        console.error("Fehler beim Laden der Konversationen:", error);
      }
    };

    fetchConversations();
  }, []);

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversation(null);
    setIsNewConversation(true);
  };

  const loadConversation = async (conversationId) => {
    try {
      const messagesSnap = await getDocs(
        query(collection(db, "Praxen", "1", "Konversationen", conversationId, "messages"), orderBy("timestamp", "asc"))
      );
      const messagesList = messagesSnap.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setMessages(messagesList);
      setCurrentConversation(conversationId);
      setIsNewConversation(false);
    } catch (error) {
      console.error("Fehler beim Laden der Nachrichten:", error);
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      await deleteDoc(doc(db, "Praxen", "1", "Konversationen", conversationId));
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      if (currentConversation === conversationId) {
        startNewConversation();
      }
    } catch (error) {
      console.error("Fehler beim Löschen der Konversation:", error);
    }
  };

  const processWithGemini = async (userMessage) => {
    if (!geminiService) {
      throw new Error('Google Gemini API Key nicht konfiguriert');
    }

    setIsLoading(true);
    try {
      // Baue Konversationshistorie für Kontext
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('🤖 Sende Frage an Gemini:', userMessage);
      const aiResponse = await geminiService.answerMedicalQuestion(userMessage, conversationHistory);
      console.log('✅ Gemini Antwort erhalten:', aiResponse.substring(0, 100) + '...');

      const newMessages = [
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: aiResponse, timestamp: new Date() }
      ];

      setMessages(prev => [...prev, ...newMessages]);

      // Speichern in Firestore
      let conversationId = currentConversation;
      
      if (isNewConversation) {
        // Neue Konversation erstellen
        const conversationRef = doc(db, "Praxen", "1", "Konversationen", Date.now().toString());
        await setDoc(conversationRef, {
          title: userMessage.substring(0, 60) + (userMessage.length > 60 ? "..." : ""),
          timestamp: serverTimestamp()
        });
        conversationId = conversationRef.id;
        setCurrentConversation(conversationId);
        setIsNewConversation(false);
        
        // Konversationen-Liste aktualisieren
        setConversations(prev => [{
          id: conversationId,
          title: userMessage.substring(0, 60) + (userMessage.length > 60 ? "..." : ""),
          timestamp: new Date()
        }, ...prev]);
      }

      // Nachrichten zur Konversation hinzufügen
      if (conversationId) {
        for (const message of newMessages) {
          await addDoc(
            collection(db, "Praxen", "1", "Konversationen", conversationId, "messages"),
            { ...message, timestamp: serverTimestamp() }
          );
        }
      }
    } catch (error) {
      console.error('❌ Fehler bei der Verarbeitung:', error);
      const errorMessage = error.message.includes('API Key') 
        ? 'Google Gemini API Key nicht konfiguriert. Bitte in den Einstellungen hinzufügen.'
        : 'Es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es später erneut.';
      
      setMessages(prev => [...prev,
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: errorMessage, timestamp: new Date() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage;
    setInputMessage("");
    await processWithGemini(userMessage);
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Gradient Background - Bleibt statisch */}
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-gradient-to-br from-[#e6f7c1] via-[#ffe6a7] to-[#ffb36b]" style={{background: 'radial-gradient(circle at 20% 30%, #b6e3c6 0%, #ffe6a7 40%, #ffb36b 100%)'}} />
      </div>
      
      {/* TopNavigation - Bleibt statisch */}
      <TopNavigation />
      
      {/* Hauptinhalt - Wird animiert */}
      <motion.div 
        className="flex flex-1"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.5 }}
      >
        {/* Sidebar - Links, wie Dashboard */}
        <aside className="w-[320px] flex flex-col justify-start py-16 px-12 min-h-screen relative">
          {/* Branding */}
          <div className="mb-20">
            <span className="text-5xl font-extrabold tracking-tight text-[#ff9900] block mb-2">evident.</span>
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">AI DOCS</span>
          </div>
          
          {/* Neue Frage Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startNewConversation}
            className="flex items-center gap-2 py-3 px-4 rounded-lg text-sm w-full transition-colors bg-[#ff9900] text-white font-semibold mb-8 shadow-md hover:shadow-lg"
          >
            <FiPlus className="text-lg" />
            Neue Frage
          </motion.button>
          
          {/* Konversationen Liste */}
          <div className="flex-1 overflow-y-auto">
            <div className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-4 px-2">
              Konversationen
            </div>
            {conversations.length === 0 ? (
              <div className="text-sm text-white/60 px-2 py-4 text-center">
                Noch keine Konversationen
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <motion.button
                    key={conversation.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => loadConversation(conversation.id)}
                    className={`flex items-center justify-between w-full gap-2 py-2 px-3 rounded-lg text-lg font-semibold font-sans tracking-tight transition-colors text-left text-white ${
                      currentConversation === conversation.id 
                        ? "bg-white/20" 
                        : "hover:bg-white/10"
                    }`}
                  >
                    <span className="flex-1 truncate">{conversation.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Konversation löschen?')) {
                          deleteConversation(conversation.id);
                        }
                      }}
                      className="text-white/60 hover:text-red-300 transition-colors flex-shrink-0 ml-2"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content - Wie Dashboard */}
        <main className="flex-1 flex flex-col justify-center px-24 py-24">
          <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
            {/* Chat-Header - Zentriert */}
            <div className="mb-12 text-center">
              <h2 className="text-5xl font-extrabold text-[#22223b] flex items-center justify-center gap-3 mb-3">
                <FiMessageSquare className="text-[#ff9900]" />
                Wissensdatenbank
              </h2>
              <p className="text-xl text-gray-600">Stellen Sie Fragen zu zahnmedizinischen oder medizinischen Themen</p>
            </div>

            {/* Chat-Nachrichten - Scrollbar */}
            <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-4">
              {messages.length === 0 && !isLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <FiMessageSquare className="text-6xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-700 mb-2">Stellen Sie Ihre erste Frage</h3>
                    <p className="text-gray-500">
                      Beispiel: "Was sagt die Leitlinie über Antibiotika bei Patienten mit künstlichen Herzklappen und Prophylaxe?"
                    </p>
                  </div>
                </div>
              )}
              
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] ${
                        msg.role === 'user'
                          ? 'bg-[#ff9900] text-white p-4 rounded-2xl shadow-lg'
                          : 'bg-white/90 backdrop-blur-sm text-gray-800 border border-gray-200/50 p-5 rounded-2xl shadow-md'
                      }`}
                    >
                      <div className={`whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user' 
                          ? 'text-lg font-medium' 
                          : 'text-base'
                      }`}>
                        {msg.role === 'assistant' 
                          ? msg.content
                              .replace(/\*\*(.*?)\*\*/g, '$1') // Entferne **fett**
                              .replace(/#{1,6}\s/g, '') // Entferne # Überschriften
                              .replace(/^-\s/gm, '• ') // Ersetze - mit •
                              .replace(/^\d+\.\s/gm, '') // Entferne nummerierte Listen
                              .replace(/^Als Experte.*?\.\s*/i, '') // Entferne einleitenden Satz
                              .trim()
                          : msg.content
                        }
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-gray-200/50 shadow-lg">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-[#ff9900] rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-[#ff9900] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 bg-[#ff9900] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Eingabefeld - Moderne große Zeile wie Dashboard */}
            <form onSubmit={handleSubmit} className="mt-auto">
              <div className="flex items-center gap-4">
                <motion.input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Stellen Sie eine Frage zu zahnmedizinischen oder medizinischen Themen..."
                  className="flex-1 px-0 py-6 border-0 border-b-2 border-[#ff9900] bg-transparent text-3xl font-light focus:outline-none focus:ring-0 placeholder-gray-400"
                  animate={{ y: 0 }}
                  transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                />
                <motion.button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-[#ff9900] hover:bg-orange-600 text-white px-8 py-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-xl shadow-lg hover:shadow-xl ${
                    isLoading ? 'cursor-wait' : ''
                  }`}
                >
                  <FiSend className="text-2xl" />
                </motion.button>
              </div>
            </form>
          </div>
        </main>
      </motion.div>
    </div>
  );
}
