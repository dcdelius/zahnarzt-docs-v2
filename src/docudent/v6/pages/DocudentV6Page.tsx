/**
 * Docudent V6 — Jeton Warm Gradient Theme
 * 
 * Design System:
 * - Hero Gradient: Pink → Peach → Apricot
 * - Accent: Coral #FF6B4A
 * - Typography: Large, white, Light/SemiBold
 * - Warm, soft, emotional, premium
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Copy, RotateCcw } from 'lucide-react';
import { useDocudentV6, type PracticeSettings, type DictationState } from '../hooks/useDocudentV6';
import { InsuranceModeBar, DictationButton, Stepper, CategorySelector, ProcessingOverlay } from '../components/hero';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS — JETON WARM SYSTEM
// ═══════════════════════════════════════════════════════════════

const colors = {
    // Warm Gradient Colors
    warmPink: '#F87A7A',
    warmPeach: '#F69A7C',
    softApricot: '#F7B88C',
    apricotLight: '#FDD9B5',

    // Accent
    coralAccent: '#FF6B4A',
    coralLight: '#FFB199',

    // Orb Colors
    orbApricot: '#FFE1D6',
    orbPink: '#FFB199',

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.65)',
    textMuted: 'rgba(255,255,255,0.45)',

    // Lines
    lineSoft: 'rgba(255,255,255,0.12)',
    lineUltraSoft: 'rgba(255,255,255,0.06)',
};

const gradients = {
    hero: 'linear-gradient(135deg, #F87A7A 0%, #F69A7C 40%, #F7B88C 70%, #FDD9B5 100%)',
    warm: 'linear-gradient(135deg, #FA8C80 0%, #F8AA86 30%, #F6C79A 80%)',
    light: 'linear-gradient(135deg, #FBCDB2 0%, #FDDDC8 100%)',
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DocudentV6Page() {
    const {
        dictation,
        insuranceType,
        hasMKV,
        isInsuranceModalOpen,
        textLength,
        selectedMaterial,
        selectedCategory,
        selectedSubcategory,
        dictationState,
        step,
        isProcessing,
        extracted,
        questions,
        output,
        setDictation,
        setInsuranceType,
        setMKV,
        setInsuranceModalOpen,
        setCategory,
        setSubcategory,
        startRecording,
        stopRecording,
        setMaterial,
        setTextLength,
        analyzeDictation,
        answerQuestion,
        allQuestionsAnswered,
        proceedToOutput,
        reset
    } = useDocudentV6();

    // DictationButton handler — Real recording with Whisper transcription
    const handleDictationClick = async () => {
        if (dictationState === 'idle') {
            await startRecording();
        } else if (dictationState === 'recording') {
            await stopRecording();
            // Text is now in dictation field, step will advance when user clicks analyze
        }
    };

    // Step number for stepper
    const currentStepNumber: 1 | 2 | 3 = step === 'dictation' ? 1 : step === 'questions' ? 2 : 3;

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{
                background: gradients.hero,
                filter: isProcessing ? 'brightness(0.96)' : 'brightness(1)',
                transition: 'filter 0.3s ease-out'
            }}
        >
            {/* Decorative Orbs - Soft Glow */}
            <motion.div
                className="absolute pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                style={{
                    top: '-80px',
                    right: '-100px',
                    width: '480px',
                    height: '480px',
                    borderRadius: '50%',
                    background: colors.orbApricot,
                    opacity: 0.08,
                    filter: 'blur(160px)',
                }}
            />
            <motion.div
                className="absolute pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                style={{
                    bottom: '-120px',
                    left: '-80px',
                    width: '520px',
                    height: '520px',
                    borderRadius: '50%',
                    background: colors.orbPink,
                    opacity: 0.10,
                    filter: 'blur(180px)',
                }}
            />

            {/* Main Content */}
            <AnimatePresence mode="wait">
                {step === 'dictation' && (
                    <DictationSection
                        key="dictation"
                        dictation={dictation}
                        setDictation={setDictation}
                        dictationState={dictationState}
                        onDictationClick={handleDictationClick}
                        onSubmit={analyzeDictation}
                        canSubmit={dictation.trim().length > 0 && !isProcessing && dictationState === 'idle'}
                        selectedCategory={selectedCategory}
                        selectedSubcategory={selectedSubcategory}
                        onSelectCategory={setCategory}
                        onSelectSubcategory={setSubcategory}
                        onBack={() => setCategory(null)}
                        currentStep={currentStepNumber}
                        isProcessing={isProcessing}
                    />
                )}

                {/* Processing Overlay — shows regardless of step when isProcessing */}
                <ProcessingOverlay isVisible={isProcessing} />

                {step === 'questions' && (
                    <QuestionsSection
                        key="questions"
                        extracted={extracted!}
                        questions={questions}
                        onAnswer={answerQuestion}
                        onProceed={proceedToOutput}
                        allAnswered={allQuestionsAnswered()}
                        isProcessing={isProcessing}
                        hasMKV={hasMKV}
                        selectedMaterial={selectedMaterial}
                        onMaterialChange={setMaterial}
                    />
                )}

                {step === 'output' && output && (
                    <OutputSection
                        key="output"
                        output={output}
                        textLength={textLength}
                        setTextLength={setTextLength}
                        onReset={reset}
                        insuranceType={insuranceType}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SEKTION 1: DIKTAT-EINGABE (mit Hero Components)
// ═══════════════════════════════════════════════════════════════

function DictationSection({
    dictation,
    setDictation,
    dictationState,
    onDictationClick,
    onSubmit,
    canSubmit,
    selectedCategory,
    selectedSubcategory,
    onSelectCategory,
    onSelectSubcategory,
    onBack,
    currentStep,
    isProcessing
}: {
    dictation: string;
    setDictation: (text: string) => void;
    dictationState: 'idle' | 'recording' | 'processing';
    onDictationClick: () => void;
    onSubmit: () => void;
    canSubmit: boolean;
    selectedCategory: string | null;
    selectedSubcategory: string | null;
    onSelectCategory: (id: string) => void;
    onSelectSubcategory: (id: string) => void;
    onBack: () => void;
    currentStep: 1 | 2 | 3;
    isProcessing: boolean;
}) {
    const [isFocused, setIsFocused] = React.useState(false);

    // Submit on Ctrl+Enter or Cmd+Enter
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSubmit) {
            e.preventDefault();
            onSubmit();
        }
    };


    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isProcessing
                ? { opacity: 0, y: -16, filter: 'blur(2px)' }
                : { opacity: 1, y: 0, filter: 'blur(0px)' }
            }
            exit={{ opacity: 0, y: -16, filter: 'blur(2px)' }}
            transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94] // easeOutQuart
            }}
            className="min-h-screen relative"
            style={{ paddingTop: '12vh', paddingLeft: '6vw', paddingRight: '6vw' }}
        >
            {/* Step Number - Background */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="absolute select-none pointer-events-none"
                style={{
                    left: '2vw',
                    top: '10vh',
                    fontSize: '220px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.06)',
                    lineHeight: 1,
                    zIndex: 0,
                }}
            >
                01
            </motion.div>

            {/* Two Column Layout */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start min-h-[70vh]">
                {/* Left: Text Content */}
                <div className="max-w-[560px]">
                    {/* Label */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
                        style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            letterSpacing: '0.15em',
                            color: colors.textMuted,
                            textTransform: 'uppercase',
                            marginBottom: '20px',
                        }}
                    >
                        Diktat
                    </motion.p>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                    >
                        <span
                            style={{
                                display: 'block',
                                fontSize: 'clamp(48px, 8vw, 88px)',
                                fontWeight: 300,
                                color: colors.textPrimary,
                                letterSpacing: '-0.02em',
                                lineHeight: 1.05,
                            }}
                        >
                            Was wurde
                        </span>
                        <span
                            style={{
                                display: 'block',
                                fontSize: 'clamp(48px, 8vw, 88px)',
                                fontWeight: 600,
                                color: colors.textPrimary,
                                letterSpacing: '-0.02em',
                                lineHeight: 1.05,
                            }}
                        >
                            durchgeführt?
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
                        style={{
                            fontSize: '18px',
                            fontWeight: 400,
                            color: colors.textMuted,
                            marginTop: '16px',
                            marginBottom: '32px',
                        }}
                    >
                        Diktieren Sie die Behandlung
                    </motion.p>

                    {/* Underline Input */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
                    >
                        <textarea
                            value={dictation}
                            onChange={(e) => setDictation(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onKeyDown={handleKeyDown}
                            placeholder="36 mod anästhesie tief kofferdam 80€"
                            rows={2}
                            className="w-full resize-none outline-none"
                            style={{
                                maxWidth: '560px',
                                minHeight: '80px',
                                fontSize: '20px',
                                fontWeight: 300,
                                color: colors.textPrimary,
                                background: 'transparent',
                                border: 'none',
                                borderBottom: `2px solid ${isFocused ? colors.coralAccent : colors.lineSoft}`,
                                paddingBottom: '12px',
                                transition: 'border-color 0.25s ease',
                            }}
                        />
                        <style>{`
                            textarea::placeholder {
                                color: rgba(255,255,255,0.35);
                            }
                        `}</style>
                    </motion.div>

                    {/* Insurance Mode Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
                        style={{ marginTop: '24px' }}
                    >
                        <InsuranceModeBar />
                    </motion.div>

                    {/* Dictation Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.45, ease: 'easeOut' }}
                        style={{ marginTop: '16px' }}
                    >
                        <DictationButton
                            state={dictationState}
                            onClick={onDictationClick}
                        />
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
                        style={{ marginTop: '20px' }}
                    >
                        <motion.button
                            onClick={onSubmit}
                            disabled={!canSubmit}
                            whileHover={{ scale: canSubmit ? 1.02 : 1 }}
                            whileTap={{ scale: canSubmit ? 0.98 : 1 }}
                            className="inline-flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                padding: '16px 32px',
                                fontSize: '15px',
                                fontWeight: 600,
                                color: colors.textPrimary,
                                background: canSubmit ? colors.coralAccent : 'rgba(255,255,255,0.1)',
                                borderRadius: '999px',
                                border: 'none',
                                cursor: canSubmit ? 'pointer' : 'not-allowed',
                                boxShadow: canSubmit ? '0 8px 24px -4px rgba(255,107,74,0.35)' : 'none',
                                transition: 'all 0.25s ease',
                            }}
                        >
                            Analysieren
                            <ArrowRight className="w-4 h-4" />
                        </motion.button>
                        <p style={{
                            fontSize: '12px',
                            color: colors.textMuted,
                            marginTop: '8px',
                        }}>
                            oder ⌘+Enter
                        </p>
                    </motion.div>
                </div>

                {/* Floating Category Rail — absolute positioned */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
                    className="hidden lg:block absolute"
                    style={{
                        top: '12vh',      // Same as paddingTop of container
                        right: '96px',    // Jeton spec
                        zIndex: 20,
                    }}
                >
                    <CategorySelector
                        selectedCategory={selectedCategory}
                        selectedSubcategory={selectedSubcategory}
                        onSelectCategory={onSelectCategory}
                        onSelectSubcategory={onSelectSubcategory}
                        onBack={onBack}
                    />
                </motion.div>
            </div>

            {/* Stepper */}
            <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: '10vh' }}
            >
                <Stepper currentStep={currentStep} />
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SEKTION 2: BESTÄTIGEN
// ═══════════════════════════════════════════════════════════════

function QuestionsSection({
    extracted,
    questions,
    onAnswer,
    onProceed,
    allAnswered,
    isProcessing,
    hasMKV,
    selectedMaterial,
    onMaterialChange
}: {
    extracted: any;
    questions: any[];
    onAnswer: (questionId: string, optionId: string) => void;
    onProceed: () => void;
    allAnswered: boolean;
    isProcessing: boolean;
    hasMKV: boolean;
    selectedMaterial: string;
    onMaterialChange: (material: string) => void;
}) {
    // Group questions by category
    const groupedQuestions = {
        befund: questions.filter(q => q.category === 'forensic'),
        leistungen: questions.filter(q => q.category === 'upsell'),
        mehrkosten: questions.filter(q => q.category === 'mkv'),
    };

    const confirmedFromDictation = questions.filter(q => q.answered);
    const needsAnswer = questions.filter(q => !q.answered);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
                duration: 0.32,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="min-h-screen relative"
            style={{
                paddingTop: '14vh',
                paddingLeft: '8vw',
                paddingRight: '8vw',
                background: gradients.warm,
            }}
        >
            {/* Step Number Background */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="absolute select-none pointer-events-none"
                style={{
                    left: '3vw',
                    top: '10vh',
                    fontSize: '200px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.05)',
                    lineHeight: 1,
                    zIndex: 0,
                }}
            >
                02
            </motion.div>

            {/* Content - Two Column Layout */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-start max-w-6xl mx-auto">
                {/* Left: Extraction Summary */}
                <div className="max-w-[480px]">
                    {/* Label */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            letterSpacing: '0.18em',
                            color: colors.textMuted,
                            textTransform: 'uppercase',
                            marginBottom: '16px',
                        }}
                    >
                        Bestätigen
                    </motion.p>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                    >
                        <span style={{
                            display: 'block',
                            fontSize: 'clamp(48px, 7vw, 80px)',
                            fontWeight: 300,
                            color: colors.textPrimary,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.05,
                        }}>
                            Zahn{' '}
                            <span style={{ fontWeight: 600 }}>{extracted?.tooth || '—'}</span>
                        </span>
                    </motion.h1>

                    {/* Summary Pills */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.25 }}
                        className="flex flex-wrap gap-2 mt-6 mb-8"
                    >
                        {extracted?.surfaces?.length > 0 && (
                            <span className="px-4 py-2 rounded-full text-sm font-medium" style={{
                                background: 'rgba(255,255,255,0.18)',
                                color: colors.textPrimary,
                            }}>
                                {extracted.surfaces.join('/').toUpperCase()}
                            </span>
                        )}
                        {extracted?.diagnosis && (
                            <span className="px-4 py-2 rounded-full text-sm font-medium" style={{
                                background: 'rgba(255,255,255,0.18)',
                                color: colors.textPrimary,
                            }}>
                                {extracted.diagnosis}
                            </span>
                        )}
                        {extracted?.costs && (
                            <span className="px-4 py-2 rounded-full text-sm font-semibold" style={{
                                background: colors.coralAccent,
                                color: colors.textPrimary,
                            }}>
                                {extracted.costs}€
                            </span>
                        )}
                    </motion.div>

                    {/* Confirmed Items - Compact Pills */}
                    {confirmedFromDictation.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            className="mb-6"
                        >
                            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: colors.textMuted }}>
                                Aus Diktat erkannt
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {confirmedFromDictation.map(q => {
                                    const opt = q.options.find((o: any) => o.id === q.answered);
                                    return (
                                        <span
                                            key={q.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                                            style={{
                                                background: 'rgba(255,255,255,0.12)',
                                                color: colors.textSecondary,
                                            }}
                                        >
                                            <Check className="w-3 h-3" />
                                            {opt?.label || q.answered}
                                        </span>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        style={{ marginTop: '32px' }}
                    >
                        <motion.button
                            onClick={onProceed}
                            disabled={!allAnswered || isProcessing}
                            whileHover={{ scale: allAnswered && !isProcessing ? 1.02 : 1 }}
                            whileTap={{ scale: allAnswered && !isProcessing ? 0.98 : 1 }}
                            className="inline-flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                padding: '18px 36px',
                                fontSize: '15px',
                                fontWeight: 600,
                                color: colors.textPrimary,
                                background: colors.coralAccent,
                                borderRadius: '999px',
                                border: 'none',
                                cursor: allAnswered ? 'pointer' : 'not-allowed',
                                boxShadow: '0 12px 32px -8px rgba(255,107,74,0.4)',
                            }}
                        >
                            {isProcessing ? (
                                <>
                                    <motion.div
                                        className="w-5 h-5 border-2 rounded-full"
                                        style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    />
                                    Generiere...
                                </>
                            ) : (
                                <>
                                    Fertigstellen
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                </div>

                {/* Right: Questions Panel */}
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full lg:w-[400px] space-y-6"
                >
                    {/* Befund Section */}
                    {groupedQuestions.befund.filter(q => !q.answered).length > 0 && (
                        <QuestionGroup
                            title="Befund"
                            icon="🔍"
                            questions={groupedQuestions.befund.filter(q => !q.answered)}
                            onAnswer={onAnswer}
                        />
                    )}

                    {/* Leistungen Section */}
                    {groupedQuestions.leistungen.filter(q => !q.answered).length > 0 && (
                        <QuestionGroup
                            title="Zusatzleistungen"
                            icon="💡"
                            questions={groupedQuestions.leistungen.filter(q => !q.answered)}
                            onAnswer={onAnswer}
                        />
                    )}

                    {/* Mehrkosten Section */}
                    {hasMKV && groupedQuestions.mehrkosten.filter(q => !q.answered).length > 0 && (
                        <QuestionGroup
                            title="Mehrkosten"
                            icon="💶"
                            questions={groupedQuestions.mehrkosten.filter(q => !q.answered)}
                            onAnswer={onAnswer}
                        />
                    )}

                    {/* All Done */}
                    {needsAnswer.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-8 px-6 rounded-3xl text-center"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                        >
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'rgba(255,255,255,0.15)' }}
                            >
                                <Check className="w-7 h-7" style={{ color: colors.textPrimary }} />
                            </div>
                            <p style={{ fontSize: '16px', color: colors.textSecondary }}>
                                Alle Angaben vollständig
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Stepper */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: '10vh' }}
            >
                <div className="flex items-center gap-0">
                    <div className="w-2 h-2 rounded-full" style={{ background: colors.coralAccent }} />
                    <div style={{ width: '28px', height: '2px', background: colors.coralAccent, opacity: 0.6 }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: colors.coralAccent }} />
                    <div style={{ width: '28px', height: '2px', background: colors.lineSoft }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                </div>
            </motion.div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════
// QUESTION GROUP COMPONENT - Jeton Style Cards
// ═══════════════════════════════════════════════════════════════

function QuestionGroup({
    title,
    icon,
    questions,
    onAnswer
}: {
    title: string;
    icon: string;
    questions: any[];
    onAnswer: (questionId: string, optionId: string) => void;
}) {
    return (
        <div
            className="rounded-3xl p-5"
            style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    {title}
                </span>
            </div>

            {/* Questions */}
            <div className="space-y-5">
                {questions.map((q, i) => (
                    <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.06 }}
                    >
                        <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                            {q.question.replace(/[🔍💡💶🎨🧪💎]/g, '').trim()}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {q.options.map((opt: any) => (
                                <motion.button
                                    key={opt.id}
                                    onClick={() => onAnswer(q.id, opt.id)}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
                                    style={{
                                        background: q.answered === opt.id
                                            ? colors.coralAccent
                                            : 'rgba(255,255,255,0.10)',
                                        color: colors.textPrimary,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: q.answered === opt.id
                                            ? '0 4px 12px rgba(255,107,74,0.3)'
                                            : 'none',
                                    }}
                                >
                                    {opt.label}
                                    {opt.billingValue > 0 && (
                                        <span className="ml-2 opacity-70" style={{ fontSize: '12px' }}>
                                            +{opt.billingValue.toFixed(0)}€
                                        </span>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function OutputSection({
    output,
    textLength,
    setTextLength,
    onReset,
    insuranceType
}: {
    output: any;
    textLength: string;
    setTextLength: (l: any) => void;
    onReset: () => void;
    insuranceType: string;
}) {
    const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

    // ComposedOutput structure:
    // - sections[]: {id, label, content, lines, evidenceRefs}
    // - fullText: string
    // - billingCodes: string[]
    // - warnings: string[]

    // Extract data from sections for display
    const headerSection = output.sections?.find((s: any) => s.id === 'header');
    const behandlungSection = output.sections?.find((s: any) => s.id === 'behandlung');
    const leistungenSection = output.sections?.find((s: any) => s.id === 'leistungen');
    const abrechnungSection = output.sections?.find((s: any) => s.id === 'abrechnung');
    const befundSection = output.sections?.find((s: any) => s.id === 'befund');

    // Build behandlungsablauf from sections (excluding abrechnung)
    const behandlungText = output.sections
        ?.filter((s: any) => s.id !== 'abrechnung' && s.id !== 'header')
        .map((s: any) => s.content)
        .join('\n\n') || output.fullText || '';

    // Billing display (billingCodes are string[] like "BEMA_13c", "GOZ_2080")
    const billingCodes = output.billingCodes || [];

    const handleCopy = (section: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSection(section);
        setTimeout(() => setCopiedSection(null), 2000);
    };

    const copyAll = () => {
        handleCopy('all', output.fullText || behandlungText);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen relative"
            style={{
                paddingTop: '10vh',
                paddingLeft: '6vw',
                paddingRight: '6vw',
                paddingBottom: '10vh',
                background: gradients.light,
            }}
        >
            {/* Step Number */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7 }}
                className="absolute select-none pointer-events-none"
                style={{
                    left: '3vw',
                    top: '8vh',
                    fontSize: '180px',
                    fontWeight: 700,
                    color: 'rgba(255,107,74,0.06)',
                    lineHeight: 1,
                    zIndex: 0,
                }}
            >
                03
            </motion.div>

            {/* Content - Two Column */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 max-w-6xl mx-auto">
                {/* Left: Main Output */}
                <div>
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(255,107,74,0.15)' }}
                            >
                                <Check className="w-6 h-6" style={{ color: colors.coralAccent }} />
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,107,74,0.6)' }}>
                                    Dokumentation fertig
                                </p>
                                <h1 style={{
                                    fontSize: '28px',
                                    fontWeight: 600,
                                    color: colors.coralAccent,
                                }}>
                                    {headerSection?.content?.trim() || 'Dokumentation'}
                                </h1>
                            </div>
                        </div>

                        {/* Text Length Toggle */}
                        <div
                            className="inline-flex rounded-full p-1"
                            style={{ background: 'rgba(255,107,74,0.08)' }}
                        >
                            {(['kurz', 'mittel', 'lang'] as const).map((len) => (
                                <motion.button
                                    key={len}
                                    onClick={() => setTextLength(len)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                                    style={{
                                        background: textLength === len ? colors.coralAccent : 'transparent',
                                        color: textLength === len ? '#fff' : 'rgba(255,107,74,0.5)',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {len.charAt(0).toUpperCase() + len.slice(1)}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Behandlungsablauf Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="rounded-2xl p-5 mb-6"
                        style={{
                            background: 'rgba(255,255,255,0.70)',
                            boxShadow: '0 12px 32px -8px rgba(0,0,0,0.08)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(120,90,70,0.5)' }}>
                                Behandlungsablauf
                            </span>
                            <motion.button
                                onClick={() => handleCopy('behandlung', behandlungText)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                                style={{
                                    background: copiedSection === 'behandlung' ? colors.coralAccent : 'rgba(255,107,74,0.08)',
                                    color: copiedSection === 'behandlung' ? '#fff' : colors.coralAccent,
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <Copy className="w-3 h-3" />
                                {copiedSection === 'behandlung' ? 'Kopiert!' : 'Kopieren'}
                            </motion.button>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(80,60,50,0.85)' }}>
                            {behandlungText}
                        </p>
                    </motion.div>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                        className="flex gap-3"
                    >
                        <motion.button
                            onClick={copyAll}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center gap-2"
                            style={{
                                padding: '16px 32px',
                                fontSize: '15px',
                                fontWeight: 600,
                                color: colors.textPrimary,
                                background: colors.coralAccent,
                                borderRadius: '999px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 8px 24px -4px rgba(255,107,74,0.35)',
                            }}
                        >
                            <Copy className="w-4 h-4" />
                            {copiedSection === 'all' ? 'Alles kopiert!' : 'Alles kopieren'}
                        </motion.button>
                        <motion.button
                            onClick={onReset}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-12 h-12 flex items-center justify-center rounded-full"
                            style={{
                                background: 'rgba(255,107,74,0.10)',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <RotateCcw className="w-5 h-5" style={{ color: colors.coralAccent }} />
                        </motion.button>
                    </motion.div>
                </div>

                {/* Right: Billing Panel */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="space-y-4"
                >
                    {/* Billing Card */}
                    <div
                        className="rounded-2xl p-5"
                        style={{
                            background: 'rgba(255,255,255,0.70)',
                            boxShadow: '0 12px 32px -8px rgba(0,0,0,0.08)',
                        }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(120,90,70,0.5)' }}>
                                Abrechnung ({insuranceType})
                            </span>
                            <span className="text-lg font-bold" style={{ color: colors.coralAccent }}>
                                {billingCodes.length} Codes
                            </span>
                        </div>

                        {/* Billing Pills - now using billingCodes: string[] */}
                        <div className="flex flex-wrap gap-2">
                            {billingCodes.map((code: string, i: number) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                                    className="px-3 py-2 rounded-xl text-xs"
                                    style={{
                                        background: code.startsWith('GOZ')
                                            ? 'rgba(107,74,255,0.12)'
                                            : 'rgba(255,107,74,0.12)',
                                        color: code.startsWith('GOZ')
                                            ? 'rgb(107,74,200)'
                                            : 'rgba(200,80,50,1)',
                                    }}
                                >
                                    <span className="font-bold">{code.replace('BEMA_', '').replace('GOZ_', '')}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Copy Billing */}
                        <motion.button
                            onClick={() => handleCopy('billing', output.abrechnung.map((c: any) => `${c.code}: ${c.label}`).join('\n'))}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full mt-4 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium"
                            style={{
                                background: copiedSection === 'billing' ? colors.coralAccent : 'rgba(255,107,74,0.08)',
                                color: copiedSection === 'billing' ? '#fff' : colors.coralAccent,
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <Copy className="w-3 h-3" />
                            {copiedSection === 'billing' ? 'Kopiert!' : 'Codes kopieren'}
                        </motion.button>
                    </div>

                    {/* Audit Panel (Warnings from Engine) */}
                    {output.warnings && output.warnings.length > 0 && (
                        <div
                            className="rounded-2xl p-4"
                            style={{
                                background: 'rgba(255,200,100,0.15)',
                                border: '1px solid rgba(255,180,80,0.3)',
                            }}
                        >
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(180,120,40,0.8)' }}>
                                ⚠️ Hinweise
                            </span>
                            <ul className="mt-2 space-y-1">
                                {output.warnings.map((w: any, i: number) => (
                                    <li key={i} className="text-xs" style={{ color: 'rgba(150,100,30,0.9)' }}>
                                        {/* Defensive: handle both string and ValidationWarning object */}
                                        • {typeof w === 'string' ? w : (w.title || w.description || JSON.stringify(w))}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Optimizations Panel */}
                    {output.optimierungen && output.optimierungen.length > 0 && (
                        <div
                            className="rounded-2xl p-4"
                            style={{
                                background: 'rgba(100,200,150,0.12)',
                                border: '1px solid rgba(80,180,120,0.25)',
                            }}
                        >
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(60,140,90,0.8)' }}>
                                💡 Optimierungen
                            </span>
                            <ul className="mt-2 space-y-1">
                                {output.optimierungen.map((o: string, i: number) => (
                                    <li key={i} className="text-xs" style={{ color: 'rgba(50,120,70,0.9)' }}>
                                        • {o}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Stepper */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: '6vh' }}
            >
                <div className="flex items-center gap-0">
                    <div className="w-2 h-2 rounded-full" style={{ background: colors.coralAccent }} />
                    <div style={{ width: '28px', height: '2px', background: colors.coralAccent, opacity: 0.6 }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: colors.coralAccent }} />
                    <div style={{ width: '28px', height: '2px', background: colors.coralAccent, opacity: 0.6 }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: colors.coralAccent }} />
                </div>
            </motion.div>
        </motion.div>
    );
}

