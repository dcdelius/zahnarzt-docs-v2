import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCpu, FiCheck, FiSave, FiArrowLeft, FiArrowRight, FiGrid, FiLayers, FiBox, FiActivity, FiDisc, FiX, FiMoreHorizontal, FiToggleLeft, FiFileText, FiAlignLeft, FiMonitor, FiZap, FiLoader } from 'react-icons/fi';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { buildGPTPrompts } from './utils/buildGPTPrompts';
import { runLLMProcessing } from './utils/llmService';

// --- CONFIGURATION ---
const BUILDER_CONFIG = {
    "Zahnersatz": {
        icon: <FiLayers />,
        description: "Kronen, Brücken, Prothetik",
        subCategories: {
            "Kronen & Brücken": {
                sections: [
                    {
                        title: "1. Anästhesie",
                        blocks: [
                            { id: "anest_ober", label: "Oberflächenanästhesie", text: "Oberflächenanästhesie (Xylocain Spray) zur Vorbereitung." },
                            { id: "anest_infilt", label: "Infiltrationsanästhesie", text: "Infiltrationsanästhesie mit Ultracain D-S (Articain/Epinephrin)." },
                            { id: "anest_leit", label: "Leitungsanästhesie", text: "Leitungsanästhesie des N. alveolaris inferior (Ultracain D-S)." },
                            { id: "anest_intralig", label: "Intraligamentär", text: "Intraligamentäre Anästhesie (Citoject) zur Ergänzung." }
                        ]
                    },
                    {
                        title: "2. Vorbereitung & Präparation",
                        blocks: [
                            { id: "sens_test", label: "Sensibilitätsprobe", text: "Sensibilitätsprobe an Zahn {Zahn} positiv (Kältetest)." },
                            { id: "antagonisten", label: "Antagonisten-Check", text: "Prüfung der Okklusion und Artikulation vor Präparation." },
                            { id: "praep_hohl", label: "Hohlkehlpräparation", text: "Zirkuläre Hohlkehlpräparation an Zahn {Zahn} zur Aufnahme einer VMK/Zirkonkrone." },
                            { id: "praep_stufen", label: "Stufenpräparation", text: "Stufenpräparation an Zahn {Zahn} mit abgerundeter Innenkante für Vollkeramik." },
                            { id: "praep_defekt", label: "Aufbaufüllung", text: "Entfernung alter Füllungen/Karies an Zahn {Zahn}, adhäsive Aufbaufüllung (Core-Build-Up)." }
                        ]
                    },
                    {
                        title: "3. Gingivamanagement (Retraktion)",
                        blocks: [
                            { id: "faden_einfach", label: "Retraktionsfaden (Single)", text: "Legen eines Retraktionsfadens (Größe 00) in den Sulkus von Zahn {Zahn}." },
                            { id: "faden_doppel", label: "Doppelfadentechnik", text: "Doppelfadentechnik (Größe 000 + 0) an Zahn {Zahn} zur maximalen Freilegung." },
                            { id: "paste_retra", label: "Retraktionspaste", text: "Applikation von Retraktionspaste (z.B. Expasyl/Traxodent) zur Blutstillung und Sulkuserweiterung." },
                            { id: "elektrotom", label: "Elektrotomie", text: "Chirurgische Darstellung der Präparationsgrenze mittels Elektrotom." }
                        ]
                    },
                    {
                        title: "4. Abformung (Old School vs. New School)",
                        blocks: [
                            { id: "scan_ios", label: "📷 Intraoralscan (Digital)", text: "Digitaler Intraoralscan (OK, UK, Biss) durchgeführt. Kontrolle der Präparationsgrenzen am Monitor: Ränder exakt dargestellt." },
                            { id: "abf_silikon", label: "🏺 Silikonabformung", text: "Präzisionsabformung mit A-Silikon (Doppelmischtechnik, Korrektur)." },
                            { id: "abf_polyether", label: "🏺 Polyether (Impregum)", text: "Präzisionsabformung mit Polyether (Impregum) im individuellen Löffel." },
                            { id: "abf_alg_gegen", label: "Alginat Gegenkiefer", text: "Gegenkieferabformung mit Alginat." },
                            { id: "biss_reg", label: "Bissregistrat", text: "Bissregistrierung mit A-Silikon (O-Bite/Futar D)." },
                            { id: "gesichtsbogen", label: "Gesichtsbogen", text: "Anlegen des Gesichtsbogens zur Übertragung der schädelbezüglichen Position." }
                        ]
                    },
                    {
                        title: "5. Provisorium & Abschluss",
                        blocks: [
                            { id: "prov_direkt", label: "Provisorium (Direkt)", text: "Herstellung eines direkten Provisoriums (Luxatemp) für Zahn {Zahn}. Ausarbeitung und Politur." },
                            { id: "prov_labor", label: "Provisorium (Labor)", text: "Eingliederung eines laborgefertigten Langzeitprovisoriums an Zahn {Zahn}." },
                            { id: "zement_temp", label: "TempBond", text: "Einsetzen mit TempBond (eugenolhaltig)." },
                            { id: "zement_free", label: "Eugenolfrei", text: "Einsetzen mit eugenolfreiem provisorischen Zement (RelyX Temp)." },
                            { id: "farbe_digital", label: "Farbnahme (Digital)", text: "Digitale Farbbestimmung (VITA Easyshade): Farbe {Farbe}." },
                            { id: "farbe_foto", label: "Farbnahme (Foto)", text: "Konventionelle Farbnahme mit Farbring (Farbe {Farbe}) + Fotodokumentation." }
                        ]
                    }
                ]
            },
            "Prothetik (Teleskop/Total)": {
                sections: [
                    {
                        title: "Basis & Vorbereitung",
                        blocks: [
                            { id: "funktionsrand", label: "Funktionsrand", text: "Funktionsrandgestaltung mit Kerr-Masse." },
                            { id: "abformung_indiv", label: "Indiv. Abformung", text: "Funktionsabformung mit individuellem Löffel (Permadyne)." }
                        ]
                    },
                    {
                        title: "Bissnahme & Einprobe",
                        blocks: [
                            { id: "biss_stuetz", label: "Stützstift-Biss", text: "Bissnahme mittels Stützstiftregistrat (Pfeilwinkel)." },
                            { id: "wachs_einprobe", label: "Wachseinprobe", text: "Wachseinprobe: Ästhetik, Phonetik und Mittellinie kontrolliert. Patient zufrieden." },
                            { id: "geruest_einprobe", label: "Gerüsteinprobe", text: "Gerüsteinprobe: Passung spannungsfrei. Randschluss kontrolliert." }
                        ]
                    }
                ]
            }
        }
    },
    "Konservierend": {
        icon: <FiBox />,
        description: "Füllungen, Endo",
        subCategories: {
            "Füllungstherapie": {
                sections: [
                    {
                        title: "Vorbereitung",
                        blocks: [
                            { id: "anesthesie", label: "Anästhesie", text: "Anästhesie: Infiltrationsanästhesie (Ultracain D-S)." },
                            { id: "kofferdam", label: "Kofferdam", text: "Anlegen von Kofferdam zur absoluten Trockenlegung." }
                        ]
                    },
                    {
                        title: "Prozess",
                        blocks: [
                            { id: "exkavation", label: "Exkavation", text: "Kariesentfernung, Kariesdetektor: kariesfrei." },
                            { id: "matrize", label: "Matrize", text: "Teilmatrizensystem angelegt, verkeilt." },
                            { id: "bonding", label: "Bonding", text: "Ätzen (Schmelz 30s, Dentin 15s), Bonding (OptiBond) einmassiert, lichtgehärtet." },
                            { id: "fuellung", label: "Füllung", text: "Mehrschichttechnik (Tetric EvoCeram), jede Schicht lichtgehärtet." }
                        ]
                    }
                ]
            },
            "Endodontie": {
                sections: [
                    {
                        title: "Zugang & Aufbereitung",
                        blocks: [
                            { id: "anest_leit", label: "Leitungsanästhesie", text: "Leitungsanästhesie des N. alveolaris inferior." },
                            { id: "kofferdam", label: "Kofferdam", text: "Anlegen von Kofferdam (absolut trocken)." },
                            { id: "trepanation", label: "Trepanation", text: "Trepanation und Darstellung der Kanaleingänge." },
                            { id: "rx_mess", label: "Röntgen-Mess", text: "Röntgen-Messaufnahme zur Längenbestimmung." },
                            { id: "wf_warm", label: "WF (Warm)", text: "Wurzelfüllung: Warme vertikale Kondensation." },
                            { id: "verschluss", label: "Verschluss", text: "Adhäsiver Verschluss der Zugangskavität." }
                        ]
                    }
                ]
            }
        }
    },
    "Chirurgie": {
        icon: <FiCpu />,
        description: "Extraktionen",
        subCategories: {
            "Extraktion": {
                sections: [
                    {
                        title: "Ablauf",
                        blocks: [
                            { id: "anesthesie", label: "Anästhesie", text: "Leitungs- und Infiltrationsanästhesie." },
                            { id: "luxation", label: "Luxation", text: "Syndesmotomie, Luxation mit Hebeln." },
                            { id: "osteotomie", label: "Osteotomie", text: "Osteotomie vestibulär, Trennung der Wurzeln." },
                            { id: "entfernung", label: "Entfernung", text: "Zahn vollständig entfernt. Alveole kürettiert." },
                            { id: "naht", label: "Naht", text: "Wundverschluss: Naht (Vicryl 4-0), Einzelknopfnähte." }
                        ]
                    }
                ]
            }
        }
    }
};

// --- MATERIAL CONFIGURATION ---
const MATERIAL_CONFIG = {
    "Zahnersatz": [
        { id: "mat_impregum", label: "Impregum (Polyether)", text: "Abformung mit Impregum (Polyether)." },
        { id: "mat_permadyne", label: "Permadyne", text: "Abformung mit Permadyne." },
        { id: "mat_tempbond", label: "TempBond", text: "Befestigung mit TempBond." },
        { id: "mat_relyx", label: "RelyX Unicem", text: "Befestigung mit RelyX Unicem." },
        { id: "mat_panavia", label: "Panavia V5", text: "Adhäsive Befestigung mit Panavia V5." }
    ],
    "Konservierend": [
        { id: "mat_optibond", label: "OptiBond FL", text: "Bonding: OptiBond FL." },
        { id: "mat_tetric", label: "Tetric EvoCeram", text: "Komposit: Tetric EvoCeram." },
        { id: "mat_filtek", label: "Filtek Supreme", text: "Komposit: Filtek Supreme XTE." },
        { id: "mat_dycal", label: "Dycal", text: "Überkappung mit Dycal." }
    ],
    "Chirurgie": [
        { id: "mat_vicryl", label: "Vicryl 4-0", text: "Nahtmaterial: Vicryl 4-0." },
        { id: "mat_gelastypt", label: "Gelastypt", text: "Blutstillung: Gelastypt Schwamm." },
        { id: "mat_collacone", label: "Collacone", text: "Alveolenauffüllung: Collacone." }
    ]
};

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } }
};

// --- HELPERS ---
const safeCopy = async (text) => {
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (_) { }

    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
    } catch (_) {
        return false;
    }
};

export default function TemplateBuilder() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [selectedBlocks, setSelectedBlocks] = useState([]); // Array of { id, label, text, type: 'fixed' | 'smart' }
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [customMaterialInput, setCustomMaterialInput] = useState(""); // NEW
    const [previewText, setPreviewText] = useState(null); // NEW: For Preview Modal
    const [isPreviewLoading, setIsPreviewLoading] = useState(false); // NEW
    const [styleSettings, setStyleSettings] = useState({
        format: 'text',
        billing: false,
        length: 'standard',
        tone: 'professional',
        perspective: 'we',
        structure: 'standard',
        customStructure: "",
        pmsMode: 'markdown'
    });
    const [templateName, setTemplateName] = useState("");
    const [testDictation, setTestDictation] = useState("Patient kommt mit Schmerzen an 16. Leitungsanästhesie. Präparation Hohlkehle. Farbe A3 bestimmt. Provisorium sitzt gut.");
    const blueprintRef = useRef(null); // NEW: Ref for Blueprint Editor

    // --- ACTIONS ---
    const handleCategorySelect = (cat) => {
        setSelectedCategory(cat);
        setSelectedSubCategory(null);
        setSelectedBlocks([]);
        setSelectedMaterials([]);
        setPreviewText(null);
        setStep(2);
    };

    const handleSubCategorySelect = (sub) => {
        setSelectedSubCategory(sub);
        setSelectedBlocks([]);
        setSelectedMaterials([]);
        setPreviewText(null);
        setTemplateName(`${sub} (Custom)`);
        setStep(3);
    };

    // Cycle: Unselected -> Fixed -> Smart -> Unselected
    const toggleBlock = (block) => {
        setSelectedBlocks(prev => {
            const existing = prev.find(b => b.id === block.id);

            if (!existing) {
                return [...prev, { ...block, type: 'fixed' }];
            }
            if (existing.type === 'fixed') {
                return prev.map(b => (b.id === block.id ? { ...b, type: 'smart' } : b));
            }
            return prev.filter(b => b.id !== block.id);
        });
    };

    const toggleMaterial = (mat) => {
        setSelectedMaterials(prev => {
            if (prev.some(m => m.id === mat.id)) return prev.filter(m => m.id !== mat.id);
            return [...prev, mat];
        });
    };

    // NEW: Add Custom Material
    const addCustomMaterial = () => {
        const label = customMaterialInput.trim();
        if (!label) return;

        const newMat = {
            id: `custom_${Date.now()}`,
            label,
            text: `Verwendetes Material: ${label}.`,
            isCustom: true
        };

        setSelectedMaterials(prev => [...prev, newMat]);
        setCustomMaterialInput("");
        toast.success("Material hinzugefügt");
    };



    // --- BILLING CONTEXT (Sonia-Level Intelligence) ---
    const BILLING_CONTEXT = {
        "Zahnersatz": `
    RELEVANTE GEBÜHRENZIFFERN (BEMA/GOZ):
    - BEMA 19 (bMF), 20 (CP), 90 (Wurzelstift), 91 (Aufbau), 24a (Exkav), 98a/b/c (Teile).
    - GOZ 2197 (Adhäsiv), 2180 (Plast. Aufbau), 5000ff (Kronen), 5120/5140 (Provisorien).
    - GOZ 2030 (bmF), 0065 (Opt-elektr. Abformung), 5170 (Indiv. Löffel).
    `,
        "Konservierend": `
    RELEVANTE GEBÜHRENZIFFERN (BEMA/GOZ):
    - BEMA 13a-d (Füllungen), 40/41 (Anästhesie), 12 (bmF), 0065 (Opt-elektr.).
    - GOZ 2050-2120 (Füllungen), 2197 (Adhäsiv), 2040 (Kofferdam).
    - Endo: 2360 (WK), 2410 (WF), 2440 (Füllung), 2400 (Elektrom.).
    `,
        "Chirurgie": `
    RELEVANTE GEBÜHRENZIFFERN (BEMA/GOZ):
    - BEMA 43-48 (X1-X3), 40/41 (Anästhesie), 38 (N), 50 (XN).
    - GOZ 3000-3040 (Extraktionen), 3090 (Plast. Deckung), 3290 (OK-Kontrolle).
    - GOZ 9090/9100 (Implantate/Augmentation).
    `
    };

    // --- HELPER: Generate "Perfect" Prompt based on Category & Style ---
    // DEPRECATED: Use buildGPTPrompts instead
    const generatePrompt = (cat, sub, style) => {
        let systemPrompt = `Du bist ein erfahrener Zahnarzt und Spezialist für forensisch sichere Dokumentation.
Dein Ziel ist es, einen perfekten, lückenlosen Behandlungsbericht für eine "${sub}" (${cat}) zu erstellen.

### STRUKTUR DES BERICHTS:
Der Bericht MUSS zwingend folgende Struktur einhalten (es sei denn, das Diktat gibt explizit etwas anderes vor):
`;

        // STRUCTURE LOGIC
        if (style.structure === 'blueprint') {
            systemPrompt += `
### AUFGABE: LÜCKENTEXT AUSFÜLLEN (BLUEPRINT MODE)
Du erhältst einen festen "Master-Text" (Blueprint) mit Platzhaltern.
Deine EINZIGE Aufgabe ist es, diese Platzhalter basierend auf dem Diktat zu füllen.

### DER BLUEPRINT:
"""
${style.customStructure}
"""

### REGELN:
1. Suche im Diktat nach Werten für die Platzhalter (z.B. {Zahn}, {Material}).
2. Ersetze die Platzhalter im Blueprint durch die gefundenen Werte.
3. Wenn eine Information im Diktat fehlt, schreibe "[FEHLT: ...]".
4. Ändere SONST NICHTS am Text. Struktur, Satzzeichen und Formatierung bleiben 100% unverändert.
5. Kein zusätzlicher Text. Keine Einleitung. Keine Erklärungen. Nur der ausgefüllte Blueprint.
`;

            if (style.pmsMode === 'plain') {
                systemPrompt += `\nWICHTIG (PMS): reiner Text, keine Markdown-Syntax, keine Emojis.\n`;
            }

            return systemPrompt;
        } else if (style.structure === 'custom' && style.customStructure.trim()) {
            systemPrompt += style.customStructure + "\n";
        } else if (style.structure === 'billing_focus') {
            systemPrompt += `
### STRUKTURVORGABE (STRIKT EINHALTEN):

1. **Übersicht & Abrechnungsrelevantes**
   (Jeder Punkt MUSS zwingend in einer NEUEN ZEILE stehen. Keine fortlaufende Liste!)
   - **Zahn:** [Nr]
   - **Befund:** [Kurz, z.B. "insuff. Altfüllung / Karies"]
   - **Rö:** [Falls erwähnt, z.B. "BW bestätigt Läsion"]
   - **LA:** [Anästhesiemittel / Art]
   - **TL:** [Trockenlegung, z.B. "rel. TL / Kofferdam"]
   - **Maßnahmen:** [Hauptschritte kurz]
   - **Material/Adhäsiv:** [Verwendete Materialien]
   - **Füllung/Versorgung:** [Art der Versorgung]
   - **Kontrolle:** [z.B. "OKK geprüft, Politur"]
   - **Abrechnung (Vorschlag):** [Relevante BEMA/GOZ Ziffern]

   ---

2. **Behandlungsverlauf**
   [Hier folgt ein flüssiger, professioneller Text, der den Ablauf beschreibt. Nutze die "FESTEN TEXTBAUSTEINE" und "MATERIALIEN" um diesen Text zu generieren. Schreibe präzise und medizinisch korrekt.]
`;
        } else {
            // STANDARD (Forensic 5-Point)
            systemPrompt += `
1. **ANAMNESE/GRUND:** Warum kommt der Patient? (Schmerzen, geplante Behandlung, Termin).
2. **BEFUND:** Was wurde klinisch festgestellt? (z.B. "Zahn xy vital, klopfempfindlich").
3. **DIAGNOSE:** Medizinische Diagnose (kurz & präzise).
4. **THERAPIE (Hauptteil):** Detaillierte Beschreibung der durchgeführten Schritte.
   - Nutze hierfür die untenstehenden "FESTEN TEXTBAUSTEINE" als Basis.
   - Integriere die "VERWENDETEN MATERIALIEN" an den passenden Stellen.
5. **PROZEDERE:** Wie geht es weiter? (Nächster Termin, Rezept, Verhalten).
`;
        }

        if (style.structure !== 'blueprint') {
            systemPrompt += `\n### STIL & FORMATIERUNG:\n`;
            // ... (Standard Style Instructions only if NOT blueprint)
            // PMS MODE (Plain Text vs Markdown)
            if (style.pmsMode === 'plain') {
                systemPrompt += `
### SOFTWARE-KOMPATIBILITÄT (WICHTIG):
- Das Zielsystem (Dampsoft/Z1) unterstützt KEIN Markdown.
- Nutze KEINE Fettschrift (**Text**).
- Nutze KEINE Überschriften mit Rauten (###).
- Nutze für Listen einfache Bindestriche (-) am Zeilenanfang.
- Nutze KEINE Emojis.
- Halte die Formatierung so simpel wie möglich (Reintext).
`;
            } else {
                systemPrompt += `- **FORMATIERUNG:** Nutze Markdown (Fettschrift für Wichtiges, saubere Listen).\n`;
            }

            // Style Instructions
            if (style.format === 'bullets') {
                systemPrompt += "- **LAYOUT:** Nutze eine strukturierte Stichpunktliste für maximale Übersichtlichkeit.\n";
            } else {
                systemPrompt += "- **LAYOUT:** Verfasse einen professionellen Fließtext. Nutze Absätze für Lesbarkeit.\n";
            }

            if (style.length === 'short') {
                systemPrompt += "- **LÄNGE:** Fasse dich kurz (KISS-Prinzip). Nur das Wesentliche.\n";
            } else if (style.length === 'detailed') {
                systemPrompt += "- **LÄNGE:** Sei extrem detailliert. Dokumentiere jeden Zwischenschritt forensisch genau.\n";
            }

            if (style.tone === 'friendly') {
                systemPrompt += "- **TONFALL:** Freundlich, patientenzugewandt, aber professionell.\n";
            } else {
                systemPrompt += "- **TONFALL:** Strikt sachlich, objektiv, medizinische Fachsprache.\n";
            }

            if (style.perspective === 'i') {
                systemPrompt += "- **PERSPEKTIVE:** Ich-Form ('Ich habe präpariert...').\n";
            } else {
                systemPrompt += "- **PERSPEKTIVE:** Wir-Form ('Wir haben...') oder Passiv ('Es wurde...').\n";
            }
        }

        if (style.billing) {
            systemPrompt += "- **ABRECHNUNG:** Füge GANZ OBEN einen Block 'Voraussichtliche Abrechnungspositionen (BEMA/GOZ)' ein.\n";
            // INJECT BILLING CONTEXT
            const billingKnowledge = BILLING_CONTEXT[cat] || "";
            if (billingKnowledge) {
                systemPrompt += `\n### ABRECHNUNGS-WISSEN:\nNutze folgende Positionen als Referenz, falls zutreffend:\n${billingKnowledge}\n`;
            }
        }

        systemPrompt += `
### REGELN FÜR VARIABLEN & PLATZHALTER:
- Die Textbausteine können Platzhalter in geschweiften Klammern enthalten, z.B. "{Zahn}", "{Farbe}", "{Material}".
- **DEINE AUFGABE:** Suche im Diktat nach dem passenden Wert für diese Variable.
- **WENN GEFUNDEN:** Ersetze "{Variable}" durch den diktierten Wert (z.B. "16" oder "A3").
- **WENN NICHT GEFUNDEN:** Ersetze es durch "[FEHLT: Variable]" (damit der Arzt es sofort sieht).
- **BEISPIEL:** Baustein: "Präparation an Zahn {Zahn}." -> Diktat: "Wir haben am 26 präpariert." -> Output: "Präparation an Zahn 26."

### WEITERE REGELN:
- Erfinde KEINE Fakten. Wenn Informationen fehlen, lasse sie weg oder schreibe "nicht dokumentiert".
- Nutze Fachbegriffe (z.B. "okklusal", "vestibulär", "Infiltrationsanästhesie").
- Die "FESTEN TEXTBAUSTEINE" sind deine "Golden Source". Nutze sie bevorzugt.
`;

        const instruction = `Nutze die untenstehenden "FESTEN TEXTBAUSTEINE" und "MATERIALIEN" als Basis. Ergänze diese sinnvoll mit den diktierten Informationen.
Achte besonders auf die Platzhalter in den Bausteinen!`;
        return `${systemPrompt}\n${instruction}`;
    };

    const handleSave = async () => {
        if (!templateName.trim()) {
            toast.error("Bitte einen Namen eingeben");
            return;
        }

        // Split blocks into Fixed Text and Smart Defaults
        const fixedBlocks = selectedBlocks.filter(b => b.type === 'fixed');
        const smartBlocks = selectedBlocks.filter(b => b.type === 'smart');

        // Format Material with a clear Header
        const selectedForMaterial = selectedBlocks.filter(b => b.type === 'fixed' || b.type === 'smart');
        let materialText = `--- TEXTBAUSTEINE ---\n${selectedForMaterial.map(b => b.text).join("\n")}`;

        if (selectedMaterials.length > 0) {
            materialText += `\n\n--- MATERIALIEN ---\n${selectedMaterials.map(m => m.text).join("\n")}`;
        }

        const smartDefaultsString = smartBlocks.map(b => b.label).join(", ");

        // Generate a specific Prompt
        const generatedPrompt = generatePrompt(selectedCategory, selectedSubCategory, styleSettings);

        const newId = `V2_BUILDER_${Date.now()}`;

        const newTemplate = {
            id: newId,
            title: templateName,
            Kategorie: `00. Eigene (${selectedCategory})`,
            Prompt: generatedPrompt,
            GPTPrompt: generatedPrompt,
            Material: materialText,
            dictationInstructions: "Ergänze spezifische Details (z.B. Zahn, Besonderheiten).",
            users: ["all"],
            systemVersion: "v2",
            practiceDefaults: {
                standardLeistungen: smartDefaultsString
            },
            aiSettings: {
                textLength: styleSettings.length,
                forensicMode: 'standard',
                revenueBooster: styleSettings.billing,
                blueprint: styleSettings.format === 'bullets' ? 'stichpunkte' : 'modern'
            },
            testInput: `Patient zur Behandlung (${selectedSubCategory}).`
        };

        try {
            await setDoc(doc(db, "Praxen", "1", "Vorlagen", newId), newTemplate);
            toast.success("Vorlage gespeichert!");
            navigate('/dashboard');
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Fehler beim Speichern");
        }
    };

    // --- RENDER STEPS ---

    // STEP 1: CATEGORY
    const renderStep1 = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto mt-10">
            {Object.keys(BUILDER_CONFIG).map(cat => (
                <motion.button
                    key={cat}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategorySelect(cat)}
                    className="group flex flex-col items-center gap-4 p-8 rounded-[2.5rem] bg-white/80 backdrop-blur-md border border-white/60 shadow-sm hover:shadow-md transition-all w-48 h-48 justify-center"
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-3xl text-gray-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {BUILDER_CONFIG[cat].icon}
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1">{cat}</h3>
                        <p className="text-xs text-gray-500 font-medium opacity-80">{BUILDER_CONFIG[cat].description}</p>
                    </div>
                </motion.button>
            ))}
        </motion.div>
    );

    // STEP 2: SUB-CATEGORY
    const renderStep2 = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-2xl mx-auto mt-10">
            <motion.button onClick={() => setStep(1)} className="flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors mb-8 text-sm font-bold uppercase tracking-wider mx-auto bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm">
                <FiArrowLeft className="mr-2" /> Zurück
            </motion.button>
            <div className="space-y-4">
                {Object.keys(BUILDER_CONFIG[selectedCategory].subCategories).map(sub => (
                    <motion.button
                        key={sub}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSubCategorySelect(sub)}
                        className="w-full bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-sm hover:shadow-md hover:bg-white/90 transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                                <FiActivity />
                            </div>
                            <span className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{sub}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                            <FiArrowRight />
                        </div>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );

    // MACRO LOGIC (scoped)
    const MACRO_SETS = {
        all_ceramic: {
            onlySub: ["Kronen & Brücken"],
            ids: ['anest_infilt', 'praep_hohl', 'faden_doppel', 'scan_ios', 'prov_direkt', 'zement_free'],
        },
        endo_std: {
            onlySub: ["Endodontie"],
            ids: ['anest_leit', 'kofferdam', 'trepanation', 'wf_warm', 'rx_mess', 'verschluss'],
        },
    };

    const getCurrentBlocks = () => {
        if (!selectedCategory || !selectedSubCategory) return [];
        const subCatData = BUILDER_CONFIG?.[selectedCategory]?.subCategories?.[selectedSubCategory];
        const sections = Array.isArray(subCatData) ? [{ blocks: subCatData }] : (subCatData?.sections ?? []);
        return sections.flatMap(s => s.blocks ?? []);
    };

    const isMacroAvailable = (macroId) => {
        const macro = MACRO_SETS[macroId];
        if (!macro) return false;

        // hard scope by subcategory
        if (macro.onlySub && !macro.onlySub.includes(selectedSubCategory)) return false;

        // only enable if at least one macro-block exists in this subcategory (future-proof)
        const currentIds = new Set(getCurrentBlocks().map(b => b.id));
        return macro.ids.some(id => currentIds.has(id));
    };

    const applyMacro = (macroId) => {
        const macro = MACRO_SETS[macroId];
        if (!macro) return;

        if (macro.onlySub && !macro.onlySub.includes(selectedSubCategory)) {
            toast.info("Macro passt nicht zu dieser Unterkategorie.");
            return;
        }

        const blockById = new Map(getCurrentBlocks().map(b => [b.id, b]));

        // functional update (no race conditions)
        setSelectedBlocks(prev => {
            const already = new Set(prev.map(b => b.id));

            const toAdd = macro.ids
                .map(id => blockById.get(id))
                .filter(Boolean)
                .filter(b => !already.has(b.id))
                .map(b => ({ ...b, type: 'fixed' }));

            if (toAdd.length > 0) {
                toast.success(`${toAdd.length} Bausteine hinzugefügt!`);
                return [...prev, ...toAdd];
            }

            toast.info("Bausteine bereits ausgewählt oder nicht in dieser Kategorie.");
            return prev;
        });
    };

    // STEP 3: ULTRA-MODERN CARD-BASED BUILDER
    const renderStep3 = () => {
        const subCatData = BUILDER_CONFIG[selectedCategory].subCategories[selectedSubCategory];
        const sections = Array.isArray(subCatData) ? [{ title: "Allgemein", blocks: subCatData }] : subCatData.sections;

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col max-w-7xl mx-auto w-full overflow-hidden">
                {/* Sticky Header with Glassmorphism */}
                <div className="sticky top-0 z-30 backdrop-blur-xl bg-gradient-to-b from-white/80 to-white/40 border-b border-white/50 mb-4">
                    <div className="flex items-center justify-between px-6 py-4">
                        <button
                            onClick={() => setStep(2)}
                            className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-all text-sm font-bold bg-white/60 hover:bg-white px-5 py-2.5 rounded-2xl backdrop-blur-sm shadow-sm hover:shadow-md border border-white/50"
                        >
                            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Zurück
                        </button>

                        <div className="flex items-center gap-3 text-sm">
                            {/* SMART MACROS (Step 3) */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => applyMacro('all_ceramic')}
                                    disabled={!isMacroAvailable('all_ceramic')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2
                                        ${isMacroAvailable('all_ceramic')
                                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <FiZap /> All-Ceramic Set
                                </button>
                                <button
                                    onClick={() => applyMacro('endo_std')}
                                    disabled={!isMacroAvailable('endo_std')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2
                                        ${isMacroAvailable('endo_std')
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <FiZap /> Endo Standard
                                </button>
                            </div>

                            <div className="h-6 w-px bg-gray-300 mx-2"></div>

                            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-sm border border-white/50">
                                <span className="w-2 h-2 rounded-full bg-gray-900 animate-pulse"></span>
                                <span className="text-xs font-bold text-gray-600">Fester Text</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-sm border border-white/50">
                                <span className="w-2 h-2 rounded-full border-2 border-blue-500"></span>
                                <span className="text-xs font-bold text-blue-600">Flexibel</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                                <span className="text-xs font-bold text-gray-400">{selectedBlocks.length} gewählt</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(4)}
                            className="group flex items-center gap-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        >
                            Weiter <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Modern Grid Layout */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-20 min-h-0">
                    {
                        sections.map((section, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="mb-10"
                            >
                                {/* Section Header - Premium Design */}
                                <div className="flex items-center gap-4 mb-6 group">
                                    <div className="relative">
                                        <div className="absolute -inset-2 bg-gradient-to-r from-gray-900 to-gray-600 rounded-full opacity-20 group-hover:opacity-30 transition-opacity blur-lg"></div>
                                        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-lg">
                                            <FiMoreHorizontal className="text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight">{section.title}</h3>
                                        <div className="h-0.5 bg-gradient-to-r from-gray-900 via-gray-300 to-transparent mt-2"></div>
                                    </div>
                                </div>

                                {/* Ultra-Modern Card Grid */}
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                                >
                                    {section.blocks.map(block => {
                                        const selection = selectedBlocks.find(b => b.id === block.id);
                                        const isFixed = selection?.type === 'fixed';
                                        const isSmart = selection?.type === 'smart';

                                        return (
                                            <motion.button
                                                key={block.id}
                                                variants={itemVariants}
                                                layout
                                                whileHover={{ scale: 1.03, y: -4 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => toggleBlock(block)}
                                                className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${isFixed
                                                    ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl ring-2 ring-gray-900 ring-offset-2'
                                                    : isSmart
                                                        ? 'bg-gradient-to-br from-blue-50 to-white text-blue-700 shadow-lg ring-2 ring-blue-500 ring-offset-2'
                                                        : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md hover:shadow-xl border-2 border-gray-100 hover:border-gray-200'
                                                    }`}
                                            >
                                                {/* Gradient Overlay on Hover */}
                                                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity ${isFixed ? 'from-white to-transparent' : 'from-blue-500 to-purple-500'
                                                    }`}></div>

                                                {/* Icon Badge */}
                                                <div className="relative flex items-start gap-3">
                                                    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isFixed
                                                        ? 'bg-white/20 text-white'
                                                        : isSmart
                                                            ? 'bg-blue-500 text-white shadow-md'
                                                            : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                                                        }`}>
                                                        {isFixed ? <FiFileText className="w-4 h-4" /> : isSmart ? <FiToggleLeft className="w-4 h-4" /> : <FiActivity className="w-4 h-4" />}
                                                    </div>

                                                    {/* Label */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-bold leading-tight line-clamp-2 ${isFixed ? 'text-white' : isSmart ? 'text-blue-900' : 'text-gray-900'
                                                            }`}>
                                                            {block.label}
                                                        </p>
                                                        {(isFixed || isSmart) && (
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 inline-block ${isFixed ? 'text-white/60' : 'text-blue-600/60'
                                                                }`}>
                                                                {isFixed ? 'Aktiv' : 'Button'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Selection Indicator */}
                                                {(isFixed || isSmart) && (
                                                    <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center ${isFixed ? 'bg-white/30' : 'bg-blue-500'
                                                        }`}>
                                                        <FiCheck className={`w-4 h-4 ${isFixed ? 'text-white' : 'text-white'}`} />
                                                    </div>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </motion.div>
                            </motion.div>
                        ))
                    }
                </div>
            </motion.div >
        );
    };

    // STEP 4: MATERIALS (Updated)
    const renderStep4 = () => {
        const materials = MATERIAL_CONFIG[selectedCategory] || [];
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col max-w-4xl mx-auto w-full">
                {/* ... Header ... */}
                <div className="flex items-center justify-between mb-8 px-4">
                    <button onClick={() => setStep(3)} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors text-sm font-bold uppercase tracking-wider bg-white/40 px-4 py-2 rounded-full backdrop-blur-sm">
                        <FiArrowLeft className="mr-2" /> Zurück zu Schritten
                    </button>
                    <button onClick={() => setStep(5)} className="bg-gray-900 text-white px-6 py-2 rounded-full text-sm font-bold shadow-md hover:bg-black transition-all flex items-center gap-2">
                        Weiter zum Design <FiArrowRight />
                    </button>
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">Materialien wählen</h2>
                    <p className="text-gray-500">Wählen Sie Standards oder fügen Sie eigene hinzu.</p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-32">
                    <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">

                        {/* Custom Input */}
                        <div className="flex gap-3 mb-8 max-w-xl mx-auto">
                            <input
                                type="text"
                                value={customMaterialInput}
                                onChange={(e) => setCustomMaterialInput(e.target.value)}
                                placeholder="Neues Material hinzufügen (z.B. 'Adhese Universal')..."
                                className="flex-1 px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80"
                                onKeyDown={(e) => e.key === 'Enter' && addCustomMaterial()}
                            />
                            <button
                                onClick={addCustomMaterial}
                                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                + Hinzufügen
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-4 justify-center">
                            {/* Predefined */}
                            {materials.map(mat => {
                                const isSelected = selectedMaterials.find(m => m.id === mat.id);
                                return (
                                    <motion.button
                                        key={mat.id}
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => toggleMaterial(mat)}
                                        className={`px-6 py-4 rounded-2xl text-sm font-bold transition-all border flex flex-col items-center gap-2 w-40 ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white/80 text-gray-600 border-white/50 hover:bg-white'}`}
                                    >
                                        <FiBox className="w-6 h-6" />
                                        {mat.label}
                                    </motion.button>
                                );
                            })}

                            {/* Custom Added */}
                            {selectedMaterials.filter(m => m.isCustom).map(mat => (
                                <motion.button
                                    key={mat.id}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    onClick={() => toggleMaterial(mat)}
                                    className="px-6 py-4 rounded-2xl text-sm font-bold transition-all border flex flex-col items-center gap-2 w-40 bg-purple-600 text-white border-purple-600 shadow-lg"
                                >
                                    <FiBox className="w-6 h-6" />
                                    {mat.label}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    // NEW: AI Extraction Logic
    const [showExtractionModal, setShowExtractionModal] = useState(false);
    const [extractionInput, setExtractionInput] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);

    const [showPreviewModal, setShowPreviewModal] = useState(false); // NEW
    const [activeStructureTab, setActiveStructureTab] = useState('ai'); // 'ai' | 'blueprint'

    // NEW: Insert Variable into Blueprint
    const insertVariable = (varName) => {
        const textarea = blueprintRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = styleSettings.customStructure;
        const newText = text.substring(0, start) + varName + text.substring(end);

        setStyleSettings({ ...styleSettings, customStructure: newText });

        // Restore focus (timeout needed for React render cycle)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + varName.length, start + varName.length);
        }, 0);
    };

    // NEW: AI Extraction Logic
    const handleExtractBlueprint = async () => {
        if (!extractionInput.trim()) return;
        setIsExtracting(true);
        try {
            const systemPrompt = `
                Du bist ein Experte für Dental-Dokumentation.
                Deine Aufgabe ist es, einen gegebenen Beispiel-Bericht in eine "Blueprint-Vorlage" (Lückentext) umzuwandeln.

                REGELN:
                1. Analysiere den Text und identifiziere variable Teile (Zahnnummern, Materialien, Befunde, Farben, Anästhetika).
                2. Ersetze diese Teile durch die passenden Platzhalter:
   - Zahnnummern (z.B. "16", "24-27") -> {Zahn}
   - Materialien (z.B. "Tetric", "Adhese") -> {Material}
   - Befunde (z.B. "Karies", "insuffizient") -> {Befund}
   - Farben (z.z. "A3", "A3.5") -> {Farbe}
   - Anästhetika (z.B. "Ultracain", "Articain") -> {LA}
   - Begründungen/Anamnese -> {Grund}
   - Besonderheiten -> {Besonderheiten}
                3. Behalte den restlichen Satzbau, die Grammatik und die Formatierung zu 100% bei.
                4. Gib NUR den umgewandelten Text zurück. Keine Erklärungen.

                BEISPIEL:
                Input: "Der Patient kam mit Schmerzen an 46. Wir haben Tetric EvoCeram A3 verwendet."
                Output: "Der Patient kam mit {Grund} an {Zahn}. Wir haben {Material} {Farbe} verwendet."
                `;
            const result = await runLLMProcessing({
                systemPrompt: systemPrompt,
                userPrompt: extractionInput,
                model: "gpt-4o" // Use smart model for this logic task
            });

            setStyleSettings({ ...styleSettings, customStructure: result });
            setShowExtractionModal(false);
            setExtractionInput("");
            toast.success("Blueprint erstellt!");
        } catch (error) {
            toast.error("Fehler: " + error.message);
        } finally {
            setIsExtracting(false);
        }
    };

    // NEW: Extraction Modal Component
    const ExtractionModal = () => (
        <AnimatePresence>
            {showExtractionModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowExtractionModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="text-2xl">✨</span> Blueprint-Generator
                            </h3>
                            <button onClick={() => setShowExtractionModal(false)}><FiX className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="p-8">
                            <p className="text-gray-600 mb-4 text-sm">
                                Fügen Sie hier einen <strong>perfekten Beispiel-Bericht</strong> ein.
                                Die KI erkennt automatisch Zahnnummern, Materialien und Befunde und ersetzt sie durch Platzhalter.
                            </p>
                            <textarea
                                value={extractionInput}
                                onChange={(e) => setExtractionInput(e.target.value)}
                                placeholder={`Beispiel: "Der Patient klagte über Aufbissbeschwerden an Zahn 36. Klinisch zeigte sich eine Fraktur der mesialen Randleiste. Nach Infiltrationsanästhesie mit Ultracain DS forte wurde der Zahn präpariert und mit Tetric EvoCeram A3 gefüllt."`}
                                className="w-full h-48 p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm transition-all"
                            />
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowExtractionModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors">
                                Abbrechen
                            </button>
                            <button
                                onClick={handleExtractBlueprint}
                                disabled={isExtracting || !extractionInput.trim()}
                                className="px-6 py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExtracting ? <FiLoader className="animate-spin" /> : <FiCpu />}
                                {isExtracting ? "Analysiere..." : "In Blueprint umwandeln"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    // NEW: Handle Preview
    const handlePreview = async () => {
        setIsPreviewLoading(true);
        try {
            // Construct Draft Template Config
            const draftTemplate = {
                id: "preview_draft",
                Kategorie: selectedCategory,
                subCategory: selectedSubCategory,
                aiSettings: {
                    ...styleSettings,
                    blueprint: styleSettings.structure === 'blueprint' ? 'custom' : styleSettings.structure,
                },
                customBlueprint: styleSettings.structure === 'blueprint' ? styleSettings.customStructure : "",
                Material: selectedMaterials.map(m => m.text).join("\n"),
                practiceDefaults: {} // Fixed blocks are passed as bausteine/activeStandards
            };

            // Prepare Blocks
            const fixedBlocks = selectedBlocks.filter(b => b.type === 'fixed');
            const smartBlocks = selectedBlocks.filter(b => b.type === 'smart');
            const allActiveBlocks = [...fixedBlocks, ...smartBlocks];

            // Build Prompts using Single Source of Truth
            const { systemPrompt, userPrompt } = buildGPTPrompts({
                template: draftTemplate,
                inputText: testDictation,
                bausteine: allActiveBlocks, // Passed as text blocks
                activeStandards: fixedBlocks.map(b => b.text), // Also pass fixed as standards if needed
                textLength: styleSettings.textLength,
                forensicLevel: styleSettings.forensicLevel,
                manualMaterial: draftTemplate.Material
            });

            const result = await runLLMProcessing({
                systemPrompt,
                userPrompt,
                model: "gpt-5-mini"
            });

            setPreviewText(result);
            setShowPreviewModal(true); // Open Modal
        } catch (error) {
            toast.error("Vorschau fehlgeschlagen: " + error.message);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // NEW: Preview Modal Component
    const PreviewModal = () => (
        <AnimatePresence>
            {showPreviewModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowPreviewModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b flex items-center justify-between bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FiActivity className="text-blue-600" /> Generierter Bericht
                            </h3>
                            <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <FiX className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-white">
                            <div className="prose prose-lg max-w-none font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                                {previewText}
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowPreviewModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                                Schließen
                            </button>
                            <button
                                onClick={async () => {
                                    // FORENSIC GUARDRAILS (Step 2) - IMPROVED
                                    const missing = [];
                                    const text = previewText.toLowerCase();

                                    // Regex for synonyms
                                    if (!/(aufklär\w*|einwill\w*|consent)/i.test(text)) missing.push("Aufklärung/Einwilligung");
                                    if (!/(risik\w*|komplik\w*|nebenwirk\w*)/i.test(text)) missing.push("Risiken/Nebenwirkungen");

                                    // Check for placeholders
                                    if (text.includes("[fehlt") || text.includes("{")) missing.push("Ungefüllte Platzhalter");

                                    const performCopy = async () => {
                                        const ok = await safeCopy(previewText);
                                        if (ok) {
                                            toast.success("Kopiert!");
                                        } else {
                                            toast.error("Kopieren fehlgeschlagen. Bitte manuell markieren (Strg+C).");
                                        }
                                    };

                                    if (missing.length > 0) {
                                        toast.warning(`Forensik-Warnung: ${missing.join(", ")} fehlt!`, {
                                            description: "Bitte ergänzen Sie diese Punkte für eine rechtssichere Doku.",
                                            duration: 5000,
                                            action: {
                                                label: "Trotzdem Kopieren",
                                                onClick: performCopy
                                            }
                                        });
                                    } else {
                                        await performCopy();
                                    }
                                }}
                                className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <FiCheck /> Kopieren
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    // STEP 5: STYLE (Fully Restored)
    const renderStep5 = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col max-w-6xl mx-auto w-full">
            {/* ... Header ... */}
            <div className="flex items-center justify-between mb-8 px-4">
                <button onClick={() => setStep(4)} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors text-sm font-bold uppercase tracking-wider bg-white/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    <FiArrowLeft className="mr-2" /> Zurück zu Materialien
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 mb-12 h-full overflow-hidden">

                {/* Left: Settings */}
                <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-20">

                    {/* MODE TOGGLE (AI vs BLUEPRINT) */}
                    <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-2 border border-white/60 shadow-sm flex">
                        <button
                            onClick={() => { setActiveStructureTab('ai'); setStyleSettings({ ...styleSettings, structure: 'standard' }); }}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeStructureTab === 'ai' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}
                        >
                            <FiCpu /> KI-Generierung
                        </button>
                        <button
                            onClick={() => { setActiveStructureTab('blueprint'); setStyleSettings({ ...styleSettings, structure: 'blueprint' }); }}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeStructureTab === 'blueprint' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}
                        >
                            <FiFileText /> Blueprint (Fest)
                        </button>
                    </div>

                    {/* AI OPTIONS */}
                    {activeStructureTab === 'ai' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                            {/* STRUCTURE SECTION (AI) */}
                            <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/60 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FiAlignLeft /> Struktur & Aufbau
                                </h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setStyleSettings({ ...styleSettings, structure: 'standard' })}
                                        className={`w-full p-4 rounded-xl text-left font-bold transition-all border flex flex-col gap-1 ${styleSettings.structure === 'standard' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <span>Forensisch (Standard)</span>
                                        <span className={`text-xs font-normal ${styleSettings.structure === 'standard' ? 'text-gray-400' : 'text-gray-400'}`}>1. Anamnese, 2. Befund, 3. Diagnose, 4. Therapie, 5. Prozedere</span>
                                    </button>

                                    <button
                                        onClick={() => setStyleSettings({ ...styleSettings, structure: 'billing_focus' })}
                                        className={`w-full p-4 rounded-xl text-left font-bold transition-all border flex flex-col gap-1 ${styleSettings.structure === 'billing_focus' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <span>Kompakt (Abrechnung & Ablauf)</span>
                                        <span className={`text-xs font-normal ${styleSettings.structure === 'billing_focus' ? 'text-gray-400' : 'text-gray-400'}`}>1. Übersicht & Abrechnung, 2. Behandlungsablauf</span>
                                    </button>

                                    <button
                                        onClick={() => setStyleSettings({ ...styleSettings, structure: 'custom' })}
                                        className={`w-full p-4 rounded-xl text-left font-bold transition-all border flex flex-col gap-1 ${styleSettings.structure === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <span>Eigene Struktur (Prompt)</span>
                                        <span className={`text-xs font-normal ${styleSettings.structure === 'custom' ? 'text-blue-200' : 'text-gray-400'}`}>Definieren Sie die Abschnitte selbst.</span>
                                    </button>

                                    {styleSettings.structure === 'custom' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                            <textarea
                                                value={styleSettings.customStructure}
                                                onChange={(e) => setStyleSettings({ ...styleSettings, customStructure: e.target.value })}
                                                placeholder={`1. Einleitung\n2. Hauptteil\n3. Schluss`}
                                                className="w-full h-32 p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* PMS MODE & STYLE SETTINGS (Only for AI) */}
                            <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/60 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FiMonitor /> Software-Kompatibilität
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setStyleSettings({ ...styleSettings, pmsMode: 'markdown' })} className={`p-4 rounded-xl font-bold border flex flex-col items-center gap-2 text-center transition-all ${styleSettings.pmsMode === 'markdown' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-100'}`}>
                                        <span className="text-lg">📱</span>
                                        <div><div>Modern</div><div className="text-xs font-normal opacity-70">Markdown, Fett, Emojis</div></div>
                                    </button>
                                    <button onClick={() => setStyleSettings({ ...styleSettings, pmsMode: 'plain' })} className={`p-4 rounded-xl font-bold border flex flex-col items-center gap-2 text-center transition-all ${styleSettings.pmsMode === 'plain' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-100'}`}>
                                        <span className="text-lg">💾</span>
                                        <div><div>Klassisch (PMS)</div><div className="text-xs font-normal opacity-70">Dampsoft, Z1, Charly</div></div>
                                    </button>
                                </div>
                            </div>

                            {/* Format, Tone, Billing (Simplified) */}
                            <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white/60 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Format & Länge</h3>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <button onClick={() => setStyleSettings({ ...styleSettings, format: 'text' })} className={`p-3 rounded-xl font-bold border ${styleSettings.format === 'text' ? 'bg-gray-900 text-white' : 'bg-white'}`}>Fließtext</button>
                                    <button onClick={() => setStyleSettings({ ...styleSettings, format: 'bullets' })} className={`p-3 rounded-xl font-bold border ${styleSettings.format === 'bullets' ? 'bg-gray-900 text-white' : 'bg-white'}`}>Stichpunkte</button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {['short', 'standard', 'detailed'].map(len => (
                                        <button key={len} onClick={() => setStyleSettings({ ...styleSettings, length: len })} className={`p-2 rounded-lg text-sm font-bold border capitalize ${styleSettings.length === len ? 'bg-blue-600 text-white' : 'bg-white'}`}>{len}</button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={() => setStyleSettings({ ...styleSettings, billing: !styleSettings.billing })} className={`w-full p-4 rounded-2xl text-left font-bold transition-all border flex items-center gap-4 ${styleSettings.billing ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-100'}`}>
                                <FiDisc className="w-6 h-6" />
                                <div><div>Abrechnungsvorschlag</div><div className="text-xs font-normal opacity-80">BEMA/GOZ Positionen automatisch ergänzen</div></div>
                            </button>
                        </motion.div>
                    )}

                    {/* BLUEPRINT EDITOR (Polished Pill Design) */}
                    {activeStructureTab === 'blueprint' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative"
                        >
                            {/* Floating Variable Toolbar (The "Bedienleiste") */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-white/50 ring-1 ring-black/5">
                                <div className="flex items-center gap-2 px-3 border-r border-gray-200/50 mr-1">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                        <FiCpu className="text-purple-500" /> Variablen
                                    </span>
                                </div>
                                {['{Zahn}', '{Befund}', '{Material}', '{Farbe}', '{LA}', '{Grund}', '{Besonderheiten}'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => insertVariable(v)}
                                        className="px-4 py-1.5 rounded-full bg-white text-gray-600 text-xs font-bold hover:bg-purple-50 hover:text-purple-600 transition-all border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>

                            {/* The Editor Pill */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 pt-12 border border-white/60 shadow-xl ring-1 ring-black/5 relative overflow-hidden group">

                                {/* Subtle Gradient Background */}
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-50/30 to-white pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-2 px-2">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Master-Text Definition</h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowExtractionModal(true)}
                                                className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-full transition-colors border border-purple-100"
                                            >
                                                <span className="text-lg">✨</span> Aus Beispiel generieren
                                            </button>
                                            <button
                                                onClick={() => setStyleSettings({ ...styleSettings, customStructure: "Patient klagt über Schmerzen an Zahn {Zahn}.\nBefund: {Befund}.\nTherapie: Anästhesie mit {LA}, Präparation, Füllung mit {Material}.\nBesonderheiten: {Besonderheiten}." })}
                                                className="text-xs text-gray-500 hover:text-gray-700 font-bold flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full transition-colors"
                                            >
                                                <FiActivity /> Demo laden
                                            </button>
                                        </div>
                                    </div>

                                    <textarea
                                        ref={blueprintRef}
                                        id="blueprint-editor"
                                        value={styleSettings.customStructure}
                                        onChange={(e) => setStyleSettings({ ...styleSettings, customStructure: e.target.value })}
                                        placeholder={`Schreiben Sie hier Ihren Master-Text...\nBeispiel: "Wir haben Zahn {Zahn} mit {Material} versorgt."`}
                                        className="w-full h-96 bg-transparent text-lg font-medium text-gray-700 placeholder-gray-300 outline-none resize-none leading-relaxed p-2 font-mono"
                                    />
                                </div>

                                {/* Bottom Info Bar */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/50 backdrop-blur-md border-t border-white/50 flex justify-center">
                                    <p className="text-xs text-gray-400 font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                        KI füllt nur die Platzhalter. Struktur bleibt 100% erhalten.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Right: Preview & Save */}
                <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white flex flex-col shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-800 to-black opacity-50 pointer-events-none"></div>
                    <div className="relative z-10 flex-1 flex flex-col justify-center">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <FiActivity className="text-blue-400" /> Live-Vorschau
                        </h3>

                        {/* Test Dictation Input */}
                        <div className="mb-8">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Test-Diktat (Simulation)</label>
                            <textarea
                                value={testDictation}
                                onChange={(e) => setTestDictation(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-base text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-40"
                                placeholder="Diktieren Sie hier einen Testfall..."
                            />
                        </div>

                        <button
                            onClick={handlePreview}
                            disabled={isPreviewLoading}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg mb-8 ${previewText ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/50'}`}
                        >
                            {isPreviewLoading ? 'Generiere...' : previewText ? '🔄 Neu generieren (Update)' : '✨ Vorschau generieren'}
                        </button>

                        <div className="h-px bg-white/20 mb-8"></div>

                        {/* Save Section */}
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Name der Vorlage..."
                                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                onClick={handleSave}
                                className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
                            >
                                <FiSave /> Speichern
                            </button>
                        </div>
                    </div>
                </div>
            </div> {/* This closes the grid container div */}

            {/* Modals */}
            <PreviewModal />
            <ExtractionModal />
        </motion.div>
    );

    // Main component return
    return (
        <div className="flex-1 relative overflow-hidden flex flex-col font-sans h-screen">
            <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col relative z-10 h-full overflow-hidden">
                <header className="mb-6 text-center flex-shrink-0">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tighter drop-shadow-sm">
                            Vorlagen<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Builder</span>
                        </h1>
                        <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">Designen Sie Ihre perfekte Dokumentation.</p>
                    </motion.div>
                </header>

                <div className="flex-1 relative overflow-hidden flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className="h-full flex flex-col"
                        >
                            {step === 1 && renderStep1()}
                            {step === 2 && renderStep2()}
                            {step === 3 && renderStep3()}
                            {step === 4 && renderStep4()}
                            {step === 5 && renderStep5()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
