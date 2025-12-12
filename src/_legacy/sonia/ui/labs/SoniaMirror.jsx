import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheck, FiCpu, FiRefreshCw, FiChevronDown } from 'react-icons/fi';
import { analyzeStyle } from '../../knowledge/styleAnalyzer';
import { SettingsManager } from '../../settings/settingsManager';
import { LivePreview } from './LivePreview';
import { TREATMENT_TYPES, TEMPLATES, getTemplatesForTreatment } from '../../templates/catalog';

export const SoniaMirror = () => {
    const [step, setStep] = useState('input'); // input, analyzing, result
    const [inputText, setInputText] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [settings, setSettings] = useState(SettingsManager.load());

    // Selection State (derived from settings)
    const activeTreatmentId = settings.selectedTreatmentType || 'filling';
    const activeTemplateId = settings.selectedTemplateIdByTreatment[activeTreatmentId] || 'master_fill_v3';

    const handleTreatmentChange = (e) => {
        const newTreatmentId = e.target.value;
        const defaultTemplate = getTemplatesForTreatment(newTreatmentId)[0]?.id;

        const newSettings = { ...settings };
        newSettings.selectedTreatmentType = newTreatmentId;
        if (defaultTemplate) {
            newSettings.selectedTemplateIdByTreatment[newTreatmentId] = defaultTemplate;
        }
        setSettings(newSettings);
        SettingsManager.save(newSettings);
    };

    const handleTemplateChange = (e) => {
        const newTemplateId = e.target.value;
        const newSettings = { ...settings };
        newSettings.selectedTemplateIdByTreatment[activeTreatmentId] = newTemplateId;
        setSettings(newSettings);
        SettingsManager.save(newSettings);
    };

    const handleAnalyze = async () => {
        setStep('analyzing');

        // Simulate processing time for "AI feel"
        setTimeout(() => {
            const result = analyzeStyle(inputText);
            setAnalysis(result);

            // Apply analysis to settings
            const newSettings = { ...settings };
            newSettings.global.showBillingCodes = result.settings.global.showBillingCodes;
            newSettings.global.forensicLevel = result.settings.global.forensicLevel;
            newSettings.global.textLength = result.settings.global.textLength;

            // Apply groups override to CURRENT template
            if (!newSettings.perTreatment[activeTreatmentId]) newSettings.perTreatment[activeTreatmentId] = {};
            if (!newSettings.perTreatment[activeTreatmentId].templateOverrides) newSettings.perTreatment[activeTreatmentId].templateOverrides = {};
            newSettings.perTreatment[activeTreatmentId].templateOverrides[activeTemplateId] = result.settings.templateOverrides['master_fill_v3']; // Mapping logic needed here if generic

            setSettings(newSettings);
            setStep('result');
        }, 1500);
    };

    const handleSave = () => {
        SettingsManager.save(settings);
        alert("Dein Stil wurde gespeichert! ✓");
        setStep('input');
        setInputText('');
    };

    // Resolve active template from registry + overrides
    const baseTemplate = TEMPLATES[activeTemplateId];
    const overrides = settings.perTreatment[activeTreatmentId]?.templateOverrides?.[activeTemplateId];

    // If analysis is active, use its result, otherwise use saved overrides, otherwise base
    const activeGroups = analysis
        ? analysis.settings.templateOverrides['master_fill_v3'].groups
        : (overrides?.groups || baseTemplate?.groups || []);

    const activeTemplate = baseTemplate ? { ...baseTemplate, groups: activeGroups } : null;

    if (!activeTemplate) return <div>Template not found: {activeTemplateId}</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header & Template Bar */}
            <div className="bg-white border-b border-gray-200 shadow-sm z-10">
                <div className="py-4 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg">
                            ✨
                        </span>
                        <h1 className="text-xl font-bold text-gray-900">Sonia Mirror</h1>
                    </div>

                    {/* Template Bar */}
                    <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                        <div className="relative">
                            <select
                                value={activeTreatmentId}
                                onChange={handleTreatmentChange}
                                className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-3 pr-8 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {TREATMENT_TYPES.filter(t => settings.enabledTreatmentTypes.includes(t.id)).map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                            <FiChevronDown className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                        </div>

                        <span className="text-gray-300">/</span>

                        <div className="relative">
                            <select
                                value={activeTemplateId}
                                onChange={handleTemplateChange}
                                className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-3 pr-8 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {getTemplatesForTreatment(activeTreatmentId).map(t => (
                                    <option key={t.id} value={t.id}>{t.title || t.id}</option>
                                ))}
                            </select>
                            <FiChevronDown className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-8">
                {step === 'input' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl mx-auto"
                    >
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <label className="block text-lg font-medium text-gray-900 mb-4">
                                Füge hier eine Füllungs-Dokumentation ein, die dir zu 100% gefällt:
                            </label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Bsp: Infiltration Ultracain, Kofferdam, Kariesexkavation..."
                                className="w-full h-64 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-700 font-mono text-sm leading-relaxed"
                            />
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!inputText.trim()}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <FiCpu />
                                    Stil analysieren
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-3 gap-6 text-center text-gray-500 text-sm">
                            <div>
                                <div className="w-10 h-10 mx-auto bg-white rounded-full flex items-center justify-center border border-gray-200 mb-2">1</div>
                                Text einfügen
                            </div>
                            <div>
                                <div className="w-10 h-10 mx-auto bg-white rounded-full flex items-center justify-center border border-gray-200 mb-2">2</div>
                                KI-Analyse
                            </div>
                            <div>
                                <div className="w-10 h-10 mx-auto bg-white rounded-full flex items-center justify-center border border-gray-200 mb-2">3</div>
                                Stil speichern
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center h-[60vh]">
                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6" />
                        <h2 className="text-xl font-medium text-gray-900">Extrahiere Style-DNA...</h2>
                        <p className="text-gray-500 mt-2">Struktur, Wortwahl und Module werden analysiert.</p>
                    </div>
                )}

                {step === 'result' && analysis && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Analyse-Ergebnis</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('input')}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Zurück
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-lg shadow-green-500/20"
                                >
                                    <FiCheck />
                                    Als Standard speichern
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 flex-1 min-h-0">
                            {/* Analysis Details */}
                            <div className="space-y-6 overflow-y-auto pr-2">
                                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <FiCpu className="text-indigo-500" />
                                        Erkannte Merkmale
                                    </h3>
                                    <div className="space-y-2">
                                        {analysis.insights.map((insight, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                                                <FiCheck className="text-green-500 flex-shrink-0" />
                                                {insight}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">Konfigurierte Einstellungen</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Forensik</span>
                                            <span className="font-medium text-gray-900 capitalize">{analysis.settings.global.forensicLevel}</span>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Abrechnung</span>
                                            <span className="font-medium text-gray-900">{analysis.settings.global.showBillingCodes ? 'Anzeigen' : 'Ausblenden'}</span>
                                        </div>
                                        <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                                            <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Aktive Module</span>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {analysis.detectedModules.map(m => (
                                                    <span key={m} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-600">
                                                        {m}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div className="flex flex-col h-full">
                                <h3 className="font-semibold text-gray-900 mb-4">Generierte Vorschau (Sonia)</h3>
                                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <LivePreview
                                        template={activeTemplate}
                                        settings={settings}
                                        structure={analysis?.structure}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
