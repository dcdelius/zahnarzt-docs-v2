import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiMic,
    FiSend,
    FiChevronLeft,
    FiChevronDown,
    FiRefreshCw,
    FiCopy,
    FiCheck,
    FiX,
    FiCpu,
    FiSliders,
    FiAlignLeft,
    FiAlignJustify,
    FiFileText,
    FiBox,
    FiZap,
    FiShield,
    FiLock,
    FiCornerRightDown,
    FiSlash,
    FiCheckCircle,
    FiArrowRight
} from "react-icons/fi";
import { toast } from "sonner";
import { TypeAnimation } from 'react-type-animation';
import { extractStructuredData } from "../../engine/extractStructuredData";
import { buildGPTPrompts } from "../../utils/buildGPTPrompts";
import { runLLMProcessing } from "../../../utils/llmService";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { setDoc, doc } from "firebase/firestore";
import { MASTER_TEMPLATE_V3 } from "../../data/masterTemplate";
import { SettingsManager } from "../../sonia/settings/settingsManager";

// --- CHIP HELPERS ---
const CHIP_GROUP_META = {
    dictation: { label: "Im Diktat erkannt", accent: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    standard: { label: "Praxis-Standards", accent: "bg-blue-50 text-blue-700 border-blue-200" },
    critical: { label: "Kritisch / Forensik", accent: "bg-amber-50 text-amber-700 border-amber-200" }
};

const cycleChipState = (current) => {
    if (current === "active") return "inactive";
    if (current === "inactive") return "optional";
    return "active";
};

// Helper to generate chips dynamically from template fields
const generateChipsFromTemplate = (template, extractedData = {}) => {
    const chips = [];

    // 1. Dictation Chips (from Extracted Data)
    if (extractedData) {
        Object.entries(extractedData).forEach(([key, value]) => {
            if (value && key !== 'tooth' && key !== 'surfaces') {
                const field = template.fields?.find(f => f.id === key);
                if (field) {
                    chips.push({
                        id: `chip-${key}`,
                        label: field.label || key,
                        fieldId: key,
                        value: value,
                        group: "dictation",
                        matches: (v) => v === value
                    });
                }
            }
        });
    }

    // 2. Standard Chips (from Template Defaults/Standards)
    // Assuming template has a way to define standards, or we use a heuristic
    // For now, we'll map boolean fields as potential standards
    template.fields?.forEach(field => {
        if (field.type === 'boolean' && !chips.find(c => c.fieldId === field.id)) {
            chips.push({
                id: `chip-${field.id}`,
                label: field.label,
                fieldId: field.id,
                value: true,
                group: "standard", // Default to standard for booleans
                matches: (v) => v === true
            });
        }
    });

    return chips;
};

const deriveChipStateFromData = (data, chips) => {
    const next = {};
    chips.forEach((chip) => {
        const value = data?.[chip.fieldId];
        // If value matches chip value, it's active
        // If it's a dictation chip and value is missing/different, it's inactive (or we keep it active if it WAS in dictation?)
        // Simplified:
        const matches = chip.matches ? chip.matches(value) : (value === chip.value);

        if (matches) {
            next[chip.id] = "active";
        } else if (chip.group === "dictation") {
            // If it was a dictation chip but data doesn't match anymore, it might be inactive
            next[chip.id] = "inactive";
        } else {
            next[chip.id] = "optional";
        }
    });
    return next;
};

const applyChipToData = (data, chip, state) => {
    const next = { ...data };
    if (state === "active") {
        next[chip.fieldId] = chip.value ?? true;
    } else {
        next[chip.fieldId] = null; // Or false for booleans?
    }
    return next;
};

const buildPreviewText = (data) => {
    // Basic renderer - in real app this would use render.ts
    if (!data) return "";
    return Object.entries(data)
        .filter(([_, v]) => v !== null && v !== undefined && v !== false)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
};

// --- COMPONENTS ---

const ActionChip = ({ chip, state, onToggle }) => {
    const stateStyles = {
        active: "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm",
        inactive: "border-red-200 bg-red-50 text-red-400 opacity-60 grayscale",
        optional: "border-gray-200 bg-white text-gray-500 hover:border-blue-300"
    };

    const stateIcons = {
        active: <FiCheckCircle className="w-4 h-4" />,
        inactive: <FiSlash className="w-4 h-4" />,
        optional: <FiCornerRightDown className="w-4 h-4" />
    };

    return (
        <button
            onClick={() => onToggle(chip)}
            className={`relative w-full text-left rounded-xl border px-3 py-2.5 flex items-center justify-between transition-all duration-200 ${stateStyles[state]}`}
        >
            <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${state === 'active' ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100'}`}>
                    {stateIcons[state]}
                </div>
                <span className="text-sm font-semibold">{chip.label}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{state}</span>
        </button>
    );
};

const TreatmentListItem = ({ treatment, isSelected, onClick }) => {
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

export default function SoniaFlow() {
    const textareaRef = useRef(null);

    // State
    const [templates, setTemplates] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedTreatment, setSelectedTreatment] = useState("");
    const [sidebarStep, setSidebarStep] = useState(1);
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [animationPhase, setAnimationPhase] = useState('input'); // input | review | result
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [activeStandards, setActiveStandards] = useState([]); // Smart Standards Chips

    // Sonia Specific State
    const [formData, setFormData] = useState({});
    const [chipStates, setChipStates] = useState({});
    const [generatedChips, setGeneratedChips] = useState([]);
    const [previewText, setPreviewText] = useState("");
    const [finalResult, setFinalResult] = useState("");

    // Pill Controls
    const [isPillExpanded, setIsPillExpanded] = useState(false);
    const [activeTextLength, setActiveTextLength] = useState('standard');
    const [forensicLevel, setForensicLevel] = useState('standard');
    const [insuranceType, setInsuranceType] = useState('GKV');
    const [manualMaterial, setManualMaterial] = useState('');

    // Load Templates
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const snap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setTemplates(list);
            } catch (e) {
                console.error("Failed to load templates", e);
                toast.error("Vorlagen konnten nicht geladen werden.");
            }
        };
        fetchTemplates();
    }, []);

    // Derived
    const categories = [...new Set(templates.map(t => t.Kategorie || t.category))].filter(Boolean).sort();
    const treatments = templates.filter(t => (t.Kategorie || t.category) === selectedCategory);

    // Apply Overrides from SettingsManager (The Atelier)
    const currentTemplate = useMemo(() => {
        const base = templates.find(t => t.id === selectedTreatment);
        if (!base) return null;

        try {
            const settings = SettingsManager.load();
            // Assuming treatmentId maps to category or we use a mapping. 
            // For now, let's try to find the override by template ID directly if possible, 
            // or fallback to checking all treatments in settings.
            // The SettingsManager structure is perTreatment -> templateOverrides.
            // We need to know which 'treatment' (e.g. 'filling') this template belongs to.
            // In SoniaFlow, we might not have the clean 'treatmentId' (like 'filling') easily available 
            // if it comes from Firestore with arbitrary categories.
            // Heuristic: Check all treatments in settings for an override for this template ID.

            let overrides = null;
            Object.values(settings.perTreatment).forEach(tSettings => {
                if (tSettings.templateOverrides?.[base.id]) {
                    overrides = tSettings.templateOverrides[base.id];
                }
            });

            if (overrides && overrides.groups) {
                console.log("Applying Atelier Overrides to Template:", base.id);
                return { ...base, groups: overrides.groups };
            }
        } catch (e) {
            console.error("Failed to apply template overrides", e);
        }

        return base;
    }, [templates, selectedTreatment]);

    // Update Standards on Template Select
    useEffect(() => {
        if (currentTemplate) {
            // Parse standards from template (Dashboard logic)
            const defaultsStr = currentTemplate.practiceDefaults?.standardLeistungen || "";
            if (defaultsStr) {
                const standardsList = defaultsStr.split(',').map((s, idx) => ({
                    id: `std-${idx}`,
                    label: s.trim(),
                    active: true
                })).filter(s => s.label);
                setActiveStandards(standardsList);
            } else {
                setActiveStandards([]);
            }

            // Also set defaults for pill controls
            setManualMaterial(currentTemplate.Material || "");
            setActiveTextLength(currentTemplate.aiSettings?.textLength || 'standard');
            setInsuranceType('GKV'); // Default
        }
    }, [currentTemplate]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [inputValue, animationPhase]);

    // Update Preview
    useEffect(() => {
        setPreviewText(buildPreviewText(formData));
    }, [formData]);

    const handleExtraction = async () => {
        if (!inputValue.trim()) {
            toast.error("Bitte diktieren Sie etwas.");
            return;
        }
        if (!currentTemplate) {
            toast.error("Keine Vorlage ausgewählt.");
            return;
        }

        setIsProcessing(true);
        try {
            // Convert V2 to V3 on the fly if needed
            let templateToUse = currentTemplate;

            if (!templateToUse.fields) {
                // V2 -> V3 Migration Layer
                console.log("Converting V2 template to V3 structure for engine...");
                templateToUse = {
                    ...currentTemplate,
                    // Create a V3-compatible structure from V2 data
                    fields: [
                        { id: "tooth", label: "Zahn", type: "string", description: "Betroffener Zahn (FDI)" },
                        { id: "surfaces", label: "Flächen", type: "multiselect", description: "Flächen (m,o,d,b,l)" },
                        { id: "material", label: "Material", type: "string", description: "Verwendetes Material" },
                        { id: "anesthesia", label: "Anästhesie", type: "string", description: "Art der Betäubung" },
                        { id: "diagnosis", label: "Diagnose", type: "text", description: "Befund/Diagnose" },
                        { id: "therapy", label: "Therapie", type: "text", description: "Durchgeführte Therapie" },
                        { id: "medication", label: "Medikamente", type: "string", description: "Verabreichte Medikamente" },
                        { id: "advice", label: "Beratung", type: "text", description: "Patientenberatung" }
                    ],
                    rules: [],
                    renderConfig: { blocks: [] }
                };
            }

            const result = await extractStructuredData(templateToUse, inputValue);

            setFormData(result.data);

            // Generate chips dynamically
            const chips = generateChipsFromTemplate(templateToUse, result.data);
            setGeneratedChips(chips);
            setChipStates(deriveChipStateFromData(result.data, chips));

            setAnimationPhase('review');
        } catch (e) {
            console.error(e);
            toast.error("Fehler: " + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleChipToggle = (chip) => {
        setChipStates(prev => {
            const current = prev[chip.id] || "optional";
            const next = cycleChipState(current);
            setFormData(d => applyChipToData(d, chip, next));
            return { ...prev, [chip.id]: next };
        });
    };

    const handleFinalize = async () => {
        setIsProcessing(true);
        try {
            // 1. Gather Active/Inactive Standards from Chips
            const activeStd = [];
            const inactiveStd = [];

            generatedChips.forEach(chip => {
                const state = chipStates[chip.id] || "optional";
                if (state === "active") activeStd.push(chip.label);
                if (state === "inactive") inactiveStd.push(chip.label);
            });

            // 2. Build Prompts (The Composer)
            const { systemPrompt, userPrompt } = buildGPTPrompts({
                template: currentTemplate, // The V3 template (or migrated V2)
                inputText: inputValue,
                activeStandards: activeStd,
                inactiveStandards: inactiveStd,
                insuranceType: insuranceType,
                textLength: activeTextLength,
                forensicLevel: forensicLevel,
                manualMaterial: manualMaterial
            });

            // 3. Run LLM (The Generator)
            const result = await runLLMProcessing({
                systemPrompt,
                userPrompt,
                model: "gpt-4o-mini" // or from settings
            });

            setFinalResult(result);
            setAnimationPhase('result');

        } catch (e) {
            console.error("Generation failed", e);
            toast.error("Fehler bei der Generierung: " + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setAnimationPhase('input');
        setInputValue("");
        setFormData({});
        setChipStates({});
        setGeneratedChips([]);
        setFinalResult("");
    };

    const uploadMasterTemplate = async () => {
        try {
            await setDoc(doc(db, "Praxen", "1", "Vorlagen", MASTER_TEMPLATE_V3.id), MASTER_TEMPLATE_V3);
            toast.success("Master Template hochgeladen! Bitte Seite neu laden.");
        } catch (e) {
            console.error(e);
            toast.error("Upload fehlgeschlagen.");
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col overflow-hidden h-full w-full">
            <div className="flex flex-1 h-screen overflow-hidden">

                {/* SIDEBAR (Copied from Dashboard) */}
                <aside className="w-[380px] flex flex-col justify-start py-16 px-10" style={{ height: 'calc(100vh - 73px)' }}>
                    <div className="mb-20">
                        <h1 className="text-3xl font-black text-white tracking-tight">Sonia Engine</h1>
                        <p className="text-white/50 text-sm font-medium">Next Gen Documentation</p>
                    </div>

                    <div className="mb-16 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        <AnimatePresence mode="wait" initial={false}>
                            {sidebarStep === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="flex flex-col gap-0 pb-20"
                                >
                                    {categories.map(category => (
                                        <motion.div
                                            key={category}
                                            className="w-full py-2 text-2xl font-semibold font-sans tracking-tight cursor-pointer select-none px-2 text-left text-white/90 hover:text-white drop-shadow-sm"
                                            whileHover={{ scale: 1.05, x: 10 }}
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
                                    className="flex flex-col h-full pb-20"
                                >
                                    <div className="mb-6 flex justify-center flex-shrink-0">
                                        <button
                                            onClick={() => {
                                                if (selectedTreatment) setSelectedTreatment("");
                                                else setSidebarStep(1);
                                            }}
                                            className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm shadow-sm"
                                        >
                                            <FiChevronLeft className="text-3xl" />
                                        </button>
                                    </div>
                                    <div className="flex-1 w-full flex flex-col gap-0">
                                        {treatments.map(treatment => (
                                            <TreatmentListItem
                                                key={treatment.id}
                                                treatment={treatment}
                                                isSelected={selectedTreatment === treatment.id}
                                                onClick={() => {
                                                    setSelectedTreatment(treatment.id);
                                                    if (animationPhase !== 'input') handleReset();
                                                }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 flex flex-col px-8 md:px-24 overflow-y-auto relative" style={{ height: 'calc(100vh - 73px)' }}>
                    <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0 relative">
                        <AnimatePresence mode="wait" initial={false}>

                            {/* PHASE 1: INPUT (Dashboard Style) */}
                            {animationPhase === 'input' && (
                                <motion.div
                                    key="input-phase"
                                    className="w-full h-full flex flex-col justify-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {!selectedTreatment ? (
                                        <div className="flex flex-col items-center justify-center h-full text-white/30">
                                            <FiCpu className="w-24 h-24 mb-6 opacity-50" />
                                            <p className="text-xl font-light">Wähle eine Behandlung</p>
                                        </div>
                                    ) : (
                                        <div className="w-full flex flex-col items-center justify-center min-h-full pb-32 relative">
                                            <motion.h1
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-4xl md:text-6xl font-black text-white mb-12 text-center drop-shadow-lg tracking-tight"
                                            >
                                                {currentTemplate?.title || currentTemplate?.titel || selectedTreatment}
                                            </motion.h1>

                                            {/* PILL CONTAINER */}
                                            <motion.div
                                                initial={{ y: 30, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                className="relative w-full max-w-3xl z-20 rounded-[4.5rem] shadow-2xl ring-1 ring-white/10 bg-white"
                                            >
                                                <div className="relative rounded-[4.5rem] flex flex-col transition-all min-h-[320px] overflow-hidden h-full z-10 bg-white/90 backdrop-blur-md">

                                                    {/* INPUT FIELD */}
                                                    <div
                                                        className="flex-1 relative flex items-center justify-center px-8 py-8 cursor-text"
                                                        onClick={() => textareaRef.current?.focus()}
                                                    >
                                                        <AnimatePresence>
                                                            {!inputValue && !isInputFocused && (
                                                                <motion.div
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    exit={{ opacity: 0 }}
                                                                    className="absolute inset-0 flex items-center justify-center pointer-events-none pb-16"
                                                                >
                                                                    <TypeAnimation
                                                                        sequence={['Sprechen Sie jetzt...', 2000, 'Oder tippen Sie...', 2000]}
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
                                                            onFocus={() => setIsInputFocused(true)}
                                                            onBlur={() => setIsInputFocused(false)}
                                                            className="w-full bg-transparent border-0 text-2xl md:text-4xl font-medium text-gray-800 placeholder-transparent focus:ring-0 focus:outline-none px-4 text-center resize-none outline-none ring-0 relative z-10 overflow-hidden pb-4"
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
                                                                    >
                                                                        {std.active ? <FiCheck className="w-3.5 h-3.5" /> : <FiX className="w-3.5 h-3.5" />}
                                                                        <span>{std.label}</span>
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {/* CONTROLS BAR */}
                                                    <div className="flex justify-center pb-8 pt-4 px-8 relative z-30 w-full">
                                                        <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-[2.5rem] border border-gray-100/80 p-2 flex items-center gap-2">
                                                            <button
                                                                onClick={() => setIsPillExpanded(!isPillExpanded)}
                                                                className="h-11 w-11 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                                                            >
                                                                <FiSliders className="w-5 h-5" />
                                                            </button>
                                                            <div className="w-px h-5 bg-gray-200 mx-1"></div>
                                                            <button
                                                                onClick={() => setIsRecording(!isRecording)}
                                                                className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-red-500 text-white hover:bg-red-600'}`}
                                                            >
                                                                <FiMic className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={handleExtraction}
                                                                disabled={!inputValue.trim() || isProcessing}
                                                                className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-md ${inputValue.trim() ? 'bg-[#ff9900] text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-300'}`}
                                                            >
                                                                {isProcessing ? <FiRefreshCw className="w-5 h-5 animate-spin" /> : <FiArrowRight className="w-5 h-5" />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* EXPANDED SETTINGS */}
                                                    <AnimatePresence>
                                                        {isPillExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden border-t border-gray-200/50 bg-gray-50/30 p-6"
                                                            >
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {/* Mock Settings */}
                                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
                                                                        <span className="text-xs font-bold text-gray-400 uppercase">Textlänge</span>
                                                                        <div className="mt-2 text-sm font-bold text-gray-800">{activeTextLength}</div>
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setForensicLevel(l => l === 'standard' ? 'max' : 'standard')}>
                                                                        <span className="text-xs font-bold text-gray-400 uppercase">Forensik</span>
                                                                        <div className="mt-2 text-sm font-bold text-gray-800">{forensicLevel}</div>
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 text-center cursor-pointer hover:bg-gray-50" onClick={() => setInsuranceType(t => t === 'GKV' ? 'PKV' : 'GKV')}>
                                                                        <span className="text-xs font-bold text-gray-400 uppercase">Versicherung</span>
                                                                        <div className="mt-2 text-sm font-bold text-gray-800">{insuranceType}</div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* PHASE 2: REVIEW (Sonia Analysis) */}
                            {animationPhase === 'review' && (
                                <motion.div
                                    key="review-phase"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="w-full h-full pt-10 pb-20"
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <button onClick={() => setAnimationPhase('input')} className="text-white/60 hover:text-white flex items-center gap-2 font-medium transition-colors">
                                            <FiChevronLeft /> Zurück zum Diktat
                                        </button>
                                        <h2 className="text-3xl font-black text-white">Sonia's Analyse</h2>
                                        <div className="w-24"></div> {/* Spacer */}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* CHIPS COLUMN */}
                                        <div className="lg:col-span-7 space-y-6">
                                            {["dictation", "standard", "critical"].map(group => {
                                                const chips = generatedChips.filter(c => c.group === group);
                                                const meta = CHIP_GROUP_META[group];
                                                if (!chips.length) return null;

                                                return (
                                                    <div key={group} className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${meta.accent}`}>
                                                                {meta.label}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {chips.map(chip => (
                                                                <ActionChip
                                                                    key={chip.id}
                                                                    chip={chip}
                                                                    state={chipStates[chip.id] || "optional"}
                                                                    onToggle={handleChipToggle}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* PREVIEW COLUMN */}
                                        <div className="lg:col-span-5">
                                            <div className="sticky top-8 space-y-6">
                                                <div className="bg-gray-900/80 backdrop-blur-md text-white rounded-3xl p-8 shadow-2xl border border-white/10">
                                                    <div className="flex items-center gap-3 mb-6 text-white/50 text-xs font-bold uppercase tracking-widest">
                                                        <FiFileText /> Live Preview
                                                    </div>
                                                    <div className="prose prose-invert prose-sm max-w-none">
                                                        <p className="leading-relaxed text-lg">{previewText || "Warte auf Input..."}</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleFinalize}
                                                    className="w-full py-4 rounded-2xl bg-[#ff9900] text-white font-bold text-lg shadow-xl hover:bg-orange-600 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                                                >
                                                    <FiCheck /> Fertigstellen
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* PHASE 3: RESULT */}
                            {animationPhase === 'result' && (
                                <motion.div
                                    key="result-phase"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="max-w-3xl mx-auto pt-20 text-center"
                                >
                                    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-10 shadow-2xl text-left">
                                        <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                                            <h2 className="text-2xl font-black text-gray-900">Dokumentation</h2>
                                            <button onClick={() => { navigator.clipboard.writeText(finalResult); toast.success("Kopiert!"); }} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-bold text-sm">
                                                <FiCopy /> Kopieren
                                            </button>
                                        </div>
                                        <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">{finalResult || "Generiere..."}</p>
                                    </div>

                                    <div className="mt-8 flex justify-center">
                                        <button onClick={handleReset} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold backdrop-blur-md transition-all flex items-center gap-2">
                                            <FiRefreshCw /> Neue Behandlung
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
