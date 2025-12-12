import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { toast } from 'sonner';
import {
  FiUsers,
  FiFileText,
  FiChevronRight,
  FiPlus,
  FiTrash2,
  FiX,
  FiSettings,
  FiCpu,
  FiSliders,
  FiInfo,
  FiCheck,
  FiZap,
  FiRefreshCw,
  FiCode,
  FiLayers,
  FiPlay,
  FiLayout,
  FiColumns,
  FiSidebar,
  FiShield,
  FiDollarSign,
  FiActivity,
  FiEdit3
} from "react-icons/fi";
import BrandLogo from "./components/BrandLogo";
import { analyzeMaterialsWithGPT4o } from './services/MaterialAnalysisService';
import { runLLMProcessing } from './services/LLMService';
import { UNIVERSAL_PROMPTS } from './utils/universalPrompts';

// Hilfsfunktion für Text-Rendering (Preview)
function renderPreviewText(text) {
  if (!text) return <div className="text-gray-400 italic text-center mt-10">Ergebnis erscheint hier...</div>;

  // Clean up XML tags and format
  let cleanText = text
    .replace(/<abrechnung>/g, "LEISTUNGEN & ABRECHNUNG:\n")
    .replace(/<\/abrechnung>/g, "\n")
    .replace(/<behandlung>/g, "\nDOKUMENTATION:\n")
    .replace(/<\/behandlung>/g, "")
    .replace(/<[^>]*>/g, ""); // Remove any other tags

  const lines = cleanText.split(/\n/);
  return (
    <div className="space-y-1 text-gray-800 font-medium text-sm leading-relaxed select-text font-mono">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.match(/^-{3,}$/)) return <hr key={idx} className="my-4 border-t-2 border-gray-200" />;

        // Headers (Abrechnung / Doku)
        if (trimmed === "LEISTUNGEN & ABRECHNUNG:" || trimmed === "DOKUMENTATION:") {
          return <div key={idx} className="font-black text-[#ff9900] text-xs uppercase tracking-widest mt-6 mb-2 border-b border-gray-100 pb-1">{trimmed}</div>;
        }

        if (trimmed.match(/^\d+\)/) || (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && !trimmed.includes(":"))) {
          return <div key={idx} className="font-bold text-[#22223b] mt-3 mb-1">{line}</div>;
        }
        if (!trimmed) return <div key={idx} className="h-2"></div>;
        if (trimmed.startsWith('•') || trimmed.startsWith('- ')) return <div key={idx} className="pl-4">{line}</div>;
        return <div key={idx}>{line}</div>;
      })}
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState("templates"); // "templates" | "user"

  // Benutzerverwaltung States
  const [benutzer, setBenutzer] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRolle, setEditRolle] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState("#94a3b8");

  // Vorlagenverwaltung States
  const [vorlagen, setVorlagen] = useState([]);

  // Modal & Edit States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editVorlage, setEditVorlage] = useState(null);
  const [activeTab, setActiveTab] = useState("simulator"); // "simulator", "prompt", "settings"

  // Form Fields
  const [editTitel, setEditTitel] = useState("");
  const [editKategorie, setEditKategorie] = useState("");
  const [editPrompt, setEditPrompt] = useState(""); // V1 Prompt (Legacy)
  const [editGPTPrompt, setEditGPTPrompt] = useState(""); // System Prompt (Advanced)
  const [editCustomBlueprint, setEditCustomBlueprint] = useState(""); // NEW: Custom Blueprint
  const [editMaterial, setEditMaterial] = useState("");
  const [editDictationInstructions, setEditDictationInstructions] = useState("");

  // AI Settings State
  const [editAiSettings, setEditAiSettings] = useState({
    textLength: 'standard',
    forensicMode: 'standard',
    revenueBooster: false,
    blueprint: 'modern' // 'classic', 'modern', 'forensic'
  });

  // Simulator States
  const [simInput, setSimInput] = useState("");
  const [simOutput, setSimOutput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  // Helper States
  const [isAnalyzingMaterial, setIsAnalyzingMaterial] = useState(false);

  const navigate = useNavigate();

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userSnap = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
        setBenutzer(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const templateSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
        setVorlagen(templateSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        toast.error("Daten konnten nicht geladen werden.");
      }
    };
    fetchData();
  }, []);

  // --- User Actions ---
  const handleSaveUser = async () => {
    if (!editName.trim()) return;
    const id = editUser?.id || crypto.randomUUID();
    await setDoc(doc(db, "Praxen", "1", "Benutzer", id), {
      name: editName,
      rolle: editRolle,
      avatarColor: editAvatarColor,
    });
    setEditUser(null);
    const res = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
    setBenutzer(res.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    toast.success("Benutzer gespeichert");
  };

  const deleteUser = async () => {
    if (!editUser?.id) return;
    await deleteDoc(doc(db, "Praxen", "1", "Benutzer", editUser.id));
    setEditUser(null);
    const res = await getDocs(collection(db, "Praxen", "1", "Benutzer"));
    setBenutzer(res.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    toast.success("Benutzer gelöscht");
  };

  // --- Template Actions ---
  const openTemplateModal = (template = null) => {
    if (template) {
      // Edit existing
      setEditVorlage(template);
      setEditTitel(template.title || template.id.replace("V2_", "").replace(/_/g, " "));
      setEditKategorie(template.Kategorie || "");
      setEditPrompt(template.Prompt || "");
      setEditGPTPrompt(template.GPTPrompt || template.gptPrompt || "");
      setEditCustomBlueprint(template.customBlueprint || ""); // Load custom blueprint
      setEditMaterial(template.Material || "");
      setEditDictationInstructions(template.dictationInstructions || "");

      // Settings Migration & Load
      const loadedSettings = template.aiSettings || {};
      let forensicLevel = 'standard';
      if (loadedSettings.forensicMode === true) forensicLevel = 'max';
      if (loadedSettings.forensicMode === 'minimal') forensicLevel = 'minimal';
      if (loadedSettings.forensicMode === 'max') forensicLevel = 'max';

      setEditAiSettings({
        textLength: loadedSettings.textLength || (loadedSettings.telegramStyle ? 'short' : 'standard'),
        forensicMode: forensicLevel,
        revenueBooster: loadedSettings.revenueBooster || false,
        blueprint: loadedSettings.blueprint || 'modern'
      });

      // Pre-fill Simulator Input with saved testInput or dummy text
      setSimInput(template.testInput || "Patient klagt über Schmerzen an 36. Karies profunda mesial. ILA, Vit+, Exkavation cp. Füllung mit Tetric. Aufklärung erfolgt.");
      setSimOutput("");

    } else {
      // Create new
      setEditVorlage({
        id: '',
        Kategorie: 'Neue Kategorie',
        users: ['all'],
        systemVersion: 'v2',
        practiceDefaults: {}
      });
      setEditTitel("");
      setEditKategorie("");
      setEditPrompt("");
      setEditGPTPrompt("");
      setEditCustomBlueprint("");
      setEditMaterial("");
      setEditDictationInstructions("");
      setEditAiSettings({ textLength: 'standard', forensicMode: 'standard', revenueBooster: false, blueprint: 'modern' });
      setSimInput("Test-Diktat hier eingeben...");
      setSimOutput("");
    }
    setActiveTab("simulator");
    setIsModalOpen(true);
  };

  const handleSaveVorlage = async () => {
    if (!editTitel.trim()) {
      toast.error("Bitte einen Titel eingeben");
      return;
    }

    // ID Generierung falls neu
    const vorlageId = editVorlage.id || `V2_${editTitel.trim().replace(/\s+/g, "_")}`;

    const vorlageData = {
      id: vorlageId,
      title: editTitel,
      Kategorie: editKategorie,
      Prompt: editPrompt,
      GPTPrompt: editGPTPrompt,
      customBlueprint: editCustomBlueprint, // Save custom blueprint
      Material: editMaterial,
      dictationInstructions: editDictationInstructions,
      users: editVorlage.users || ["all"],
      systemVersion: "v2",
      practiceDefaults: editVorlage.practiceDefaults || {},
      aiSettings: editAiSettings
    };

    try {
      await setDoc(doc(db, "Praxen", "1", "Vorlagen", vorlageId), vorlageData, { merge: true });

      // Refresh local state
      const snapshot = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
      setVorlagen(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

      toast.success("Vorlage gespeichert!");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Speichern der Vorlage");
    }
  };

  const deleteVorlage = async () => {
    if (!editVorlage?.id) return;
    if (!window.confirm("Möchten Sie diese Vorlage wirklich löschen?")) return;

    try {
      await deleteDoc(doc(db, "Praxen", "1", "Vorlagen", editVorlage.id));
      setEditVorlage(null);
      setIsModalOpen(false);

      const res = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
      setVorlagen(res.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      toast.success("Vorlage gelöscht");
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  const handleSimulation = async () => {
    if (!simInput.trim()) {
      toast.error("Bitte erst einen Test-Text eingeben.");
      return;
    }
    setIsSimulating(true);
    try {
      // Standards parsen
      const standardsStr = editVorlage.practiceDefaults?.standardLeistungen || "";
      const activeStandards = standardsStr.split(',').map(s => s.trim()).filter(Boolean);

      // Wir simulieren eine "temporäre" Vorlage mit den aktuellen Settings aus dem Modal
      const tempTemplate = {
        ...editVorlage,
        id: editVorlage.id || "TEMP_SIMULATION",
        title: editTitel,
        Kategorie: editKategorie,
        GPTPrompt: editGPTPrompt, // Nutzt den aktuellen System-Prompt (falls editiert)
        customBlueprint: editCustomBlueprint, // Nutzt den custom blueprint
        Material: editMaterial,
        practiceDefaults: { standardLeistungen: standardsStr },
        aiSettings: editAiSettings
      };

      const result = await runLLMProcessing({
        template: tempTemplate,
        dictatedText: simInput,
        insuranceType: 'GKV', // Standard für Sim
        textLength: editAiSettings.textLength,
        forensicLevel: editAiSettings.forensicMode,
        manualMaterial: editMaterial,
        activeStandards: activeStandards.map(l => ({ label: l, active: true })), // Mock active objects
        inactiveStandards: [],
        globalAiSettings: {} // Global settings werden hier ignoriert/mocked
      });

      setSimOutput(result);
    } catch (error) {
      console.error("Simulations-Fehler:", error);
      toast.error("Simulation fehlgeschlagen: " + error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // --- AUTO-SETUP: PROTHETIK ---
  const createProstheticTemplates = async () => {
    if (!window.confirm("Sollen die 3 Standard-Prothetik-Vorlagen (Teleskop, Klammer, Total) automatisch angelegt werden?")) return;

    const templates = [
      {
        id: "V2_Teleskopprothese",
        title: "Teleskopprothese",
        Kategorie: "05. ZE Mobil",
        Prompt: "",
        GPTPrompt: UNIVERSAL_PROMPTS.PROTHETIK_TELESKOP,
        Material: "Anästhesie: Ultracain D-S\nAbformung: Impregum / Permadyne\nZementierung: Ketac Cem / Panavia\nProvisorium: Luxatemp",
        dictationInstructions: "Phase nennen! (z.B. 'heute Präp' oder 'heute Einprobe')",
        users: ["all"],
        systemVersion: "v2",
        practiceDefaults: {},
        aiSettings: { textLength: 'standard', forensicMode: 'standard', revenueBooster: false, blueprint: 'modern' },
        testInput: "Teleskopprothese OK, heute Einprobe der Primärteile an 13, 23. Randschluss gut. Farbe A3 bestimmt."
      },
      {
        id: "V2_Klammerprothese",
        title: "Klammerprothese",
        Kategorie: "05. ZE Mobil",
        Prompt: "",
        GPTPrompt: UNIVERSAL_PROMPTS.PROTHETIK_KLAMMER,
        Material: "Abformung: Alginat / Impregum\nBissnahme: Wachs / Registrat",
        dictationInstructions: "Phase nennen! (z.B. 'heute Gerüsteinprobe')",
        users: ["all"],
        systemVersion: "v2",
        practiceDefaults: {},
        aiSettings: { textLength: 'standard', forensicMode: 'standard', revenueBooster: false, blueprint: 'modern' },
        testInput: "Klammerprothese UK, heute Gerüsteinprobe. Klammer an 34, 44 passt. Wachsaufstellung ok."
      },
      {
        id: "V2_Totalprothese",
        title: "Totalprothese",
        Kategorie: "05. ZE Mobil",
        Prompt: "",
        GPTPrompt: UNIVERSAL_PROMPTS.PROTHETIK_TOTAL,
        Material: "Abformung 1: Alginat\nAbformung 2: Permadyne (Funktionsrand)\nBissnahme: Stützstift / Wachswall",
        dictationInstructions: "Phase nennen! (z.B. 'heute Wachseinprobe')",
        users: ["all"],
        systemVersion: "v2",
        practiceDefaults: {},
        aiSettings: { textLength: 'standard', forensicMode: 'standard', revenueBooster: false, blueprint: 'modern' },
        testInput: "Totalprothese OK/UK, heute Funktionsabformung mit individuellem Löffel. Randgestaltung mit Kerr."
      }
    ];

    try {
      for (const t of templates) {
        await setDoc(doc(db, "Praxen", "1", "Vorlagen", t.id), t, { merge: true });
      }

      // Refresh
      const snapshot = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
      setVorlagen(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

      toast.success("3 Prothetik-Vorlagen erfolgreich erstellt!");
    } catch (error) {
      console.error("Fehler beim Erstellen:", error);
      toast.error("Fehler: " + error.message);
    }
  };

  // --- SMART TEST INPUTS ---
  const getSmartTestInput = (title) => {
    const t = title.toLowerCase();
    if (t.includes("teleskop")) return "Teleskopprothese OK, heute Einprobe der Primärteile an 13, 23. Randschluss gut. Farbe A3 bestimmt.";
    if (t.includes("klammer")) return "Klammerprothese UK, heute Gerüsteinprobe. Klammer an 34, 44 passt. Wachsaufstellung ok.";
    if (t.includes("total") || t.includes("voll")) return "Totalprothese OK/UK, heute Funktionsabformung mit individuellem Löffel. Randgestaltung mit Kerr.";

    if (t.includes("füllung") || t.includes("kons")) return "36 okklusal, Karies media. Exkavation, cp. Füllung mit Tetric (A3). Poliert, Okklusion geprüft.";
    if (t.includes("endo") || t.includes("wurzel")) return "16 Trepanation, Vitalextirpation. Kanäle (mb, db, p) aufbereitet bis ISO 35. Med: Ledermix. Prov: Cavit.";
    if (t.includes("krone") || t.includes("brücke") || t.includes("präp")) return "Präparation 26 für Vollkeramikkrone. Hohlkehle. Scan erfolgt. Provisorium Luxatemp A3 eingesetzt.";
    if (t.includes("extraktion") || t.includes("chirurgie") || t.includes("x")) return "Extraktion 48. Osteotomie, Wurzel getrennt. Naht (Vicryl). Tupfer. Aufklärung Verhalten n. OP.";
    if (t.includes("pust") || t.includes("par") || t.includes("reinigung")) return "PZR komplett. Schallscaler, Airflow, Politur. OHI: Zahnseide instruiert. Pat. zufrieden.";
    if (t.includes("schien") || t.includes("knirsch")) return "Abdruck für Knirscherschiene OK. Alginat. Bissnahme in ZIK.";
    if (t.includes("befund") || t.includes("01")) return "01 Befund: 18-28, 38-48 vital. PSI Code 1/1/1/1. 36 füllungsbedürftig. HKP besprochen.";

    return "Patient klagt über Beschwerden. Befundaufnahme und Beratung durchgeführt.";
  };

  const updateAllTestInputs = async () => {
    if (!window.confirm("Sollen ALLE Vorlagen mit passenden Test-Szenarien aktualisiert werden?")) return;

    try {
      let count = 0;
      for (const template of vorlagen) {
        // Only update if no testInput exists or if it's the default dummy
        if (!template.testInput || template.testInput.includes("Test-Diktat")) {
          const smartInput = getSmartTestInput(template.title || template.id);
          await setDoc(doc(db, "Praxen", "1", "Vorlagen", template.id), { testInput: smartInput }, { merge: true });
          count++;
        }
      }

      // Refresh
      const snapshot = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
      setVorlagen(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

      toast.success(`${count} Vorlagen mit Test-Szenarien aktualisiert!`);
    } catch (error) {
      console.error("Fehler beim Update:", error);
      toast.error("Fehler: " + error.message);
    }
  };

  // --- Computed Values ---
  const v2Categories = [...new Set(
    vorlagen
      .filter(t => t.systemVersion === "v2")
      .map((t) => t.Kategorie)
      .filter(Boolean)
  )].sort((a, b) => {
    const numA = parseInt(a.match(/^\d+/)?.[0] || "999");
    const numB = parseInt(b.match(/^\d+/)?.[0] || "999");
    return numA - numB;
  });

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Main Content Wrapper - Transparent um Layout-Background zu zeigen */}
      <div className="flex flex-1 overflow-hidden">

        {/* --- Sidebar (Transparent & Floating style like Dashboard) --- */}
        <aside className="w-[380px] flex flex-col justify-start py-16 px-10 overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
          {/* Branding */}
          <BrandLogo className="mb-20" />

          {/* Navigation */}
          <div className="space-y-4">
            <motion.button
              whileHover={{ x: 4, textShadow: '0px 0px 8px rgba(255,255,255,0.5)' }}
              onClick={() => setTab("user")}
              className={`w-full text-left text-2xl font-bold tracking-tight transition-all cursor-pointer select-none ${tab === "user"
                ? "text-white drop-shadow-md"
                : "text-white/70 hover:text-white drop-shadow-sm"
                }`}
            >
              Benutzer
            </motion.button>

            <motion.button
              whileHover={{ x: 4, textShadow: '0px 0px 8px rgba(255,255,255,0.5)' }}
              onClick={() => setTab("templates")}
              className={`w-full text-left text-2xl font-bold tracking-tight transition-all cursor-pointer select-none ${tab === "templates"
                ? "text-white drop-shadow-md"
                : "text-white/70 hover:text-white drop-shadow-sm"
                }`}
            >
              Vorlagen
            </motion.button>
          </div>
        </aside>

        {/* --- Main Area --- */}
        <main className="flex-1 flex flex-col px-12 py-16 overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
          <div className="max-w-6xl mx-auto w-full">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 flex justify-between items-end"
            >
              <div>
                <h1 className="text-4xl font-black text-white drop-shadow-md mb-2 tracking-tight">
                  {tab === "user" ? "Benutzerverwaltung" : "Vorlagenverwaltung"}
                </h1>
                <p className="text-white/80 text-lg font-medium drop-shadow-sm">
                  {tab === "user"
                    ? "Verwalten Sie Benutzerrechte und Zugriffe."
                    : "Bearbeiten und simulieren Sie Ihre Dokumentationsvorlagen."}
                </p>
              </div>

              {/* Action Button */}
              {tab === "templates" && (
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createProstheticTemplates}
                    className="px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 backdrop-blur-md text-blue-100 font-bold rounded-full transition-all shadow-lg ring-1 ring-blue-400/40 flex items-center gap-2"
                  >
                    <FiZap className="w-5 h-5" /> Auto-Setup Prothetik
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={updateAllTestInputs}
                    className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 backdrop-blur-md text-purple-100 font-bold rounded-full transition-all shadow-lg ring-1 ring-purple-400/40 flex items-center gap-2"
                  >
                    <FiActivity className="w-5 h-5" /> Test-Daten Update
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openTemplateModal(null)}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold rounded-full transition-all shadow-lg ring-1 ring-white/40 flex items-center gap-2"
                  >
                    <FiPlus className="w-5 h-5" /> Neue Vorlage
                  </motion.button>
                </div>
              )}
              {tab === "user" && !editUser && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEditUser({ id: '', name: '', rolle: '', avatarColor: '#94a3b8' });
                    setEditName(''); setEditRolle(''); setEditAvatarColor('#94a3b8');
                  }}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold rounded-full transition-all shadow-lg ring-1 ring-white/40 flex items-center gap-2"
                >
                  <FiPlus className="w-5 h-5" /> Neuer Benutzer
                </motion.button>
              )}
            </motion.div>

            {/* Content Switch */}
            {tab === "templates" ? (
              /* --- TEMPLATE LIST VIEW --- */
              <div className="space-y-12 pb-24">
                {v2Categories.map(catName => {
                  const catTemplates = vorlagen.filter(v =>
                    v.systemVersion === "v2" && v.Kategorie === catName
                  );

                  if (catTemplates.length === 0) return null;

                  return (
                    <div key={catName}>
                      <div className="flex items-center gap-3 mb-6">
                        <h3 className="text-2xl font-bold text-white drop-shadow-md">
                          {catName.replace(/^\d+\.\s*/, "")}
                        </h3>
                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/20">
                          {catTemplates.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {catTemplates.map(template => (
                          <motion.div
                            key={template.id}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => openTemplateModal(template)}
                            className="cursor-pointer group relative bg-white/40 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm hover:shadow-xl border border-white/50 hover:bg-white/50 transition-all duration-300 flex flex-col justify-between min-h-[160px]"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="bg-white/40 p-3 rounded-2xl transition-colors shadow-sm">
                                <FiLayout className="w-6 h-6 text-gray-700" />
                              </div>
                              {template.GPTPrompt && (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 bg-blue-100/50 px-2 py-1 rounded-full border border-blue-200/50">
                                  Smart
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="text-lg font-bold text-gray-800 leading-tight mb-1">
                                {template.title || template.id.replace("V2_", "").replace(/_/g, " ")}
                              </h4>
                              <p className="text-xs text-gray-600 font-mono truncate opacity-70">
                                {template.id}
                              </p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-800/10 flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors flex items-center gap-1">
                                <FiEdit3 /> Bearbeiten
                              </span>
                              <FiChevronRight className="text-gray-500 group-hover:text-gray-900 transition-colors" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* --- USER VIEW --- */
              <div className="space-y-6">
                {/* (User View Code Identical to before) */}
                {editUser ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-xl p-8 border border-white/60"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-bold text-gray-800">
                        {editUser.id ? "Benutzer bearbeiten" : "Neuer Benutzer"}
                      </h3>
                      <button onClick={() => setEditUser(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <FiX className="w-6 h-6 text-gray-500" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Name</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200/50 focus:border-[#ff9900] focus:outline-none bg-white/50 focus:bg-white transition-colors"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Dr. Max Mustermann"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Rolle</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200/50 focus:border-[#ff9900] focus:outline-none bg-white/50 focus:bg-white transition-colors"
                          value={editRolle}
                          onChange={e => setEditRolle(e.target.value)}
                          placeholder="Zahnarzt"
                        />
                      </div>
                    </div>

                    <div className="mb-8">
                      <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Avatar Farbe</label>
                      <div className="flex gap-3">
                        {["#94a3b8", "#38bdf8", "#4ade80", "#facc15", "#f87171", "#a78bfa"].map(color => (
                          <button
                            key={color}
                            onClick={() => setEditAvatarColor(color)}
                            className={`w-10 h-10 rounded-full transition-transform ${editAvatarColor === color ? 'ring-4 ring-offset-2 ring-[#ff9900] scale-110' : 'hover:scale-110'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between pt-6 border-t border-gray-200/50">
                      {editUser.id && (
                        <button onClick={deleteUser} className="text-red-500 font-medium flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                          <FiTrash2 /> Löschen
                        </button>
                      )}
                      <div className="flex gap-4 ml-auto">
                        <button onClick={() => setEditUser(null)} className="text-gray-500 font-bold hover:bg-gray-100 px-6 py-3 rounded-full transition-colors">
                          Abbrechen
                        </button>
                        <button onClick={handleSaveUser} className="bg-[#ff9900] text-white font-bold px-8 py-3 rounded-full hover:bg-orange-600 shadow-lg transition-colors">
                          Speichern
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {benutzer.map(b => (
                      <motion.div
                        key={b.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setEditUser(b);
                          setEditName(b.name);
                          setEditRolle(b.rolle);
                          setEditAvatarColor(b.avatarColor || "#94a3b8");
                        }}
                        className="bg-white/40 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-white/50 cursor-pointer hover:shadow-md transition-all flex items-center gap-4 hover:bg-white/50"
                      >
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                          style={{ backgroundColor: b.avatarColor || "#94a3b8" }}
                        >
                          {b.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{b.name}</h4>
                          <p className="text-sm text-gray-600">{b.rolle || "Keine Rolle"}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- MODAL OVERLAY --- */}
      <AnimatePresence>
        {isModalOpen && editVorlage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#f8f9fa] rounded-[2.5rem] shadow-2xl w-full max-w-[90%] xl:max-w-7xl h-[90vh] overflow-hidden flex flex-col border border-white/50"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-8 py-6 bg-white border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {editVorlage.id ? "Vorlage bearbeiten" : "Neue Vorlage"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {editVorlage.title || editVorlage.id || "Unbenannt"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Tabs */}
                  <div className="bg-gray-100 p-1.5 rounded-full flex">
                    {[
                      { id: "simulator", label: "Simulator & Design", icon: FiPlay },
                      { id: "prompt", label: "Experten-Prompt", icon: FiCpu },
                      { id: "settings", label: "Meta-Daten", icon: FiSettings },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeTab === t.id ? "bg-white text-[#ff9900] shadow-sm" : "text-gray-500 hover:text-gray-700"
                          }`}
                      >
                        <t.icon className="w-4 h-4" /> {t.label}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <FiX className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col relative">
                <AnimatePresence mode="wait">

                  {/* TAB: SIMULATOR & DESIGN */}
                  {activeTab === "simulator" && (
                    <motion.div
                      key="simulator"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex overflow-hidden"
                    >
                      {/* LEFT COLUMN: SETTINGS & INPUT */}
                      <div className="w-1/3 bg-gray-50 p-8 overflow-y-auto border-r border-gray-200 flex flex-col gap-8">

                        {/* 1. BLUEPRINT / STRUCTURE */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FiLayout className="text-[#ff9900]" /> Struktur-Blaupause (Gold-Standard)
                          </label>
                          <div className="space-y-3">
                            {[
                              { id: 'modern', label: 'Modern (Empfohlen)', desc: 'Abrechnungs-Check (Liste) + Behandlungsablauf (Kompakt).' },
                              { id: 'classic', label: 'Klassisch (Fließtext)', desc: 'Ein zusammenhängender Textblock, traditionell.' },
                              { id: 'forensic', label: 'Forensik-Fokus', desc: 'Maximale Aufklärung & Risiken + Ablauf.' },
                            ].map(bp => (
                              <div
                                key={bp.id}
                                onClick={() => setEditAiSettings(p => ({ ...p, blueprint: bp.id }))}
                                className={`p-4 rounded-xl cursor-pointer border transition-all ${editAiSettings.blueprint === bp.id
                                  ? 'bg-white border-[#ff9900] shadow-md ring-1 ring-[#ff9900]/20'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                                  }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-bold text-sm ${editAiSettings.blueprint === bp.id ? 'text-[#ff9900]' : 'text-gray-700'}`}>{bp.label}</span>
                                  {editAiSettings.blueprint === bp.id && <FiCheck className="text-[#ff9900]" />}
                                </div>
                                <p className="text-xs text-gray-500 leading-snug">{bp.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 2. AI SETTINGS (FINE TUNING) */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FiSliders className="text-[#ff9900]" /> Fein-Tuning
                          </label>
                          <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-5 shadow-sm">
                            {/* Textlänge */}
                            <div>
                              <span className="text-[10px] font-semibold text-gray-400 uppercase mb-2 block">Textlänge</span>
                              <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['ultra-short', 'short', 'standard', 'detailed'].map(len => (
                                  <button
                                    key={len}
                                    onClick={() => setEditAiSettings(p => ({ ...p, textLength: len }))}
                                    className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${editAiSettings.textLength === len ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                  >
                                    {len === 'ultra-short' ? 'Ultra' : len === 'short' ? 'Kurz' : len === 'standard' ? 'Normal' : 'Lang'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Forensik */}
                            <div>
                              <span className="text-[10px] font-semibold text-gray-400 uppercase mb-2 block">Forensik-Level</span>
                              <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['minimal', 'standard', 'max'].map(lvl => (
                                  <button
                                    key={lvl}
                                    onClick={() => setEditAiSettings(p => ({ ...p, forensicMode: lvl }))}
                                    className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${editAiSettings.forensicMode === lvl ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                  >
                                    {lvl === 'minimal' ? 'Basis' : lvl === 'standard' ? 'Std' : 'Max'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Booster */}
                            <div>
                              <span className="text-[10px] font-semibold text-gray-400 uppercase mb-2 block">Umsatz-Booster</span>
                              <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['off', 'smart', 'max'].map(bst => (
                                  <button
                                    key={bst}
                                    onClick={() => setEditAiSettings(p => ({ ...p, revenueBooster: bst === 'off' ? false : bst }))}
                                    className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${(bst === 'off' && !editAiSettings.revenueBooster) || (editAiSettings.revenueBooster === bst) || (bst === 'smart' && editAiSettings.revenueBooster === true)
                                      ? 'bg-white text-green-600 shadow-sm'
                                      : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                  >
                                    {bst === 'off' ? 'Aus' : bst === 'smart' ? 'Smart' : 'Max'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 3. TEST INPUT */}
                        <div className="flex-1 flex flex-col">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FiSidebar className="text-[#ff9900]" /> Test-Szenario (Input)
                          </label>
                          <textarea
                            className="flex-1 w-full p-4 rounded-xl border-2 border-gray-200 focus:border-[#ff9900] focus:outline-none resize-none text-sm leading-relaxed shadow-inner"
                            placeholder="Sprechen oder tippen Sie hier ein Test-Diktat..."
                            value={simInput}
                            onChange={e => setSimInput(e.target.value)}
                          />
                        </div>

                      </div>

                      {/* RIGHT COLUMN: PREVIEW */}
                      <div className="flex-1 bg-[#f0f2f5] p-8 overflow-y-auto flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <FiColumns className="text-[#ff9900]" /> Live-Ergebnis
                          </label>
                          <button
                            onClick={handleSimulation}
                            disabled={isSimulating}
                            className={`px-6 py-2 rounded-full font-bold text-white text-sm shadow-lg transition-all flex items-center gap-2 ${isSimulating ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#ff9900] hover:bg-orange-600 hover:scale-105'
                              }`}
                          >
                            {isSimulating ? <FiRefreshCw className="animate-spin" /> : <FiPlay />}
                            {isSimulating ? "Generiere..." : "Simulation starten"}
                          </button>
                        </div>

                        {/* PREVIEW CARD */}
                        <div className="flex-1 bg-white rounded-[2rem] shadow-xl p-8 border border-white overflow-y-auto relative">
                          {isSimulating && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center flex-col gap-4">
                              <div className="w-12 h-12 border-4 border-[#ff9900] border-t-transparent rounded-full animate-spin"></div>
                              <p className="text-sm font-bold text-gray-500 animate-pulse">KI generiert Vorschau...</p>
                            </div>
                          )}

                          <div className="prose prose-sm max-w-none">
                            {renderPreviewText(simOutput)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: PROMPT (EXPERTEN) */}
                  {activeTab === "prompt" && (
                    <motion.div key="prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-8 overflow-y-auto space-y-8">

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Diktathilfen */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                          <label className="font-bold text-gray-700 uppercase tracking-wider text-sm mb-3 block flex items-center gap-2"><FiInfo /> Diktat-Hinweise (Dashboard)</label>
                          <input
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-[#ff9900] focus:outline-none transition-colors"
                            value={editDictationInstructions}
                            onChange={e => setEditDictationInstructions(e.target.value)}
                            placeholder="z.B. Zahn, Flächen, Material..."
                          />
                          <p className="text-xs text-gray-400 mt-2">Erscheint im Dashboard als Hilfestellung.</p>
                        </div>

                        {/* Praxis-Standards */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                          <label className="font-bold text-gray-700 uppercase tracking-wider text-sm mb-3 block flex items-center gap-2"><FiLayers /> Praxis-Standards (Auto-Doku)</label>
                          <textarea
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-[#ff9900] focus:outline-none transition-colors resize-none"
                            rows={3}
                            value={editVorlage.practiceDefaults?.standardLeistungen || ""}
                            onChange={e => setEditVorlage(prev => ({ ...prev, practiceDefaults: { ...prev.practiceDefaults, standardLeistungen: e.target.value } }))}
                            placeholder="z.B. Kofferdam, Längenmessung..."
                          />
                          <p className="text-xs text-gray-400 mt-2">Wird automatisch dokumentiert, wenn nicht widersprochen.</p>
                        </div>
                      </div>

                      {/* Custom Blueprint (NEW) */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <label className="font-bold text-gray-700 uppercase tracking-wider text-sm mb-3 block flex items-center gap-2"><FiLayout /> Struktur-Blaupause (Custom)</label>
                        <p className="text-xs text-gray-500 mb-4">Definieren Sie hier die exakte Struktur des Outputs. Wenn leer, wird das Standard-Layout verwendet.</p>
                        <textarea
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-[#ff9900] focus:outline-none transition-colors resize-none font-mono text-sm"
                          rows={6}
                          value={editCustomBlueprint}
                          onChange={e => setEditCustomBlueprint(e.target.value)}
                          placeholder={`Beispiel:
1) ÜBERSCHRIFT
[Hier Abrechnung einfügen]

2) TEXT
[Hier Fließtext einfügen]`}
                        />
                      </div>

                      {/* System Prompt */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <label className="font-bold text-gray-700 uppercase tracking-wider text-sm mb-3 block flex items-center gap-2"><FiCode /> System-Prompt (Advanced)</label>
                        <p className="text-xs text-gray-500 mb-4">Hier können Sie die tiefste Logik der KI steuern. Nur für Experten.</p>
                        <textarea
                          className="w-full px-4 py-3 rounded-xl bg-[#1e1e2e] text-gray-300 border-2 border-transparent focus:border-[#ff9900] focus:outline-none transition-colors resize-none font-mono text-sm shadow-inner"
                          rows={16}
                          value={editGPTPrompt}
                          onChange={e => setEditGPTPrompt(e.target.value)}
                          placeholder="Prompt Logik..."
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: SETTINGS (META) */}
                  {activeTab === "settings" && (
                    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-8 overflow-y-auto space-y-8">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="font-bold text-gray-700 uppercase tracking-wider text-sm mb-2 block">Titel</label>
                            <input
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-[#ff9900] focus:outline-none"
                              value={editTitel}
                              onChange={e => setEditTitel(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="font-bold text-gray-700 uppercase tracking-wider text-sm mb-2 block">Kategorie</label>
                            <input
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-[#ff9900] focus:outline-none"
                              value={editKategorie}
                              onChange={e => setEditKategorie(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between mb-3">
                          <label className="font-bold text-gray-700 uppercase tracking-wider text-sm block">Material-Konfiguration</label>
                          <button
                            onClick={async () => {
                              if (!editMaterial.trim()) return;
                              setIsAnalyzingMaterial(true);
                              try {
                                const res = await analyzeMaterialsWithGPT4o(editMaterial);
                                setEditMaterial(res.formatted);
                                toast.success("Analysiert!");
                              } catch (e) { toast.error("Fehler"); }
                              finally { setIsAnalyzingMaterial(false); }
                            }}
                            disabled={isAnalyzingMaterial || !editMaterial.trim()}
                            className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-purple-100 transition-colors"
                          >
                            {isAnalyzingMaterial ? <FiRefreshCw className="animate-spin" /> : <FiZap />} Smart-Analyse
                          </button>
                        </div>
                        <textarea
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:bg-white focus:border-[#ff9900] focus:outline-none resize-none"
                          rows={4}
                          value={editMaterial}
                          onChange={e => setEditMaterial(e.target.value)}
                          placeholder="Materialien..."
                        />
                        <p className="text-xs text-gray-400 mt-2">Tipp: "Smart-Analyse" nutzen für automatische Kategorisierung.</p>
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <label className="font-bold text-gray-700 uppercase tracking-wider text-sm mb-3 block">Verfügbarkeit</label>
                        <div className="flex flex-wrap gap-3">
                          <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                            <input type="checkbox" className="rounded text-[#ff9900] focus:ring-[#ff9900]" checked={editVorlage.users?.includes("all")} onChange={e => e.target.checked ? setEditVorlage(p => ({ ...p, users: ["all"] })) : setEditVorlage(p => ({ ...p, users: [] }))} />
                            <span className="text-sm font-bold text-gray-700">Alle Benutzer</span>
                          </label>
                          {!editVorlage.users?.includes("all") && benutzer.map(u => (
                            <label key={u.id} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                              <input type="checkbox" className="rounded text-[#ff9900] focus:ring-[#ff9900]" checked={editVorlage.users?.includes(u.id)}
                                onChange={e => setEditVorlage(p => ({ ...p, users: e.target.checked ? [...(p.users || []), u.id] : (p.users || []).filter(id => id !== u.id) }))} />
                              <span className="text-sm font-bold text-gray-700">{u.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 bg-white border-t border-gray-100 flex justify-between items-center rounded-b-[2.5rem]">
                {editVorlage.id && (
                  <button onClick={deleteVorlage} className="text-red-500 font-bold flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                    <FiTrash2 /> Löschen
                  </button>
                )}
                <div className="flex gap-4 ml-auto">
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 font-bold px-6 py-3 hover:bg-gray-50 rounded-full transition-colors">
                    Abbrechen
                  </button>
                  <button onClick={handleSaveVorlage} className="bg-[#ff9900] text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2">
                    <FiCheck /> Speichern
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
