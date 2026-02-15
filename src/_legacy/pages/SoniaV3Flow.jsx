import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoniaV3Controller } from '../sonia/hooks/useSoniaV3Controller';
import DictationPill from '../sonia/ui/DictationPill';
import IssuesPanel from '../sonia/ui/IssuesPanel';
import PreviewPanel from '../sonia/ui/PreviewPanel';
import { ConfirmationCards, getPendingConfirmations } from '../sonia/ui/confirmation';
import { FiCheck, FiCopy, FiRotateCcw, FiLoader, FiSettings } from 'react-icons/fi';
import { TREATMENT_TYPES } from '../sonia/templates/catalog';

// Minimal icons
const ICONS = {
    filling: '◉', endo: '⦿', extraction: '⊗', crown: '◎',
    consultation: '◇', prophylaxis: '○', default: '•'
};

export default function SoniaV3Flow() {
    const c = useSoniaV3Controller();
    const navigate = useNavigate();
    const [phase, setPhase] = useState('select'); // select | input | review | done

    // Auto-reset if no treatment
    useEffect(() => {
        if (!c.treatmentType && phase !== 'select') setPhase('select');
    }, [c.treatmentType]);

    // AUTO-ADVANCE: Treatment selected → Go to input
    const selectTreatment = (id) => {
        c.setTreatmentType(id);
        setTimeout(() => setPhase('input'), 200); // Smooth transition
    };

    // Extract & auto-advance
    const submitDictation = async () => {
        const res = await c.handleExtract();
        if (res?.ok) {
            // Auto-accept suggestions with high confidence
            c.handleAcceptAllSuggestions();

            // If no suggestions to show, skip review and go directly to generation
            if (res.suggestionsCount === 0) {
                // Generate immediately and go to done
                await c.handlePreview();
                setTimeout(() => setPhase('done'), 100);
            } else {
                setPhase('review');
            }
        }
    };

    // Generate & show result
    const generateDoc = async () => {
        await c.handlePreview();
        // Small delay to ensure state is updated
        setTimeout(() => setPhase('done'), 100);
    };

    // Copy & Reset
    const copyAndReset = () => {
        navigator.clipboard.writeText(c.previewResult || '');
        setTimeout(() => {
            c.resetSession();
            setPhase('select');
        }, 300);
    };

    const reset = () => {
        c.resetSession();
        setPhase('select');
    };

    const hasErrors = c.validation?.issues?.some(i => i?.severity === 'error');

    // Get pending confirmations for uncertain findings
    // Only shows when genuinely uncertain (confidence < 0.3) AND dictation mentions befund
    const pendingConfirmations = useMemo(() => {
        // Build chipStates with LOWER confidence threshold
        const chipStates = c.availableChips.map(chip => ({
            id: chip.id,
            active: !c.inactiveStandards.includes(chip.id),
            source: c.inactiveStandards.includes(chip.id) ? 'user' : 'default',
            // Only mark as very uncertain (0.2) if it's a befund default AND not confirmed
            confidence: c.userConfirmations?.has(chip.id) ? 1.0 :
                (chip.defaultActive && chip.category === 'befund') ? 0.2 : 0.8,
            needsConfirmation: chip.defaultActive && !c.userConfirmations?.has(chip.id) && chip.category === 'befund'
        }));
        // Pass dictation to enable context-aware filtering
        return getPendingConfirmations(chipStates, c.caseState?.data || {}, c.dictation);
    }, [c.availableChips, c.inactiveStandards, c.userConfirmations, c.caseState, c.dictation]);

    return (
        <div className="h-screen flex flex-col bg-[url('/background.jpg')] bg-cover bg-center font-['SF_Pro_Display',-apple-system,sans-serif] overflow-hidden">

            {/* Minimal Top Bar - transparent glass effect */}
            <div className="h-12 flex items-center justify-between px-5 bg-white/20 backdrop-blur-xl border-b border-white/10">
                <span className="text-sm font-semibold text-white drop-shadow-md">Sonia</span>

                <div className="flex items-center gap-3">
                    {/* Progress indicator */}
                    <div className="flex gap-1">
                        {['select', 'input', 'review', 'done'].map((p, i) => (
                            <div key={p} className={`h-1 rounded-full transition-all duration-300 ${p === phase ? 'w-4 bg-blue-500' :
                                ['select', 'input', 'review', 'done'].indexOf(phase) > i ? 'w-1 bg-emerald-400' : 'w-1 bg-gray-200'
                                }`} />
                        ))}
                    </div>

                    {phase !== 'select' && (
                        <button onClick={reset} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                            <FiRotateCcw className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">

                    {/* PHASE 1: Select Treatment - Click = Auto advance */}
                    {phase === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex flex-col items-center justify-center p-6"
                        >
                            <motion.h1
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl font-semibold text-white drop-shadow-lg mb-10"
                            >
                                Was wurde gemacht?
                            </motion.h1>

                            <div className="grid grid-cols-3 gap-2 max-w-sm">
                                {TREATMENT_TYPES.filter(t => c.enabledTreatmentIds.includes(t.id)).map((t, i) => (
                                    <motion.div
                                        key={t.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="relative group"
                                    >
                                        <motion.button
                                            whileHover={{ scale: 1.05, y: -3 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => selectTreatment(t.id)}
                                            className="aspect-square w-full flex flex-col items-center justify-center gap-2 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg hover:shadow-xl hover:bg-white/30 transition-all p-4"
                                        >
                                            <span className="text-2xl text-white/80">{ICONS[t.id] || ICONS.default}</span>
                                            <span className="text-sm font-semibold text-white drop-shadow-md">{t.label}</span>
                                        </motion.button>

                                        {/* Settings Button - appears on hover */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/sonia-v3/settings/${t.id}`);
                                            }}
                                            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                                        >
                                            <FiSettings className="w-3.5 h-3.5 text-white" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* PHASE 2: Dictation - Enter/Send = Submit */}
                    {phase === 'input' && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            className="absolute inset-0 flex flex-col items-center p-6 pt-4"
                        >
                            <div className="w-full max-w-2xl flex-1 flex flex-col">
                                {/* Treatment Title - Bold white like dashboard */}
                                <div className="flex justify-center mb-6">
                                    <span className="text-4xl font-semibold text-white drop-shadow-lg tracking-tight">
                                        {TREATMENT_TYPES.find(t => t.id === c.treatmentType)?.label}
                                    </span>
                                </div>

                                <DictationPill
                                    value={c.dictation}
                                    onChange={c.setDictation}
                                    hideExtractButton={false}
                                    onExtract={submitDictation}
                                    isRecording={c.isRecording}
                                    onStartRecording={c.handleStartRecording}
                                    onStopRecording={c.handleStopRecording}
                                    isTranscribing={c.isTranscribing}
                                    extracting={c.extracting}
                                    insuranceType={c.insuranceType}
                                    onInsuranceChange={c.setInsuranceType}
                                    manualMaterial={c.manualMaterial}
                                    onMaterialChange={c.setManualMaterial}
                                    standards={[]}
                                    inactiveStandards={c.inactiveStandards}
                                    onToggleStandard={c.handleToggleStandard}
                                    showBillingCodes={c.showBillingCodes}
                                    setShowBillingCodes={c.setShowBillingCodes}
                                />

                                {/* QuickView Chips - BELOW DictationPill */}
                                {c.quickViewChips.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="flex flex-wrap gap-3 justify-center mt-6"
                                    >
                                        {c.quickViewChips.map((chip, index) => {
                                            const isActive = !c.inactiveStandards.includes(chip.id);
                                            return (
                                                <motion.button
                                                    key={chip.id}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.1 + index * 0.05 }}
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => c.handleToggleStandard(chip.id)}
                                                    className={`
                                                        px-5 py-2.5 rounded-full text-base font-semibold 
                                                        transition-all duration-200 flex items-center gap-2
                                                        backdrop-blur-md border shadow-lg
                                                        ${isActive
                                                            ? 'bg-emerald-500/90 text-white border-emerald-400/50 hover:bg-emerald-600'
                                                            : 'bg-white/20 text-white/60 border-white/20 line-through hover:bg-white/30'
                                                        }
                                                    `}
                                                >
                                                    {isActive && (
                                                        <span className="w-2 h-2 bg-white/80 rounded-full" />
                                                    )}
                                                    {chip.then?.label || chip.id}
                                                </motion.button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* PHASE 3: Review - Quick look before generating */}
                    {phase === 'review' && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            className="absolute inset-0 flex flex-col items-center p-6 overflow-auto"
                        >
                            <div className="w-full max-w-lg">
                                {/* Extracted Summary */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Erkannt</div>
                                    <div className="space-y-2 text-sm">
                                        {c.caseState?.data?.tooth && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Zahn</span>
                                                <span className="font-medium">{c.caseState.data.tooth}</span>
                                            </div>
                                        )}
                                        {c.caseState?.data?.surfaces && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Flächen</span>
                                                <span className="font-medium">{Array.isArray(c.caseState.data.surfaces) ? c.caseState.data.surfaces.join('').toUpperCase() : c.caseState.data.surfaces}</span>
                                            </div>
                                        )}
                                        {c.caseState?.data?.material && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Material</span>
                                                <span className="font-medium">{c.caseState.data.material}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Confirmation Cards for uncertain findings */}
                                {pendingConfirmations.length > 0 && (
                                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                                        <ConfirmationCards
                                            items={pendingConfirmations}
                                            onConfirm={(itemId, option) => c.handleConfirmation(itemId, option)}
                                        />
                                    </div>
                                )}

                                {/* Suggestions (if any) */}
                                {c.smartSuggestions.length > 0 && (
                                    <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                                        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                                            Zusätzliche Leistungen
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {c.smartSuggestions.map(s => {
                                                const active = c.acceptedSuggestions.includes(s.id);
                                                return (
                                                    <motion.button
                                                        key={s.id}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => c.toggleSuggestion(s.id)}
                                                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${active
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-gray-100 text-gray-500'
                                                            }`}
                                                    >
                                                        {active && <FiCheck className="w-3 h-3" />}
                                                        {s.label}
                                                        <span className="text-[10px] opacity-60">€</span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Issues */}
                                {c.validation?.issues?.length > 0 && (
                                    <IssuesPanel issues={c.validation.issues} />
                                )}

                                {/* Generate Button */}
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={generateDoc}
                                    disabled={hasErrors || c.loading}
                                    className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium rounded-2xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {c.loading ? (
                                        <><FiLoader className="w-4 h-4 animate-spin" /> Generiere...</>
                                    ) : (
                                        'Dokumentation erstellen'
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* PHASE 4: Done - Copy & Start New */}
                    {phase === 'done' && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col p-6 overflow-auto"
                        >
                            <div className="flex-1 max-w-3xl mx-auto w-full">
                                <PreviewPanel
                                    result={c.previewResult}
                                    loading={c.loading}
                                />
                            </div>

                            {/* Sticky bottom action */}
                            <div className="pt-4 flex justify-center gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={copyAndReset}
                                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                    <FiCopy className="w-4 h-4" />
                                    Kopieren & Nächste
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
