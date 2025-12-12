/**
 * Docudent V5 Page - Light & Friendly Edition
 * 
 * Design Philosophy:
 * - Warm, light background with soft pastels
 * - Gentle gradients (lavender, peach, mint)
 * - Smaller, rounder, modern buttons
 * - Friendly, approachable feel
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/button';
import { Mic, MicOff, Sparkles, FileText, Copy, Check, AlertCircle, Zap, ArrowRight, ArrowLeft, CircleDot, CheckCircle2, Settings, X, ChevronDown, Euro } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useBillingV5Controller } from '../hooks/useBillingV5Controller';
import { useState, useEffect } from 'react';
import TreatmentSetupWizard from '../components/TreatmentSetupWizard';
import { loadPracticeProfile, getTreatmentDefaults, type PracticeProfile, type TreatmentDefaults } from '../models/PracticeProfile';
import { lookupBillingCode } from '../../core/billing/knowledgeBase/logic/treatmentEngine';



// ═══════════════════════════════════════════════════════════════
// STEP DEFINITIONS
// ═══════════════════════════════════════════════════════════════

type Step = 'dictation' | 'confirm' | 'customize' | 'result';

const STEPS: { id: Step; label: string }[] = [
    { id: 'dictation', label: 'Diktat' },
    { id: 'confirm', label: 'Prüfen' },
    { id: 'customize', label: 'Anpassen' },
    { id: 'result', label: 'Fertig' },
];

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
};

// ═══════════════════════════════════════════════════════════════
// SOFT BACKGROUND
// ═══════════════════════════════════════════════════════════════

function SoftBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-purple-50/30 to-rose-50/40" />

            {/* Soft organic blobs */}
            <motion.div
                className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-60"
                style={{
                    background: 'radial-gradient(circle, rgba(216, 180, 254, 0.4) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                }}
                animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full opacity-50"
                style={{
                    background: 'radial-gradient(circle, rgba(253, 186, 116, 0.3) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                }}
                animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute -bottom-20 right-1/3 w-[350px] h-[350px] rounded-full opacity-40"
                style={{
                    background: 'radial-gradient(circle, rgba(167, 243, 208, 0.4) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                }}
                animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// STEP INDICATOR
// ═══════════════════════════════════════════════════════════════

function StepIndicator({ currentStep, completedSteps }: { currentStep: Step; completedSteps: Step[] }) {
    return (
        <div className="flex items-center justify-center gap-3 mb-10">
            {STEPS.map((step, i) => {
                const isActive = step.id === currentStep;
                const isCompleted = completedSteps.includes(step.id);
                const isPast = STEPS.findIndex(s => s.id === currentStep) > i;

                return (
                    <div key={step.id} className="flex items-center">
                        <div className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                            transition-all duration-300
                            ${isActive
                                ? 'bg-white shadow-md text-purple-600'
                                : isCompleted || isPast
                                    ? 'text-emerald-600'
                                    : 'text-gray-400'}
                        `}>
                            {isCompleted || isPast ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : isActive ? (
                                <motion.div
                                    className="w-2 h-2 rounded-full bg-purple-500"
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-gray-300" />
                            )}
                            <span>{step.label}</span>
                        </div>

                        {i < STEPS.length - 1 && (
                            <div className={`w-6 h-[2px] mx-1 rounded-full ${isPast ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: DICTATION
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// STEP 1: DICTATION - PILL SHAPED INPUT
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// STEP 1: DICTATION - V3 SONIA STYLE (Refined)
// ═══════════════════════════════════════════════════════════════

function DictationStep({
    dictation,
    setDictation,
    insuranceType,
    setInsuranceType,
    hasZuzahlung,
    setHasZuzahlung,
    onAnalyze,
    isLoading,
    onOpenSetup
}: {
    dictation: string;
    setDictation: (v: string) => void;
    insuranceType: 'GKV' | 'PKV';
    setInsuranceType: (v: 'GKV' | 'PKV') => void;
    hasZuzahlung: boolean;
    setHasZuzahlung: (v: boolean) => void;
    onAnalyze: () => void;
    isLoading: boolean;
    onOpenSetup: () => void;
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Lazy load defaults on mount to avoid re-reading localStorage on every render
    const [defaults] = useState(() =>
        getTreatmentDefaults(loadPracticeProfile(), 'fuellung')
    );

    return (
        <motion.div {...pageTransition} className="max-w-2xl mx-auto flex flex-col justify-center min-h-[60vh]">
            {/* Header */}
            <div className="text-center mb-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.8 }}
                    className="inline-block mb-2 px-3 py-1 rounded-full bg-white/50 border border-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-slate-400 shadow-sm"
                >
                    Schritt 1 von 4
                </motion.div>
                <motion.h1
                    className="text-3xl font-semibold text-slate-800 tracking-tight"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Behandlungsdiktat
                </motion.h1>
            </div>

            {/* MAIN INPUT CARD */}
            <motion.div
                className="relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/40 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {/* Visual Header Inside Card */}
                <div className="flex justify-center items-center px-8 py-4 border-b border-black/[0.02]">
                    <div className="flex gap-6 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                        <span>Zahn</span>
                        <span>Flächen</span>
                        <span>Befund</span>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-0 min-h-[300px]">
                    <textarea
                        value={dictation}
                        onChange={(e) => setDictation(e.target.value)}
                        placeholder="Sprechen Sie z.B. &#10;» 36 mod, Caries profunda, Leitungsanästhesie «"
                        className="w-full h-full min-h-[300px] p-8 bg-transparent border-none resize-none focus:ring-0 focus:outline-none text-2xl font-light text-slate-700 placeholder:text-slate-300 text-center leading-relaxed selection:bg-indigo-50/50"
                        autoFocus
                    />
                </div>
            </motion.div>

            {/* FLOATING CONTROL STACK */}
            <div className="relative -mt-8 z-20 flex flex-col items-center">

                {/* 1. THE CONTROL PILL */}
                <motion.div
                    className="bg-white/90 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] rounded-full border border-white/40 p-1 flex items-center gap-1"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                >
                    {/* Settings Toggle (Expand) */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 
                            ${isExpanded ? 'bg-slate-100 text-slate-900 rotate-180' : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                        title="Standards anzeigen"
                    >
                        <Settings className="w-4 h-4" strokeWidth={1.5} />
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Insurance Toggle */}
                    <div className="bg-slate-100/80 rounded-full p-1 h-12 flex items-center">
                        {(['GKV', 'PKV'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setInsuranceType(type)}
                                className={`
                                    px-4 h-full rounded-full text-xs font-bold transition-all duration-300 relative flex items-center justify-center
                                    ${insuranceType === type ? 'text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}
                                `}
                            >
                                {insuranceType === type && (
                                    <motion.div
                                        layoutId="pill-active-bg"
                                        className="absolute inset-0 bg-white rounded-full"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10">{type}</span>
                            </button>
                        ))}
                    </div>

                    {/* Zuzahlung Toggle (nur bei GKV sichtbar) */}
                    {insuranceType === 'GKV' && (
                        <>
                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <button
                                onClick={() => setHasZuzahlung(!hasZuzahlung)}
                                className={`h-11 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium transition-all duration-200
                                    ${hasZuzahlung
                                        ? 'bg-amber-100 text-amber-700 border border-amber-300 shadow-sm'
                                        : 'bg-slate-100/60 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}
                                `}
                                title="Zuzahlung vom Patienten"
                            >
                                <Euro className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Zuzahlung</span>
                            </button>
                        </>
                    )}

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Mic Toggle */}
                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        className={`h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 relative
                            ${isRecording ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                        `}
                    >
                        {isRecording ? (
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-3 h-3 bg-white rounded-sm"
                            />
                        ) : (
                            <Mic className="w-5 h-5" />
                        )}
                    </button>

                    {/* Analyze Button */}
                    <button
                        onClick={onAnalyze}
                        disabled={!dictation.trim() || isLoading}
                        className={`h-12 px-6 rounded-full flex items-center gap-2 font-medium text-sm transition-all duration-300
                            ${!dictation.trim() || isLoading
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-slate-800 text-white shadow-lg shadow-slate-800/20 hover:bg-slate-700 hover:scale-105 active:scale-95'}
                        `}
                    >
                        {isLoading ? (
                            <Sparkles className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>Erstellen</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </motion.div>

                {/* 2. SETTINGS SHEET (MODAL VIA PORTAL) */}
                <AnimatePresence>
                    {isExpanded && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsExpanded(false)}
                                className="absolute inset-0 bg-black/20 backdrop-blur-md"
                            />

                            {/* Sheet / Modal */}
                            <motion.div
                                initial={{ y: "100%", opacity: 0, scale: 0.96 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: "100%", opacity: 0, scale: 0.96 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-md bg-white/80 backdrop-blur-2xl shadow-2xl rounded-t-[2.5rem] sm:rounded-[2rem] border border-white/50 overflow-hidden m-0 sm:m-4"
                            >
                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        Aktive Standards
                                    </h3>
                                    <button
                                        onClick={() => setIsExpanded(false)}
                                        className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-6 pt-2 space-y-6">
                                    {/* Active Standards Chips */}
                                    <div className="flex flex-wrap gap-2.5">
                                        <div className={`px-3 py-2 rounded-xl text-sm font-medium border flex-1 text-center transition-colors
                                            ${defaults?.methodik?.kofferdamStandard
                                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700'
                                                : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'}`}>
                                            Kofferdam
                                        </div>

                                        <div className={`px-3 py-2 rounded-xl text-sm font-medium border flex-1 text-center transition-colors
                                            ${defaults?.anaesthesie?.oberflaecheImmer
                                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700'
                                                : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'}`}>
                                            Oberfl. Anästhesie
                                        </div>

                                        <div className={`px-3 py-2 rounded-xl text-sm font-medium border flex-1 text-center transition-colors
                                            ${defaults?.tiefKaries?.unterfuellungStandard
                                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700'
                                                : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'}`}>
                                            Unterfüllung
                                        </div>
                                    </div>

                                    {/* Anesthesia Separator */}
                                    <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-4 flex items-center justify-between">
                                        <span className="text-xs font-medium text-blue-700/70">Betäubung (UK Seitenzahn)</span>
                                        <span className="text-sm font-bold text-blue-700 uppercase">{defaults?.anaesthesie?.ukSeitenzahn || 'Standard'}</span>
                                    </div>

                                    <div className="pt-2 text-center">
                                        <button
                                            onClick={onOpenSetup}
                                            className="text-xs text-slate-400 hover:text-indigo-500 font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                                        >
                                            <Settings className="w-3 h-3" />
                                            Setup bearbeiten
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>,
                        document.body
                    )}
                </AnimatePresence>
            </div>

        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: CONFIRMATIONS
// ═══════════════════════════════════════════════════════════════

function ConfirmStep({
    confirmations,
    onAnswer,
    onNext,
    onBack
}: {
    confirmations: any[];
    onAnswer: (id: string, optionId: string) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const allAnswered = confirmations.every(c => c.answered);

    return (
        <motion.div {...pageTransition} className="max-w-lg mx-auto">
            <div className="text-center mb-8">
                <motion.h1
                    className="text-2xl font-semibold text-gray-800 mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Kurze Rückfrage
                </motion.h1>
                <p className="text-gray-500 text-sm">
                    Für eine korrekte Abrechnung
                </p>
            </div>

            <div className="space-y-4">
                {confirmations.map((q, i) => (
                    <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-5 rounded-2xl bg-white/80 border border-gray-100 shadow-sm"
                    >
                        <p className="text-gray-700 font-medium mb-3">{q.frage}</p>
                        <div className="flex flex-wrap gap-2">
                            {q.options.map((option: any) => (
                                <button
                                    key={option.id}
                                    onClick={() => onAnswer(q.id, option.id)}
                                    className={`
                                        px-4 py-2 rounded-full text-xs font-medium transition-all duration-200
                                        ${q.answered === option.id
                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}
                                    `}
                                >
                                    {q.answered === option.id && <Check className="w-3 h-3 inline mr-1" />}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
                <button
                    onClick={onBack}
                    className="inline-flex items-center px-4 py-2 rounded-full text-xs font-medium
                               text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Zurück
                </button>
                <button
                    onClick={onNext}
                    disabled={!allAnswered}
                    className="inline-flex items-center px-5 py-2 rounded-full text-xs font-medium
                               bg-gradient-to-r from-emerald-400 to-teal-400 text-white
                               shadow-sm shadow-emerald-100 disabled:opacity-50
                               transition-all duration-200"
                >
                    Weiter
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: CUSTOMIZE
// ═══════════════════════════════════════════════════════════════

function CustomizeStep({
    activeChipIds,
    toggleChip,
    billingResult,
    festzuschuss,
    onGenerate,
    onBack,
    isLoading,
    insuranceType,
    zuzahlungBetrag
}: {
    activeChipIds: string[];
    toggleChip: (id: string) => void;
    billingResult: any;
    festzuschuss: number;
    onGenerate: () => void;
    onBack: () => void;
    isLoading: boolean;
    insuranceType: 'GKV' | 'PKV';
    zuzahlungBetrag: number | null;
}) {
    const [showAllCodes, setShowAllCodes] = useState(false);

    // Grouped chips for better organization
    // IDs MUST match chip IDs in fuellung_unified.json!
    const chipGroups = [
        {
            label: 'Prozedur',
            chips: [
                { id: 'la_infiltr', label: 'Anästhesie', icon: '💉', description: 'LA Infiltration' },
                { id: 'kofferdam', label: 'Kofferdam', icon: '🛡️', description: 'Trockenlegung' },
            ]
        },
        {
            label: 'Technik',
            chips: [
                { id: 'cp', label: 'Cp (ind. Überk.)', icon: '🧪', description: 'Indirekte Überkappung' },
                { id: 'mehrschicht', label: 'Schichttechnik', icon: '📚', description: 'Inkrementale Applikation' },
            ]
        },
        {
            label: 'Abschluss',
            chips: [
                { id: 'fluor', label: 'Fluoridierung', icon: '✨', description: 'Schutzbehandlung' },
                { id: 'finishing', label: 'Politur', icon: '💎', description: 'Oberflächenfinish' },
            ]
        }
    ];

    // Get extracted info from billing result
    const extracted = billingResult?.extracted || {};
    const tooth = extracted.tooth || extracted.zahn;
    const surfaces = extracted.surfaces || extracted.flaechen || [];
    const diagnosis = extracted.diagnosis || extracted.diagnose;

    // Separate codes by type and de-duplicate
    const suggestions = billingResult?.suggestions || [];
    const gozCodesRaw = suggestions.filter((s: any) => s.code?.startsWith('GOZ'));
    const bemaCodesRaw = suggestions.filter((s: any) => s.code?.startsWith('BEMA'));

    // De-duplicate by code
    const seenGoz = new Set<string>();
    const gozCodes = gozCodesRaw.filter((s: any) => {
        if (seenGoz.has(s.code)) return false;
        seenGoz.add(s.code);
        return true;
    });
    const seenBema = new Set<string>();
    const bemaCodes = bemaCodesRaw.filter((s: any) => {
        if (seenBema.has(s.code)) return false;
        seenBema.add(s.code);
        return true;
    });

    const displayLimit = showAllCodes ? 20 : 4;

    // ═══════════════════════════════════════════════════════════
    // PRICE LOOKUP (dynamisch aus Katalog via treatmentEngine)
    // ═══════════════════════════════════════════════════════════

    // Synchrone Helper: Holt Betrag aus zentralem Katalog (SSOT!)
    // NOTE: Uses imported lookupBillingCode instead of require() for browser compatibility
    const getCodePriceSync = (code: string): number => {
        const normalizedCode = code?.replace(/\s/g, '_');
        const data = lookupBillingCode(normalizedCode);
        if (!data) return 0;
        // GOZ: betrag_23 (2.3-fach), BEMA: punkte * 1.0375 (Punktwert 2025)
        if (normalizedCode.startsWith('GOZ_')) {
            return data.betrag_23 || 0;
        } else {
            return (data.punkte || 0) * 1.0375;
        }
    };

    // Calculate estimated total cost for GOZ (PKV) - NOW FROM CATALOG!
    const estimatedGozCost = gozCodes.reduce((sum: number, s: any) => {
        return sum + getCodePriceSync(s.code);
    }, 0);

    // Calculate estimated total cost for BEMA (GKV) - NOW FROM CATALOG!
    const estimatedBemaCost = bemaCodes.reduce((sum: number, s: any) => {
        return sum + getCodePriceSync(s.code);
    }, 0);

    // For multi-surface fillings, add material cost estimate
    const surfaceCount = Array.isArray(surfaces) ? surfaces.length : 0;
    const hasMehrschicht = activeChipIds.includes('schicht');
    const isMehrflaechig = surfaceCount >= 2;
    const materialCost = hasMehrschicht && isMehrflaechig ? 15 : 0; // Material für Schichttechnik

    return (
        <motion.div {...pageTransition} className="max-w-xl mx-auto">
            {/* Header - Compact */}
            <div className="text-center mb-5">
                <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-lg font-semibold text-gray-800">Feintuning</h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Schritt 3 von 4</p>
                    </div>
                </motion.div>
            </div>

            {/* Extracted Treatment Summary - Hero Card */}
            {(tooth || surfaces.length > 0 || diagnosis) && (
                <motion.div
                    className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-white/60 backdrop-blur-xl shadow-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="flex items-center gap-4">
                        {/* Tooth Badge */}
                        {tooth && (
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-lg">
                                <span className="text-xl font-bold text-white">{tooth}</span>
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            {/* Surfaces */}
                            {surfaces.length > 0 && (
                                <div className="flex items-center gap-1.5 mb-1">
                                    {(Array.isArray(surfaces) ? surfaces : [surfaces]).map((s: string, i: number) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 rounded-md bg-white/80 text-xs font-bold text-slate-600 uppercase border border-slate-200/50"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* Diagnosis */}
                            {diagnosis && (
                                <p className="text-sm text-gray-600 truncate">{diagnosis}</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Billing Section - Redesigned */}
            {billingResult && (
                <motion.div
                    className="mb-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm overflow-hidden"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                                <span className="text-white text-sm">💰</span>
                            </div>
                            <div>
                                <span className="text-sm font-semibold text-gray-800">Abrechnungspositionen</span>
                                <p className="text-[10px] text-gray-400">{suggestions.filter((s: any) => s.code).length} Codes erkannt</p>
                            </div>
                        </div>
                        {festzuschuss > 0 && (
                            <div className="text-right">
                                <span className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                                    {festzuschuss.toFixed(2)}€
                                </span>
                                <p className="text-[9px] text-gray-400 uppercase tracking-wider">Festzuschuss</p>
                            </div>
                        )}
                    </div>

                    {/* Codes Grid */}
                    <div className="p-4 space-y-3">
                        {/* GOZ Codes */}
                        {gozCodes.length > 0 && (
                            <div>
                                <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    GOZ (Privat)
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {gozCodes.slice(0, displayLimit).map((s: any, i: number) => (
                                        <span
                                            key={i}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/80 shadow-sm"
                                        >
                                            {s.code}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* BEMA Codes */}
                        {bemaCodes.length > 0 && (
                            <div>
                                <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    BEMA (Kasse)
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {bemaCodes.slice(0, displayLimit).map((s: any, i: number) => (
                                        <span
                                            key={i}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-100/80 shadow-sm"
                                        >
                                            {s.code}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Show More Toggle */}
                        {suggestions.filter((s: any) => s.code).length > 4 && (
                            <button
                                onClick={() => setShowAllCodes(!showAllCodes)}
                                className="w-full py-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-1"
                            >
                                {showAllCodes ? 'Weniger anzeigen' : `+${suggestions.filter((s: any) => s.code).length - 4} weitere Codes`}
                                <motion.div animate={{ rotate: showAllCodes ? 180 : 0 }}>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </motion.div>
                            </button>
                        )}

                        {/* Estimated Cost Summary - Insurance-specific */}
                        {((insuranceType === 'PKV' && estimatedGozCost > 0) || (insuranceType === 'GKV' && estimatedBemaCost > 0)) && (
                            <div className="mt-3 pt-3 border-t border-gray-100/60">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Euro className="w-4 h-4 text-amber-500" />
                                        <div>
                                            <span className="text-xs text-gray-500">
                                                Geschätzte Kosten
                                            </span>
                                            <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${insuranceType === 'PKV' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {insuranceType}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-gray-800">
                                            {insuranceType === 'PKV'
                                                ? (estimatedGozCost + materialCost).toFixed(2)
                                                : estimatedBemaCost.toFixed(2)}€
                                        </span>
                                        {hasMehrschicht && isMehrflaechig && (
                                            <p className="text-[9px] text-amber-600 font-medium">
                                                ✨ Mehrschichtfüllung
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Zuzahlung Display */}
                                {zuzahlungBetrag && zuzahlungBetrag > 0 && (
                                    <div className="mt-2 flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 border border-amber-200">
                                        <span className="text-xs font-medium text-amber-700">
                                            💰 Patientenzuzahlung
                                        </span>
                                        <span className="text-sm font-bold text-amber-800">
                                            {zuzahlungBetrag}€
                                        </span>
                                    </div>
                                )}

                                <p className="text-[9px] text-gray-400 mt-1">
                                    {insuranceType === 'PKV'
                                        ? 'GOZ 2,3-fach (Standardfaktor)'
                                        : `BEMA Punktwert ${(1.0375).toFixed(4)}€ (2025)`}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Quick Options - Grouped */}
            <motion.div
                className="mb-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="px-4 py-3 border-b border-gray-100/80 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-sm">
                        <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-gray-800">Dokumentationsoptionen</span>
                        <p className="text-[10px] text-gray-400">Aktivierte Elemente werden dokumentiert</p>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {chipGroups.map((group, groupIdx) => (
                        <div key={group.label}>
                            <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                                {group.label}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {group.chips.map(chip => {
                                    const isActive = activeChipIds.includes(chip.id);
                                    return (
                                        <button
                                            key={chip.id}
                                            onClick={() => toggleChip(chip.id)}
                                            className={`
                                                group relative p-3 rounded-xl text-left transition-all duration-200
                                                ${isActive
                                                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200/50'
                                                    : 'bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/50 hover:border-purple-200'}
                                            `}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-base transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                    {chip.icon}
                                                </span>
                                                <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-700'}`}>
                                                    {chip.label}
                                                </span>
                                                {isActive && (
                                                    <Check className="w-3.5 h-3.5 text-white/80 ml-auto" />
                                                )}
                                            </div>
                                            <p className={`text-[10px] ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                                                {chip.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                            {groupIdx < chipGroups.length - 1 && (
                                <div className="mt-3 border-t border-gray-100/50" />
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Navigation - Elevated */}
            <motion.div
                className="flex justify-between items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
            >
                <button
                    onClick={onBack}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-medium
                               text-gray-500 hover:text-gray-700 hover:bg-white/60 transition-all duration-200"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Zurück
                </button>
                <button
                    onClick={onGenerate}
                    disabled={isLoading}
                    className={`
                        inline-flex items-center px-7 py-3 rounded-2xl text-sm font-bold
                        transition-all duration-300
                        ${isLoading
                            ? 'bg-gray-100 text-gray-400 cursor-wait'
                            : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white shadow-xl shadow-purple-300/40 hover:shadow-2xl hover:shadow-purple-400/50 hover:scale-[1.03] active:scale-[0.98]'}
                    `}
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 mr-2 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                            Generiere...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Dokumentation erstellen
                        </>
                    )}
                </button>
            </motion.div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: RESULT
// ═══════════════════════════════════════════════════════════════

function ResultStep({
    preview,
    onRestart
}: {
    preview: string;
    onRestart: () => void;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(preview);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div {...pageTransition} className="max-w-lg mx-auto">
            <div className="text-center mb-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 
                               flex items-center justify-center shadow-lg shadow-emerald-100"
                >
                    <CheckCircle2 className="w-7 h-7 text-white" />
                </motion.div>
                <motion.h1
                    className="text-2xl font-semibold text-gray-800"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Fertig!
                </motion.h1>
            </div>

            {/* Preview */}
            <motion.div
                className="p-4 rounded-2xl bg-white/90 border border-gray-100 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <pre className="text-gray-600 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {preview}
                </pre>
            </motion.div>

            {/* Actions */}
            <div className="mt-6 flex justify-center gap-3">
                <button
                    onClick={handleCopy}
                    className={`
                        inline-flex items-center px-5 py-2 rounded-full text-xs font-medium transition-all duration-200
                        ${copied
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                    `}
                >
                    {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    {copied ? 'Kopiert!' : 'Kopieren'}
                </button>
                <button
                    onClick={onRestart}
                    className="inline-flex items-center px-5 py-2 rounded-full text-xs font-medium
                               bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                >
                    Neue Behandlung
                </button>
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export function DocudentV5Page() {
    const {
        dictation,
        insuranceType,
        hasZuzahlung,
        zuzahlungBetrag,
        isExtracting,
        isGenerating,
        billingResult,
        confirmations,
        preview,
        festzuschuss,
        activeChipIds,
        suggestions,
        setDictation,
        setInsuranceType,
        setHasZuzahlung,
        setZuzahlungBetrag,
        toggleChip,
        analyze,
        answerConfirmation,
        generatePreview,
        reset
    } = useBillingV5Controller('fuellung');

    const [currentStep, setCurrentStep] = useState<Step>('dictation');
    const [completedSteps, setCompletedSteps] = useState<Step[]>([]);

    // Setup wizard state
    const [practiceProfile, setPracticeProfile] = useState<PracticeProfile | null>(null);
    const [showSetup, setShowSetup] = useState(false);

    // Load profile on mount
    useEffect(() => {
        const profile = loadPracticeProfile();
        if (profile?.treatments?.fuellung?.setupComplete) {
            setPracticeProfile(profile);
        } else {
            // First visit - show setup
            setShowSetup(true);
        }
    }, []);

    // Handle setup completion
    const handleSetupComplete = (profile: PracticeProfile) => {
        setPracticeProfile(profile);
        setShowSetup(false);
    };

    // Get current toggle defaults for display
    const toggleDefaults = practiceProfile ? getTreatmentDefaults(practiceProfile, 'fuellung') : null;

    const handleAnalyze = async () => {
        const result = await analyze();
        setCompletedSteps(prev => [...prev, 'dictation']);
        // Use returned count, not stale state
        const hasConfirmations = result.confirmationsCount > 0;
        setCurrentStep(hasConfirmations ? 'confirm' : 'customize');
    };

    const handleConfirmNext = () => {
        setCompletedSteps(prev => [...prev, 'confirm']);
        setCurrentStep('customize');
    };

    const handleGenerate = () => {
        generatePreview();
        setCompletedSteps(prev => [...prev, 'customize']);
        setCurrentStep('result');
    };

    const handleRestart = () => {
        reset();
        setCurrentStep('dictation');
        setCompletedSteps([]);
    };

    // Show setup wizard if needed
    // Show setup wizard if needed (Old blocking logic removed)
    // if (showSetup) {
    //    return <TreatmentSetupWizard onComplete={handleSetupComplete} />;
    // }

    return (
        <div className="min-h-screen text-gray-800 overflow-hidden">
            <SoftBackground />

            {/* Setup Wizard Modal */}
            <TreatmentSetupWizard
                isOpen={showSetup}
                onClose={() => setShowSetup(false)}
                onComplete={handleSetupComplete}
            />

            {/* Header */}
            <header className="relative z-50 py-5">
                <div className="max-w-lg mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center shadow-sm">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-gray-700">Docudent</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">V5</span>
                    </div>

                    {/* Settings Button */}
                    <button
                        onClick={() => setShowSetup(true)}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                        title="Standards bearbeiten"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Step Indicator */}
            <div className="relative z-10 px-6">
                <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
            </div>

            {/* Main Content */}
            <main className="relative z-10 px-6 pb-16">
                <AnimatePresence mode="wait">
                    {currentStep === 'dictation' && (
                        <DictationStep
                            key="dictation"
                            dictation={dictation}
                            setDictation={setDictation}
                            insuranceType={insuranceType}
                            setInsuranceType={setInsuranceType}
                            hasZuzahlung={hasZuzahlung}
                            setHasZuzahlung={setHasZuzahlung}
                            onAnalyze={handleAnalyze}
                            isLoading={isExtracting}
                            onOpenSetup={() => setShowSetup(true)}
                        />
                    )}

                    {currentStep === 'confirm' && (
                        <ConfirmStep
                            key="confirm"
                            confirmations={confirmations}
                            onAnswer={answerConfirmation}
                            onNext={handleConfirmNext}
                            onBack={() => setCurrentStep('dictation')}
                        />
                    )}

                    {currentStep === 'customize' && (
                        <CustomizeStep
                            key="customize"
                            activeChipIds={activeChipIds}
                            toggleChip={toggleChip}
                            billingResult={billingResult}
                            festzuschuss={festzuschuss}
                            onGenerate={handleGenerate}
                            onBack={() => setCurrentStep(confirmations.length > 0 ? 'confirm' : 'dictation')}
                            isLoading={isGenerating}
                            insuranceType={insuranceType}
                            zuzahlungBetrag={zuzahlungBetrag}
                        />
                    )}

                    {currentStep === 'result' && (
                        <ResultStep
                            key="result"
                            preview={preview}
                            onRestart={handleRestart}
                        />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default DocudentV5Page;

