import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiSend, FiLogOut, FiUser, FiHelpCircle, FiEdit2, FiChevronLeft, FiCircle, FiChevronDown, FiChevronUp, FiChevronRight } from "react-icons/fi";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY } from "./firebase";
import { AudioRecorder } from "./services/AudioRecorder";
import { WhisperService } from "./services/WhisperService";
import { GeminiService } from "./services/GeminiService";
import DocumentationModal from "./components/DocumentationModal";
import CustomDropdown from "./components/CustomDropdown";
import TopNavigation from "./components/TopNavigation";
import BausteinSelector from './components/BausteinSelector';
import { buildGPTPrompts } from './utils/buildGPTPrompts';

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
  const [geminiService] = useState(() => GOOGLE_GEMINI_API_KEY ? new GeminiService(GOOGLE_GEMINI_API_KEY) : null);
  const [processedText, setProcessedText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);
  const [sidebarStep, setSidebarStep] = useState(1); // 1: Kategorie, 2: Behandlung
  const [billingSuggestions, setBillingSuggestions] = useState("");
  const [confirmedExtras, setConfirmedExtras] = useState([]);
  const [pendingExtras, setPendingExtras] = useState([]); // Von GPT vorgeschlagene, aber noch nicht bestätigte Leistungen
  const [expandedSuggestions, setExpandedSuggestions] = useState(new Set()); // Für aufklappbare Optimierungsvorschläge
  const [aktiveBausteine, setAktiveBausteine] = useState([]);
  const [bausteine, setBausteine] = useState([]);
  const [selectedBillingCodes, setSelectedBillingCodes] = useState([]); // Ausgewählte Codes zum Hinzufügen
  const [showMaterialField, setShowMaterialField] = useState(false); // Collapsible material field

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
      
      // Use utility function to build prompts
      let systemPrompt, userPrompt;
      try {
        const prompts = buildGPTPrompts({
          template: selectedTemplate,
          inputText: inputValue,
          bausteine: aktiveBausteine,
          allBausteine: bausteine
        });
        systemPrompt = prompts.systemPrompt;
        userPrompt = prompts.userPrompt;
        
        if (!systemPrompt || !userPrompt) {
          throw new Error('Fehler beim Erstellen der GPT-Prompts');
        }
      } catch (promptError) {
        console.error('❌ Fehler beim Erstellen der Prompts:', promptError);
        throw new Error(`Fehler beim Erstellen der Prompts: ${promptError.message}`);
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_completion_tokens: 2000, // GPT-5 verwendet max_completion_tokens
          reasoning_effort: "low", // Reduziertes Reasoning für schnellere Antworten
          // temperature wird nicht unterstützt - GPT-5-mini verwendet Standardwert 1
          stream: false
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
      }
      const data = await response.json();
      
      // Debug: Vollständige API-Antwort loggen
      console.log('📥 GPT-5-mini API-Antwort (Text-Submit):', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        firstChoice: data.choices?.[0],
        hasMessage: !!data.choices?.[0]?.message,
        hasContent: !!data.choices?.[0]?.message?.content
      });
      
      // Validierung der API-Antwort mit detaillierter Fehlermeldung
      if (!data.choices || data.choices.length === 0) {
        console.error('❌ Keine choices in API-Antwort:', data);
        throw new Error('GPT-5-mini API hat keine choices zurückgegeben. Bitte versuchen Sie es erneut.');
      }
      
      if (!data.choices[0]) {
        console.error('❌ choices[0] fehlt:', data);
        throw new Error('GPT-5-mini API choices Array ist leer. Bitte versuchen Sie es erneut.');
      }
      
      if (!data.choices[0].message) {
        console.error('❌ message fehlt in choices[0]:', data.choices[0]);
        throw new Error('GPT-5-mini API Antwort enthält keine message. Bitte versuchen Sie es erneut.');
      }
      
      // GPT-5-mini könnte eine andere Struktur haben - prüfe verschiedene Möglichkeiten
      const processedText = data.choices[0].message?.content 
        || data.choices[0].message?.text
        || data.choices[0].text
        || data.content
        || data.text;
      
      if (!processedText || (typeof processedText === 'string' && !processedText.trim())) {
        console.error('❌ Kein Content in API-Antwort:', {
          message: data.choices[0].message,
          choice: data.choices[0],
          fullData: data
        });
        throw new Error('GPT-5-mini hat keine Text-Antwort zurückgegeben. Bitte versuchen Sie es erneut.');
      }
      setProcessedText(processedText);
      setInputValue("");
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
      console.error('❌ Fehler bei der Text-Verarbeitung:', error);
      console.error('Error Details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        selectedTreatment: selectedTreatment,
        templateFound: !!templates.find(t => t.id === selectedTreatment)
      });
      
      // Detaillierte Fehlermeldung für den Benutzer
      let errorMessage = 'Fehler bei der Verarbeitung: ';
      if (error.message.includes('Vorlage nicht gefunden')) {
        errorMessage += 'Die ausgewählte Vorlage wurde nicht gefunden. Bitte wählen Sie eine andere Vorlage.';
      } else if (error.message.includes('OpenAI API')) {
        errorMessage += `API-Fehler: ${error.message}. Bitte überprüfen Sie Ihre API-Keys.`;
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      setProcessedText(""); // Reset bei Fehler
    } finally {
      setIsProcessing(false);
    }
  };

  // Audio Recording Handler - Kompletter Flow: Aufnahme → Whisper → GPT → Vorlage
  const handleRecordingToggle = async () => {
    if (!isRecording) {
      // Aufnahme starten
      try {
        if (!selectedTreatment) {
          alert('Bitte wählen Sie zuerst eine Behandlung aus');
          return;
        }
        
        console.log('🎤 Starte Audio-Aufnahme...');
        await audioRecorder.startRecording();
        audioRecorder.setStatusCallback((status) => {
          console.log('📊 Recording Status:', status);
          setIsRecording(status);
        });
        setIsRecording(true);
        console.log('✅ Aufnahme gestartet');
      } catch (error) {
        console.error('❌ Fehler beim Starten der Aufnahme:', error);
        let errorMessage = 'Mikrofon konnte nicht aktiviert werden';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Mikrofon-Berechtigung wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'Kein Mikrofon gefunden. Bitte verbinden Sie ein Mikrofon.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Mikrofon wird bereits von einer anderen Anwendung verwendet.';
        } else {
          errorMessage = error.message || errorMessage;
        }
        
        alert(errorMessage);
        setIsRecording(false);
      }
    } else {
      // Aufnahme stoppen, transkribieren und automatisch verarbeiten
      try {
        console.log('⏹️ Stoppe Audio-Aufnahme...');
        setIsProcessing(true);
        setIsRecording(false); // Sofort auf false setzen, damit Button wieder klickbar ist
        const audioBlob = await audioRecorder.stopRecording();
        console.log('✅ Aufnahme gestoppt, starte Verarbeitung...');
        
        // Schritt 1: Whisper Transkription
        console.log('🎙️ Starte Whisper-Transkription...');
        const transcribedText = await whisperService.transcribe(audioBlob);
        console.log('✅ Whisper Transkription abgeschlossen:', transcribedText);
        
        if (!transcribedText || !transcribedText.trim()) {
          throw new Error('Keine Transkription erhalten');
        }
        
        // Transkription NICHT anzeigen - direkt verarbeiten
        // setInputValue wird nicht gesetzt, damit der Text nicht im Input-Feld erscheint
        
        // Schritt 2: GPT-Verarbeitung mit strikten Konsistenz-Anweisungen
        console.log('🤖 Starte GPT-5-mini Verarbeitung...');
        
        // Template-Vorbereitung
        const selectedTemplate = templates.find(t => t.id === selectedTreatment);
        if (!selectedTemplate) throw new Error('Vorlage nicht gefunden');
        
        // Use utility function to build prompts
        let systemPrompt, userPrompt;
        try {
          const prompts = buildGPTPrompts({
            template: selectedTemplate,
            inputText: transcribedText,
            bausteine: aktiveBausteine,
            allBausteine: bausteine
          });
          systemPrompt = prompts.systemPrompt;
          userPrompt = prompts.userPrompt;
          
          if (!systemPrompt || !userPrompt) {
            throw new Error('Fehler beim Erstellen der GPT-Prompts');
          }
        } catch (promptError) {
          console.error('❌ Fehler beim Erstellen der Prompts:', promptError);
          throw new Error(`Fehler beim Erstellen der Prompts: ${promptError.message}`);
        }
        
        console.log('📤 Sende an GPT-5-mini:', {
          systemPrompt: systemPrompt.substring(0, 100) + '...',
          userPrompt: userPrompt.substring(0, 100) + '...'
        });
        
        // GPT-5-mini Aufruf mit reduziertem Reasoning
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-5-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
          max_completion_tokens: 2000, // GPT-5 verwendet max_completion_tokens
          reasoning_effort: "low", // Reduziertes Reasoning für schnellere Antworten
          // temperature wird nicht unterstützt - GPT-5-mini verwendet Standardwert 1
          stream: false
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI API Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
        }
        
        const data = await response.json();
        
        // Debug: Vollständige API-Antwort loggen
        console.log('📥 GPT-5-mini API-Antwort (vollständig):', JSON.stringify(data, null, 2));
        console.log('📥 GPT-5-mini API-Antwort (Struktur):', {
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length,
          firstChoice: data.choices?.[0],
          firstChoiceKeys: data.choices?.[0] ? Object.keys(data.choices[0]) : [],
          hasMessage: !!data.choices?.[0]?.message,
          messageKeys: data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : [],
          hasContent: !!data.choices?.[0]?.message?.content,
          contentType: typeof data.choices?.[0]?.message?.content,
          contentValue: data.choices?.[0]?.message?.content,
          allDataKeys: Object.keys(data),
          // Prüfe auch finish_reason
          finishReason: data.choices?.[0]?.finish_reason,
          // Prüfe ob message ein String ist
          messageIsString: typeof data.choices?.[0]?.message === 'string',
          messageStringValue: typeof data.choices?.[0]?.message === 'string' ? data.choices[0].message : null
        });
        
        // Validierung der API-Antwort mit detaillierter Fehlermeldung
        if (!data.choices || data.choices.length === 0) {
          console.error('❌ Keine choices in API-Antwort:', data);
          throw new Error('GPT-5-mini API hat keine choices zurückgegeben. Bitte versuchen Sie es erneut.');
        }
        
        if (!data.choices[0]) {
          console.error('❌ choices[0] fehlt:', data);
          throw new Error('GPT-5-mini API choices Array ist leer. Bitte versuchen Sie es erneut.');
        }
        
        if (!data.choices[0].message) {
          console.error('❌ message fehlt in choices[0]:', data.choices[0]);
          // Prüfe finish_reason für weitere Informationen
          if (data.choices[0].finish_reason) {
            console.error('⚠️ finish_reason:', data.choices[0].finish_reason);
            if (data.choices[0].finish_reason === 'content_filter') {
              throw new Error('GPT-5-mini hat die Antwort aufgrund von Content-Filterung blockiert. Bitte versuchen Sie es mit anderen Formulierungen.');
            } else if (data.choices[0].finish_reason === 'length') {
              throw new Error('GPT-5-mini Antwort wurde wegen Token-Limit abgeschnitten. Bitte kürzen Sie die Eingabe.');
            }
          }
          throw new Error('GPT-5-mini API Antwort enthält keine message. Bitte versuchen Sie es erneut.');
        }
        
        // Prüfe finish_reason für Warnungen
        if (data.choices[0].finish_reason && data.choices[0].finish_reason !== 'stop') {
          console.warn('⚠️ finish_reason ist nicht "stop":', data.choices[0].finish_reason);
        }
        
        // GPT-5-mini könnte eine andere Struktur haben - prüfe verschiedene Möglichkeiten
        // Zuerst die Standard-Struktur
        let processedText = data.choices[0].message?.content;
        
        // Prüfe ob content leerer String ist (finish_reason: "length" kann zu leerem content führen)
        if (processedText === "" && data.choices[0].finish_reason === "length") {
          console.warn('⚠️ Content ist leer und finish_reason ist "length" - Token-Limit erreicht');
          throw new Error('Die Antwort wurde wegen des Token-Limits abgeschnitten. Bitte versuchen Sie es mit einer kürzeren Eingabe.');
        }
        
        // Wenn nicht vorhanden, prüfe alternative Strukturen
        if (!processedText || processedText.trim() === "") {
          console.log('⚠️ Standard content nicht gefunden, suche Alternativen...');
          console.log('🔍 Prüfe finish_reason:', data.choices[0].finish_reason);
          
          // Prüfe ob message selbst ein String ist (unwahrscheinlich, aber möglich)
          if (typeof data.choices[0].message === 'string') {
            processedText = data.choices[0].message;
            console.log('✅ Message ist direkt ein String');
          }
          // Prüfe alternative Pfade
          else {
            processedText = data.choices[0].message?.text
              || data.choices[0].message?.delta?.content
              || data.choices[0].text
              || data.choices[0].content
              || data.content
              || data.text;
          }
          
          // Wenn immer noch nichts gefunden, logge die vollständige Struktur
          if (!processedText) {
            console.error('❌ Kein Text in folgenden Pfaden gefunden:', {
              'choices[0].message.content': data.choices[0].message?.content,
              'choices[0].message.text': data.choices[0].message?.text,
              'choices[0].message.delta.content': data.choices[0].message?.delta?.content,
              'choices[0].text': data.choices[0].text,
              'choices[0].content': data.choices[0].content,
              'data.content': data.content,
              'data.text': data.text,
              'message type': typeof data.choices[0].message,
              'message value': data.choices[0].message,
              'finish_reason': data.choices[0].finish_reason
            });
          }
        }
        
        console.log('🔍 Extrahierter processedText:', {
          found: !!processedText,
          type: typeof processedText,
          length: processedText?.length,
          preview: processedText?.substring(0, 100)
        });
        
        if (!processedText || (typeof processedText === 'string' && !processedText.trim())) {
          console.error('❌ Kein oder leerer Content in API-Antwort:', {
            message: data.choices[0].message,
            choice: data.choices[0],
            fullData: data,
            processedText: processedText,
            finish_reason: data.choices[0].finish_reason,
            usage: data.usage
          });
          
          // Spezifische Fehlermeldung basierend auf finish_reason
          if (data.choices[0].finish_reason === "length") {
            throw new Error('Die Antwort wurde wegen des Token-Limits abgeschnitten. Bitte versuchen Sie es mit einer kürzeren Eingabe oder erhöhen Sie max_tokens.');
          } else if (data.choices[0].finish_reason === "content_filter") {
            throw new Error('Die Antwort wurde von der Content-Filterung blockiert. Bitte versuchen Sie es mit anderen Formulierungen.');
          } else {
            throw new Error(`GPT-5-mini hat keine Text-Antwort zurückgegeben (finish_reason: ${data.choices[0].finish_reason}). Bitte versuchen Sie es erneut.`);
          }
        }
        
        console.log('✅ GPT-5-mini Verarbeitung abgeschlossen:', processedText.substring(0, 100) + '...');
        
        // Schritt 3: Ergebnis SOFORT anzeigen (nicht auf Firestore warten)
        setProcessedText(processedText);
        // Input-Feld leeren, da processedText jetzt angezeigt wird
        setInputValue("");
        setIsProcessing(false); // UI sofort freigeben
        console.log('📝 processedText gesetzt und angezeigt, Input-Feld geleert');
        
        // Firestore-Speicherung und History-Update im Hintergrund (nicht blockierend)
        setDoc(doc(db, "Praxen", "1", "Dokumentationen", Date.now().toString()), {
          behandlung: selectedTemplate.id,
          transkript: transcribedText,
          dokumentation: processedText,
          timestamp: new Date(),
          user: selectedUser
        }).catch(err => console.error('Fehler beim Speichern in Firestore:', err));
        
        // History-Update im Hintergrund
        getDocs(collection(db, "Praxen", "1", "Dokumentationen"))
          .then(docSnap => {
            const docList = docSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate() || new Date()
            }));
            const sortedDocs = docList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
            setHistory(sortedDocs);
          })
          .catch(err => console.error('Fehler beim Aktualisieren der History:', err));
        
        console.log('✅ Komplette Verarbeitung abgeschlossen (UI bereits freigegeben)');
      } catch (error) {
        console.error('❌ Fehler bei der Verarbeitung:', error);
        console.error('Error Details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          selectedTreatment: selectedTreatment,
          templateFound: !!templates.find(t => t.id === selectedTreatment)
        });
        
        // Detaillierte Fehlermeldung für den Benutzer
        let errorMessage = 'Fehler bei der Verarbeitung: ';
        if (error.message.includes('Vorlage nicht gefunden')) {
          errorMessage += 'Die ausgewählte Vorlage wurde nicht gefunden. Bitte wählen Sie eine andere Vorlage.';
        } else if (error.message.includes('Keine Transkription')) {
          errorMessage += 'Die Audio-Aufnahme konnte nicht transkribiert werden. Bitte versuchen Sie es erneut.';
        } else if (error.message.includes('OpenAI API')) {
          errorMessage += `API-Fehler: ${error.message}. Bitte überprüfen Sie Ihre API-Keys.`;
        } else {
          errorMessage += error.message;
        }
        
        alert(errorMessage);
        setIsProcessing(false);
        setIsRecording(false);
        // Reset processedText bei Fehler
        setProcessedText("");
      }
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

  // Optimiertes, kürzeres Prompt-Template für GPT (schnellere Verarbeitung)
  const buildBillingPrompt = (documentationText, extras = []) => {
    let extraInfo = "";
    if (extras.length > 0) {
      extraInfo = `Zusätzlich: ${extras.join(", ")}. `;
    }
    return [
      { role: 'system', content: 'Zahnärztliche Abrechnung: Identifiziere GOZ/BEMA-Codes. Format: Leistung, Bezeichnung, Begründung. Fehlende Leistungen als Fragen: "X wurde nicht dokumentiert. Wurde sie durchgeführt?"' },
      { role: 'user', content: `${extraInfo}Dokumentation:\n${documentationText}` }
    ];
  };

  // Abrechnungsoptimierung mit Google Gemini (präziser, weniger Halluzinationen)
  // Fallback auf GPT-5-mini falls Google API Key nicht vorhanden
  const performBillingOptimization = async (documentationText, extras = []) => {
    try {
      // Priorität: Google Gemini (präziser für Abrechnungsziffern)
      if (GOOGLE_GEMINI_API_KEY && geminiService) {
        try {
          const suggestions = await geminiService.analyzeBilling(documentationText, extras);
          setBillingSuggestions(suggestions);
          // Extrahiere offene Fragen (z.B. Zeilen mit "?" am Ende)
          const pending = suggestions.split(/\n/).filter(l => l.trim().endsWith("?"));
          setPendingExtras(pending);
          return;
        } catch (geminiError) {
          console.warn('Google Gemini Fehler, Fallback auf GPT-5-mini:', geminiError);
          // Fallback auf GPT-5-mini
        }
      }
      
      // Fallback: GPT-5-mini (schnell und günstig für Abrechnungsoptimierung)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: buildBillingPrompt(documentationText, extras),
            max_completion_tokens: 1000, // GPT-5 verwendet max_completion_tokens
            reasoning_effort: "low", // Reduziertes Reasoning für schnellere Antworten
            // temperature wird nicht unterstützt - GPT-5-mini verwendet Standardwert 1
            stream: false
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
      alert('Fehler bei der Abrechnungsoptimierung: ' + error.message);
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
    if (!suggestions) return { codes: [], optimizations: [], rawText: "" };
    
    // Extrahiere GOZ/BEMA-Codes - verschiedene Formate
    const codeRegex = /(?:GOZ|BEMA|Leistung:)\s*([\d]{2,5})|([\d]{4,5})/gi;
    const codes = [];
    const codeSet = new Set();
    let match;
    
    // Suche nach Codes in verschiedenen Formaten
    const patterns = [
      /GOZ\s*([\d]{2,5})/gi,
      /BEMA\s*([\d]{2,3})/gi,
      /Leistung:\s*([\d]{2,5})/gi,
      /([\d]{4,5})/g  // 4-5 stellige Zahlen (typisch für GOZ)
    ];
    
    patterns.forEach(pattern => {
      while ((match = pattern.exec(suggestions)) !== null) {
        const code = match[1] || match[0];
        if (code && code.length >= 2 && code.length <= 5 && !codeSet.has(code)) {
          codeSet.add(code);
          codes.push(code);
        }
      }
    });
    
    // Extrahiere Optimierungsvorschläge mit Details
    const blocks = suggestions.split(/\n\n+|(?=Leistung:)/g).map(block => block.trim()).filter(Boolean);
    const optimizations = [];
    
    blocks.forEach((block, idx) => {
      // Prüfe ob Block relevante Informationen enthält
      if (block.length < 10) return; // Zu kurz, wahrscheinlich nicht relevant
      
      const leistung = block.match(/Leistung: ?(.+?)(\n|$)/i)?.[1]?.trim() || "";
      const bezeichnung = block.match(/Bezeichnung: ?(.+?)(\n|$)/i)?.[1]?.trim() || "";
      const begruendung = block.match(/Begründung: ?(.+?)(\n|$)/i)?.[1]?.trim() || "";
      const verbesserung = block.match(/Verbesserungsvorschlag: ?(.+?)(\n|$)/i)?.[1]?.trim() || "";
      
      // Extrahiere Code aus verschiedenen Stellen
      let code = "";
      const codeMatch = (leistung + " " + bezeichnung).match(/([\d]{3,5})/);
      if (codeMatch) {
        code = codeMatch[1];
      }
      
      // Nur hinzufügen wenn relevante Informationen vorhanden
      if (leistung || bezeichnung || begruendung || verbesserung) {
        optimizations.push({ 
          id: idx,
          leistung, 
          bezeichnung, 
          begruendung, 
          verbesserung,
          code,
          hasDetails: !!(begruendung || verbesserung)
        });
      }
    });
    
    return { codes, optimizations, rawText: suggestions };
  }
  
  const toggleSuggestion = (id) => {
    setExpandedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Hilfsfunktion für die schöne Formatierung des fertigen Textes
  function renderProcessedText(text) {
    console.log('🎨 renderProcessedText aufgerufen mit:', text ? text.substring(0, 50) + '...' : 'null/undefined');
    if (!text) {
      console.warn('⚠️ renderProcessedText: text ist leer');
      return <div className="text-red-500">Kein Text zum Anzeigen</div>;
    }
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
                    <>
                      {/* Template-specific dictation instructions - only show if instructions exist */}
                      {(templates.find(t => t.id === selectedTreatment)?.dictationInstructions || templates.find(t => t.id === selectedTreatment)?.DictationInstructions) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6 text-lg text-white font-bold"
                        >
                          💡 <span className="font-extrabold">Bitte diktieren Sie:</span> {templates.find(t => t.id === selectedTreatment)?.dictationInstructions || templates.find(t => t.id === selectedTreatment)?.DictationInstructions}
                        </motion.div>
                      )}
                      
                      {/* Collapsible Material Field */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-8"
                      >
                        <button
                          onClick={() => setShowMaterialField(!showMaterialField)}
                          className="flex items-center gap-2 text-white font-bold text-lg mb-2 hover:text-[#ff9900] transition-colors"
                        >
                          {showMaterialField ? (
                            <FiChevronDown className="text-xl" />
                          ) : (
                            <FiChevronRight className="text-xl" />
                          )}
                          Material {showMaterialField ? 'ausblenden' : 'anzeigen'}
                        </button>
                        <AnimatePresence>
                          {showMaterialField && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <input
                                type="text"
                                value={templates.find(t => t.id === selectedTreatment)?.Material || templates.find(t => t.id === selectedTreatment)?.material || ""}
                                readOnly
                                className="w-full px-4 py-3 rounded-lg bg-white/90 text-gray-800 font-semibold text-lg border-2 border-white/50 focus:outline-none focus:border-[#ff9900]"
                                placeholder="Material aus Vorlage"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      
                      <BausteinSelector
                        currentUserId={selectedUser}
                        selectedVorlage={templates.find(t => t.id === selectedTreatment)}
                        onBausteineChange={setAktiveBausteine}
                      />
                    </>
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
                      onClick={handleRecordingToggle}
                      disabled={isProcessing || !selectedTreatment}
                      className={`flex-1 flex items-center justify-center gap-3 ${selectedCategory && selectedTreatment ? 'px-0 py-3 text-xl' : 'px-0 py-6 text-3xl'} font-extrabold uppercase tracking-wide transition-colors rounded-full ${
                        isRecording 
                          ? "bg-red-500 text-white hover:bg-red-600" 
                          : "bg-[#ff9900] text-white hover:bg-orange-600"
                      } ${(isProcessing || !selectedTreatment) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <FiMic className={`text-3xl ${isRecording ? "animate-pulse" : ""}`} />
                      {isProcessing ? "Verarbeite..." : isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
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
                  className="space-y-8"
                >
                  {/* Dokumentationstext */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50"
                  >
                    <h3 className="text-xl font-bold text-[#22223b] mb-6 flex items-center gap-2">
                      <FiCircle className="text-blue-600" />
                      Behandlungsdokumentation
                    </h3>
                    <div className="text-lg text-gray-800">
                      {processedText ? (
                        renderProcessedText(processedText)
                      ) : (
                        <div className="text-red-500">⚠️ Kein Text zum Anzeigen. processedText ist leer.</div>
                      )}
                    </div>
                </motion.div>
                  
                  {/* Abrechnungsoptimierung - Darunter */}
                  {billingSuggestions && (() => {
                    const parsed = parseBillingSuggestions(billingSuggestions);
                    const hasContent = parsed.codes.length > 0 || parsed.optimizations.length > 0;
                    
                    console.log('📊 Parsed Billing Suggestions:', {
                      codes: parsed.codes,
                      optimizationsCount: parsed.optimizations.length,
                      hasContent
                    });
                    
                    const handleAddToText = (textToAdd) => {
                      setProcessedText(prev => {
                        const newText = prev + (prev.endsWith('\n') ? '' : '\n\n') + textToAdd;
                        return newText;
                      });
                    };
                    
                    return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50"
                      >
                        <h3 className="text-xl font-bold text-[#22223b] mb-6 flex items-center gap-2">
                          <FiCircle className="text-[#ff9900]" />
                          Abrechnungsoptimierung
                        </h3>
                        
                        {/* GOZ/BEMA-Codes - Kompakt oben */}
                        {parsed.codes.length > 0 && (
                          <div className="mb-6">
                            <div className="text-sm font-semibold text-gray-700 mb-3">Abrechnungsziffern:</div>
                            <div className="flex flex-wrap gap-2">
                              {parsed.codes.map((code, idx) => (
                <motion.button
                                  key={idx}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleAddToText(`GOZ ${code}`)}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
                                >
                                  {code}
                </motion.button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Optimierungsvorschläge - Aufklappbar */}
                        {parsed.optimizations.length > 0 && (
                          <div className="space-y-3">
                            <div className="text-sm font-semibold text-gray-700 mb-3">Optimierungsvorschläge:</div>
                            {parsed.optimizations.map((opt) => {
                              const isExpanded = expandedSuggestions.has(opt.id);
                              const isSelected = selectedBillingCodes.includes(opt.id);
                              return (
                                <motion.div
                                  key={opt.id}
                                  className="border border-gray-200 rounded-lg overflow-hidden bg-white/80 backdrop-blur-sm"
                                  initial={false}
                                  whileHover={{ borderColor: '#ff9900' }}
                                >
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleSuggestion(opt.id)}
                                      className="flex-1 px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors text-left"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {opt.code && (
                                          <span className="px-3 py-1 bg-gradient-to-r from-[#ff9900] to-orange-500 text-white rounded-lg text-xs font-bold flex-shrink-0 shadow-sm">
                                            {opt.code}
                                          </span>
                                        )}
                                        <span className="text-sm font-medium text-gray-800 truncate">
                                          {opt.bezeichnung || opt.leistung || "Optimierungsvorschlag"}
                                        </span>
                                      </div>
                                      {opt.hasDetails && (
                                        <motion.div
                                          animate={{ rotate: isExpanded ? 180 : 0 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <FiChevronDown className="text-gray-400 flex-shrink-0 ml-2" />
                                        </motion.div>
                                      )}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const textToAdd = opt.bezeichnung || opt.leistung || '';
                                        if (textToAdd) {
                                          handleAddToText(textToAdd);
                                          setSelectedBillingCodes(prev => [...prev, opt.id]);
                                        }
                                      }}
                                      className={`px-4 py-3 flex-shrink-0 transition-all ${
                                        isSelected 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-[#ff9900] hover:bg-orange-600 text-white'
                                      } font-semibold text-xs`}
                                    >
                                      {isSelected ? '✓ Hinzugefügt' : '+ Hinzufügen'}
                                    </button>
                                  </div>
                                  {opt.hasDetails && (
                                    <AnimatePresence>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-4 py-3 bg-gray-50/50 text-sm text-gray-700 space-y-2 border-t border-gray-200">
                                            {opt.leistung && !opt.code && (
                                              <div>
                                                <span className="font-semibold text-[#ff9900]">Leistung:</span> {opt.leistung}
                                              </div>
                                            )}
                                            {opt.begruendung && (
                                              <div>
                                                <span className="font-semibold text-blue-700">Begründung:</span> {opt.begruendung}
                                              </div>
                                            )}
                                            {opt.verbesserung && (
                                              <div>
                                                <span className="font-semibold text-blue-700">Vorschlag:</span> {opt.verbesserung}
                                              </div>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Fallback: Zeige rohen Text wenn Parsing fehlschlägt */}
                        {!hasContent && parsed.rawText && (
                          <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                            {parsed.rawText}
                          </div>
                        )}
              </motion.div>
                    );
                  })()}
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