import { MASTER_TEMPLATE_V3 } from '../../data/masterTemplate';
import { runLLMProcessing } from '../../../utils/llmService';

export default function SoniaV3Lab() {
    // State
    const [dictation, setDictation] = useState("");
    const [activeStandards, setActiveStandards] = useState(["Oberflächenanästhesie", "Trockenlegung (relativ)", "Adhäsivtechnik", "Mehrschicht-Technik", "Okklusionsprüfung", "Politur", "Fluoridierung"]);
    const [inactiveStandards, setInactiveStandards] = useState([]);
    const [manualMaterial, setManualMaterial] = useState("");
    const [insuranceType, setInsuranceType] = useState("GKV");

    const [previewResult, setPreviewResult] = useState("");
    const [loading, setLoading] = useState(false);

    // Template Management
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");

    // Load Templates
    useEffect(() => {
        const load = async () => {
            try {
                const { db } = await import('../../firebase');
                const { collection, getDocs } = await import('firebase/firestore');
                const snap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
                const dbList = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.systemVersion === 'v3');

                if (dbList.length > 0) {
                    setTemplates(dbList);
                    setSelectedTemplateId(dbList[0].id);
                } else {
                    setTemplates([MASTER_TEMPLATE_V3]);
                    setSelectedTemplateId(MASTER_TEMPLATE_V3.id);
                }
            } catch (e) {
                console.warn("Failed to load templates, using master:", e);
                setTemplates([MASTER_TEMPLATE_V3]);
                setSelectedTemplateId(MASTER_TEMPLATE_V3.id);
            }
        };
        load();
    }, []);

    const activeTemplate = useMemo(() => {
        return templates.find(t => t.id === selectedTemplateId) || MASTER_TEMPLATE_V3;
    }, [templates, selectedTemplateId]);

    // 1. Resolve Case State (The Truth)
    const caseState = useMemo(() => {
        return resolveCaseState({
            template: activeTemplate,
            dictationExtracted: { _rawDictation: dictation }, // Mock extraction for now
            activeStandards,
            inactiveStandards,
            manualMaterial,
            insuranceType
        });
    }, [dictation, activeStandards, inactiveStandards, manualMaterial, insuranceType]);

    // 2. Validate (The Guardrails)
    const validation = useMemo(() => {
        return validateData(activeTemplate, caseState.data);
    }, [caseState, activeTemplate]);

    // Handlers
    const handleToggleStandard = (std) => {
        if (inactiveStandards.includes(std)) {
            setInactiveStandards(prev => prev.filter(s => s !== std));
        } else {
            setInactiveStandards(prev => [...prev, std]);
        }
    };

    const handlePreview = async () => {
        setLoading(true);
        try {
            // 3. Build Prompts (The Instruction)
            const { systemPrompt, userPrompt } = buildGPTPromptsV3({
                template: activeTemplate,
                caseState,
                validation,
                textLength: "standard",
                forensicLevel: "standard"
            });

            // Call LLM
            const llmResult = await runLLMProcessing({
                systemPrompt,
                userPrompt,
                model: "gpt-4o-mini" // Optimized: cheaper model
            });

            const debugOutput = `
=== SYSTEM PROMPT ===
${systemPrompt}

=== USER PROMPT (JSON) ===
${userPrompt}

=== LLM RESULT ===
${llmResult}
      `.trim();

            setPreviewResult(debugOutput);
        } catch (e) {
            setPreviewResult("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
            {/* Left Column: Input */}
            <div className="w-1/3 p-4 border-r border-gray-800 flex flex-col">
                <DictationPanel
                    value={dictation}
                    onChange={setDictation}
                    onExtract={() => alert("Extraction Mock: Dictation added to state.")}
                />
            </div>

            {/* Middle Column: Configuration */}
            <div className="w-1/3 p-4 border-r border-gray-800 overflow-y-auto">
                {/* Template Selector */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template</label>
                    <select
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full bg-black/30 border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.title} ({t.category})
                            </option>
                        ))}
                    </select>
                </div>
                <StandardsChips
                    activeStandards={activeStandards}
                    inactiveStandards={inactiveStandards}
                    onToggle={handleToggleStandard}
                />
                <MaterialsPanel
                    manualMaterial={manualMaterial}
                    onChange={setManualMaterial}
                    insuranceType={insuranceType}
                    onInsuranceChange={setInsuranceType}
                />

                {/* Debug View of State */}
                <div className="mt-8 p-4 bg-black/30 rounded-lg font-mono text-xs text-gray-400">
                    <h3 className="font-bold mb-2 text-gray-500">Resolved State (Debug)</h3>
                    <pre>{JSON.stringify(caseState.data, null, 2)}</pre>
                    <h3 className="font-bold mt-4 mb-2 text-gray-500">Sources</h3>
                    <pre>{JSON.stringify(caseState.sources, null, 2)}</pre>
                </div>
            </div>

            {/* Right Column: Output */}
            <div className="w-1/3 p-4 flex flex-col">
                <IssuesPanel issues={validation.issues} />
                <PreviewPanel
                    onPreview={handlePreview}
                    isLoading={loading}
                    result={previewResult}
                />
            </div>
        </div>
    );
}
