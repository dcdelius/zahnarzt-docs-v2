import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiSend, FiMessageSquare, FiPlus, FiTrash2 } from "react-icons/fi";
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import Navigation from "./components/Navigation";

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

export default function MedicalKnowledgeDashboard() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isNewConversation, setIsNewConversation] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const conversationsSnap = await getDocs(
          query(collection(db, "Praxen", "1", "Konversationen"), orderBy("timestamp", "desc"))
        );
        const conversationsList = conversationsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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
      const messagesList = messagesSnap.docs.map(doc => doc.data());
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

  const processWithAI = async (userMessage) => {
    setIsLoading(true);
    try {
      // Simulierte Antwort für Testzwecke
      const aiResponse = "Dies ist eine simulierte Antwort. Die KI-Integration wird in Kürze implementiert.";
      
      const newMessages = [
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: aiResponse, timestamp: new Date() }
      ];

      setMessages(prev => [...prev, ...newMessages]);

      // Speichern in Firestore
      if (isNewConversation) {
        const conversationRef = await addDoc(collection(db, "Praxen", "1", "Konversationen"), {
          title: userMessage.substring(0, 50) + "...",
          timestamp: serverTimestamp()
        });
        setCurrentConversation(conversationRef.id);
        setIsNewConversation(false);
      }

      // Nachrichten zur Konversation hinzufügen
      if (currentConversation) {
        for (const message of newMessages) {
          await addDoc(
            collection(db, "Praxen", "1", "Konversationen", currentConversation, "messages"),
            { ...message, timestamp: serverTimestamp() }
          );
        }
      }
    } catch (error) {
      console.error('Fehler bei der Verarbeitung:', error);
      setMessages(prev => [...prev,
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: 'Es tut mir leid, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es später erneut.', timestamp: new Date() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setInputMessage("");
    await processWithAI(userMessage);
  };

  return (
    <div className="min-h-screen bg-[url('/background.jpg')] bg-cover bg-center">
      <Navigation />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex w-full max-w-7xl h-[780px] bg-white/40 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Sidebar mit Konversationen */}
          <div className="w-64 bg-black/60 backdrop-blur-lg text-white p-4 flex flex-col gap-6">
            <div className="space-y-1">
              <motion.button
                whileHover={{ backgroundColor: "#FFFFFF15" }}
                onClick={startNewConversation}
                className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm w-full transition-colors bg-white/20 font-semibold"
              >
                <FiPlus /> Neue Konversation
              </motion.button>
              
              <div className="mt-4 space-y-1">
                {conversations.map((conversation) => (
                  <motion.button
                    key={conversation.id}
                    whileHover={{ backgroundColor: "#FFFFFF15" }}
                    onClick={() => loadConversation(conversation.id)}
                    className={`flex items-center justify-between w-full gap-2 py-2 px-3 rounded-lg text-sm transition-colors ${
                      currentConversation === conversation.id ? "bg-white/20 font-semibold" : ""
                    }`}
                  >
                    <span className="truncate">{conversation.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <FiTrash2 />
                    </button>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Hauptbereich mit Chat */}
          <div className="flex-1 flex flex-col">
            {/* Chat-Header */}
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">
                {isNewConversation ? "Neue Konversation" : "Zahnmedizinischer Chat"}
              </h2>
            </div>

            {/* Chat-Nachrichten */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/20 text-white backdrop-blur-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Eingabefeld */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Stellen Sie eine zahnmedizinische Frage..."
                  className="flex-grow px-4 py-3 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/10 text-white placeholder-gray-400 backdrop-blur-sm"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiSend />
                  Senden
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 