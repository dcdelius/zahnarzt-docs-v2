
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiRotateCcw, FiCheck, FiSettings, FiGrid, FiList } from 'react-icons/fi';
import { SettingsManager } from '../sonia/settings/settingsManager';
import { TREATMENT_CATALOG } from '../sonia/knowledge/treatments/treatmentCatalog';
import { toast } from 'sonner';

export default function SoniaSettingsPage() {
    const [settings, setSettings] = useState(null);
    const [activeTab, setActiveTab] = useState('treatments');
    const [selectedTreatment, setSelectedTreatment] = useState(null);

    useEffect(() => {
        setSettings(SettingsManager.load());
    }, []);

    const handleSave = () => {
        if (settings) {
            SettingsManager.save(settings);
            toast.success("Einstellungen gespeichert");
        }
    };

    const handleReset = () => {
        if (confirm("Wirklich alle Einstellungen zurücksetzen?")) {
            const defaults = SettingsManager.reset();
            setSettings(defaults);
            toast.success("Einstellungen zurückgesetzt");
        }
    };

    const toggleTreatment = (id) => {
        if (!settings) return;
        const current = settings.enabledTreatmentIds;
        const next = current.includes(id)
            ? current.filter(x => x !== id)
            : [...current, id];
        setSettings({ ...settings, enabledTreatmentIds: next });
    };

    if (!settings) return <div className="p-10 text-white">Laden...</div>;

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-white font-sans flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#111]">
                <div className="flex items-center gap-3">
                    <FiSettings className="text-[#ff9900] text-xl" />
                    <h1 className="text-lg font-bold">Sonia Konfiguration</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleReset} className="text-white/40 hover:text-white text-xs uppercase font-bold tracking-wider flex items-center gap-2">
                        <FiRotateCcw /> Reset
                    </button>
                    <button onClick={handleSave} className="bg-[#ff9900] text-black px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-[#ffaa33] transition-colors flex items-center gap-2">
                        <FiSave /> Speichern
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Tabs */}
                <aside className="w-64 bg-[#161616] border-r border-white/5 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('treatments')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'treatments' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        <FiGrid /> Behandlungen
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'global' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        <FiList /> Globale Defaults
                    </button>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'treatments' && (
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-2xl font-bold mb-6">Verfügbare Behandlungen</h2>
                            <p className="text-white/50 mb-8">Wählen Sie aus, welche Behandlungen in Ihrer Praxis verfügbar sein sollen.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.values(TREATMENT_CATALOG).map(t => {
                                    const isEnabled = settings.enabledTreatmentIds.includes(t.id);
                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => toggleTreatment(t.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${isEnabled
                                                ? 'bg-[#ff9900]/10 border-[#ff9900] shadow-[0_0_15px_rgba(255,153,0,0.1)]'
                                                : 'bg-[#222] border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-bold ${isEnabled ? 'text-[#ff9900]' : 'text-white/70'}`}>{t.label}</span>
                                                {isEnabled && <FiCheck className="text-[#ff9900]" />}
                                            </div>
                                            <p className="text-xs text-white/40">{t.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'global' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <h2 className="text-2xl font-bold mb-6">Globale Einstellungen</h2>

                            <div className="bg-[#222] rounded-xl p-6 border border-white/5 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">Standard Versicherung</label>
                                    <div className="flex gap-4">
                                        {['GKV', 'PKV'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setSettings({ ...settings, global: { ...settings.global, defaultInsurance: type } })}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${settings.global.defaultInsurance === type
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">Abrechnungscodes anzeigen</label>
                                    <button
                                        onClick={() => setSettings({ ...settings, global: { ...settings.global, showBillingCodes: !settings.global.showBillingCodes } })}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.global.showBillingCodes ? 'bg-[#ff9900]' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.global.showBillingCodes ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-white/40 uppercase mb-2">Textlänge</label>
                                        <select
                                            value={settings.global.textLength}
                                            onChange={(e) => setSettings({ ...settings, global: { ...settings.global, textLength: e.target.value } })}
                                            className="w-full bg-black/30 rounded-lg border-white/10 text-white text-sm p-2 focus:border-[#ff9900] focus:ring-0"
                                        >
                                            <option value="compact">Kompakt</option>
                                            <option value="standard">Standard</option>
                                            <option value="verbose">Ausführlich</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-white/40 uppercase mb-2">Forensik-Level</label>
                                        <select
                                            value={settings.global.forensicLevel}
                                            onChange={(e) => setSettings({ ...settings, global: { ...settings.global, forensicLevel: e.target.value } })}
                                            className="w-full bg-black/30 rounded-lg border-white/10 text-white text-sm p-2 focus:border-[#ff9900] focus:ring-0"
                                        >
                                            <option value="minimal">Minimal</option>
                                            <option value="standard">Standard</option>
                                            <option value="detailed">Detailliert</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
