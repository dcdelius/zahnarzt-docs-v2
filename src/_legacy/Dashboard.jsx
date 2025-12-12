import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMic, FiSend, FiHelpCircle, FiEdit2, FiChevronLeft, FiCircle, FiChevronDown, FiChevronUp, FiChevronRight, FiRefreshCw, FiCopy, FiCheck, FiX, FiCpu, FiSliders, FiAlignLeft, FiAlignJustify, FiFileText, FiBox, FiZap, FiShield, FiLock } from "react-icons/fi";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db, OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY } from "./firebase";
import BrandLogo from "./components/BrandLogo";
import { AudioRecorder } from "./services/AudioRecorder";
import { WhisperService } from "./services/WhisperService";
import { GeminiService } from "./services/GeminiService";
import DocumentationModal from "./components/DocumentationModal";
import BausteinSelector from './components/BausteinSelector';
import { buildGPTPrompts } from './utils/buildGPTPrompts';
import { useUser } from './contexts/UserContext';
import { toast } from 'sonner';

const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_MODEL = import.meta.env.VITE_GEMINI_TEMPLATE_MODEL || GEMINI_FALLBACK_MODEL;
const GEMINI_MODEL_OPTIONS = [
  { id: "gemini-3.0-pro", label: "Gemini 3 Pro" },
  { id: GEMINI_FALLBACK_MODEL, label: "Gemini 2.5 Flash" }
];

import { TypeAnimation } from 'react-type-animation';
import { useHotkeys } from 'react-hotkeys-hook';

const FUN_PROCESSING_MESSAGES = [
  "Rücksprache mit dem KI-Oberarzt...",
  "Suche nach vergessenen GOZ-Ziffern...",
  "Formuliere forensisch wasserdichten Text...",
  "Poliere die Pixel...",
  "Analysiere Audiodaten...",
  "Optimiere Abrechnungsfaktoren...",
  "Lese die Gedanken des Zahnarztes...",
  "Verhandle mit der Krankenkasse...",
  "Desinfiziere den Speicher...",
  "Rühre den digitalen Zement an...",
  "Schärfe die Skalpelle...",
  "Suche den 33. Zahn...",
  "Berechne den optimalen Steigerungsfaktor...",
  "Entschlüssele das Zahnarzt-Latein...",
  "Frage den KI-Oberarzt...",
  "Sortiere die digitalen Akten...",
  "Mache den Röntgenblick scharf...",
  "Kalibriere den Bohrer...",
  "Überprüfe auf Plausibilität...",
  "Jage nach Halluzinationen...",
  "Setze das digitale Implantat...",
  "Härte das Komposit virtuell aus...",
  "Messe die Kanallänge in Bits...",
  "Extrahiere unnötige Füllwörter...",
  "Pumpe Wissen in den Text...",
  "Scanne nach bMF-Triggern...",
  "Vermeide Regress-Fallen...",
  "Maximiere den Honorar-Booster...",
  "Prüfe auf vollständige Exkavation...",
  "Lege den digitalen Kofferdam an...",
  "Verabreiche lokale Daten-Anästhesie...",
  "Hole mir einen Kaffee...",
  "Warte auf den Abbinde-Vorgang..."
];

const FUN_DASHBOARD_MESSAGES = [
  "Bereit für den nächsten Patienten?",
  "Keine Lust auf Schreibkram? Ich übernehme.",
  "Wartezimmer voll, Personal weg? Ich bin ja da.",
  "Schneller als die KV erlaubt.",
  "Ich brauche keine Kaffeepause. Und keinen Urlaub.",
  "ZFA gesucht? Ich mache zumindest den Papierkram.",
  "Lauterbachs Albtraum: Eine funktionierende Praxis.",
  "Wer braucht schon Personal, wir haben KI.",
  "Ich meckere nicht über Überstunden.",
  "Bürokratie-Monster bekämpfen...",
  "Telematik-Infrastruktur wieder down? Ich funktioniere.",
  "Das hätte man früher auf 'Sonstiges' gebucht.",
  "Ich diskutiere nicht mit Patienten.",
  "Mehr Zeit für die Behandlung, weniger für den PC.",
  "Der MDK wird weinen vor Freude.",
  "Budget schon ausgeschöpft? Wir finden noch was.",
  "Füllung? Endo? Chirurgie?",
  "Konzentrier dich auf den Patienten.",
  "Dein KI-Assistent ist bereit.",
  "Sichere Dokumentation auf Knopfdruck.",
  "Die Krankenkasse wird staunen.",
  "Keine Angst vor dem MDK.",
  "Holen wir das Maximum aus der GOZ.",
  "Ich kenne alle BEMA-Nummern auswendig.",
  "Abrechnung leicht gemacht.",
  "Dein digitaler Abrechnungs-Joker.",
  "Nie wieder Regress-Sorgen.",
  "Lass uns Umsatz generieren.",
  "Die KI schläft nie.",
  "Forensisch sicherer als Fort Knox.",
  "Ich liebe juristisch einwandfreie Texte.",
  "Privatpatient oder Kasse? Egal.",
  "Vergiss keine Faktorerhöhung.",
  "Dokumentation ist das halbe Leben.",
  "Deine Dokumentation wird legendär.",
  "KI-Power für deine Praxis.",
  "Wir retten den Zahn (und den Umsatz).",
  "Papierkram? Nicht mit mir.",
  "Ich bin günstiger als eine neue ZFA.",
  "Endlich Feierabend machen? Ich helfe nach."
];

const TreatmentListItem = ({ treatment, isSelected, isAnySelected, onClick }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  return (
    <motion.div
      className={`relative w-full py-2 text-2xl font-semibold font-sans tracking-tight cursor-pointer select-none px-2 text-center rounded-lg overflow-hidden group transition-colors duration-300 ${isSelected
        ? 'text-white drop-shadow-md bg-white/10'
        : 'text-white/90 hover:text-white drop-shadow-sm'
        }`}
      onClick={onClick}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      {/* Spotlight Effect - Very subtle */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.1), transparent 40%)`
        }}
      />

      <span className="relative z-10">
        {treatment.title || treatment.id.replace("V2_", "").replace(/_/g, " ")}
      </span>
    </motion.div>
  );
};

export default function Dashboard() {
  const textareaRef = useRef(null);
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
  const [geminiModel, setGeminiModel] = useState(DEFAULT_GEMINI_MODEL);
  const geminiService = useMemo(() => {
    if (!GOOGLE_GEMINI_API_KEY) return null;
    try {
      return new GeminiService(GOOGLE_GEMINI_API_KEY, geminiModel);
    } catch (error) {
      console.error("❌ Gemini Service konnte nicht initialisiert werden:", error);
      return null;
    }
  }, [geminiModel]);
  const [llmProvider, setLlmProvider] = useState("gpt");
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState("");
  const [globalAiSettings, setGlobalAiSettings] = useState({}); // New state for global AI settings
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
  const [isInputFocused, setIsInputFocused] = useState(false); // Input focus state for motion
  const [insuranceType, setInsuranceType] = useState('GKV'); // 'GKV' | 'PKV'
  const [copied, setCopied] = useState(false);
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  const [dashboardMessageIndex, setDashboardMessageIndex] = useState(0);

  // Pill Controls
  const [isPillExpanded, setIsPillExpanded] = useState(false);
  const [activeTextLength, setActiveTextLength] = useState('standard');
  const [forensicLevel, setForensicLevel] = useState('standard');
  const [manualMaterial, setManualMaterial] = useState('');
  const [activeStandards, setActiveStandards] = useState([]); // Smart Standards Chips

  // Update Pill Controls when template changes
  useEffect(() => {
    if (selectedTreatment) {
      const tmpl = templates.find(t => t.id === selectedTreatment);
      setManualMaterial(tmpl?.Material || "");
      setActiveTextLength(tmpl?.aiSettings?.textLength || 'standard');
      
      // Migration: Boolean/String to String Level
      const mode = tmpl?.aiSettings?.forensicMode;
      let level = 'standard';
      if (mode === true || mode === 'max') level = 'max';
      else if (mode === 'minimal') level = 'minimal';
      else level = 'standard';
      
      setForensicLevel(level);

      // Load Standards
      const defaults = tmpl?.practiceDefaults?.standardLeistungen;
      if (defaults) {
        // Parse into objects with active state
        const standardsList = defaults.split(',').map((s, idx) => ({
          id: `std-${idx}`,
          label: s.trim(),
          active: true
        })).filter(s => s.label);
        setActiveStandards(standardsList);
      } else {
        setActiveStandards([]);
      }
    }
  }, [selectedTreatment, templates]);

  // Cycle Messages (Randomized)
  useEffect(() => {
    const intervalProcessing = setInterval(() => {
      if (animationPhase === 'processing') {
        setProcessingMessageIndex(Math.floor(Math.random() * FUN_PROCESSING_MESSAGES.length));
      }
    }, 2500);

    const intervalDashboard = setInterval(() => {
      if (animationPhase === 'input' && !inputValue && !isRecording) {
        setDashboardMessageIndex(Math.floor(Math.random() * FUN_DASHBOARD_MESSAGES.length));
      }
    }, 4000);

    return () => {
      clearInterval(intervalProcessing);
      clearInterval(intervalDashboard);
    };
  }, [animationPhase, inputValue, isRecording]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue, animationPhase]);

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

  useEffect(() => {
    // Load Global System Prompt & Settings
    const fetchGlobalSettings = async () => {
      try {
        const globalPromptDoc = await getDoc(doc(db, "Praxen", "1", "SystemSettings", "GlobalPrompts"));
        if (globalPromptDoc.exists()) {
          const data = globalPromptDoc.data();
          setGlobalSystemPrompt(data.masterPrompt || "");
          setGlobalAiSettings(data.aiSettings || {}); // Load AI settings
        }
      } catch (error) {
        console.error("Error loading global prompt:", error);
      }
    };
    fetchGlobalSettings();
  }, []);

  useEffect(() => {
    if (!geminiService && llmProvider === "gemini") {
      setLlmProvider("gpt");
    }
  }, [geminiService, llmProvider]);

  const canUseGemini = Boolean(geminiService);


  const treatments = templates.filter((t) => {
    const matchesCategory = t.Kategorie === selectedCategory;
    const matchesUser = !selectedUser || t.users?.includes("all") || t.users?.includes(selectedUser);
    // Nur V2 anzeigen
    const isV2 = t.systemVersion === "v2";
    return matchesCategory && matchesUser && isV2;
  });

  const categories = [...new Set(
    templates
      .filter(t => {
        const matchesUser = !selectedUser || t.users?.includes("all") || t.users?.includes(selectedUser);
        const isV2 = t.systemVersion === "v2";
        return matchesUser && isV2;
      })
      .map((t) => t.Kategorie)
      .filter(Boolean)
  )].sort((a, b) => {
    const numA = parseInt(a.match(/^\d+/)?.[0] || "999");
    const numB = parseInt(b.match(/^\d+/)?.[0] || "999");
    return numA - numB;
  });

  // Hotkeys
  useHotkeys('space', (e) => {
    // Prevent default scrolling behavior for space
    if (document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      handleRecordingToggle();
    }
  }, { enabled: !!selectedTreatment && !isProcessing }, [selectedTreatment, isProcessing, isRecording]);

  useHotkeys('meta+enter, ctrl+enter', () => {
    handleTextSubmit();
  }, { enabled: !!inputValue.trim() && !!selectedTreatment && !isProcessing && !isRecording, enableOnFormTags: true }, [inputValue, selectedTreatment, isProcessing, isRecording]);

  const runLLMProcessing = async ({ template, dictatedText, insuranceType, textLength, manualMaterial, forensicLevel, activeStandards }) => {
    if (!template) {
      throw new Error('Vorlage nicht gefunden');
    }
    const cleanedInput = dictatedText?.trim();
    if (!cleanedInput) {
      throw new Error('Keine Eingabe zum Verarbeiten');
    }

    let systemPrompt;
    let userPrompt;
    try {
      const prompts = buildGPTPrompts({
        template,
        inputText: cleanedInput,
        bausteine: aktiveBausteine,
        allBausteine: bausteine,
        globalSystemPrompt,
        insuranceType,
        textLength,
        manualMaterial,
        forensicLevel,
        activeStandards: activeStandards.filter(s => s.active).map(s => s.label), // Pass only active
        inactiveStandards: activeStandards.filter(s => !s.active).map(s => s.label), // Pass inactive for exclusion
        globalAiSettings // Pass global settings
      });
      systemPrompt = prompts.systemPrompt;
      userPrompt = prompts.userPrompt;
      if (!systemPrompt || !userPrompt) {
        throw new Error('Fehler beim Erstellen der Prompts');
      }
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Prompts:', error);
      throw new Error(`Fehler beim Erstellen der Prompts: ${error.message}`);
    }

    if (llmProvider === "gemini") {
      if (!geminiService) {
        throw new Error('Gemini ist nicht konfiguriert. Bitte hinterlegen Sie einen API-Key in der .env Datei.');
      }
      console.log('🌌 Starte Gemini Verarbeitung...', { model: geminiModel, template: template.id });
      const geminiResult = await geminiService.generateFromPrompts({
        systemPrompt,
        userPrompt,
        templateName: template.id || template.titel || template.name || "Vorlage"
      });
      console.log('✅ Gemini Verarbeitung abgeschlossen:', geminiResult.substring(0, 120) + '...');
      return geminiResult;
    }

    console.log('🤖 Starte GPT-5-mini Verarbeitung...');
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
        max_completion_tokens: 2000,
        reasoning_effort: "low",
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice?.message) {
      console.error('❌ Ungültige GPT-Antwort:', data);
      throw new Error('GPT-5-mini API hat keine gültige Nachricht zurückgegeben.');
    }

    let processedText = choice.message.content
      || choice.message.text
      || choice.text
      || data.content
      || data.text;

    if (!processedText || !processedText.trim()) {
      console.error('❌ Kein Content in GPT-Antwort:', data);
      throw new Error('GPT-5-mini hat keine Text-Antwort zurückgegeben. Bitte versuchen Sie es erneut.');
    }

    // Entferne Anweisungs-Texte aus dem Output
    processedText = processedText
      // Entferne komplette Anweisungs-Blöcke
      .replace(/🚨 WICHTIG - NUR FÜR INTERNE ANWEISUNGEN[^\n]*\n/g, '')
      .replace(/VERWENDETES MATERIAL[^\n]*\n/g, '')
      .replace(/KATEGORISIERUNG:[^\n]*\n/g, '')
      .replace(/MATERIAL-REGELN:[^\n]*\n/g, '')
      .replace(/VERFÜGBARE FORMULIERUNGEN[^\n]*\n/g, '')
      .replace(/DIKTIERTER TEXT[^\n]*\n/g, '')
      .replace(/KRITISCHE REGELN[^\n]*\n/g, '')
      // Entferne Material-Listen (falls sie als separate Blöcke erscheinen)
      .replace(/^[\s\n]*Anästhesie:.*$/gm, '')
      .replace(/^[\s\n]*Bonding:.*$/gm, '')
      .replace(/^[\s\n]*Flow:.*$/gm, '')
      .replace(/^[\s\n]*Komposit:.*$/gm, '')
      .replace(/^[\s\n]*Medikament:.*$/gm, '')
      .replace(/^[\s\n]*Sealer:.*$/gm, '')
      .replace(/^[\s\n]*Guttapercha:.*$/gm, '')
      // Entferne Regel-Zeilen
      .replace(/^[\s\n]*-.*→.*$/gm, '')
      .replace(/^[\s\n]*❌.*$/gm, '')
      // Entferne leere Zeilen am Anfang/Ende und reduzieren mehrfache Leerzeilen
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log('✅ GPT-5-mini Verarbeitung abgeschlossen:', processedText.substring(0, 120) + '...');
    return processedText;
  };

  const handleProcessingSuccess = async ({ template, dictatedText, processedText }) => {
    setProcessedText(processedText);
    setInputValue("");
    setIsProcessing(false);
    setAnimationPhase('result');

    try {
      await setDoc(doc(db, "Praxen", "1", "Dokumentationen", Date.now().toString()), {
        behandlung: template.id,
        transkript: dictatedText,
        dokumentation: processedText,
        timestamp: new Date(),
        user: selectedUser,
        model: llmProvider === 'gemini' ? `gemini:${geminiModel}` : 'gpt-5-mini'
      });
      const docSnap = await getDocs(collection(db, "Praxen", "1", "Dokumentationen"));
      const docList = docSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      const sortedDocs = docList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
      setHistory(sortedDocs);
    } catch (storageError) {
      console.error('⚠️ Fehler beim Speichern in Firestore:', storageError);
    }
  };

  const handleProcessingError = (error) => {
    console.error('❌ Fehler bei der Verarbeitung:', error);
    setAnimationPhase('input');
    setIsProcessing(false);
    const providerLabel = llmProvider === "gemini" ? `Gemini (${geminiModel})` : "GPT-5-mini";
    toast.error(`Fehler (${providerLabel}): ${error.message}`);
    setProcessedText("");
  };

  const handleTextSubmit = async () => {
    if (!inputValue.trim() || !selectedTreatment || isProcessing || isRecording) return;
    const selectedTemplate = templates.find(t => t.id === selectedTreatment);
    if (!selectedTemplate) {
      toast.error('Bitte wählen Sie eine gültige Vorlage aus');
      return;
    }

    try {
      setIsProcessing(true);
      setAnimationPhase('processing');
      const processedText = await runLLMProcessing({
        template: selectedTemplate,
        dictatedText: inputValue,
        insuranceType,
        textLength: activeTextLength,
        manualMaterial: manualMaterial,
        forensicLevel: forensicLevel,
        activeStandards: activeStandards // Pass active standards
      });
      await handleProcessingSuccess({
        template: selectedTemplate,
        dictatedText: inputValue,
        processedText
      });
    } catch (error) {
      handleProcessingError(error);
    }
  };

  // Audio Recording Handler - Kompletter Flow: Aufnahme → Whisper → GPT → Vorlage
  const handleRecordingToggle = async () => {
    if (!isRecording) {
      // Aufnahme starten
      try {
        if (!selectedTreatment) {
          toast.error('Bitte wählen Sie zuerst eine Behandlung aus');
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
        toast.success('Aufnahme gestartet');
      } catch (error) {
        console.error('❌ Fehler beim Starten der Aufnahme:', error);
        let errorMessage = 'Mikrofon konnte nicht aktiviert werden';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Mikrofon-Berechtigung verweigert';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'Kein Mikrofon gefunden';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Mikrofon bereits in Verwendung';
        } else {
          errorMessage = error.message || errorMessage;
        }

        toast.error(errorMessage);
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

        // Schritt 2: Template-Verarbeitung mit ausgewähltem Modell
        const selectedTemplate = templates.find(t => t.id === selectedTreatment);
        if (!selectedTemplate) throw new Error('Vorlage nicht gefunden');

        const processedText = await runLLMProcessing({
          template: selectedTemplate,
          dictatedText: transcribedText,
          insuranceType,
          textLength: activeTextLength,
          manualMaterial: manualMaterial,
          forensicLevel: forensicLevel,
        });


        await handleProcessingSuccess({
          template: selectedTemplate,
          dictatedText: transcribedText,
          processedText
        });

      } catch (error) {
        handleProcessingError(error);
        setIsRecording(false);
      }
    }
  };


  // Optimiertes, kürzeres Prompt-Template für GPT (schnellere Verarbeitung)
  const buildBillingPrompt = (documentationText, extras = []) => {
    let extraInfo = "";
    if (extras.length > 0) {
      extraInfo = `Zusätzlich: ${extras.join(", ").replace(/\?/g, '')}. `;
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
      // Leise scheitern bei Billing-Opt, kein aggressiver Alert
      console.warn('Abrechnungsoptimierung fehlgeschlagen: ' + error.message);
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

  const handleCopy = () => {
    if (!processedText) return;
    navigator.clipboard.writeText(processedText);
    setCopied(true);
    toast.success("Text kopiert!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Hilfsfunktion für die schöne Formatierung des fertigen Textes
  function renderProcessedText(text) {
    if (!text) {
      return <div className="text-red-500">Kein Text zum Anzeigen</div>;
    }
    const lines = text.split(/\n/);
    return (
      <div className="space-y-1 text-gray-800 font-medium text-base leading-relaxed select-text">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Trennlinie
          if (trimmed.match(/^-{3,}$/)) {
            return <hr key={idx} className="my-6 border-t-2 border-gray-200" />;
          }

          // Überschriften (z.B. "1) ABRECHNUNG")
          if (trimmed.match(/^\d+\)/) || (trimmed === trimmed.toUpperCase() && trimmed.length > 5)) {
            return <div key={idx} className="font-bold text-[#22223b] text-lg mt-4 mb-2">{line}</div>;
          }

          // Leere Zeilen
          if (!trimmed) {
            return <div key={idx} className="h-2"></div>;
          }

          // Listenpunkte (falls noch vorhanden)
          if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
            return <div key={idx} className="pl-4">{line}</div>;
          }

          // Normaler Text
          return <div key={idx}>{line}</div>;
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Hauptinhalt - Animation wird von App.jsx übernommen */}
      <div className="flex flex-1 h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[380px] flex flex-col justify-start py-16 px-10" style={{ height: 'calc(100vh - 73px)' }}>
          {/* Branding */}
          <BrandLogo className="mb-20" />
          {/* Zweistufiges Auswahlmenü - Scrollable & Masked */}
          <div
            className="mb-16 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0px, black 15px, black calc(100% - 60px), transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 15px, black calc(100% - 60px), transparent 100%)'
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {sidebarStep === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-0 pb-20"
                >
                  {categories.map(category => (
                    <motion.div
                      key={category}
                      className="w-full py-1 text-2xl font-semibold font-sans tracking-tight cursor-pointer select-none px-2 text-left text-white/90 hover:text-white drop-shadow-sm"
                      whileHover={{ scale: 1.08 }}
                      animate={{ color: '#ffffff' }}
                      transition={{ duration: 0.16 }}
                      onClick={() => { setSelectedCategory(category); setSidebarStep(2); }}
                    >
                      {category.replace(/^\d+\.\s*/, "")}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full pb-20"
                >
                  {/* Fixed Navigation Header - ALWAYS VISIBLE */}
                  <div className="mb-6 flex justify-center flex-shrink-0">
                    <button
                      onClick={() => {
                        if (selectedTreatment) setSelectedTreatment("");
                        else setSidebarStep(1);
                      }}
                      className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm shadow-sm"
                      title={selectedTreatment ? "Zurück zur Liste" : "Zurück zu Kategorien"}
                    >
                      <FiChevronLeft className="text-3xl" />
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 w-full">
                    <div className="flex flex-col gap-0 w-full">
                      {treatments.map(treatment => (
                        <TreatmentListItem
                          key={treatment.id}
                          treatment={treatment}
                          isSelected={selectedTreatment === treatment.id}
                          isAnySelected={!!selectedTreatment}
                          onClick={() => setSelectedTreatment(treatment.id)}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scroll Hint */}
          <div className="flex justify-center pb-4 pointer-events-none mt-2">
            <motion.div
              animate={{ y: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="drop-shadow-md filter"
            >
              <FiChevronDown className="text-white text-3xl" />
            </motion.div>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col px-8 md:px-24 overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0 relative">
            <AnimatePresence mode="wait" initial={false}>

              {/* PHASE 1: INPUT & EMPTY STATE */}
              {animationPhase === 'input' && (
                <motion.div
                  key="input-phase-wrapper"
                  className="w-full h-full flex flex-col justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {!selectedTreatment ? (
                    /* AI AMBIENT EMPTY STATE */
                    <motion.div
                      key="empty"
                      className="flex flex-col items-center justify-center h-full"
                    >
                      {/* Ambient Orb - Morphing Source */}
                      <motion.div
                        className="relative w-80 h-80 mb-12 flex items-center justify-center rounded-[3.5rem] bg-white/5 backdrop-blur-sm"
                        style={{ borderRadius: '50%' }}
                        transition={{ type: "spring", stiffness: 70, damping: 20 }}
                      >
                        {/* Ring 1 - Weit */}
                        <motion.div
                          className="absolute border border-white/40 rounded-full"
                          animate={{
                            width: ['160px', '320px', '160px'],
                            height: ['160px', '320px', '160px'],
                            opacity: [0.6, 0, 0.6]
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          key="ring-1-fix"
                        />

                        {/* Ring 2 - Mittel */}
                        <motion.div
                          className="absolute border border-white/50 rounded-full"
                          animate={{
                            width: ['140px', '260px', '140px'],
                            height: ['140px', '260px', '140px'],
                            opacity: [0.7, 0.1, 0.7]
                          }}
                          transition={{
                            duration: 4,
                            delay: 0.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          key="ring-2-fix"
                        />

                        {/* Ring 3 - Nah */}
                        <motion.div
                          className="absolute border border-white/60 rounded-full"
                          animate={{
                            width: ['120px', '200px', '120px'],
                            height: ['120px', '200px', '120px'],
                            opacity: [0.8, 0.2, 0.8]
                          }}
                          transition={{
                            duration: 4,
                            delay: 1,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          key="ring-3-fix"
                        >
                          {/* Core - Icon - Breathing Animation */}
                          <motion.div
                            className="relative z-10 w-28 h-28 bg-white rounded-full shadow-2xl flex items-center justify-center border border-gray-100"
                            animate={{
                              scale: [1, 1.15, 1],
                              boxShadow: [
                                "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
                                "0 35px 60px -15px rgba(0, 0, 0, 0.2)",
                                "0 25px 50px -12px rgba(0, 0, 0, 0.1)"
                              ]
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            key="core-fix"
                          >
                            <motion.div
                              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <FiMic className="w-10 h-10 text-[#ff9900]" />
                            </motion.div>
                          </motion.div>
                        </motion.div>
                      </motion.div>

                      {/* Fading Text Messages (Dashboard) */}
                      <div className="h-12 mb-8 w-full flex justify-center items-center overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.h2
                            key={dashboardMessageIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5 }}
                            className="text-2xl md:text-3xl font-normal text-white subpixel-antialiased drop-shadow-md tracking-tight text-center"
                          >
                            {FUN_DASHBOARD_MESSAGES[dashboardMessageIndex]}
                          </motion.h2>
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ) : (
                    /* INPUT AREA - FLOATING PILL DESIGN */
                    <div className="w-full flex flex-col items-center justify-center min-h-full pb-32 relative">

                      {/* TITLE - FADE IN */}
                      <AnimatePresence>
                        {selectedTreatment && (
                          <motion.h1
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 50 }}
                            className="text-4xl md:text-6xl font-black text-white mb-12 text-center drop-shadow-lg tracking-tight"
                          >
                            {templates.find(t => t.id === selectedTreatment)?.title || selectedTreatment.replace("V2_", "").replace(/_/g, " ")}
                          </motion.h1>
                        )}
                      </AnimatePresence>

                      {/* CENTER: BIG PILL (Integrated App Window) - Simplified Animation */}
                      <motion.div
                        key="input-pill"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                          duration: 0.5,
                          ease: [0.2, 0.8, 0.2, 1]
                        }}
                        className="relative w-full max-w-3xl z-20 rounded-[4.5rem] shadow-xl ring-1 ring-black/5 bg-white"
                      >

                        {/* Subtle Depth Layer */}
                        <div className="absolute inset-0 rounded-[4.5rem] bg-gradient-to-b from-white to-gray-50 pointer-events-none opacity-50" />

                        {/* INNER CONTENT */}
                        <motion.div
                          className="relative rounded-[4.5rem] flex flex-col transition-all min-h-[320px] overflow-hidden h-full z-10 bg-white/90 backdrop-blur-md"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        >

                          {/* Header inside Pill: Instructions & Baustein */}
                          <div className="flex justify-center items-center px-8 py-6 relative z-20">
                            {/* INSTRUCTIONS - CENTERED */}
                            <div className="flex flex-wrap gap-2 items-center justify-center bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/50 shadow-sm max-w-2xl mx-auto">
                              {(() => {
                                const tmpl = templates.find(t => t.id === selectedTreatment);
                                const instr = tmpl?.dictationInstructions || tmpl?.DictationInstructions;

                                if (!instr) {
                                  return <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Eingabe</span>;
                                }

                                return instr.split(/,\s*/).map((instruction, i, arr) => (
                                  <span key={i} className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                    {instruction}
                                    {i < arr.length - 1 && <span className="text-gray-300">•</span>}
                                  </span>
                                ));
                              })()}
                            </div>

                            <div className="absolute right-8 top-1/2 -translate-y-1/2">
                              <BausteinSelector
                                currentUserId={selectedUser}
                                selectedVorlage={templates.find(t => t.id === selectedTreatment)}
                                onBausteineChange={setAktiveBausteine}
                                compact={true}
                              />
                            </div>
                          </div>

                          {/* The Input */}
                          <div
                            className="flex-1 relative flex items-center justify-center px-8 py-2 cursor-text"
                            onClick={() => textareaRef.current?.focus()}
                          >
                            <AnimatePresence>
                              {!inputValue && !isInputFocused && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute inset-0 flex items-center justify-center pointer-events-none pb-16"
                                >
                                  <TypeAnimation
                                    sequence={[
                                      'Beginnen Sie zu sprechen...',
                                      2000,
                                      'Oder tippen Sie hier...',
                                      2000,
                                      'Ich höre zu...',
                                      2000
                                    ]}
                                    wrapper="span"
                                    speed={50}
                                    className="text-2xl md:text-4xl font-medium text-gray-400/50 tracking-tight"
                                    repeat={Infinity}
                                    cursor={false}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <textarea
                              ref={textareaRef}
                              value={inputValue}
                              onChange={e => setInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && inputValue.trim() && !isProcessing && !isRecording) {
                                  e.preventDefault();
                                  handleTextSubmit();
                                }
                              }}
                              onFocus={() => setIsInputFocused(true)}
                              onBlur={() => setIsInputFocused(false)}
                              className="w-full bg-transparent border-0 text-2xl md:text-4xl font-medium text-gray-800 placeholder-transparent focus:ring-0 focus:outline-none px-4 text-center resize-none outline-none ring-0 relative z-10 overflow-hidden pb-12"
                              style={{ lineHeight: '1.4', maxHeight: '50vh' }}
                              rows={1}
                              autoFocus
                            />
                          </div>

                          {/* Smart Toggle Bar - Standards */}
                          <AnimatePresence>
                            {activeStandards.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-wrap gap-2 justify-center px-8 pb-6 relative z-20"
                              >
                                {activeStandards.map((std) => (
                                  <button
                                    key={std.id}
                                    onClick={() => {
                                      // Toggle Active State
                                      setActiveStandards(prev => prev.map(s =>
                                        s.id === std.id ? { ...s, active: !s.active } : s
                                      ));
                                    }}
                                    className={`
                                      px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 border
                                      ${std.active
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-gray-50 text-gray-400 border-gray-200 decoration-gray-400 line-through opacity-80 hover:opacity-100 hover:bg-gray-100'
                                      }
                                    `}
                                    title={std.active ? "Standard aktiv (wird dokumentiert)" : "Standard deaktiviert (wird explizit ausgeschlossen)"}
                                  >
                                    {std.active ? (
                                      <FiCheck className="w-3.5 h-3.5" />
                                    ) : (
                                      <FiX className="w-3.5 h-3.5" />
                                    )}
                                    <span>{std.label}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* INTEGRATED SMART CONTROL PILL */}
                          <div className="flex justify-center pb-8 pt-4 px-8 relative z-30 w-full">
                            <motion.div
                              className="bg-white/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-[2.5rem] border border-gray-100/80 overflow-hidden"
                              initial={{ y: 10, opacity: 0 }}
                              animate={{
                                y: 0,
                                opacity: 1,
                                width: isPillExpanded ? '100%' : 'auto',
                                maxWidth: isPillExpanded ? '600px' : 'auto',
                                borderRadius: isPillExpanded ? '2rem' : '3rem'
                              }}
                              transition={{
                                duration: 0.4,
                                ease: "easeOut",
                                delay: 0.1
                              }}
                            >
                              <div className="flex flex-col">
                                {/* TOP ROW: STANDARD CONTROLS */}
                                <div className="flex items-center gap-2 p-2">
                                  {/* Settings Toggle (Left) */}
                                  <button
                                    onClick={() => setIsPillExpanded(!isPillExpanded)}
                                    className={`h-11 w-11 flex items-center justify-center rounded-full transition-all ${isPillExpanded ? 'bg-gray-200 text-gray-900' : 'bg-gray-100/50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                                    title="Erweiterte Einstellungen"
                                  >
                                    <FiSliders className="w-5 h-5" />
                                  </button>

                                  {/* LLM Switcher (Condensed) */}
                                  <div className="hidden md:flex items-center bg-gray-100/80 rounded-full p-1 h-11">
                                    <button
                                      onClick={() => setLlmProvider('gpt')}
                                      className={`px-3 h-full text-xs font-bold tracking-wide rounded-full transition-all flex items-center ${llmProvider === 'gpt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                      GPT
                                    </button>
                                    <button
                                      onClick={() => canUseGemini && setLlmProvider('gemini')}
                                      className={`px-3 h-full text-xs font-bold tracking-wide rounded-full transition-all flex items-center ${llmProvider === 'gemini' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                      Gemini
                                    </button>
                                  </div>

                                  {/* Insurance Switcher */}
                                  <div className="flex items-center bg-gray-100/80 rounded-full p-1 h-11">
                                    <button onClick={() => setInsuranceType('GKV')} className={`px-3 h-full text-xs font-bold rounded-full transition-all ${insuranceType === 'GKV' ? 'bg-white text-[#ff9900] shadow-sm' : 'text-gray-500'}`}>GKV</button>
                                    <button onClick={() => setInsuranceType('PKV')} className={`px-3 h-full text-xs font-bold rounded-full transition-all ${insuranceType === 'PKV' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>PKV</button>
                                  </div>

                                  <div className="w-px h-5 bg-gray-200 mx-1"></div>

                                  {/* Main Actions */}
                                  <button
                                    onClick={handleRecordingToggle}
                                    className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording
                                      ? 'bg-red-500 text-white scale-110 ring-4 ring-red-200 animate-pulse'
                                      : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 shadow-red-200'
                                      }`}
                                    title={isRecording ? 'Aufnahme stoppen' : 'Diktat starten'}
                                  >
                                    <FiMic className="w-5 h-5" />
                                  </button>

                                  <button
                                    onClick={handleTextSubmit}
                                    disabled={!inputValue.trim() || isProcessing}
                                    className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-md ${inputValue.trim() && !isProcessing
                                      ? 'bg-[#ff9900] text-white hover:bg-orange-600 hover:scale-105'
                                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                      }`}
                                  >
                                    <FiSend className="w-5 h-5 ml-0.5" />
                                  </button>
                                </div>

                                {/* EXPANDED SETTINGS ROW */}
                                <AnimatePresence>
                                  {isPillExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden border-t border-gray-200/50 bg-gray-50/30"
                                    >
                                      <div className="p-5 space-y-5">
                                        {/* Text Length Control */}
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            <span>Textlänge</span>
                                            <span className="text-gray-800">{activeTextLength === 'short' ? 'Kurz' : activeTextLength === 'detailed' ? 'Detailliert' : 'Standard'}</span>
                                          </div>
                                          <div className="flex bg-white rounded-xl p-1 shadow-sm ring-1 ring-gray-200">
                                            {['ultra-short', 'short', 'standard', 'detailed'].map((len) => (
                                              <button
                                                key={len}
                                                onClick={() => setActiveTextLength(len)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center gap-1 ${activeTextLength === len
                                                  ? 'bg-gray-100 text-gray-900 shadow-inner font-bold'
                                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                  }`}
                                              >
                                                {len === 'ultra-short' && <FiZap className="w-4 h-4" />}
                                                {len === 'short' && <FiAlignJustify className="w-4 h-4 rotate-90" />}
                                                {len === 'standard' && <FiAlignLeft className="w-4 h-4" />}
                                                {len === 'detailed' && <FiFileText className="w-4 h-4" />}
                                                <span>{
                                                  len === 'ultra-short' ? 'Ultra' :
                                                    len === 'short' ? 'Kurz' :
                                                      len === 'standard' ? 'Normal' : 'Lang'
                                                }</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Forensic Level Control */}
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            <span>Rechtssicherheit</span>
                                            <span className="text-gray-800">
                                              {forensicLevel === 'minimal' ? 'Basis' : forensicLevel === 'max' ? 'Maximal' : 'Standard'}
                                            </span>
                                          </div>
                                          <div className="flex bg-white rounded-xl p-1 shadow-sm ring-1 ring-gray-200">
                                            {['minimal', 'standard', 'max'].map((level) => (
                                              <button
                                                key={level}
                                                onClick={() => setForensicLevel(level)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center gap-1 ${forensicLevel === level
                                                  ? 'bg-gray-100 text-gray-900 shadow-inner font-bold'
                                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                  }`}
                                              >
                                                {level === 'minimal' && <FiShield className="w-4 h-4" />}
                                                {level === 'standard' && <FiCheck className="w-4 h-4" />}
                                                {level === 'max' && <FiLock className="w-4 h-4" />}
                                                <span>{
                                                  level === 'minimal' ? 'Basis' :
                                                    level === 'standard' ? 'Normal' : 'Max'
                                                }</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Material Input */}
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            <span>Material</span>
                                            <button onClick={() => setManualMaterial("")} className="text-[#ff9900] hover:underline">Reset</button>
                                          </div>
                                          <div className="relative">
                                            <FiBox className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                              type="text"
                                              value={manualMaterial}
                                              onChange={(e) => setManualMaterial(e.target.value)}
                                              placeholder="Kein Material definiert (Standard nutzen)"
                                              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-[#ff9900]/20 focus:border-[#ff9900] transition-all text-sm font-medium text-gray-800 placeholder-gray-400 outline-none shadow-sm"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          </div>

                          {/* Material Drawer (Floating inside) */}
                          <AnimatePresence>
                            {showMaterialField && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden bg-gray-50/50 border-t border-gray-100/50"
                              >
                                <div className="p-4 text-center">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Aktives Material</p>
                                  <div className="text-sm font-medium text-gray-800 leading-snug">
                                    {templates.find(t => t.id === selectedTreatment)?.Material || "Kein Material definiert"}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              )}

              {animationPhase === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center py-24 w-full h-full absolute inset-0 z-50"
                >
                  {/* ORB CONTAINER */}
                  <div className="relative mb-12 flex items-center justify-center" style={{ width: '300px', height: '300px' }}>
                    {/* Ring 1 - Fern */}
                    <motion.div
                      className="absolute border border-white/30 rounded-full"
                      animate={{
                        width: ['200px', '350px', '200px'],
                        height: ['200px', '350px', '200px'],
                        opacity: [0.8, 0, 0.8]
                      }}
                      transition={{
                        duration: 3,
                        delay: 0,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      key="proc-ring-1"
                    />

                    {/* Ring 2 - Mittel */}
                    <motion.div
                      className="absolute border border-white/50 rounded-full"
                      animate={{
                        width: ['160px', '280px', '160px'],
                        height: ['160px', '280px', '160px'],
                        opacity: [0.8, 0.1, 0.8]
                      }}
                      transition={{
                        duration: 3,
                        delay: 0.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      key="proc-ring-2"
                    />

                    {/* Core - Icon - Breathing Animation */}
                    <motion.div
                      className="relative z-10 w-28 h-28 bg-white rounded-full shadow-2xl flex items-center justify-center border border-gray-100"
                      animate={{
                        scale: [1, 1.08, 1],
                        boxShadow: [
                          "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
                          "0 35px 60px -15px rgba(0, 0, 0, 0.2)",
                          "0 25px 50px -12px rgba(0, 0, 0, 0.1)"
                        ]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {/* Rotierendes CPU Icon */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      >
                        <FiCpu className="w-10 h-10 text-[#ff9900]" />
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* TEXT MESSAGES */}
                  <div className="h-12 flex items-center justify-center overflow-hidden w-full">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={processingMessageIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="text-2xl md:text-3xl font-light text-white drop-shadow-md text-center max-w-2xl px-4 tracking-tight"
                      >
                        {FUN_PROCESSING_MESSAGES[processingMessageIndex]}
                      </motion.div>
                    </AnimatePresence>
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
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-[#22223b] flex items-center gap-2">
                        <FiCircle className="text-blue-600" />
                        Behandlungsdokumentation
                      </h3>
                      <button
                        onClick={handleCopy}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${copied
                          ? "bg-green-100 text-green-700 ring-1 ring-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
                          }`}
                      >
                        {copied ? <FiCheck /> : <FiCopy />}
                        {copied ? "Kopiert" : "Kopieren"}
                      </button>
                    </div>
                    <div className="text-lg text-gray-800 max-h-[70vh] overflow-y-auto pr-2">
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