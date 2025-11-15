import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiSend, FiHelpCircle, FiEdit2, FiChevronLeft, FiCircle, FiChevronDown, FiChevronUp, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db, OPENAI_API_KEY } from "./firebase";
import { AudioRecorder } from "./services/AudioRecorder";
import { WhisperService } from "./services/WhisperService";
import DocumentationModal from "./components/DocumentationModal";
import BausteinSelector from './components/BausteinSelector';
import { buildGPTPrompts } from './utils/buildGPTPrompts';
import { useUser } from './contexts/UserContext';

export default function Dashboard() {
  const { users, selectedUser } = useUser();
  const [templates, setTemplates] = useState([]);
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
  const [expandedSuggestions, setExpandedSuggestions] = useState(new Set()); // Für aufklappbare Optimierungsvorschläge
  const [aktiveBausteine, setAktiveBausteine] = useState([]);
  const [bausteine, setBausteine] = useState([]);
  const [selectedBillingCodes, setSelectedBillingCodes] = useState([]); // Ausgewählte Codes zum Hinzufügen
  const [showMaterialField, setShowMaterialField] = useState(false); // Collapsible material field
  const [isBillingExpanded, setIsBillingExpanded] = useState(false); // Abrechnungsoptimierung ausklappbar
  const [animationPhase, setAnimationPhase] = useState('input'); // 'input' | 'processing' | 'result'

  // Reset to input phase when treatment changes
  useEffect(() => {
    if (selectedTreatment) {
      setAnimationPhase('input');
      setProcessedText("");
      setInputValue("");
      setBillingSuggestions("");
    }
  }, [selectedTreatment]);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
      setAnimationPhase('processing'); // Input fliegt weg, Processing erscheint
      const selectedTemplate = templates.find(t => t.id === selectedTreatment);
      if (!selectedTemplate) throw new Error('Vorlage nicht gefunden');
      
        // GPT-5-mini Verarbeitung
        console.log('🤖 Starte GPT-5-mini Verarbeitung...');
      
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
      setAnimationPhase('result'); // Processing fliegt runter, Result kommt von oben
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
      
      // Bei Fehler zurück zu Input
      setAnimationPhase('input');
      
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
        
        // Audio-Aufnahme starten
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
        setAnimationPhase('processing'); // Input fliegt weg, Processing erscheint
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
        
        // Schritt 2: GPT-5-mini Template-Verarbeitung
        const selectedTemplate = templates.find(t => t.id === selectedTreatment);
        if (!selectedTemplate) throw new Error('Vorlage nicht gefunden');
        
        console.log('🤖 Starte GPT-5-mini Verarbeitung...');
        
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
        setAnimationPhase('result'); // Processing fliegt runter, Result kommt von oben
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
        setAnimationPhase('input'); // Bei Fehler zurück zu Input
        // Reset processedText bei Fehler
        setProcessedText("");
      }
    }
  };


  // Optimiertes, kürzeres Prompt-Template für GPT (schnellere Verarbeitung)
  const buildBillingPrompt = (documentationText, extras = []) => {
    let extraInfo = "";
    if (extras.length > 0) {
      extraInfo = `Zusätzlich: ${extras.join(", ")}. `;
    }
    return [
      { role: 'system', content: 'Analysiere zahnärztliche Dokumentation KURZ. Format: "GOZ/BEMA-Codes: [Liste]" und "Fehlende Leistungen: [Fragen]". Maximal 5 Zeilen.' },
      { role: 'user', content: `${extraInfo}Dokumentation:\n${documentationText}` }
    ];
  };

  // Abrechnungsoptimierung mit GPT-5-mini
  const performBillingOptimization = async (documentationText, extras = []) => {
    try {
      // GPT-5-mini für Abrechnungsoptimierung
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: buildBillingPrompt(documentationText, extras),
            max_completion_tokens: 300, // Stark reduziert für schnellere, kürzere Antworten
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

  // Vereinfachte Parsing-Funktion für kurze Antworten
  function parseBillingSuggestions(suggestions) {
    if (!suggestions) return { codes: [], questions: [], summary: "" };
    
    const codes = [];
    const questions = [];
    
    // Extrahiere GOZ/BEMA-Codes
    const codeMatches = suggestions.match(/(?:GOZ\/BEMA-Codes?:|Codes?:)\s*([\d\s,]+)/i);
    if (codeMatches && codeMatches[1]) {
      codeMatches[1].split(/[,\s]+/).forEach(code => {
        const cleanCode = code.trim();
        if (cleanCode && /^\d{2,5}$/.test(cleanCode)) {
          codes.push(cleanCode);
        }
      });
    }
    
    // Extrahiere fehlende Leistungen/Fragen
    const questionMatches = suggestions.match(/(?:Fehlende Leistungen?:|Fragen?:)\s*(.+)/i);
    if (questionMatches && questionMatches[1]) {
      questionMatches[1].split(/[,\n]/).forEach(q => {
        const cleanQ = q.trim();
        if (cleanQ && cleanQ.length > 0) {
          questions.push(cleanQ);
        }
      });
    }
    
    return { codes, questions, summary: suggestions };
  }
  
  // Alte komplexe Parsing-Funktion (für Fallback)
  function parseBillingSuggestionsOld(suggestions) {
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
      {/* Hauptinhalt - Animation wird von App.jsx übernommen */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-[320px] flex flex-col justify-start py-16 px-12 min-h-screen relative overflow-y-auto">
          {/* Branding */}
          <div className="mb-20">
            <span className="text-5xl font-extrabold tracking-tight text-[#ff9900] block mb-2">docudent.</span>
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
                      animate={{ opacity: 1, scale: 1.8, rotate: -90, y: 350 }}
                      exit={{ opacity: 0, scale: 0.7, rotate: 0, y: 0 }}
                      transition={{ type: 'spring', stiffness: 100, damping: 18 }}
                      className="origin-left text-white font-extrabold cursor-pointer select-none"
                      style={{ fontSize: '1.6rem', minWidth: '120px', letterSpacing: '0.01em' }}
                      onClick={() => { setSelectedTreatment(""); setSidebarStep(2); }}
                      title="Behandlung ändern"
                    >
                      {treatments.find(t => t.id === selectedTreatment)?.id}
                    </motion.div>
                  </div>
                ) : (
                  <div className="flex flex-row items-start gap-2">
                    <button onClick={() => { setSelectedTreatment(""); setSidebarStep(1); }} className="p-2 mt-1 rounded-full hover:bg-gray-100 transition-colors"><FiChevronLeft className="text-2xl text-[#ff9900]" /></button>
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
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-24 py-24">
          <div className="max-w-4xl mx-auto w-full">
            <AnimatePresence mode="wait" initial={false}>
              {animationPhase === 'input' && (
              <motion.div 
                  key="eingabe"
                  initial={{ opacity: 1, y: 0 }}
                  exit={{ 
                    opacity: 0,
                    y: -150,
                    scale: 0.9,
                    filter: "blur(10px)"
                  }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeIn' }}
                >
                  {/* Container mit fester Struktur - verhindert Hüpfen */}
                  <div className="relative w-full">
                    {/* Fester Platz für Elemente oberhalb des Input-Felds */}
                    <div className="mb-8" style={{ minHeight: '0px' }}>
                      {/* Template-specific dictation instructions - only show if instructions exist */}
                      {selectedTreatment && (templates.find(t => t.id === selectedTreatment)?.dictationInstructions || templates.find(t => t.id === selectedTreatment)?.DictationInstructions) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6 text-lg text-white font-bold"
                        >
                          💡 <span className="font-extrabold">Bitte diktieren Sie:</span> {templates.find(t => t.id === selectedTreatment)?.dictationInstructions || templates.find(t => t.id === selectedTreatment)?.DictationInstructions}
                        </motion.div>
                      )}
                      
                      {/* BausteinSelector - nur wenn Behandlung ausgewählt */}
                      {selectedTreatment && (
                        <BausteinSelector
                          currentUserId={selectedUser}
                          selectedVorlage={templates.find(t => t.id === selectedTreatment)}
                          onBausteineChange={setAktiveBausteine}
                        />
                      )}
                    </div>
                    
                    {/* Input Field - absolut positioniert, verschiebt sich nicht */}
                    <div className="relative w-full" style={{ height: '120px', position: 'relative' }}>
                      <div className="absolute top-0 left-0 right-0 flex items-center justify-center" style={{ height: '120px' }}>
                        <motion.input
                          type="text"
                          value={inputValue}
                          onChange={e => setInputValue(e.target.value)}
                          placeholder=" "
                          className="w-full px-0 py-6 border-0 bg-transparent text-4xl font-light focus:outline-none focus:ring-0 text-gray-900 relative z-10 text-center"
                          style={{ 
                            position: 'relative',
                            lineHeight: '1.2',
                            paddingTop: '1.5rem',
                            paddingBottom: '1.5rem'
                          }}
                        />
                        {/* Placeholder mit sanftem Fade In/Out - zentriert */}
                        {!inputValue && (
                          <motion.div
                            className="absolute left-1/2 -translate-x-1/2 text-4xl font-light text-gray-400/50 pointer-events-none z-0 whitespace-nowrap"
                            style={{ 
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              lineHeight: '1.2'
                            }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ 
                              duration: 3, 
                              repeat: Infinity, 
                              ease: "easeInOut" 
                            }}
                          >
                            Spracheingabe oder Text hier eingeben...
                          </motion.div>
                        )}
                        {/* Faded out line with gradient */}
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 h-[2px]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: inputValue ? 0.3 : 0.6 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div 
                            className="h-full w-full"
                            style={{
                              background: 'linear-gradient(to right, transparent 0%, #ff9900 20%, #ff9900 80%, transparent 100%)'
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                  


                  {/* Buttons - mehr Abstand zum Input-Feld */}
                  <motion.div
                    className="flex items-center justify-center gap-3 mb-8 mt-12"
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                  >
                    <motion.button
                      onClick={handleRecordingToggle}
                      disabled={isProcessing || !selectedTreatment}
                      whileHover={!isProcessing && selectedTreatment ? { scale: 1.05 } : {}}
                      whileTap={!isProcessing && selectedTreatment ? { scale: 0.95 } : {}}
                      className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                        isRecording 
                          ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30" 
                          : "bg-[#ff9900] text-white hover:bg-orange-600 shadow-md shadow-[#ff9900]/20 hover:shadow-lg hover:shadow-[#ff9900]/30"
                      } ${(isProcessing || !selectedTreatment) ? 'opacity-40 cursor-not-allowed' : ''}`}
                      title={isProcessing ? "Verarbeite..." : isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
                    >
                      <FiMic className={`text-lg ${isRecording ? "animate-pulse" : ""}`} />
                      {/* Tooltip */}
                      <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {isProcessing ? "Verarbeite..." : isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
                      </span>
                    </motion.button>
                    <motion.button
                      onClick={handleTextSubmit}
                      disabled={!inputValue.trim() || !selectedTreatment || isProcessing || isRecording}
                      whileHover={(!inputValue.trim() || !selectedTreatment || isProcessing || isRecording) ? {} : { scale: 1.05 }}
                      whileTap={(!inputValue.trim() || !selectedTreatment || isProcessing || isRecording) ? {} : { scale: 0.95 }}
                      className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                        (!inputValue.trim() || !selectedTreatment || isProcessing || isRecording)
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md shadow-gray-900/20 hover:shadow-lg hover:shadow-gray-900/30'
                      }`}
                      title={isProcessing ? "Verarbeite..." : "Text verarbeiten"}
                    >
                      <FiSend className="text-lg" />
                      {/* Tooltip */}
                      <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {isProcessing ? "Verarbeite..." : "Text verarbeiten"}
                      </span>
                    </motion.button>
                  </motion.div>
                  
                  {/* Material Button - erscheint unter den Buttons, links ausgerichtet, fester Platz */}
                  <div className="min-h-[60px]">
                    {selectedTreatment && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <button
                          onClick={() => setShowMaterialField(!showMaterialField)}
                          className="flex items-center gap-2 text-white font-bold text-lg hover:text-[#ff9900] transition-colors"
                        >
                          {showMaterialField ? (
                            <FiChevronDown className="text-xl" />
                          ) : (
                            <FiChevronRight className="text-xl" />
                          )}
                          Material {showMaterialField ? 'ausblenden' : 'anzeigen'}
                        </button>
                      </motion.div>
                    )}
                    
                    {/* Collapsible Material Field - erscheint unter dem Button */}
                    {selectedTreatment && (
                      <AnimatePresence>
                        {showMaterialField && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden mt-4"
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
                    )}
                  </div>
              </motion.div>
              )}
              
              {animationPhase === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 100 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="flex flex-col items-center justify-center py-24"
                >
                  {/* Dynamischer Spinner */}
                  <div className="relative mb-8" style={{ width: '200px', height: '200px' }}>
                    {/* Äußerer Ring */}
                    <motion.div
                      className="absolute border-4 border-[#ff9900]/30 rounded-full"
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ 
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                      style={{ width: '80px', height: '80px', top: '60px', left: '60px' }}
                    />
                    {/* Mittlerer Ring */}
                    <motion.div
                      className="absolute border-4 border-transparent border-t-[#ff9900] rounded-full"
                      animate={{ 
                        rotate: -360,
                        scale: [1, 0.9, 1]
                      }}
                      transition={{ 
                        rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                      }}
                      style={{ width: '60px', height: '60px', top: '70px', left: '70px' }}
                    />
                    {/* Innerer Ring */}
                    <motion.div
                      className="absolute border-3 border-transparent border-r-[#ff9900] rounded-full"
                      animate={{ 
                        rotate: 360,
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ 
                        rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                        opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                      }}
                      style={{ width: '40px', height: '40px', top: '80px', left: '80px' }}
                    />
                    {/* Zentrumspunkt */}
                    <motion.div
                      className="absolute bg-[#ff9900] rounded-full"
                      animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.6, 1, 0.6]
                      }}
                      transition={{ 
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{ width: '12px', height: '12px', top: '94px', left: '94px' }}
                    />
                  </div>
                </motion.div>
              )}
              
              {animationPhase === 'result' && (
                <motion.div
                  key="ergebnis"
                  initial={{ opacity: 0, y: -100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 100 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="space-y-8"
                >
                  {/* Reset Button */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center mb-4"
                  >
                    <motion.button
                      onClick={() => {
                        setProcessedText("");
                        setInputValue("");
                        setAnimationPhase('input');
                        setBillingSuggestions("");
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-[#ff9900] text-white rounded-full font-semibold shadow-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                    >
                      <FiRefreshCw className="text-lg" />
                      Neue Dokumentation
                    </motion.button>
                  </motion.div>
                  
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
                  
                  {/* Abrechnungsoptimierung - Kompakt, ausklappbar unten */}
                  {billingSuggestions && (() => {
                    const parsed = parseBillingSuggestions(billingSuggestions);
                    const hasContent = parsed.codes.length > 0 || parsed.questions.length > 0;
                    
                    if (!hasContent) return null;
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 overflow-hidden"
                      >
                        {/* Kompakter Header - Immer sichtbar */}
                        <button
                          onClick={() => setIsBillingExpanded(!isBillingExpanded)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FiCircle className="text-[#ff9900]" />
                            <span className="font-semibold text-gray-800">Abrechnungsvorschläge</span>
                            {parsed.codes.length > 0 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                {parsed.codes.length} Codes
                              </span>
                            )}
                            {parsed.questions.length > 0 && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                {parsed.questions.length} Fragen
                              </span>
                            )}
                          </div>
                          <motion.div
                            animate={{ rotate: isBillingExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <FiChevronDown className="text-gray-400" />
                          </motion.div>
                        </button>
                        
                        {/* Ausklappbarer Inhalt */}
                        <AnimatePresence>
                          {isBillingExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
                                {/* GOZ/BEMA-Codes */}
                                {parsed.codes.length > 0 && (
                                  <div>
                                    <div className="text-sm font-semibold text-gray-700 mb-2">Abrechnungsziffern:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {parsed.codes.map((code, idx) => (
                                        <span
                                          key={idx}
                                          className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-semibold"
                                        >
                                          {code}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Fehlende Leistungen */}
                                {parsed.questions.length > 0 && (
                                  <div>
                                    <div className="text-sm font-semibold text-gray-700 mb-2">Mögliche fehlende Leistungen:</div>
                                    <ul className="space-y-1">
                                      {parsed.questions.map((q, idx) => (
                                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                          <span className="text-[#ff9900] mt-1">•</span>
                                          <span>{q}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Fallback: Roher Text */}
                                {parsed.summary && parsed.codes.length === 0 && parsed.questions.length === 0 && (
                                  <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                    {parsed.summary}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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