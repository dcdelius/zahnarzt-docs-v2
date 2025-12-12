/**
 * TreatmentSetupWizard - Apple-Style Edition
 * 
 * Categories from a dentist's perspective:
 * 1. Dokumentation/Rechtlich - Was immer dokumentiert werden soll
 * 2. Anästhesie-Präferenz - Wie der Zahnarzt üblicherweise betäubt
 * 3. Arbeitsmethodik - Kofferdam, Kariesdetektor etc.
 * 4. Tiefe Karies - Defaults für schwierige Fälle
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, FileText, Syringe, Wrench, ShieldAlert, X } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import {
    type PracticeProfile,
    type TreatmentDefaults,
    type WizardTreatmentDefaults,
    loadPracticeProfile,
    savePracticeProfile,
    getTreatmentDefaults,
    DEFAULT_PROFILE,
    STORAGE_KEY
} from '../models/PracticeProfile';

// Types


// Sleek Card Component
function SettingsCard({
    title,
    icon: Icon,
    children,
    delay = 0
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg shadow-black/5 overflow-hidden"
        >
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-medium text-slate-800">{title}</span>
            </div>
            <div className="p-4 space-y-1">
                {children}
            </div>
        </motion.div>
    );
}

// Sleek Toggle Row
function ToggleRow({
    label,
    sublabel,
    checked,
    onChange,
    price,
}: {
    label: string;
    sublabel?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    price?: string;
}) {
    return (
        <motion.div
            className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-slate-50/50 transition-colors -mx-2"
            whileTap={{ scale: 0.995 }}
        >
            <div className="flex-1 min-w-0 pr-4">
                <div className="text-sm font-medium text-slate-800">{label}</div>
                {sublabel && (
                    <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>
                )}
            </div>
            <div className="flex items-center gap-3">
                {price && checked && (
                    <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs font-medium text-emerald-600"
                    >
                        {price}
                    </motion.span>
                )}
                <Switch
                    checked={checked}
                    onCheckedChange={onChange}
                />
            </div>
        </motion.div>
    );
}

// Segmented Control (Apple-style)
function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`
            relative flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-200
            ${value === option.value
                            ? 'text-slate-800'
                            : 'text-slate-500 hover:text-slate-700'}
          `}
                >
                    {value === option.value && (
                        <motion.div
                            layoutId="segment-active"
                            className="absolute inset-0 bg-white rounded-lg shadow-sm"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                    )}
                    <span className="relative z-10">{option.label}</span>
                </button>
            ))}
        </div>
    );
}

export default function TreatmentSetupWizard({
    isOpen,
    onClose,
    onComplete,
}: {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (profile: PracticeProfile) => void;
}) {
    // State
    const [settings, setSettings] = useState<Omit<WizardTreatmentDefaults, 'setupComplete' | 'updatedAt'>>(() => {
        const profile = loadPracticeProfile();
        const existing = getTreatmentDefaults(profile, 'fuellung');

        if (existing && existing.dokumentation && existing.anaesthesie && existing.methodik && existing.tiefKaries) {
            // We have a full existing profile, use it
            // (We cast because we verified existence, though strictly we might want validation)
            return existing as Omit<WizardTreatmentDefaults, 'setupComplete' | 'updatedAt'>;
        }

        // Fallback Defaults
        return {
            dokumentation: {
                aufklaerungImmer: true,
                alternativenBesprochen: true,
                risikenErklaert: true,
            },
            anaesthesie: {
                ukSeitenzahn: 'leitung',
                oberflaecheImmer: true,
            },
            methodik: {
                kofferdamStandard: true,
                kariesdetektorBeiZweifel: false,
            },
            tiefKaries: {
                unterfuellungStandard: true,
            },
            questionLevel: 'standard',
        };
    });

    const handleSave = () => {
        const profile: PracticeProfile = {
            id: 'default',
            treatments: {
                fuellung: {
                    ...settings,
                    setupComplete: true,
                    updatedAt: new Date().toISOString(),
                },
            },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        onComplete(profile);
        onClose();
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="relative w-full max-w-lg bg-gradient-to-br from-white to-slate-50 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-white/50 max-h-[90vh] overflow-y-auto overflow-x-hidden scrollbar-hide"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="px-8 py-10">
                            {/* Header */}
                            <div className="text-center mb-10">
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white mb-5 shadow-xl shadow-slate-900/20"
                                >
                                    <Sparkles className="w-8 h-8" />
                                </motion.div>
                                <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                                    Füllung einrichten
                                </h1>
                                <p className="text-slate-500 font-medium">
                                    Definiere deine Praxis-Standards für Füllungen
                                </p>
                            </div>

                            {/* Settings Cards */}
                            <div className="space-y-4">

                                {/* Dokumentation */}
                                <SettingsCard title="Dokumentation & Rechtlich" icon={FileText} delay={0.1}>
                                    <ToggleRow
                                        label="Aufklärung dokumentieren"
                                        sublabel="Patient wurde über Behandlung aufgeklärt"
                                        checked={settings.dokumentation.aufklaerungImmer}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            dokumentation: { ...s.dokumentation, aufklaerungImmer: v }
                                        }))}
                                    />
                                    <ToggleRow
                                        label="Alternativen besprochen"
                                        sublabel="Therapiealternativen wurden erläutert"
                                        checked={settings.dokumentation.alternativenBesprochen}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            dokumentation: { ...s.dokumentation, alternativenBesprochen: v }
                                        }))}
                                    />
                                    <ToggleRow
                                        label="Risiken erklärt"
                                        sublabel="Über Behandlungsrisiken informiert"
                                        checked={settings.dokumentation.risikenErklaert}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            dokumentation: { ...s.dokumentation, risikenErklaert: v }
                                        }))}
                                    />
                                </SettingsCard>

                                {/* Anästhesie */}
                                <SettingsCard title="Anästhesie" icon={Syringe} delay={0.2}>
                                    <div className="py-2">
                                        <div className="text-sm font-medium text-slate-800 mb-1">
                                            UK Seitenzähne (34-38, 44-48)
                                        </div>
                                        <div className="text-xs text-slate-500 mb-3">
                                            Welche Anästhesie bevorzugst du?
                                        </div>
                                        <SegmentedControl
                                            options={[
                                                { value: 'leitung', label: 'Leitung' },
                                                { value: 'infiltration', label: 'Infiltr.' },
                                                { value: 'ila', label: 'ILA' },
                                                { value: 'fragen', label: 'Fragen' },
                                            ]}
                                            value={settings.anaesthesie.ukSeitenzahn}
                                            onChange={(v) => setSettings(s => ({
                                                ...s,
                                                anaesthesie: { ...s.anaesthesie, ukSeitenzahn: v }
                                            }))}
                                        />
                                    </div>
                                    <ToggleRow
                                        label="Oberflächenanästhesie"
                                        sublabel="GOZ 0080 immer vor Injektion"
                                        checked={settings.anaesthesie.oberflaecheImmer}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            anaesthesie: { ...s.anaesthesie, oberflaecheImmer: v }
                                        }))}
                                        price="+7,25€"
                                    />
                                </SettingsCard>

                                {/* Arbeitsmethodik */}
                                <SettingsCard title="Arbeitsmethodik" icon={Wrench} delay={0.3}>
                                    <ToggleRow
                                        label="Kofferdam standardmäßig"
                                        sublabel="GOZ 2040 / BEMA 12"
                                        checked={settings.methodik.kofferdamStandard}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            methodik: { ...s.methodik, kofferdamStandard: v }
                                        }))}
                                        price="+21,74€"
                                    />
                                    <ToggleRow
                                        label="Kariesdetektor bei Zweifel"
                                        sublabel="Analog §6 GOZ, bei selektiver Exkavation"
                                        checked={settings.methodik.kariesdetektorBeiZweifel}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            methodik: { ...s.methodik, kariesdetektorBeiZweifel: v }
                                        }))}
                                        price="+16,22€"
                                    />
                                </SettingsCard>

                                {/* Tiefe Karies */}
                                <SettingsCard title="Bei tiefer Karies" icon={ShieldAlert} delay={0.4}>
                                    <ToggleRow
                                        label="Unterfüllung standardmäßig"
                                        sublabel="GOZ 2050 bei pulpanahen Kavitäten"
                                        checked={settings.tiefKaries.unterfuellungStandard}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            tiefKaries: { ...s.tiefKaries, unterfuellungStandard: v }
                                        }))}
                                        price="+21,14€"
                                    />
                                    <div className="px-2 py-3 text-xs text-slate-500 bg-amber-50/50 rounded-lg border border-amber-100 mt-2">
                                        Cp/P wird automatisch abgefragt wenn "Caries profunda" oder "Pulpaeröffnung" erkannt wird.
                                    </div>
                                </SettingsCard>

                                {/* Finishing */}
                                <SettingsCard title="Finishing" icon={Sparkles} delay={0.5}>
                                    <ToggleRow
                                        label="Fluoridierung standardmäßig"
                                        sublabel="BEMA IP4 / GOZ 1020 nach Füllung"
                                        checked={(settings as any).finishing?.fluoridImmer ?? false}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            finishing: { ...(s as any).finishing, fluoridImmer: v }
                                        }))}
                                        price="+5,94€"
                                    />
                                    <ToggleRow
                                        label="Politursequenz dokumentieren"
                                        sublabel="Forensische Absicherung"
                                        checked={(settings as any).finishing?.politurImmer ?? true}
                                        onChange={(v) => setSettings(s => ({
                                            ...s,
                                            finishing: { ...(s as any).finishing, politurImmer: v }
                                        }))}
                                    />
                                </SettingsCard>

                                {/* Question Level - NEW */}
                                <SettingsCard title="Rückfragen nach Diktat" icon={Sparkles} delay={0.6}>
                                    <div className="py-2">
                                        <div className="text-sm font-medium text-slate-800 mb-1">
                                            Wie viel nachfragen?
                                        </div>
                                        <div className="text-xs text-slate-500 mb-3">
                                            Steuert, welche Rückfragen nach dem Diktat erscheinen
                                        </div>
                                        <SegmentedControl
                                            options={[
                                                { value: 'minimal', label: 'Minimal' },
                                                { value: 'standard', label: 'Standard' },
                                                { value: 'aggressive', label: 'Aggressiv' },
                                            ]}
                                            value={(settings as any).questionLevel || 'standard'}
                                            onChange={(v) => setSettings(s => ({
                                                ...s,
                                                questionLevel: v
                                            }))}
                                        />
                                    </div>
                                    <div className="px-2 py-3 text-xs text-slate-500 bg-blue-50/50 rounded-lg border border-blue-100 mt-2 space-y-1">
                                        <div><strong>Minimal:</strong> Nur kontextrelevante Fragen (tiefe Karies → Cp?)</div>
                                        <div><strong>Standard:</strong> + Optimierung (Kofferdam?, Röntgen?)</div>
                                        <div><strong>Aggressiv:</strong> + Opportunistisch (PSI?, 01?)</div>
                                    </div>
                                </SettingsCard>

                            </div>

                            {/* Save Button */}
                            <motion.div
                                className="mt-10"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <button
                                    onClick={handleSave}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold text-lg 
                                   shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 hover:scale-[1.02]
                                   transition-all duration-300 flex items-center justify-center gap-3
                                   active:scale-[0.98]"
                                >
                                    Standards speichern
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

// Helpers are now in models/PracticeProfile.ts
export { STORAGE_KEY };
export type { PracticeProfile, TreatmentDefaults };
