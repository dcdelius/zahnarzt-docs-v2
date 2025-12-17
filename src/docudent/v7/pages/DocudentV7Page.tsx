/**
 * V7 Page — Jeton-grade Premium Hero Composition
 *
 * Design principles:
 * - NO mode toggle
 * - ONE stable input zone (canvas-style, no card)
 * - Controls are unified cluster: Input + baseline + ActionDock
 * - Step number overlay is monumental (220-360px)
 * - HeroSculpture stacked slices for Jeton wow
 * - Treatment selector near top label
 *
 * State behavior (unchanged):
 * - Empty: Mic active, Send disabled
 * - Typing: Mic disabled, Send active (glow)
 * - Recording: Mic pulsing, Send disabled, Input disabled
 * - Processing: All disabled
 *
 * ❌ NO business logic
 * ✅ Pure UI rendering
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useV7Pipeline } from '../hooks/useV7Pipeline';

// Components
import { QuestionRenderer } from '../components/QuestionRenderer';
import { QuestionsLayout } from '../components/QuestionsLayout';
import { StepDots } from '../components/StepDots';
import { OutputRenderer } from '../components/OutputRenderer';
import { InsuranceSelector } from '../components/InsuranceSelector';
import { TextLengthSelector } from '../components/TextLengthSelector';
import { PrimaryCTAButton } from '../components/PrimaryCTAButton';
import { ActionDock } from '../components/ActionDock';
import { DictationAura } from '../components/DictationAura';
import { HeroSculpture } from '../components/HeroSculpture';
import { TreatmentSelector, getTreatmentPlaceholder, type TreatmentType } from '../components/TreatmentSelector';
import { SegmentEditor } from '../components/SegmentEditor';
import { MultiOutputRenderer } from '../components/MultiOutputRenderer';

// Tokens
import {
    colors,
    gradients,
    shadows,
    radii,
    motion as motionTokens,
    typography,
    spacing,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// RHYTHM — Luxury vertical spacing
// ═══════════════════════════════════════════════════════════════

const rhythm = {
    heroTop: '14vh',
    labelToHeadline: '14px',
    headlineToSubtitle: '18px',
    subtitleToInput: '48px',        // Luxury spacing
    inputToActionDock: '12px',      // Tight attachment
    actionDockToInsurance: '48px',  // Breathing space
    sectionPadding: spacing.heroPadding,
};

// ═══════════════════════════════════════════════════════════════
// STEP NUMBER — Maps state to display
// ═══════════════════════════════════════════════════════════════

const STEP_MAP: Record<string, string> = {
    idle: '01',
    processing: '01',
    questions: '02',
    output: '03',
    error: '01',
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// TYPOGRAPHY — Very bold Inter
// ═══════════════════════════════════════════════════════════════

// Treatment labels — lowercase for background word
const TREATMENT_LABELS: Record<TreatmentType, string> = {
    fuellung: 'füllung',
    kontrolle: 'kontrolle',
    pzr: 'prophylaxe',
    endo: 'endodontie',
    extraktion: 'extraktion',
    par: 'parodontologie',
    ze: 'prothetik',
};

const styles = {
    page: {
        minHeight: '100vh',
        position: 'relative' as const,
        overflow: 'hidden',
        background: gradients.heroDeep,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
    },
    vignette: {
        position: 'fixed' as const,
        inset: 0,
        background: gradients.vignette,
        pointerEvents: 'none' as const,
        zIndex: 1,
    },
    orb1: {
        position: 'absolute' as const,
        top: '-100px',
        right: '-120px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: colors.orbApricot,
        opacity: 0.06,
        filter: 'blur(160px)',
        pointerEvents: 'none' as const,
        zIndex: 0,
    },
    orb2: {
        position: 'absolute' as const,
        bottom: '-120px',
        left: '-100px',
        width: '550px',
        height: '550px',
        borderRadius: '50%',
        background: colors.orbPink,
        opacity: 0.08,
        filter: 'blur(180px)',
        pointerEvents: 'none' as const,
        zIndex: 0,
    },
    // ═══════════════════════════════════════════════════════════════
    // ROTATED BACKGROUND WORD — Extra bold, lowercase, vertical
    // Using writing-mode for reliable vertical orientation
    // ═══════════════════════════════════════════════════════════════
    rotatedTypo: {
        position: 'fixed' as const,
        right: '2vw',
        top: '35%',
        transform: 'translateY(-50%)',
        writingMode: 'vertical-rl' as const,
        textOrientation: 'mixed' as const,
        fontSize: 'clamp(180px, 22vw, 340px)',
        fontFamily: typography.fontFamily,
        fontWeight: 900,
        letterSpacing: '-0.04em',
        color: colors.textPrimary,
        opacity: 0.055,
        pointerEvents: 'none' as const,
        userSelect: 'none' as const,
        zIndex: 2,
        whiteSpace: 'nowrap' as const,
        textTransform: 'lowercase' as const,
    },
    // ═══════════════════════════════════════════════════════════════
    // STEP NUMBER — Structural magazine page index
    // Behind headline (z-3), not behind background
    // ═══════════════════════════════════════════════════════════════
    stepNumber: {
        position: 'absolute' as const,
        top: '4vh',
        left: '-2vw',
        fontSize: 'clamp(200px, 22vw, 340px)',
        fontWeight: 800,
        color: colors.textPrimary,
        opacity: 0.045,
        lineHeight: 0.8,
        letterSpacing: '-0.05em',
        pointerEvents: 'none' as const,
        zIndex: 3,
        userSelect: 'none' as const,
    },
    content: {
        position: 'relative' as const,
        zIndex: 10,
        paddingTop: rhythm.heroTop,
        paddingLeft: rhythm.sectionPadding,
        paddingRight: rhythm.sectionPadding,
        minHeight: '100vh',
    },
    // Hero Stack — unified alignment
    heroStack: {
        maxWidth: '580px',
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column' as const,
    },
    // Top bar with treatment selector
    topBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: rhythm.labelToHeadline,
    },
    // ═══════════════════════════════════════════════════════════════
    // HEADLINE — Even larger
    // ═══════════════════════════════════════════════════════════════
    label: {
        fontSize: '12px',
        fontWeight: typography.regular,
        letterSpacing: '0.04em',
        color: 'rgba(255,255,255,0.45)',
    },
    headline: {
        display: 'block' as const,
        fontSize: 'clamp(44px, 6.5vw, 72px)',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.60)',
        letterSpacing: '-0.02em',
        lineHeight: 1.0,
    },
    headlineBold: {
        display: 'block' as const,
        fontSize: 'clamp(44px, 6.5vw, 72px)',
        fontWeight: 700,
        color: colors.textPrimary,
        letterSpacing: '-0.03em',
        lineHeight: 0.92,
    },
    subtitle: {
        fontSize: '15px',
        fontWeight: typography.regular,
        color: 'rgba(255,255,255,0.40)',
        marginTop: '20px',
        letterSpacing: '0.01em',
    },
    // ═══════════════════════════════════════════════════════════════
    // INPUT ZONE — The visual hero. Writing surface, not form.
    // Larger than headline. Dominant. Editorial baseline.
    // ═══════════════════════════════════════════════════════════════
    inputZone: {
        marginTop: '40px',
        position: 'relative' as const,
    },
    textarea: {
        width: '100%',
        minHeight: '100px',
        padding: '0',
        border: 'none',
        background: 'transparent',
        color: 'rgba(255,255,255,0.94)',
        fontSize: 'clamp(28px, 5vw, 38px)',
        fontWeight: 300,
        resize: 'none' as const,
        outline: 'none',
        lineHeight: 1.4,
        letterSpacing: '-0.005em',
        caretColor: colors.coralAccent,
        caretWidth: '3px',
    },
    // Baseline — subtle editorial underline, glows on recording
    baseline: (isRecording: boolean, isFocused: boolean) => ({
        width: '100%',
        height: '1px',
        background: `linear-gradient(90deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
        marginTop: '16px',
        opacity: isRecording ? 1 : isFocused ? 0.7 : 0.4,
        boxShadow: isRecording
            ? `0 0 20px ${colors.coralAccent}40, 0 0 40px ${colors.coralAccent}20`
            : 'none',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    }),
    // ═══════════════════════════════════════════════════════════════
    // ACTION DOCK — Instrument positioning
    // Offset left (not centered), moves closer during recording
    // ═══════════════════════════════════════════════════════════════
    actionDockSection: (isRecording: boolean) => ({
        marginTop: isRecording ? '8px' : '16px',
        marginLeft: '-2px',
        transition: 'margin-top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    }),
    // Insurance section — reduced visual weight
    insuranceSection: {
        marginTop: rhythm.actionDockToInsurance,
        opacity: 0.92,
    },
    // Processing
    processingOverlay: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '80px',
        minHeight: '50vh',
    },
    spinner: {
        width: '56px',
        height: '56px',
        border: '3px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: colors.coralAccent,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    errorCard: {
        background: 'rgba(239, 68, 68, 0.10)',
        borderRadius: radii.card,
        padding: '40px',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: '#FFCDD2',
        textAlign: 'center' as const,
        backdropFilter: 'blur(12px)',
        maxWidth: '480px',
    },
};

// ═══════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export const DocudentV7Page: React.FC = () => {
    const {
        dictation,
        insuranceType,
        textLength,
        hasMKV,
        answers,
        isProcessing,
        currentState,
        questions,
        output,
        error,
        extracted,
        setDictation,
        setInsuranceType,
        setTextLength,
        setHasMKV,
        answerQuestion,
        runPipeline,
        reset,
        // Multi-treatment
        isMultiMode,
        setMultiMode,
        segments,
        updateSegment,
        addSegment,
        removeSegment,
        runMulti,
        multiResult,
    } = useV7Pipeline();

    const [isFocused, setIsFocused] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordTime, setRecordTime] = useState(0);

    // Treatment persistence with localStorage
    const [treatment, setTreatmentState] = useState<TreatmentType>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('v7_treatment');
            if (saved && ['fuellung', 'kontrolle', 'pzr', 'endo', 'extraktion', 'par', 'ze'].includes(saved)) {
                return saved as TreatmentType;
            }
        }
        return 'fuellung';
    });
    const setTreatment = (t: TreatmentType) => {
        setTreatmentState(t);
        if (typeof window !== 'undefined') {
            localStorage.setItem('v7_treatment', t);
        }
    };

    const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Recording timer
    useEffect(() => {
        if (isRecording) {
            setRecordTime(0);
            recordTimerRef.current = setInterval(() => {
                setRecordTime((t) => t + 1);
            }, 1000);
        } else {
            if (recordTimerRef.current) {
                clearInterval(recordTimerRef.current);
            }
        }
        return () => {
            if (recordTimerRef.current) {
                clearInterval(recordTimerRef.current);
            }
        };
    }, [isRecording]);

    // Keyboard shortcut (for textarea)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl+Enter → trigger pipeline
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && dictation.trim() && !isRecording) {
            e.preventDefault();
            runPipeline();
        }
    };

    // Document-level Escape handler (works regardless of focus)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && (currentState === 'questions' || currentState === 'output')) {
                e.preventDefault();
                reset();
            }
        };
        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [currentState, reset]);

    // Mic button
    const handleMicClick = () => {
        if (isRecording) {
            // Stop recording → auto-analyze
            setIsRecording(false);
            if (dictation.trim()) {
                setTimeout(() => runPipeline(), 200);
            }
        } else {
            // Start recording
            setIsRecording(true);
        }
    };

    // Send button
    const handleSendClick = () => {
        if (dictation.trim() && !isRecording) {
            runPipeline();
        }
    };

    // State derivation
    const hasText = dictation.trim().length > 0;
    const stepNumber = STEP_MAP[currentState] || '01';

    // ═══════════════════════════════════════════════════════════════
    // STATE-BASED GRADIENT (Prompt A: V6 parity)
    // ═══════════════════════════════════════════════════════════════
    const STATE_GRADIENT: Record<string, string> = {
        idle: gradients.heroDeep,
        processing: gradients.heroDeep,
        running: gradients.heroDeep,
        questions: gradients.questionsWarm,
        output: gradients.outputLight,
        multi_output: gradients.outputLight,
        error: gradients.heroDeep,
    };
    const stateGradient = STATE_GRADIENT[currentState] || gradients.heroDeep;

    // ─── Render based on state ─────────────────────────────────
    const renderContent = () => {
        // Processing
        if (isProcessing) {
            return (
                <motion.div
                    style={styles.processingOverlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: motionTokens.durationMedium }}
                >
                    <div style={styles.spinner} />
                    <span style={{
                        fontSize: '18px',
                        fontWeight: typography.light,
                        color: colors.textSecondary,
                    }}>
                        Analysiere...
                    </span>
                </motion.div>
            );
        }

        // Error
        if (currentState === 'error' && error) {
            return (
                <motion.div
                    style={styles.errorCard}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: motionTokens.durationMedium, ease: motionTokens.easing }}
                >
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>❌ Fehler</div>
                    <div style={{ marginBottom: '24px', opacity: 0.9 }}>{error}</div>
                    <PrimaryCTAButton onClick={reset}>
                        Neu starten
                    </PrimaryCTAButton>
                </motion.div>
            );
        }

        // Questions — V6 two-column layout
        if (currentState === 'questions' && questions.length > 0) {
            return (
                <div data-testid="questions-panel">
                    <QuestionsLayout
                        questions={questions}
                        answers={answers}
                        onAnswer={answerQuestion}
                        onComplete={runPipeline}
                        extracted={extracted}
                        insuranceType={insuranceType}
                        hasMKV={hasMKV}
                    />
                </div>
            );
        }

        // Multi-Treatment Output
        if (currentState === 'multi_output' && multiResult) {
            return (
                <MultiOutputRenderer result={multiResult} onReset={reset} />
            );
        }

        // Output
        if (currentState === 'output' && output) {
            return (
                <div data-testid="output-panel">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: motionTokens.durationMedium, delay: 0.1 }}
                        style={{ marginBottom: '24px' }}
                    >
                        <TextLengthSelector value={textLength} onChange={setTextLength} />
                    </motion.div>
                    <OutputRenderer output={output} />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}
                    >
                        <PrimaryCTAButton onClick={reset}>
                            Neue Dokumentation
                        </PrimaryCTAButton>
                    </motion.div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════════════
        // IDLE STATE — Hero Stack with unified rhythm
        // ═══════════════════════════════════════════════════════════════
        return (
            <div style={styles.heroStack}>
                {/* Top bar: Treatment selector + Diktat label */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                    style={styles.topBar}
                >
                    <span style={styles.label}>Behandlung</span>
                    <TreatmentSelector value={treatment} onChange={setTreatment} />
                </motion.div>

                {/* Headline — dramatic entrance */}
                <motion.h1
                    initial={{ opacity: 0, y: 40, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <span style={styles.headline}>Was wurde</span>
                    <motion.span
                        style={styles.headlineBold}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
                    >
                        durchgeführt?
                    </motion.span>
                </motion.h1>

                {/* Subtitle — fade in delayed */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    style={styles.subtitle}
                >
                    Diktieren oder tippen Sie Ihre Behandlung
                </motion.p>

                {/* Input Zone — canvas-style */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: motionTokens.easing }}
                    style={styles.inputZone}
                >
                    <DictationAura isRecording={isRecording} />
                    <textarea
                        value={dictation}
                        onChange={(e) => setDictation(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder={getTreatmentPlaceholder(treatment)}
                        rows={2}
                        style={styles.textarea}
                        disabled={isRecording}
                        data-testid="dictation-input"
                    />
                    <style>{`
                        textarea::placeholder {
                            color: rgba(255,255,255,0.28);
                        }
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                    {/* Baseline — enhanced glow during recording */}
                    <div style={styles.baseline(isRecording, isFocused)} />
                </motion.div>

                {/* Action Dock — tight to baseline */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25, ease: motionTokens.easing }}
                    style={styles.actionDockSection(isRecording)}
                >
                    <ActionDock
                        hasText={hasText}
                        isRecording={isRecording}
                        isProcessing={isProcessing}
                        recordTime={recordTime}
                        onMicClick={handleMicClick}
                        onSendClick={handleSendClick}
                    />
                </motion.div>

                {/* Insurance Section */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3, ease: motionTokens.easing }}
                    style={styles.insuranceSection}
                >
                    <p style={{ ...styles.label, marginBottom: '12px' }}>Versicherung</p>
                    <InsuranceSelector
                        insuranceType={insuranceType}
                        hasMKV={hasMKV}
                        onInsuranceChange={setInsuranceType}
                        onMKVChange={setHasMKV}
                    />
                </motion.div>

                {/* Multi-Treatment Toggle */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{ marginTop: spacing.lg }}
                >
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                    }}>
                        <input
                            type="checkbox"
                            checked={isMultiMode}
                            onChange={(e) => setMultiMode(e.target.checked)}
                            data-testid="multi-mode-toggle"
                            style={{ cursor: 'pointer' }}
                        />
                        Multi-Treatment (manual segments)
                    </label>
                </motion.div>

                {/* Segment Editor (when multi-mode enabled) */}
                {isMultiMode && (
                    <SegmentEditor
                        segments={segments}
                        onUpdateSegment={updateSegment}
                        onAddSegment={addSegment}
                        onRemoveSegment={removeSegment}
                        onRunMulti={runMulti}
                        isProcessing={isProcessing}
                    />
                )}
            </div>
        );
    };

    return (
        <div style={styles.page}>
            {/* Vignette */}
            <div style={styles.vignette} />

            {/* ═══════════════════════════════════════════════════════════════
                ANIMATED BACKGROUND — State-based gradient transition (Prompt A)
                Crossfades between heroDeep → questionsWarm → outputLight
            ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`bg-${currentState}`}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: stateGradient,
                        zIndex: 0,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: motionTokens.easing }}
                    data-testid="v7-background"
                    data-state={currentState}
                />
            </AnimatePresence>

            {/* Background orbs — reduced for breathing space */}
            <motion.div
                style={styles.orb1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.06 }}
                transition={{ duration: 1.2 }}
            />
            <motion.div
                style={styles.orb2}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.08 }}
                transition={{ duration: 1.2, delay: 0.3 }}
            />

            {/* Hero Sculpture — Jeton stacked slices */}
            <HeroSculpture isRecording={isRecording} />

            {/* ═══════════════════════════════════════════════════════════════
                ROTATED BACKGROUND WORD — Dramatic entrance
                Slides in from below, then breathes gently.
            ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={treatment}
                    style={styles.rotatedTypo}
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    animate={{
                        opacity: 0.06,
                        y: 0,
                        scale: 1,
                    }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{
                        opacity: { duration: 0.8, ease: 'easeOut' },
                        y: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
                        scale: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
                    }}
                >
                    {TREATMENT_LABELS[treatment]}
                </motion.div>
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════════
                STEP NUMBER — Structural magazine page index
                Smooth state transitions, acts like magazine index
            ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={stepNumber}
                    style={styles.stepNumber}
                    initial={{ opacity: 0, scale: 0.96, x: -20 }}
                    animate={{
                        opacity: 0.045,
                        scale: 1,
                        x: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.96, x: 20 }}
                    transition={{
                        duration: 0.4,
                        ease: motionTokens.easing,
                    }}
                >
                    {stepNumber}
                </motion.div>
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════════
                MAIN CONTENT — AnimatePresence for step transitions (Prompt C)
                Each state has unique motion for "designed" feel
            ═══════════════════════════════════════════════════════════════ */}
            <main style={styles.content}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentState}
                        initial={{
                            opacity: 0,
                            y: currentState === 'idle' ? 20 : 0,
                            x: currentState === 'questions' ? 30 : 0,
                            scale: currentState === 'output' ? 0.98 : 1,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            x: 0,
                            scale: 1,
                        }}
                        exit={{
                            opacity: 0,
                            y: -10,
                            scale: 0.99,
                        }}
                        transition={{
                            duration: 0.35,
                            ease: motionTokens.easing,
                        }}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Step Dots — Bottom Center */}
            <StepDots currentState={currentState} />
        </div>
    );
};

export default DocudentV7Page;
