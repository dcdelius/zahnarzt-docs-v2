/**
 * V10 Page — The "Jeton" Golden UI + Full V10 Power
 * 
 * COPIED 1:1 FROM V8, then extended with:
 * - Questions/Output/Error rendering  
 * - Multi-instance (Bundle) mode UI
 * - Pack registry integration for treatments
 * - Debug drawer for meta/trace/explain
 * - Full data-testid coverage
 * 
 * Logic: Uses useV10Pipeline (which internally calls runV10)
 * UI: Identical to V8 Jeton layout
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// LOGIC HOOK (Same as V8 - this calls runV10 internally)
import { useV10Pipeline, type InsuranceType, type TextLength } from '../hooks/useV10Pipeline';
import { useSettings } from '../settings/useSettings';
import type { ReproBundleV1 } from '../debug/reproBundle';
import { AudioRecorder } from '../../../services/AudioRecorder';
import { WhisperService } from '../../../services/WhisperService';
import { useUser } from '../../../contexts/UserContext';

// PACK REGISTRY - V10 addition for dynamic treatment list
import { listPacks, listPackIds, getPack } from '../packs';

// DESIGN COMPONENTS & LAYERS (from V10 barrel)
import { SoftGradientBackground, HeroSculpture } from '../components';
import { HeaderDock } from '../components/HeaderDock';
import { colors, gradients, radii, shadows, typography, motion as motionTokens } from '../styles/tokens';

// CONTROLS (V10 versions)
import { V10TreatmentSelector } from '../components/V10TreatmentSelector';
import { V10TextLengthSelector } from '../components/V10TextLengthSelector';
import { V10InsuranceSelector } from '../components/V10InsuranceSelector';

// V10 ADDITIONS: Questions/Output (from V10 barrel)
import {
    QuestionsFlowV2,
    OutputFlow,
    MultiOutputRenderer,
    V10PostAnalysisDashboard,
    V10DebugDrawer,
} from '../components';

// V10 ADDITION: Debug drawer
import { useChipOverrides } from '../settings/useChipOverrides';

// Types (from V10 barrel)
import type { TreatmentInstance, UiStep } from '../components';
import type { QuestionBundle } from '../../contracts/questions';

export default function DocudentV10Page() {
    // ═══════════════════════════════════════════════════════════════
    // 1. LOGIC LAYER (useV10Pipeline — direct V10 call)
    // ═══════════════════════════════════════════════════════════════
    const { selectedUser } = useUser();
    const { settingsInput, userSettings, isLoaded } = useSettings({ userId: selectedUser });
    const {
        dictation,
        setDictation,
        isProcessing,
        currentState,
        runPipeline,
        reset,
        insuranceType,
        setInsuranceType,
        textLength,
        setTextLength,
        hasMKV,
        setHasMKV,
        setTreatmentId,
        setAnswers,
        // Questions/output
        questions,
        output,
        answers,
        answerQuestion,
        result,
        error,
        extracted,
        goToQuestions,
        // Multi-treatment
        isMultiMode,
        setMultiMode,
        multiResult,
        createInstancesAndRun,
        setInstanceAnswers,
    } = useV10Pipeline({ settingsInput });

    // ═══════════════════════════════════════════════════════════════
    // 2. LOCAL STATE
    // ═══════════════════════════════════════════════════════════════

    // Treatment from pack registry
    const packIds = useMemo(() => listPackIds(), []);
    const [treatmentId, setTreatmentLocal] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('v10_treatment');
            if (saved && packIds.includes(saved as any)) {
                return saved;
            }
        }
        return packIds[0] || 'fuellung';
    });

    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
    const autoMultiRef = useRef<string | null>(null);
    const settingsAppliedRef = useRef(false);
    const [debugOpen, setDebugOpen] = useState(false);
    const showDebugToggle = typeof window !== 'undefined'
        && (import.meta.env.DEV || localStorage.getItem('v10_debug') === 'true');
    const audioRecorderRef = useRef<AudioRecorder | null>(null);
    const whisperServiceRef = useRef<WhisperService | null>(null);
    const {
        overridesByInstance: chipOverridesByInstance,
        setOverride: setChipOverride,
        resetOverride: resetChipOverride,
        resetAllOverrides: resetAllChipOverrides,
    } = useChipOverrides();

    const v10CssVars: React.CSSProperties = {
        '--v7-font-display': typography.fontFamily,
        '--v7-font-body': typography.fontFamily,
        '--v7-cream': '#0d0d12',
        '--v7-cream-2': colors.surfaceCard,
        '--v7-peach': colors.surfaceGlass,
        '--v7-coral': colors.coralAccent,
        '--v7-orange': colors.coralMid,
        '--v7-yellow': colors.softApricot,
        '--v7-ink': colors.textPrimary,
        '--v7-ink-soft': colors.textSecondary,
        '--v7-white': colors.textPrimary,
        '--v7-hairline': colors.lineDivider,
        '--v7-glass': colors.surfaceGlass,
        '--v7-glass-2': colors.surfaceGlassActive,
        '--v7-shadow-soft': shadows.cardMedium,
        '--v7-shadow-pill': shadows.buttonDefault,
        '--v7-shadow-bloom': shadows.buttonGlow,
        '--v7-r-xl': radii.card,
        '--v7-r-pill': radii.pill,
    } as React.CSSProperties;

    const dockButtonBase: React.CSSProperties = {
        padding: '12px 20px',
        borderRadius: radii.pill,
        border: `1px solid ${colors.lineSoft}`,
        fontSize: '14px',
        fontWeight: typography.semibold,
        fontFamily: typography.fontFamily,
        cursor: 'pointer',
        background: colors.surfaceGlass,
        color: colors.textPrimary,
        boxShadow: shadows.cardSoft,
        transition: `all ${motionTokens.durationSmall}s ${motionTokens.easingCSS}`,
        backdropFilter: 'blur(16px)',
    };

    const dockPrimaryStyle: React.CSSProperties = {
        ...dockButtonBase,
        background: gradients.button,
        color: colors.textPrimary,
        border: 'none',
        boxShadow: shadows.buttonDefault,
    };

    const dockGhostStyle: React.CSSProperties = {
        ...dockButtonBase,
        background: 'transparent',
        border: `1px solid ${colors.lineSoft}`,
        color: colors.textSecondary,
        boxShadow: 'none',
    };

    // M57: Ref for dictation textarea focus
    const dictationRef = useRef<HTMLTextAreaElement>(null);

    // M57: Focus dictation textarea (scrolls into view)
    const focusDictation = useCallback(() => {
        dictationRef.current?.focus();
        dictationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    // M52: UI step override for stepper (independent of pipeline state)
    const [uiStepOverride, setUiStepOverride] = useState<UiStep | null>(null);

    useEffect(() => {
        if (!isLoaded || settingsAppliedRef.current) return;
        settingsAppliedRef.current = true;

        if (userSettings?.preferredTextLength && textLength === 'mittel') {
            setTextLength(userSettings.preferredTextLength as TextLength);
        }
        const mkvDefault = userSettings?.treatments?.fuellung?.defaultHasMKV ?? userSettings?.defaultHasMKV;
        if (mkvDefault && !hasMKV) {
            setInsuranceType('GKV');
            setHasMKV(true);
        }
    }, [isLoaded, userSettings, textLength, hasMKV, setTextLength, setInsuranceType, setHasMKV]);

    useEffect(() => {
        return () => {
            audioRecorderRef.current?.cleanup();
        };
    }, []);

    // Derive base step from pipeline state
    const baseStep: UiStep = (() => {
        if (isProcessing) return 'dictation';
        switch (currentState) {
            case 'questions': return 'review';
            case 'output': return 'analysis';
            case 'error': return 'error';
            case 'multi_output': return 'analysis';
            default: return 'dictation';
        }
    })();

    // Effective step (override takes precedence)
    const effectiveStep = uiStepOverride ?? baseStep;

    // Handler: Go to review (for "Bearbeiten" button)
    const goToReview = useCallback(() => {
        setUiStepOverride('review');
    }, []);

    const goToAnalysis = useCallback(() => {
        setUiStepOverride('analysis');
    }, []);

    const goToOutput = useCallback(() => {
        setUiStepOverride('output');
    }, []);

    // Handler: Back to output from review
    const backToOutput = useCallback(() => {
        setUiStepOverride(null);
    }, []);

    // Treatment placeholder
    const getPlaceholder = () => {
        switch (treatmentId) {
            case 'fuellung': return 'Füllung Zahn 36 mo Komposit Caries media...';
            case 'endo': return 'Wurzelkanalbehandlung Zahn 46...';
            default: return 'Diktat eingeben...';
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // 3. HANDLERS
    // ═══════════════════════════════════════════════════════════════
    const handleTreatmentChange = (t: string) => {
        setTreatmentLocal(t);
        setTreatmentId(t);
        localStorage.setItem('v10_treatment', t);
        if (!isMultiMode && dictation.trim().length > 0 && !isProcessing) {
            runPipeline({ treatmentId: t });
        }
    };

    const handleInsuranceChange = (next: InsuranceType) => {
        setInsuranceType(next);
        if (!isMultiMode && dictation.trim().length > 0 && !isProcessing) {
            runPipeline({ insuranceType: next });
        }
    };

    const handleMKVChange = (next: boolean) => {
        setHasMKV(next);
        if (!isMultiMode && dictation.trim().length > 0 && !isProcessing) {
            runPipeline({ hasMKV: next });
        }
    };

    const handleTextLengthChange = (next: TextLength) => {
        setTextLength(next);
        if (!isMultiMode && dictation.trim().length > 0 && !isProcessing) {
            runPipeline({ textLength: next });
        }
    };

    const ensureWhisper = () => {
        if (!whisperServiceRef.current) {
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            whisperServiceRef.current = new WhisperService(apiKey);
        }
    };

    const handleMicClick = useCallback(async () => {
        setTranscriptionError(null);

        if (!audioRecorderRef.current) {
            audioRecorderRef.current = new AudioRecorder();
        }

        if (!isRecording) {
            try {
                ensureWhisper();
                await audioRecorderRef.current.startRecording();
                setIsRecording(true);
            } catch (error) {
                setTranscriptionError('Mikrofon konnte nicht aktiviert werden.');
                setIsRecording(false);
            }
            return;
        }

        try {
            setIsTranscribing(true);
            const audioBlob = await audioRecorderRef.current.stopRecording();
            setIsRecording(false);
            ensureWhisper();
            const transcription = await whisperServiceRef.current!.transcribe(audioBlob);
            const nextText = dictation.trim().length > 0
                ? `${dictation.trim()} ${transcription}`.trim()
                : transcription;
            setDictation(nextText);
        } catch (error) {
            setTranscriptionError('Transkription fehlgeschlagen.');
            setIsRecording(false);
        } finally {
            setIsTranscribing(false);
        }
    }, [dictation, isRecording, setDictation]);

    const buildAutoMultiInstances = (teeth: string[]): Array<{
        instanceId: string;
        tooth: string;
        dictationSlice: string;
        extracted: unknown;
        answers?: Map<string, unknown>;
    }> => {
        const slices = new Map<string, string>();
        for (const tooth of teeth) {
            const regex = new RegExp(`Zahn\\s*${tooth}\\s*([^,]*(?:,|$))`, 'i');
            const match = dictation.match(regex);
            if (match) {
                slices.set(tooth, `Zahn ${tooth} ${match[1].replace(/,$/, '').trim()}`);
            } else {
                slices.set(tooth, `Zahn ${tooth}`);
            }
        }

        return teeth.map(tooth => {
            const slice = slices.get(tooth) || `Zahn ${tooth}`;

            const surfacePatterns = [
                /\b(mod)\b/i,
                /\b(mo)\b/i,
                /\b(od)\b/i,
                /\b(m)\b/i,
                /\b(o)\b/i,
                /\b(d)\b/i,
                /\b(mesial)\b/i,
                /\b(okklusal)\b/i,
                /\b(distal)\b/i,
            ];

            const surfaces: string[] = [];
            for (const pattern of surfacePatterns) {
                const match = slice.match(pattern);
                if (match) {
                    const surfaceStr = match[1].toLowerCase();
                    if (surfaceStr === 'mod') surfaces.push('m', 'o', 'd');
                    else if (surfaceStr === 'mo') surfaces.push('m', 'o');
                    else if (surfaceStr === 'od') surfaces.push('o', 'd');
                    else if (surfaceStr === 'mesial') surfaces.push('m');
                    else if (surfaceStr === 'okklusal') surfaces.push('o');
                    else if (surfaceStr === 'distal') surfaces.push('d');
                    else if (surfaceStr.length === 1) surfaces.push(surfaceStr);
                    break;
                }
            }

            const diagnosisPatterns = [
                { pattern: /karies/i, value: 'karies' },
                { pattern: /defekt/i, value: 'defekt' },
                { pattern: /insuffizien/i, value: 'insuffiziente_restauration' },
            ];

            let diagnosis: string | null = null;
            for (const { pattern, value } of diagnosisPatterns) {
                if (pattern.test(slice)) {
                    diagnosis = value;
                    break;
                }
            }

            const mentioned: Record<string, string | boolean> = {};
            if (/komposit/i.test(slice)) mentioned['material'] = 'komposit';
            if (/amalgam/i.test(slice)) mentioned['material'] = 'amalgam';
            if (/kofferdam/i.test(slice)) mentioned['kofferdam'] = true;

            return {
                instanceId: `${treatmentId}-${tooth}`,
                tooth,
                dictationSlice: slice,
                extracted: {
                    tooth,
                    surfaces: [...new Set(surfaces)],
                    diagnosis,
                    mentioned,
                },
                answers: new Map(),
            };
        });
    };

    useEffect(() => {
        if (!extracted || !Array.isArray((extracted as any).teeth)) return;
        const teeth = (extracted as any).teeth as string[];
        if (teeth.length < 2 || dictation.trim().length === 0 || isProcessing) return;

        const autoKey = `${treatmentId}:${teeth.join(',')}:${dictation}`;
        if (autoMultiRef.current === autoKey) return;

        autoMultiRef.current = autoKey;
        setMultiMode(true);
        createInstancesAndRun(buildAutoMultiInstances(teeth));
    }, [extracted, dictation, treatmentId, isProcessing, setMultiMode, createInstancesAndRun]);

    const handleImportRepro = useCallback((bundle: ReproBundleV1) => {
        const { pipelineInput, answersByInstance, settings } = bundle;
        const rawInsurance = String(pipelineInput.insuranceType || 'GKV').toUpperCase();
        const isMKV = rawInsurance === 'MKV';
        const normalizedInsurance: InsuranceType = rawInsurance === 'PKV' ? 'PKV' : 'GKV';
        const nextTextLength: TextLength | undefined = (
            pipelineInput.textLength === 'kurz' ||
            pipelineInput.textLength === 'mittel' ||
            pipelineInput.textLength === 'lang'
        ) ? (pipelineInput.textLength as TextLength) : undefined;

        const instanceAnswerMaps: Record<string, Map<string, unknown>> = {};
        let mergedAnswers = new Map<string, unknown>();

        if (answersByInstance) {
            const entries = Object.entries(answersByInstance);
            for (const [instanceId, answerMap] of entries) {
                instanceAnswerMaps[instanceId] = new Map(Object.entries(answerMap || {}));
            }
            if (entries.length === 1) {
                mergedAnswers = new Map(Object.entries(entries[0][1] || {}));
            }
        }

        setDictation(pipelineInput.dictation || '');
        setTreatmentId(pipelineInput.treatmentId || 'fuellung');
        setInsuranceType(normalizedInsurance);
        setHasMKV(isMKV);
        if (nextTextLength) {
            setTextLength(nextTextLength);
        }
        if (Object.keys(instanceAnswerMaps).length > 0) {
            setInstanceAnswers(instanceAnswerMaps);
        }
        setAnswers(mergedAnswers);

        runPipeline({
            dictation: pipelineInput.dictation || '',
            treatmentId: pipelineInput.treatmentId || 'fuellung',
            insuranceType: isMKV ? 'MKV' : normalizedInsurance,
            textLength: nextTextLength ?? textLength,
            answers: mergedAnswers,
            userDefaults: settings ?? settingsInput,
        });

        setUiStepOverride(null);
    }, [
        runPipeline,
        setDictation,
        setTreatmentId,
        setInsuranceType,
        setHasMKV,
        setTextLength,
        setAnswers,
        setInstanceAnswers,
        textLength,
        settingsInput,
    ]);

    // ═══════════════════════════════════════════════════════════════
    // 4. RENDER CONTENT (Questions/Output/Error)
    // ═══════════════════════════════════════════════════════════════
    const renderContent = () => {
        // [V10_UI] Phase 1: renderState logging
        console.log(`[V10_UI] renderState=${JSON.stringify({
            currentState,
            hasBundle: !!result?.questionBundle,
            questionsCount: questions?.length || 0,
            hasOutput: !!output,
            isProcessing,
        })}`);

        // Processing spinner
        if (isProcessing) {
            return (
                <motion.div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        padding: '80px',
                        minHeight: '50vh',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div style={{
                        width: '56px',
                        height: '56px',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: '#FA7366',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)' }}>
                        Analysiere...
                    </span>
                </motion.div>
            );
        }

        // Unsupported state
        if (currentState === 'unsupported') {
            return (
                <motion.div
                    data-testid="v10-unsupported-panel"
                    style={{
                        background: 'rgba(255, 152, 0, 0.10)',
                        borderRadius: '24px',
                        padding: '40px',
                        border: '1px solid rgba(255, 152, 0, 0.2)',
                        color: '#FFE0B2',
                        textAlign: 'center',
                        backdropFilter: 'blur(12px)',
                        maxWidth: '480px',
                        margin: '40px auto',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>Nicht unterstützt</div>
                    <div style={{ marginBottom: '24px', opacity: 0.9 }}>
                        Diese Behandlung wird noch nicht unterstützt.
                    </div>
                    <button onClick={reset} style={dockPrimaryStyle}>
                        Neu starten
                    </button>
                </motion.div>
            );
        }

        // Error state
        if (currentState === 'error' && error) {
            return (
                <motion.div
                    data-testid="v10-error-panel"
                    style={{
                        background: 'rgba(239, 68, 68, 0.10)',
                        borderRadius: '24px',
                        padding: '40px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#FFCDD2',
                        textAlign: 'center',
                        backdropFilter: 'blur(12px)',
                        maxWidth: '480px',
                        margin: '40px auto',
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>Fehler</div>
                    <div style={{ marginBottom: '24px', opacity: 0.9 }}>{error}</div>
                    {/* Combinability conflicts */}
                    {result?.combinability?.verdict === 'BLOCK' && (
                        <div data-testid="v10-combinability-conflicts" style={{ marginBottom: '24px', textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Kombinationskonflikte:</div>
                            {result.combinability.conflicts?.map((c: any, i: number) => (
                                <div key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>
                                    • {c.ruleId}: {c.codesInvolved?.join(' + ')}
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={reset} style={dockPrimaryStyle}>
                        Neu starten
                    </button>
                </motion.div>
            );
        }

        // Questions state
        if (currentState === 'questions') {
            if (import.meta.env.DEV) {
                // V10 DEBUG: Log questions state details (DEV only)
                console.log('[V10 RENDER] Questions state detected:', {
                    hasBundle: !!result?.questionBundle,
                    questionsCount: questions?.length ?? 0,
                    questionsIds: questions?.map(q => q.id || q.questionKey),
                    resultQuestions: result?.questions?.length ?? 0,
                });
            }

            const bundle = (result?.questionBundle as QuestionBundle | undefined) ?? (() => {
                if (!questions || questions.length === 0) return undefined;
                const required = questions.filter(q => q.medicalSeverity !== 'soft');
                const soft = questions.filter(q => q.medicalSeverity === 'soft');
                return {
                    required,
                    optionalVisible: [],
                    optionalHidden: soft,
                    optionalTotal: soft.length,
                    docMode: 'balanced',
                } satisfies QuestionBundle;
            })();

            if (bundle) {
                return (
                    <div data-testid="v10-questions-panel" style={{ padding: '40px' }}>
                        <QuestionsFlowV2
                            bundle={bundle}
                            answers={answers}
                            onAnswer={answerQuestion}
                            onComplete={runPipeline}
                            extracted={extracted}
                            review={result?.review}
                        />
                    </div>
                );
            }

            // V10 FIX: Fallback when questions state but no questions array
            // This indicates a wiring issue - log and show debug UI
            console.warn('[V10 RENDER] Questions state without questions! Check result.questions mapping.', {
                resultState: result?.state,
                resultQuestions: result?.questions,
                stateQuestions: questions,
            });

            // Show error state with option to proceed or restart
            return (
                <motion.div
                    data-testid="v10-questions-fallback"
                    style={{
                        background: 'rgba(255, 180, 0, 0.15)',
                        borderRadius: '24px',
                        padding: '40px',
                        border: '1px solid rgba(255, 180, 0, 0.3)',
                        color: 'white',
                        textAlign: 'center',
                        maxWidth: '480px',
                        margin: '40px auto',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div style={{ fontSize: '20px', marginBottom: '12px' }}>Rückfragen werden geladen...</div>
                    <div style={{ fontSize: '14px', marginBottom: '24px', opacity: 0.8 }}>
                        Falls keine Rückfragen erscheinen, bitte erneut versuchen.
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={runPipeline} style={dockPrimaryStyle}>
                            Erneut versuchen
                        </button>
                        <button onClick={reset} style={dockGhostStyle}>
                            Neu starten
                        </button>
                    </div>
                </motion.div>
            );
        }

        // Multi output state
        if (currentState === 'multi_output' && multiResult) {
            return (
                <div data-testid="v10-multi-output-panel">
                    <MultiOutputRenderer result={multiResult} onReset={reset} />
                </div>
            );
        }

        // M64: "Bearbeiten" from Output returns to the Review step (3-step flow).
        // Note: V10ReviewStep (advanced manual overrides) is intentionally not part of the main flow.

        // Output state
        if (currentState === 'output' && output) {
            const reviewInstances = Object.values(output?.perInstance ?? {}).map((instance, idx) => ({
                instanceId: instance.instanceId ?? `inst-${idx}`,
                treatmentId,
                tooth: instance.teeth?.[0],
            }));

            const standardChipIdsByInstance = new Map(
                (result?.review?.instances ?? []).map(inst => [inst.instanceId, inst.standardChipIds] as const)
            );

            const settingsChipsByInstance = Object.fromEntries(
                Object.values(output?.perInstance ?? {}).map(instance => {
                    const standardChipIds = standardChipIdsByInstance.get(instance.instanceId) ?? [];
                    return [
                        instance.instanceId,
                        standardChipIds.map(chipId => ({ id: chipId, enabled: true })),
                    ] as const;
                })
            );

            const dictationChipsByInstance = Object.fromEntries(
                Object.values(output?.perInstance ?? {}).map(instance => {
                    const standardChipIds = standardChipIdsByInstance.get(instance.instanceId) ?? [];
                    const standardSet = new Set(standardChipIds);
                    return [
                        instance.instanceId,
                        (instance.chips ?? [])
                            .filter(chipId => !standardSet.has(chipId))
                            .map(chipId => ({ id: chipId, enabled: true })),
                    ] as const;
                })
            );

            const handleApplyAnswers = (nextAnswers: Map<string, unknown>) => {
                setAnswers(nextAnswers);
                runPipeline({
                    answers: nextAnswers,
                    chipOverrides: chipOverridesByInstance,
                });
            };

            if (effectiveStep !== 'output') {
                return (
                    <div data-testid="v10-output-panel" style={{ padding: '40px' }}>
                        <V10PostAnalysisDashboard
                            treatmentId={treatmentId}
                            instances={reviewInstances}
                            dictationChips={dictationChipsByInstance}
                            settingsChips={settingsChipsByInstance}
                            overridesByInstance={chipOverridesByInstance}
                            onOverride={setChipOverride}
                            onResetOverride={resetChipOverride}
                            onResetAllOverrides={resetAllChipOverrides}
                            questions={questions}
                            answers={answers}
                            onApplyAnswers={handleApplyAnswers}
                            upsellHints={result?.upsellHints}
                            onProceedToOutput={goToOutput}
                            meta={result?.meta}
                            perInstance={output?.perInstance as any}
                            billingCodes={output?.billingCodes}
                            review={result?.review}
                            showTrace={showDebugToggle}
                        />
                    </div>
                );
            }

            return (
                <div data-testid="v10-output-panel" style={{ padding: '40px' }}>
                    <OutputFlow
                        output={output}
                        onReset={reset}
                        onEdit={goToReview}
                        combinability={result?.combinability}
                    />
                </div>
            );
        }

        return null;
    };

    // ═══════════════════════════════════════════════════════════════
    // 5. MAIN RENDER (V8 Jeton Layout with V10 extensions)
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="v7" data-testid="v10-docudent-page" style={v10CssVars}>
            {/* Background Layers (Same as V8) */}
            <SoftGradientBackground />
            <div className="v7-bg" />

            {/* Hero Sculpture (Same as V8) */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <HeroSculpture isRecording={isRecording} />
            </div>

            {/* TOP GLOBAL PILL */}
            {effectiveStep !== 'output' && currentState !== 'error' && (
                <HeaderDock
                    mode="docs"
                    docsControls={(
                        <>
                            <V10TreatmentSelector
                                value={treatmentId}
                                onChange={handleTreatmentChange}
                                data-testid="v10-treatment-select"
                            />
                            <span className="header-dock-divider" />
                            <V10InsuranceSelector
                                insuranceType={insuranceType}
                                hasMKV={hasMKV}
                                onInsuranceChange={handleInsuranceChange}
                                onMKVChange={handleMKVChange}
                                data-testid="v10-insurance-select"
                            />
                            <span className="header-dock-divider" />
                            <V10TextLengthSelector
                                value={textLength}
                                onChange={handleTextLengthChange}
                                data-testid="v10-textlength-select"
                            />
                            {isMultiMode ? (
                                <>
                                    <span className="header-dock-divider" />
                                    <button
                                        data-testid="v10-multi-button"
                                        onClick={() => setMultiMode(false)}
                                        style={dockButtonBase}
                                    >
                                        Multi-Modus
                                    </button>
                                </>
                            ) : null}
                        </>
                    )}
                />
            )}

            {/* MAIN CONTENT */}
            {/* M64: Only show dictation input for idle state, NOT for review step */}
            {currentState === 'idle' ? (
                <div className="v7-jeton-hero">
                    <div className="v7-jeton-container" style={{ position: 'relative', zIndex: 10 }}>
                        <div className="v7-jeton-kicker">INTELLIGENT DOCUMENTATION</div>
                        <h1 className="v7-jeton-h1">
                            Was wurde<br />
                            durchgeführt?
                        </h1>

                        <div className="v7-jeton-lead" style={{ position: 'relative' }}>
                            <textarea
                                ref={dictationRef}
                                data-testid="v10-dictation-input"
                                value={dictation}
                                onChange={(e) => setDictation(e.target.value)}
                                placeholder={getPlaceholder()}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: 'inherit',
                                    fontFamily: 'inherit',
                                    resize: 'none',
                                    outline: 'none',
                                    minHeight: '120px',
                                    lineHeight: '1.4'
                                }}
                                rows={3}
                            />
                            <motion.div
                                animate={{
                                    width: isRecording ? '100%' : '0%',
                                    opacity: isRecording ? 1 : 0.3
                                }}
                                style={{
                                    height: '2px',
                                    background: 'white',
                                    marginTop: '16px',
                                    boxShadow: '0 0 20px rgba(255,255,255,0.5)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ marginTop: '120px', position: 'relative', zIndex: 10 }}>
                    {renderContent()}
                </div>
            )}

        {/* FLOATING ACTION DOCK */}
            {currentState === 'idle' && (
            <div className="v7-jeton-dock">
                <button
                    data-testid="v10-dock-aufnahme"
                    onClick={() => {
                        handleMicClick();
                        focusDictation();
                    }}
                    disabled={isProcessing || isTranscribing}
                    style={{
                        ...(isRecording ? dockPrimaryStyle : dockButtonBase),
                        minWidth: '120px',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: isProcessing || isTranscribing ? 0.6 : 1,
                    }}
                >
                    {isRecording && <span className="animate-pulse">●</span>}
                    {isTranscribing ? 'Transkribiere…' : isRecording ? 'Stop' : 'Aufnahme'}
                </button>

                {/* M56: Primary CTA always visible, disabled when empty */}
                <button
                    data-testid="v10-run-button"
                    data-disabled-color="rgba(255, 255, 255, 0.4)"
                    onClick={runPipeline}
                    disabled={dictation.trim().length === 0 || isProcessing || isTranscribing}
                    title={dictation.trim().length === 0 ? 'Bitte Text eingeben' : 'Dokumentation starten'}
                    style={{
                        ...dockPrimaryStyle,
                        background: dictation.trim().length === 0 ? colors.surfaceGlass : gradients.button,
                        color: dictation.trim().length === 0 ? 'rgba(255, 255, 255, 0.4)' : colors.textPrimary,
                        cursor: dictation.trim().length === 0 ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isProcessing ? 'Läuft…' : 'Dokumentieren'}
                </button>

                <Link to="/docudent/v10/cases" style={dockButtonBase}>Fälle</Link>
                <Link to="/docudent/v10/settings" style={dockButtonBase}>Einstellungen</Link>
            </div>
            )}

            {transcriptionError && (
                <div style={{
                    position: 'fixed',
                    bottom: '96px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#FFCDD2',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    zIndex: 120,
                }}>
                    {transcriptionError}
                </div>
            )}

            {showDebugToggle && (
                <button
                    data-testid="v10-debug-toggle"
                    onClick={() => setDebugOpen(true)}
                    style={{
                        position: 'fixed',
                        right: '24px',
                        bottom: '24px',
                        zIndex: 2000,
                        padding: '10px 16px',
                        borderRadius: radii.pill,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(20, 20, 30, 0.7)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    Debug
                </button>
            )}

            {showDebugToggle && debugOpen && (
                <V10DebugDrawer
                    result={result}
                    onClose={() => setDebugOpen(false)}
                    onImportRepro={handleImportRepro}
                    onRunRepro={() => runPipeline()}
                />
            )}

            {null}
        </div>
    );
}
