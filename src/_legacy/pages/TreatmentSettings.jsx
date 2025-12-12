/**
 * TreatmentSettings - Treatment-specific settings page
 * 
 * Tabs:
 * 1. Chip Defaults - 3-column drag & drop
 * 2. Material & Farbe - Default material, shade, quick-select
 * 3. Text - Length, forensic level
 * 4. Abrechnung - Insurance, billing codes
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiGrid, FiDroplet, FiFileText, FiDollarSign } from 'react-icons/fi';
import { getTreatment } from '../sonia/behandlungen';
import { SettingsManager } from '../sonia/settings/settingsManager';
import ChipConfigPanel from '../components/ChipConfigPanel';

// ═══════════════════════════════════════════════════════════════════════════
// Material Tab
// ═══════════════════════════════════════════════════════════════════════════

function MaterialTab({ treatmentId, settings, onChange }) {
    const treatment = getTreatment(treatmentId);
    const defaults = treatment?.defaults || {};

    const quickMaterials = [
        'Tetric EvoCeram',
        'Venus Diamond',
        'Filtek Supreme',
        'GrandioSO',
        'Estelite Sigma'
    ];

    const shades = ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'C1', 'C2', 'D2', 'D3'];

    return (
        <div className="space-y-8">
            {/* Default Material */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Standard-Material
                </label>
                <input
                    type="text"
                    value={settings.defaultMaterial || defaults.material || ''}
                    onChange={(e) => onChange('defaultMaterial', e.target.value)}
                    placeholder="z.B. Tetric EvoCeram"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />

                <div className="flex flex-wrap gap-2 mt-3">
                    {quickMaterials.map(mat => (
                        <button
                            key={mat}
                            onClick={() => onChange('defaultMaterial', mat)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${settings.defaultMaterial === mat
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {mat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Default Shade */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Standard-Farbe
                </label>
                <div className="flex flex-wrap gap-2">
                    {shades.map(shade => (
                        <button
                            key={shade}
                            onClick={() => onChange('defaultShade', shade)}
                            className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${(settings.defaultShade || defaults.shade) === shade
                                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {shade}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Text Tab
// ═══════════════════════════════════════════════════════════════════════════

function TextTab({ settings, onChange }) {
    const textLengths = [
        { id: 'kurz', label: 'Kurz', desc: 'Minimal, schnell' },
        { id: 'mittel', label: 'Mittel', desc: 'Ausgewogen' },
        { id: 'lang', label: 'Ausführlich', desc: 'Maximale Details' }
    ];

    const forensicLevels = [
        { id: 'minimal', label: 'Minimal', desc: 'Nur das Nötigste' },
        { id: 'standard', label: 'Standard', desc: 'Empfohlen' },
        { id: 'detailed', label: 'Detailliert', desc: 'Vollständig forensisch' }
    ];

    return (
        <div className="space-y-8">
            {/* Text Length */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Textlänge
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {textLengths.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onChange('textLength', opt.id)}
                            className={`p-4 rounded-xl text-left transition-all ${(settings.textLength || 'mittel') === opt.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <div className="font-bold text-sm">{opt.label}</div>
                            <div className={`text-xs mt-1 ${(settings.textLength || 'mittel') === opt.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                {opt.desc}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Forensic Level */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Forensik-Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {forensicLevels.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onChange('forensicLevel', opt.id)}
                            className={`p-4 rounded-xl text-left transition-all ${(settings.forensicLevel || 'standard') === opt.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <div className="font-bold text-sm">{opt.label}</div>
                            <div className={`text-xs mt-1 ${(settings.forensicLevel || 'standard') === opt.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                {opt.desc}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Billing Tab
// ═══════════════════════════════════════════════════════════════════════════

function BillingTab({ settings, onChange }) {
    return (
        <div className="space-y-8">
            {/* Insurance Type */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                    Standard-Versicherung
                </label>
                <div className="flex gap-3">
                    {['GKV', 'PKV'].map(type => (
                        <button
                            key={type}
                            onClick={() => onChange('defaultInsurance', type)}
                            className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${(settings.defaultInsurance || 'GKV') === type
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <div className="font-medium text-gray-900">Abrechnungscodes anzeigen</div>
                        <div className="text-xs text-gray-500">BEMA/GOZ Codes in der Dokumentation</div>
                    </div>
                    <button
                        onClick={() => onChange('showBillingCodes', !settings.showBillingCodes)}
                        className={`w-12 h-7 rounded-full p-1 transition-colors ${settings.showBillingCodes !== false ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                    >
                        <motion.div
                            animate={{ x: settings.showBillingCodes !== false ? 20 : 0 }}
                            className="w-5 h-5 rounded-full bg-white shadow-sm"
                        />
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <div className="font-medium text-gray-900">Auto-Upsell Vorschläge</div>
                        <div className="text-xs text-gray-500">Zusätzliche Leistungen automatisch vorschlagen</div>
                    </div>
                    <button
                        onClick={() => onChange('autoUpsellEnabled', !settings.autoUpsellEnabled)}
                        className={`w-12 h-7 rounded-full p-1 transition-colors ${settings.autoUpsellEnabled !== false ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                    >
                        <motion.div
                            animate={{ x: settings.autoUpsellEnabled !== false ? 20 : 0 }}
                            className="w-5 h-5 rounded-full bg-white shadow-sm"
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
    { id: 'chips', label: 'Chips', icon: FiGrid },
    { id: 'material', label: 'Material', icon: FiDroplet },
    { id: 'text', label: 'Text', icon: FiFileText },
    { id: 'billing', label: 'Abrechnung', icon: FiDollarSign }
];

export default function TreatmentSettings() {
    const { treatmentId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('chips');
    const [settings, setSettings] = useState({});

    const treatment = getTreatment(treatmentId || 'filling');

    // Load settings
    useEffect(() => {
        const loaded = SettingsManager.load();
        const treatmentSettings = loaded.perTreatment?.[treatmentId] || {};
        setSettings({
            defaultMaterial: treatmentSettings.defaultMaterial,
            defaultShade: treatmentSettings.defaultShade,
            textLength: loaded.global?.textLength || 'standard',
            forensicLevel: loaded.global?.forensicLevel || 'standard',
            defaultInsurance: loaded.global?.defaultInsurance || 'GKV',
            showBillingCodes: loaded.global?.showBillingCodes !== false,
            autoUpsellEnabled: treatmentSettings.autoUpsellEnabled !== false
        });
    }, [treatmentId]);

    // Handle settings change
    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));

        // Persist immediately
        const loaded = SettingsManager.load();

        // Global settings
        if (['textLength', 'forensicLevel', 'defaultInsurance', 'showBillingCodes'].includes(key)) {
            loaded.global = { ...loaded.global, [key]: value };
        }

        // Per-treatment settings
        if (['defaultMaterial', 'defaultShade', 'autoUpsellEnabled'].includes(key)) {
            if (!loaded.perTreatment) loaded.perTreatment = {};
            if (!loaded.perTreatment[treatmentId]) loaded.perTreatment[treatmentId] = {};
            loaded.perTreatment[treatmentId][key] = value;
        }

        SettingsManager.save(loaded);
    };

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-[#fafafa] font-['SF_Pro_Display',-apple-system,sans-serif]">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 bg-white/80 backdrop-blur-xl border-b border-black/5 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <FiArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">
                            {treatment?.label || 'Einstellungen'}
                        </h1>
                        <p className="text-xs text-gray-500">Behandlungs-Einstellungen</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-14 bg-white/80 backdrop-blur-xl border-b border-black/5 z-10">
                <div className="max-w-4xl mx-auto px-5">
                    <div className="flex gap-1">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto p-6">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'chips' && (
                        <ChipConfigPanel treatmentId={treatmentId || 'filling'} />
                    )}
                    {activeTab === 'material' && (
                        <MaterialTab
                            treatmentId={treatmentId || 'filling'}
                            settings={settings}
                            onChange={handleChange}
                        />
                    )}
                    {activeTab === 'text' && (
                        <TextTab settings={settings} onChange={handleChange} />
                    )}
                    {activeTab === 'billing' && (
                        <BillingTab settings={settings} onChange={handleChange} />
                    )}
                </motion.div>
            </div>
        </div>
    );
}
