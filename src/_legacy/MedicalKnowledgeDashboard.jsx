import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSend, FiMessageSquare, FiPlus, FiTrash2, FiChevronLeft, FiGlobe, FiCpu, FiActivity, FiFileText, FiAlignLeft, FiAlignJustify, FiUser } from "react-icons/fi";
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db, OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY } from "./firebase";
import BrandLogo from "./components/BrandLogo";
import { GeminiService } from "./services/GeminiService";

const FUN_KNOWLEDGE_MESSAGES = [
  "Ich lese mal eben das ganze Internet...",
  "Suche nach der Nadel im Heuhaufen...",
  "Wälze digitale Fachbücher...",
  "Verbinde Neuronen...",
  "Checke Leitlinien...",
  "Suche Evidenz...",
  "Keine Sorge, ich weiß (fast) alles.",
  "Dein persönliches Lexikon.",
  "Schneller als jeder Oberarzt.",
  "Was willst du wissen?",
  "Medizin ist mein Hobby.",
  "Ich liebe komplizierte Fälle.",
  "Keine Frage ist zu schwer.",
  "Lass uns Wissen schaffen.",
  "Bereit für die nächste Diagnose?",
  "Ich kenne alle Wechselwirkungen.",
  "Frag mich alles."
];

export default function MedicalKnowledgeDashboard() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isNewConversation, setIsNewConversation] = useState(true);
  const [knowledgeMessageIndex, setKnowledgeMessageIndex] = useState(0);
  const [geminiService] = useState(() => GOOGLE_GEMINI_API_KEY ? new GeminiService(GOOGLE_GEMINI_API_KEY) : null);
  
  // Refs für Auto-Scroll
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Toggles
  const [selectedModel, setSelectedModel] = useState('gpt'); // 'gpt' | 'gemini'
  const [answerStyle, setAnswerStyle] = useState('brief'); // 'brief' | 'detailed'
  const [targetAudience, setTargetAudience] = useState('medical'); // 'medical' | 'patient'

  useEffect(() => {
    const interval = setInterval(() => {
      setKnowledgeMessageIndex(Math.floor(Math.random() * FUN_KNOWLEDGE_MESSAGES.length));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-Scroll wenn neue Nachrichten kommen
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

  // Smart Routing: Entscheidet automatisch das beste Modell
  const detectOptimalModel = (userMessage, userSelectedModel) => {
    const msgLower = userMessage.toLowerCase();
    
    // 1. PRIORITÄT: Leitlinien/Aktualität -> IMMER Gemini (kann potentiell live suchen)
    const leitlinienKeywords = ['leitlinie', 'leitlinien', 'aktuell', 'neueste', 'neue', '2024', '2025', 'update', 'empfehlung', 'richtlinie', 'guideline', 's3-leitlinie', 'aha', 'esc', 'dgzmk'];
    const isLeitlinienFrage = leitlinienKeywords.some(keyword => msgLower.includes(keyword));
    
    if (isLeitlinienFrage) {
      console.log('🎯 Smart Routing: Leitlinien-Frage erkannt -> Gemini');
      return { model: 'gemini', reason: 'leitlinien' };
    }
    
    // 2. Komplexitäts-Erkennung (nur wenn User "gpt" gewählt hat)
    if (userSelectedModel === 'gpt') {
      const komplexKeywords = ['pathophysiologie', 'mechanismus', 'warum', 'wie funktioniert', 'erkläre', 'detailliert', 'ausführlich', 'komplex', 'differentialdiagnose', 'pathogenese'];
      const isKomplex = komplexKeywords.some(keyword => msgLower.includes(keyword)) || userMessage.length > 200;
      
      if (isKomplex) {
        console.log('🎯 Smart Routing: Komplexe Frage -> GPT-4o');
        return { model: 'gpt', variant: 'gpt-4o', reason: 'komplex' };
      } else {
        console.log('🎯 Smart Routing: Einfache Frage -> GPT-4o-mini');
        return { model: 'gpt', variant: 'gpt-4o-mini', reason: 'einfach' };
      }
    }
    
    // 3. User-Auswahl respektieren
    return { model: userSelectedModel, variant: null, reason: 'user-choice' };
  };

  const buildSystemPrompt = (isLeitlinienFrage = false) => {
    let prompt = `Du bist ein Experte für Zahnmedizin und Medizin. `;
    
    if (targetAudience === 'patient') {
        prompt += `Antworte so, dass es ein PATIENT versteht (leicht verständlich, keine Fachbegriffe ohne Erklärung, empathisch). `;
    } else {
        prompt += `Antworte auf fachärztlichem Niveau (präzise, Fachterminologie, evidenzbasiert). `;
    }

    // Verstärkte Aktualitäts-Hinweise bei Leitlinien-Fragen
    if (isLeitlinienFrage) {
      prompt += `\n🚨 KRITISCH - AKTUALITÄT:
- Du MUSST die NEUESTEN Leitlinien verwenden (Stand 2024/2025).
- Wenn du dir bei der Aktualität unsicher bist, weise EXPLIZIT darauf hin ("Stand meines Wissens (Training bis [Datum])... Bitte prüfe die neueste Leitlinie auf [Website].").
- Nenne IMMER das Jahr der Leitlinie, auf die du dich beziehst.
- Bei Widersprüchen zwischen alten und neuen Leitlinien: PRIORISIERE die neueste Version.\n`;
    }

    prompt += `\nWICHTIGE LEITLINIEN-UPDATES (Zwingend beachten):
1. Endokarditis-Prophylaxe (AHA 2021 / ESC): Clindamycin ist NICHT mehr erste Wahl bei Penicillin-Allergie. Stattdessen: Azithromycin/Clarithromycin oder Doxycyclin.
2. Antiresorptiva: Beachte aktuelle S3-Leitlinien zu MRONJ.
3. Karies: Minimalinvasive Therapie vorziehen.\n`;

    if (answerStyle === 'brief') {
        prompt += `\nFORMAT: Fasse dich KURZ (Telegram-Stil). Nutze Spiegelstriche (•). Keine langen Absätze.`;
    } else {
        prompt += `\nFORMAT: Antworte AUSFÜHRLICH. Erkläre Hintergründe, Pathophysiologie und Evidenz.`;
    }

    prompt += `\nNutze KEINE Markdown-Formatierung (**fett**, #).`;

    return prompt;
  };

  const processAI = async (userMessage) => {
    setIsLoading(true);
    try {
      let aiResponseText = "";

      // Smart Routing: Bestes Modell automatisch wählen
      const routing = detectOptimalModel(userMessage, selectedModel);
      const actualModel = routing.model;
      const isLeitlinienFrage = routing.reason === 'leitlinien';
      
      const systemPrompt = buildSystemPrompt(isLeitlinienFrage);
      
      // History bauen
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      if (actualModel === 'gpt') {
        if (!OPENAI_API_KEY) throw new Error('OpenAI API Key fehlt.');
        
        // Smart Routing: GPT-4o vs GPT-4o-mini
        const gptVariant = routing.variant || 'gpt-4o-mini';
        console.log(`🤖 Smart Routing: ${routing.reason} -> ${gptVariant}`);
        
        const messagesPayload = [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: userMessage }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: gptVariant,
                messages: messagesPayload,
                temperature: 0.3,
                max_tokens: routing.variant === 'gpt-4o' ? 3000 : 2000
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'OpenAI Error');
        aiResponseText = data.choices[0].message.content;

      } else {
        // GEMINI (automatisch bei Leitlinien-Fragen oder User-Auswahl)
        if (!geminiService) throw new Error('Gemini Service nicht verfügbar.');
        console.log(`🤖 Smart Routing: ${routing.reason} -> Gemini 2.5 Flash`);
        
        // Gemini hat keine System-Role im Standard-Chat, daher Prompt voranstellen
        const combinedPrompt = `${systemPrompt}\n\nFRAGE: ${userMessage}`;
        
        const result = await geminiService.answerMedicalQuestion(combinedPrompt, conversationHistory);
        aiResponseText = result;
      }

      const newMessages = [
        { role: 'user', content: userMessage, timestamp: new Date() },
        { 
          role: 'assistant', 
          content: aiResponseText, 
          timestamp: new Date(),
          model: actualModel === 'gpt' ? (routing.variant || 'gpt-4o-mini') : 'gemini-2.5-flash',
          routingReason: routing.reason
        }
      ];

      setMessages(prev => [...prev, ...newMessages]);
      saveConversation(userMessage, newMessages, currentConversation, isNewConversation);

    } catch (error) {
      handleError(error, userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (title, newMsgs, convId, isNew) => {
      let targetId = convId;
      if (isNew) {
        const ref = doc(db, "Praxen", "1", "Konversationen", Date.now().toString());
        await setDoc(ref, {
            title: title.substring(0, 60) + (title.length > 60 ? "..." : ""),
            timestamp: serverTimestamp()
        });
        targetId = ref.id;
        setCurrentConversation(targetId);
        setIsNewConversation(false);
        setConversations(prev => [{ id: targetId, title: title.substring(0, 60) + "...", timestamp: new Date() }, ...prev]);
      }

      if (targetId) {
        for (const msg of newMsgs) {
            await addDoc(collection(db, "Praxen", "1", "Konversationen", targetId, "messages"), { ...msg, timestamp: serverTimestamp() });
        }
      }
  };

  const handleError = (error, userMessage) => {
      console.error('❌ Fehler:', error);
      let msg = 'Ein Fehler ist aufgetreten.';
      if (error.message.includes('API Key')) msg = 'API Key fehlt.';
      else if (error.message.includes('404')) msg = 'KI-Modell nicht verfügbar.';
      else if (error.message.includes('quota')) msg = 'Limit erreicht.';
      else msg = `Fehler: ${error.message}`;

      setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }, { role: 'assistant', content: msg, timestamp: new Date() }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    const msg = inputMessage;
    setInputMessage("");
    await processAI(msg);
  };

  return (
    <div className="h-full relative flex flex-col overflow-hidden font-sans">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="w-full h-full bg-gradient-to-br from-[#e6f7c1] via-[#ffe6a7] to-[#ffb36b]" style={{background: 'radial-gradient(circle at 20% 30%, #b6e3c6 0%, #ffe6a7 40%, #ffb36b 100%)'}} />
        </div>

      <div className="flex flex-1 h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[380px] flex flex-col justify-start py-16 px-10 overflow-y-auto z-20" style={{ height: 'calc(100vh - 73px)' }}>
          <BrandLogo subtitle="KNOWLEDGE" className="mb-20" />
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startNewConversation}
            className="flex items-center gap-2 py-3 px-6 rounded-full text-sm w-full transition-all bg-white/20 backdrop-blur-md text-white font-bold mb-8 shadow-lg border border-white/30 hover:bg-white/30"
          >
            <FiPlus className="text-lg" />
            Neue Frage
          </motion.button>
          
          <div 
            className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
            style={{ 
              maskImage: 'linear-gradient(to bottom, transparent 0px, black 15px, black calc(100% - 15px), transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 15px, black calc(100% - 15px), transparent 100%)' 
            }}
          >
            <div className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4 px-2">Verlauf</div>
            {conversations.length === 0 ? (
              <div className="text-sm text-white/60 px-2 py-4 text-center italic">Noch keine Fragen gestellt</div>
            ) : (
              <div className="space-y-0">
                {conversations.map((conversation) => (
                  <motion.button
                    key={conversation.id}
                    onClick={() => loadConversation(conversation.id)}
                    className={`relative w-full py-2 text-left transition-all duration-300 group overflow-hidden ${
                      currentConversation === conversation.id 
                        ? "text-white drop-shadow-md scale-105 origin-left" 
                        : "text-white/60 hover:text-white hover:scale-105 origin-left hover:drop-shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 relative z-10">
                        <span className="truncate text-2xl font-bold font-sans tracking-tight">{conversation.title}</span>
                        <div onClick={(e) => { e.stopPropagation(); if (confirm('Löschen?')) deleteConversation(conversation.id); }} className="opacity-0 group-hover:opacity-100 text-white/60 hover:text-white transition-opacity p-1">
                          <FiTrash2 className="text-base" />
                        </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full relative z-10">
            
            {/* Floating Chat Area */}
            <div 
                className="flex-1 overflow-y-auto px-6 py-4 pt-8 scroll-smooth custom-scrollbar"
                style={{ 
                    maskImage: 'linear-gradient(to bottom, transparent 0px, black 60px, black 95%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 60px, black 95%, transparent 100%)' 
                }}
                ref={chatContainerRef}
            >
                <div className={`max-w-5xl mx-auto min-h-full flex flex-col ${messages.length === 0 ? 'justify-center' : 'justify-end'} pb-8`}>
                    {/* Empty State Orb */}
                    {messages.length === 0 && !isLoading && (
                         <div className="flex flex-col items-center justify-center py-20 opacity-90">
                            <div className="relative mb-12 flex items-center justify-center" style={{ width: '300px', height: '300px' }}>
                                {[0, 1, 2].map(i => (
                                    <motion.div key={i} className={`absolute border border-white/${30 + i*10} rounded-full`}
                                      initial={{ width: 140 - i*20, height: 140 - i*20, opacity: 0.4 }}
                                      animate={{ width: [140, 280, 140], height: [140, 280, 140], opacity: [0.4, 0, 0.4] }}
                                      transition={{ duration: 5, delay: i * 0.8, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                ))}
                                <motion.div className="relative z-10 w-32 h-32 bg-white/90 backdrop-blur-md rounded-full shadow-[0_0_60px_rgba(255,255,255,0.4)] flex items-center justify-center border border-white"
                                  animate={{ scale: [1, 1.05, 1] }}
                                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  <FiCpu className="w-12 h-12 text-[#ff9900]" />
                                </motion.div>
                            </div>
                            <div className="h-12 flex justify-center items-center overflow-hidden w-full px-4">
                                <AnimatePresence mode="wait">
                                  <motion.h2 key={knowledgeMessageIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-2xl md:text-3xl font-normal text-white subpixel-antialiased drop-shadow-md tracking-tight text-center">
                                    {FUN_KNOWLEDGE_MESSAGES[knowledgeMessageIndex]}
                                  </motion.h2>
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Chat Messages */}
                    <AnimatePresence>
                        {messages.map((msg, index) => (
                        <motion.div key={index} initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] p-6 rounded-3xl shadow-lg backdrop-blur-sm text-lg leading-relaxed border border-white/20 ${msg.role === 'user' ? 'bg-[#ff9900] text-white rounded-tr-sm' : 'bg-white/90 text-gray-800 rounded-tl-sm'}`}>
                                {msg.role === 'assistant' ? (
                                    <>
                                        {msg.model && (
                                            <div className="mb-3 flex items-center gap-2 text-xs">
                                                <span className={`px-2 py-1 rounded-full font-bold ${
                                                    msg.model.includes('gemini') ? 'bg-blue-100 text-blue-700' : 
                                                    msg.model === 'gpt-4o' ? 'bg-purple-100 text-purple-700' : 
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {msg.model === 'gpt-4o' ? 'GPT-4o' : msg.model === 'gpt-4o-mini' ? 'GPT-4o-mini' : 'Gemini 2.5'}
                                                </span>
                                                {msg.routingReason === 'leitlinien' && (
                                                    <span className="text-gray-500 italic">(Leitlinien-Frage erkannt)</span>
                                                )}
                                                {msg.routingReason === 'komplex' && (
                                                    <span className="text-gray-500 italic">(Komplexe Frage)</span>
                                                )}
                                            </div>
                                        )}
                                        <div className="prose prose-lg max-w-none prose-p:mb-2 prose-p:text-gray-800">
                                            {msg.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                        </div>
                                    </>
                                ) : msg.content}
                            </div>
                        </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    {isLoading && (
                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-6">
                            <div className="bg-white/90 p-5 rounded-3xl rounded-tl-sm shadow-lg border border-white/20 flex gap-2">
                                <div className="w-2.5 h-2.5 bg-[#ff9900] rounded-full animate-bounce" />
                                <div className="w-2.5 h-2.5 bg-[#ff9900] rounded-full animate-bounce delay-100" />
                                <div className="w-2.5 h-2.5 bg-[#ff9900] rounded-full animate-bounce delay-200" />
                            </div>
                         </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* THE SMART PILL - Fixed at Bottom */}
            <div className="w-full max-w-5xl mx-auto px-6 pb-24 pt-4 z-30">
                <motion.div 
                    className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] border border-white/60 p-2 flex flex-col gap-0 overflow-hidden transition-all hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {/* Input Row */}
                    <form onSubmit={handleSubmit} className="flex items-center gap-4 px-4 py-2">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {selectedModel === 'gpt' ? <FiCpu className="text-gray-600" /> : <FiGlobe className="text-blue-600" />}
                        </div>
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Was möchtest du wissen?"
                            className="flex-1 bg-transparent border-none focus:ring-0 text-xl text-gray-800 placeholder-gray-400/80 font-medium outline-none h-12"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={!inputMessage.trim() || isLoading} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${!inputMessage.trim() || isLoading ? 'bg-gray-200 text-gray-400' : 'bg-[#ff9900] text-white hover:scale-110 hover:bg-orange-500'}`}>
                            <FiSend className="w-5 h-5 ml-0.5" />
                        </button>
                    </form>

                    {/* Controls Drawer - integrated neatly */}
                    <div className="bg-gray-50/50 rounded-b-[2rem] rounded-t-xl mx-1 mb-1 px-4 py-3 flex flex-wrap justify-between items-center gap-3 border-t border-gray-100/50">
                         {/* Model Selector */}
                         <div className="flex bg-white rounded-full p-1 shadow-sm ring-1 ring-gray-200/50">
                            <button onClick={() => setSelectedModel('gpt')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${selectedModel === 'gpt' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                <FiCpu /> GPT-4o
                            </button>
                            <button onClick={() => setSelectedModel('gemini')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${selectedModel === 'gemini' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                <FiGlobe /> Gemini
                            </button>
                        </div>

                        <div className="w-px h-6 bg-gray-300/50 hidden sm:block" />

                        {/* Style Selector */}
                        <div className="flex bg-white rounded-full p-1 shadow-sm ring-1 ring-gray-200/50">
                             <button onClick={() => setAnswerStyle('brief')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${answerStyle === 'brief' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                                <FiAlignLeft /> Kurz
                            </button>
                            <button onClick={() => setAnswerStyle('detailed')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${answerStyle === 'detailed' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                                <FiAlignJustify /> Lang
                            </button>
                        </div>

                         <div className="w-px h-6 bg-gray-300/50 hidden sm:block" />

                        {/* Target Audience */}
                        <div className="flex bg-white rounded-full p-1 shadow-sm ring-1 ring-gray-200/50">
                             <button onClick={() => setTargetAudience('medical')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${targetAudience === 'medical' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                                <FiActivity /> Arzt
                            </button>
                            <button onClick={() => setTargetAudience('patient')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${targetAudience === 'patient' ? 'bg-green-50 text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
                                <FiUser /> Patient
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

        </main>
      </div>
    </div>
  );
}