import React, { useState, useEffect, useMemo } from 'react';
import { FiSave, FiTrash2, FiPlus, FiRefreshCw, FiPlay, FiCheck, FiAlertTriangle, FiCode, FiDownload, FiUpload, FiCopy, FiLayers, FiFileText, FiList, FiShield, FiDollarSign, FiMoreHorizontal } from 'react-icons/fi';
import { TemplateStore } from '../../templates/storage/templateStore';
import { TemplateV3SpecSchema } from '../../templates/schema/templateV3Schema';
import { TREATMENT_TYPES, BUILT_IN_TEMPLATES } from '../../templates/catalog';
import { toast } from 'sonner';

// Default Template Structure
const DEFAULT_TEMPLATE = {
    id: '',
    title: '',
    systemVersion: 'v3',
    treatmentType: 'filling',
    version: 1,
    rulesetId: 'conservative_rules',
    renderSpec: {
        sections: [
            { id: 'summary', required: true, title: 'ZUSAMMENFASSUNG' },
            { id: 'procedure', required: true, title: 'BEHANDLUNGSABLAUF' },
            { id: 'forensic', required: true, title: 'FORENSIK & SICHERHEIT' },
            { id: 'billing', required: false, title: 'ABRECHNUNG' },
            { id: 'extras', required: true, title: 'SONSTIGES' }
        ],
        strict: true
    },
    renderMode: 'deterministic',
    blueprint: {
        summary: 'Zahn {{tooth}} ({{surfaces}}), {{material}}. Diagnose: {{diagnosis}}',
        procedure: '{{procedureLines}}',
        forensic: 'Aufklärung erfolgt. {{risksLines}}',
        billing: '{{billingLines}}',
        extras: '{{dictationExtras}}'
    },
    requiredFacts: ['tooth', 'surfaces', 'material', 'diagnosis'],
    fields: [
        { id: 'tooth', label: 'Zahn', type: 'string' },
        { id: 'surfaces', label: 'Flächen', type: 'multiselect', options: ['m', 'o', 'd'] },
        { id: 'material', label: 'Material', type: 'string' }
    ],
    defaults: {
        insuranceType: 'GKV',
        showBillingCodes: true,
        includeRisks: true,
        forensicLevel: 'standard',
        textLength: 'standard',
        activeStandards: []
    }
};

const KNOWN_TOKENS = [
    { id: 'tooth', label: 'Zahn', type: 'value' },
    { id: 'surfaces', label: 'Flächen', type: 'value' },
    { id: 'surfacesShort', label: 'Flächen (MOD)', type: 'value' },
    { id: 'surfacesPretty', label: 'Flächen (m, o, d)', type: 'value' },
    { id: 'material', label: 'Material (+Farbe)', type: 'value' },
    { id: 'diagnosis', label: 'Diagnose', type: 'value' },
    { id: 'insuranceType', label: 'Versicherung', type: 'value' },
    { id: 'anesthesia', label: 'Anästhesie', type: 'value' },
    { id: 'excavation', label: 'Exkavation', type: 'value' },

    { id: 'procedureLines', label: 'Ablauf (Liste)', type: 'list' },
    { id: 'billingLines', label: 'Abrechnung (Liste)', type: 'list' },
    { id: 'risksLines', label: 'Risiken (Liste)', type: 'list' },
    { id: 'dictationExtras', label: 'Extras (Unmapped)', type: 'list' },

    { id: 'injectedText', label: 'Injected Text (Raw)', type: 'raw' },
    { id: 'dictationRaw', label: 'Diktat (Raw)', type: 'raw' },
];

export default function TemplateStudio() {
    const [templates, setTemplates] = useState([]);
    const [currentTemplate, setCurrentTemplate] = useState(DEFAULT_TEMPLATE);
    const [activeTab, setActiveTab] = useState('summary');

    // Import Modal State
    const [showImport, setShowImport] = useState(false);
    const [importJson, setImportJson] = useState('');

    // Paste Full Modal State
    const [showPasteFull, setShowPasteFull] = useState(false);
    const [pasteFullText, setPasteFullText] = useState('');

    // Dry Run State
    const [testDictation, setTestDictation] = useState('Füllung an 16 mod mit Tetric, ILA, relative Trockenlegung. Patient sehr ängstlich.');
    const [dryRunResult, setDryRunResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = () => {
        const admin = TemplateStore.loadAdminTemplates();
        const builtIn = Object.values(BUILT_IN_TEMPLATES);

        // Merge: Admin overrides Built-in by ID
        const merged = new Map();
        builtIn.forEach(t => merged.set(t.id, { ...t, _source: 'built-in' }));
        admin.forEach(t => merged.set(t.id, { ...t, _source: 'admin' }));
        setTemplates(Array.from(merged.values()));
    };

    const handleNew = () => {
        setCurrentTemplate({ ...DEFAULT_TEMPLATE, id: `tpl_${Date.now()}` });
        setDryRunResult(null);
    };

    const handleLoad = (id) => {
        const tpl = templates.find(t => t.id === id);
        if (tpl) {
            const { _source, ...cleanTpl } = tpl;
            // Ensure defaults
            if (!cleanTpl.blueprint) cleanTpl.blueprint = { ...DEFAULT_TEMPLATE.blueprint };
            if (!cleanTpl.renderMode) cleanTpl.renderMode = 'deterministic';

            // Ensure extras section exists
            if (!cleanTpl.renderSpec.sections.find(s => s.id === 'extras')) {
                cleanTpl.renderSpec.sections.push({ id: 'extras', required: true, title: 'SONSTIGES' });
                cleanTpl.blueprint.extras = '{{dictationExtras}}';
            }

            setCurrentTemplate(JSON.parse(JSON.stringify(cleanTpl)));
            setDryRunResult(null);
        }
    };

    const handleLoadPreset = (presetId) => {
        const preset = BUILT_IN_TEMPLATES[presetId];
        if (preset) {
            const tpl = JSON.parse(JSON.stringify(preset));
            if (!tpl.blueprint) tpl.blueprint = { ...DEFAULT_TEMPLATE.blueprint };
            if (!tpl.renderMode) tpl.renderMode = 'deterministic';

            // Ensure extras section exists
            if (!tpl.renderSpec.sections.find(s => s.id === 'extras')) {
                tpl.renderSpec.sections.push({ id: 'extras', required: true, title: 'SONSTIGES' });
                tpl.blueprint.extras = '{{dictationExtras}}';
            }

            setCurrentTemplate(tpl);
            setDryRunResult(null);
            toast.success(`Preset '${preset.title}' geladen`);
        }
    };

    const handleSave = () => {
        const result = TemplateV3SpecSchema.safeParse(currentTemplate);
        if (!result.success) {
            toast.error('Validierung fehlgeschlagen');
            console.error(result.error);
            return;
        }
        TemplateStore.upsertTemplate(currentTemplate);
        toast.success('Template gespeichert');
        loadTemplates();
    };

    const handleDelete = () => {
        if (!currentTemplate.id) return;
        const existing = templates.find(t => t.id === currentTemplate.id);
        if (existing && existing._source === 'built-in') {
            toast.error('Built-in Templates können nicht gelöscht werden.');
            return;
        }
        if (confirm('Wirklich löschen?')) {
            TemplateStore.deleteTemplate(currentTemplate.id);
            toast.success('Template gelöscht');
            loadTemplates();
            handleNew();
        }
    };

    const handleExport = () => {
        const json = JSON.stringify(currentTemplate, null, 2);
        navigator.clipboard.writeText(json);
        toast.success('JSON in die Zwischenablage kopiert');
    };

    const handleImport = () => {
        try {
            const parsed = JSON.parse(importJson);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            let successCount = 0;
            for (const item of items) {
                const result = TemplateV3SpecSchema.safeParse(item);
                if (result.success) {
                    TemplateStore.upsertTemplate(item);
                    successCount++;
                } else {
                    console.error('Invalid template:', item, result.error);
                }
            }
            if (successCount > 0) {
                toast.success(`${successCount} Templates importiert`);
                loadTemplates();
                setShowImport(false);
                setImportJson('');
                if (!Array.isArray(parsed)) setCurrentTemplate(parsed);
            } else {
                toast.error('Keine gültigen Templates gefunden');
            }
        } catch (e) {
            toast.error('JSON Parse Error: ' + e.message);
            console.error(e);
        }
    };

    const handlePasteFull = () => {
        if (!pasteFullText.trim()) return;

        const sections = {
            summary: '',
            procedure: '',
            forensic: '',
            billing: '',
            extras: ''
        };

        const sectionTitles = {};

        // Split by headers like "=== TITLE ==="
        const parts = pasteFullText.split(/=== (.*?) ===/);

        // parts[0] is text before first header (ignore or append to summary?)
        // parts[1] is first title, parts[2] is first content, etc.

        for (let i = 1; i < parts.length; i += 2) {
            const title = parts[i].trim();
            const content = parts[i + 1].trim();

            let sectionId = 'extras'; // Default
            const t = title.toLowerCase();

            if (t.includes('zusammenfassung') || t.includes('übersicht') || t.includes('summary')) sectionId = 'summary';
            else if (t.includes('ablauf') || t.includes('procedure') || t.includes('behandlung')) sectionId = 'procedure';
            else if (t.includes('forensik') || t.includes('sicherheit') || t.includes('risiko')) sectionId = 'forensic';
            else if (t.includes('abrechnung') || t.includes('billing') || t.includes('kosten')) sectionId = 'billing';
            else if (t.includes('sonstiges') || t.includes('extras')) sectionId = 'extras';

            sections[sectionId] = content;
            sectionTitles[sectionId] = title;
        }

        // Update Template
        const next = JSON.parse(JSON.stringify(currentTemplate));

        // Update Blueprint content
        next.blueprint = { ...next.blueprint, ...sections };

        // Update Section Titles
        next.renderSpec.sections = next.renderSpec.sections.map(s => {
            if (sectionTitles[s.id]) {
                return { ...s, title: sectionTitles[s.id] };
            }
            return s;
        });

        setCurrentTemplate(next);
        setShowPasteFull(false);
        setPasteFullText('');
        toast.success('Blueprint parsed and applied!');
    };

    const handleDryRun = async () => {
        setIsRunning(true);
        setDryRunResult(null);
        try {
            const { extractDictationV3 } = await import('../../extraction/extractDictationV3');
            const { validateData } = await import('../../../engine/validate');
            const { renderTemplateV3 } = await import('../../render/renderTemplateV3');
            const { generateBillingFromState } = await import('../../knowledge/billingEngine');
            const { applyStandards } = await import('../../standards/applyStandards');

            // 1. Extract
            const { extracted, meta } = await extractDictationV3({
                template: currentTemplate,
                rawText: testDictation,
                model: 'gpt-4o-mini'
            });

            // 2. Validate
            const validation = validateData(currentTemplate, extracted);

            // 3. Apply Standards (Chips) -> Deterministic Data & Codes
            // (In a real app, activeStandards would come from UI state, here we take from defaults or mock)
            const activeStandards = currentTemplate.defaults?.activeStandards || [];
            // Mocking some standards for testing if empty
            // if (activeStandards.length === 0) activeStandards.push('Oberflächenanästhesie');

            const standardsResult = applyStandards({
                activeStandards,
                treatmentType: currentTemplate.treatmentType,
                insuranceType: currentTemplate.defaults?.insuranceType || 'GKV'
            });

            // 4. Prepare Data Context
            // Priority: Extracted > Standards > Defaults
            const defaults = currentTemplate.defaults || {};

            const cleanExtracted = Object.fromEntries(
                Object.entries(extracted).filter(([_, v]) => v !== null && v !== undefined && v !== '')
            );

            const mergedState = {
                ...defaults,
                ...standardsResult.dataPatches, // Standards override static defaults
                ...cleanExtracted, // Extraction overrides standards (e.g. if user explicitly says "NO anesthesia")
                meta: extracted.meta || {}
            };

            // 5. Generate Billing from State (Auto-Logic)
            const autoBillingItems = generateBillingFromState({
                caseState: { data: mergedState },
                insuranceType: mergedState.insuranceType || 'GKV',
                treatmentType: currentTemplate.treatmentType
            });

            // Merge Billing: Standards + Auto
            // Deduplicate by code
            const allBillingItems = [...standardsResult.billingItems];
            autoBillingItems.forEach(item => {
                if (!allBillingItems.find(b => b.code === item.code)) {
                    allBillingItems.push(item);
                }
            });

            // Mock Suggestions for Renderer
            const mockSuggestions = allBillingItems.length > 0 ? [{
                id: 'billing_combined',
                billingItems: allBillingItems
            }] : [];

            // 6. Render
            const rendered = renderTemplateV3({
                template: currentTemplate,
                caseState: mergedState, // Pass the FULLY MERGED state to renderer
                validation,
                acceptedSuggestions: mockSuggestions,
                injectedText: [],
                dictationRaw: testDictation,
                dictationExtras: extracted.dictationExtras || []
            });

            setDryRunResult({
                extracted,
                meta,
                validation,
                rendered,
                success: validation.isValid
            });

        } catch (e) {
            toast.error('Dry Run Failed: ' + e.message);
            console.error(e);
        } finally {
            setIsRunning(false);
        }
    };

    const update = (path, value) => {
        setCurrentTemplate(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const parts = path.split('.');
            let current = next;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    current[part] = value;
                } else {
                    if (!current[part] || typeof current[part] !== 'object') current[part] = {};
                    current = current[part];
                }
            }
            return next;
        });
    };

    // Analyze Tokens in Blueprint
    const usedTokens = useMemo(() => {
        const text = Object.values(currentTemplate.blueprint || {}).join(' ');
        const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
        return new Set(matches.map(m => m.slice(2, -2)));
    }, [currentTemplate.blueprint]);

    const groupedTemplates = templates.reduce((acc, t) => {
        const type = t.treatmentType;
        if (!acc[type]) acc[type] = [];
        acc[type].push(t);
        return acc;
    }, {});

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* LEFT: Library */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2"><FiLayers /> Library</h2>
                    <div className="flex gap-2 mt-3">
                        <button onClick={handleNew} className="flex-1 bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1"><FiPlus /> Neu</button>
                        <button onClick={() => setShowImport(true)} className="bg-gray-200 text-gray-700 px-2 py-1.5 rounded text-xs hover:bg-gray-300 flex items-center gap-1"><FiUpload /> Import</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {Object.entries(groupedTemplates).map(([typeId, list]) => {
                        const typeLabel = TREATMENT_TYPES.find(t => t.id === typeId)?.label || typeId;
                        return (
                            <div key={typeId} className="mb-4">
                                <div className="text-xs font-bold text-gray-400 uppercase px-2 mb-1">{typeLabel}</div>
                                <div className="space-y-0.5">
                                    {list.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleLoad(t.id)}
                                            className={`w-full text-left px-3 py-2 rounded text-sm truncate flex items-center justify-between group ${currentTemplate.id === t.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
                                        >
                                            <span className="truncate">{t.title}</span>
                                            {t._source === 'admin' && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Local</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MIDDLE: Text-First Editor */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50">
                {/* Header */}
                <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="font-bold text-lg text-gray-800">Blueprint Editor</h2>
                        <input
                            value={currentTemplate.title}
                            onChange={e => update('title', e.target.value)}
                            className="border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 font-medium text-gray-700"
                            placeholder="Template Title"
                        />
                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-mono">{currentTemplate.id}</span>
                    </div>
                    <div className="flex gap-2">
                        {/* Paste Full Button */}
                        <button onClick={() => setShowPasteFull(true)} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-100 flex items-center gap-1 border border-indigo-100">
                            <FiFileText /> Paste Full
                        </button>

                        {/* Preset Loader */}
                        <div className="relative group mr-2">
                            <button className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-200 flex items-center gap-1">
                                <FiCopy /> Preset
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-64 bg-white border rounded shadow-xl hidden group-hover:block z-50 max-h-64 overflow-y-auto">
                                {Object.values(BUILT_IN_TEMPLATES).map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleLoadPreset(t.id)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                    >
                                        {t.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleExport} className="text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded text-sm flex items-center gap-2"><FiDownload /> Export</button>
                        <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded text-sm flex items-center gap-2"><FiTrash2 /> Löschen</button>
                        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 flex items-center gap-2 shadow-sm"><FiSave /> Speichern</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-white px-4 gap-1">
                    {[
                        { id: 'summary', label: 'Zusammenfassung', icon: FiFileText },
                        { id: 'procedure', label: 'Behandlungsablauf', icon: FiList },
                        { id: 'forensic', label: 'Forensik', icon: FiShield },
                        { id: 'billing', label: 'Abrechnung', icon: FiDollarSign },
                        { id: 'extras', label: 'Sonstiges', icon: FiMoreHorizontal },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        >
                            <tab.icon /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Editor Area */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-2 bg-gray-50 border-b text-xs text-gray-500 flex justify-between items-center">
                            <span>Blueprint Text (Markdown supported)</span>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={currentTemplate.renderSpec.sections.find(s => s.id === activeTab)?.required}
                                        onChange={e => {
                                            const sections = [...currentTemplate.renderSpec.sections];
                                            const idx = sections.findIndex(s => s.id === activeTab);
                                            if (idx >= 0) {
                                                sections[idx] = { ...sections[idx], required: e.target.checked };
                                                update('renderSpec.sections', sections);
                                            }
                                        }}
                                    />
                                    Required Section
                                </label>
                            </div>
                        </div>
                        <textarea
                            value={currentTemplate.blueprint?.[activeTab] || ''}
                            onChange={e => update(`blueprint.${activeTab}`, e.target.value)}
                            className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed"
                            placeholder={`Enter ${activeTab} blueprint here... Use {{tokens}} to insert data.`}
                        />
                    </div>

                    {/* Meta Controls */}
                    <div className="mt-4 grid grid-cols-4 gap-4">
                        <div className="bg-white p-3 rounded border">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID</label>
                            <input value={currentTemplate.id} onChange={e => update('id', e.target.value)} className="w-full text-sm outline-none" />
                        </div>
                        <div className="bg-white p-3 rounded border">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Treatment Type</label>
                            <select value={currentTemplate.treatmentType} onChange={e => update('treatmentType', e.target.value)} className="w-full text-sm outline-none bg-transparent">
                                {TREATMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="bg-white p-3 rounded border">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Render Mode</label>
                            <select value={currentTemplate.renderMode} onChange={e => update('renderMode', e.target.value)} className="w-full text-sm outline-none bg-transparent">
                                <option value="deterministic">Deterministic (Strict)</option>
                                <option value="llm_polish">LLM Polish</option>
                                <option value="llm_generate">LLM Generate (Legacy)</option>
                            </select>
                        </div>
                        <div className="bg-white p-3 rounded border">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ruleset</label>
                            <input value={currentTemplate.rulesetId} onChange={e => update('rulesetId', e.target.value)} className="w-full text-sm outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Tokens & Dry Run */}
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                {/* Tokens Panel */}
                <div className="flex-1 overflow-y-auto border-b border-gray-200">
                    <div className="p-3 bg-gray-50 border-b font-bold text-xs text-gray-500 uppercase">Available Tokens</div>
                    <div className="p-2 space-y-1">
                        {KNOWN_TOKENS.map(token => {
                            const isUsed = usedTokens.has(token.id);
                            return (
                                <div key={token.id} className={`flex items-center justify-between px-3 py-2 rounded text-sm ${isUsed ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-50'}`}>
                                    <div className="flex flex-col">
                                        <span className="font-mono font-bold text-xs">{`{{${token.id}}}`}</span>
                                        <span className="text-[10px] opacity-75">{token.label}</span>
                                    </div>
                                    {isUsed && <FiCheck className="text-green-600" />}
                                </div>
                            );
                        })}
                        {/* Show warning for unknown tokens */}
                        {Array.from(usedTokens).filter(t => !KNOWN_TOKENS.find(k => k.id === t)).map(unknown => (
                            <div key={unknown} className="flex items-center justify-between px-3 py-2 rounded text-sm bg-red-50 text-red-800 border border-red-100">
                                <div className="flex flex-col">
                                    <span className="font-mono font-bold text-xs">{`{{${unknown}}}`}</span>
                                    <span className="text-[10px]">Unknown Token!</span>
                                </div>
                                <FiAlertTriangle className="text-red-500" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dry Run Panel */}
                <div className="h-1/2 flex flex-col border-t border-gray-200 bg-gray-50">
                    <div className="p-3 bg-white border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FiPlay /> Dry Run</h3>
                        <button
                            onClick={handleDryRun}
                            disabled={isRunning}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isRunning ? 'Running...' : 'Test'}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        <textarea
                            value={testDictation}
                            onChange={e => setTestDictation(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm h-24 resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Test Dictation..."
                        />

                        {dryRunResult && (
                            <div className="space-y-3">
                                {dryRunResult.success ? (
                                    <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-xs font-bold flex items-center gap-2">
                                        <FiCheck /> Valid Extraction
                                    </div>
                                ) : (
                                    <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-xs font-bold flex items-center gap-2">
                                        <FiAlertTriangle /> Validation Failed
                                    </div>
                                )}

                                <div className="bg-white border rounded overflow-hidden">
                                    <div className="bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase">Blueprint Render</div>
                                    <pre className="p-2 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {dryRunResult.rendered?.fullText}
                                    </pre>
                                </div>

                                <div className="bg-white border rounded overflow-hidden">
                                    <div className="bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase">Extracted Data</div>
                                    <pre className="p-2 text-[10px] font-mono overflow-x-auto max-h-40">
                                        {JSON.stringify(dryRunResult.extracted, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Import Modal Overlay */}
            {showImport && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-[600px] flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Import JSON</h3>
                            <button onClick={() => setShowImport(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-4 flex-1">
                            <textarea
                                value={importJson}
                                onChange={e => setImportJson(e.target.value)}
                                className="w-full h-64 border rounded p-3 font-mono text-xs"
                                placeholder="Paste Template JSON here..."
                            />
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setShowImport(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Abbrechen</button>
                            <button onClick={handleImport} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Importieren</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Paste Full Modal Overlay */}
            {showPasteFull && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-[800px] flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Paste Full Blueprint</h3>
                            <button onClick={() => setShowPasteFull(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                            <p className="text-xs text-gray-500 mb-2">
                                Paste your full text here. Use headers like <code>=== TITLE ===</code> to separate sections.
                                Recognized sections: Summary, Procedure, Forensic, Billing, Extras.
                            </p>
                            <textarea
                                value={pasteFullText}
                                onChange={e => setPasteFullText(e.target.value)}
                                className="flex-1 w-full border rounded p-3 font-mono text-xs h-96 resize-none"
                                placeholder={`=== ZUSAMMENFASSUNG ===\nZahn {{tooth}}...\n\n=== BEHANDLUNGSABLAUF ===\n...`}
                            />
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setShowPasteFull(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Abbrechen</button>
                            <button onClick={handlePasteFull} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Parse & Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
