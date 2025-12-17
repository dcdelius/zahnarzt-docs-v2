/**
 * Docudent V6 - Main Controller Hook
 * 
 * Clean architecture with 4 steps:
 * 1. DIKTAT → Extract data from dictation
 * 2. FRAGEN → Dynamic questions based on gaps
 * 3. VALIDIERUNG → Check billing rules
 * 4. OUTPUT → Generate documentation
 * 
 * NO chips, NO defaults - only what is dictated or answered!
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioRecorder } from '../../../services/AudioRecorder';
import { WhisperService } from '../../../services/WhisperService';
// Output Composer - SSOT for output generation
import {
    composeOutput,
    type ComposedOutput,
    type ComposedSection,
    type ComposeOptions
} from '../../core/billing/knowledgeBase/logic/outputComposer';

// Re-export types for UI
export type { ComposedOutput, ComposedSection };

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';
export type TextLength = 'kurz' | 'mittel' | 'lang';
export type DictationState = 'idle' | 'recording' | 'processing';

export interface ExtractedData {
    tooth: string | null;
    surfaces: string[];
    diagnosis: string | null;
    costs: number | null;

    // What was explicitly mentioned in dictation
    mentioned: {
        anesthesia?: { type: 'infiltr' | 'leitung' | 'keine'; confidence: number };
        kofferdam?: boolean;
        capping?: { type: 'cp' | 'p' | 'none' };
        material?: string;
        vitality?: '+' | '-';
        percussion?: '+' | '-';
    };

    // What was NOT mentioned → becomes a question
    gaps: string[];

    // Original dictation text for downstream detection (e.g., endo step)
    rawDictation?: string;
}

export interface DynamicQuestion {
    id: string;
    category: 'forensic' | 'upsell' | 'mkv';
    question: string;
    type?: 'single' | 'number' | 'multi'; // NEW: Support number and multi input
    options: {
        id: string;
        label: string;
        billingCode?: string;
        billingValue?: number;
        documentationText?: string;
        dataValue?: any;         // Value to set in extracted data
        chipActivation?: string; // Chip to activate when selected
    }[];
    answered?: string | number | boolean; // Allow non-string answers
    // NEW: Rule-driven fields
    ruleRef?: string;           // Reference to rule that triggered this question
    chipId?: string;            // Chip this question relates to
    riskLevel?: 'hoch' | 'mittel' | 'niedrig';
    upsellNotes?: string[];     // Notes for upsell questions
    // Number specific fields
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    presets?: number[];
    defaultValue?: number;
}

export interface BillingCode {
    code: string;
    label: string;
    points?: number;
    value: number;
    source: 'dictation' | 'question' | 'auto';
}

export interface ValidationWarning {
    id: string;
    type: 'regress' | 'warning' | 'info';
    title: string;
    description: string;
    affectedCodes: string[];
    action?: string;
}

// FinalOutput interface removed in favor of ComposedOutput from outputService

type Step = 'dictation' | 'questions' | 'output';

// ═══════════════════════════════════════════════════════════════
// PRACTICE SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface PracticeSettings {
    // Anästhesie-Defaults
    ukMolarenILA: boolean;          // UK Molaren → Intraligamentär statt Leitung

    // Forensisch wichtige Standard-Texte (immer im Output)
    forensicDefaults: {
        aufklaerung: boolean;       // "Aufklärung erfolgt"
        alternativen: boolean;      // "Alternativen besprochen"
        risikenErklaert: boolean;   // "Risiken erklärt"
        einwilligung: boolean;      // "Einwilligung erteilt"
        anamneseAktuell: boolean;   // "Anamnese aktuell, keine Medikamentenänderung"
        materialAlternativen: boolean; // "Materialalternativen (Amalgam) besprochen" (bei GKV)
    };

    // Standard-Materialien
    defaultMaterial: string;        // z.B. "Komposit"
    defaultCappingMaterial: string; // z.B. "Ca(OH)2" oder "MTA"
}

const DEFAULT_SETTINGS: PracticeSettings = {
    ukMolarenILA: false, // Standard: Leitungsanästhesie
    forensicDefaults: {
        aufklaerung: true,
        alternativen: true,
        risikenErklaert: true,
        einwilligung: true,
        anamneseAktuell: false,
        materialAlternativen: false
    },
    defaultMaterial: 'Komposit',
    defaultCappingMaterial: 'Ca(OH)2'
};

interface V6State {
    // Input
    dictation: string;
    insuranceType: InsuranceType;
    hasMKV: boolean;               // Mehrkostenvereinbarung (GKV + private Zuzahlung)
    isInsuranceModalOpen: boolean; // Insurance modal open state
    textLength: TextLength;

    // Category/Treatment Selection (NEW)
    selectedCategory: string | null;      // e.g. 'konservierend'
    selectedSubcategory: string | null;   // e.g. 'filling' = treatmentType
    dictationState: DictationState;       // idle | recording | processing

    // Practice Settings
    settings: PracticeSettings;
    showSettings: boolean;

    // Material selection (dropdown or custom)
    selectedMaterial: string;

    // Processing
    step: Step;
    isProcessing: boolean;

    // After extraction
    extracted: ExtractedData | null;
    questions: DynamicQuestion[];
    answers: Map<string, any>; // Allow any type for answers (string | number | boolean)

    // After questions
    billingCodes: BillingCode[];
    warnings: ValidationWarning[];

    // Final output (now ComposedOutput from composeOutput)
    finalOutput: ComposedOutput | null;

    // Error state
    error: string | null;

    // Processing stage for detailed feedback
    processingStage?: 'extraction' | 'question_generation' | 'output_generation';
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useDocudentV6() {
    const [state, setState] = useState<V6State>({
        step: 'dictation',
        dictation: '',
        extracted: null,
        questions: [],
        answers: new Map<string, any>(),
        finalOutput: null,
        insuranceType: 'GKV',
        hasMKV: false,
        isInsuranceModalOpen: false,
        textLength: 'mittel',
        selectedCategory: 'fuellung',
        selectedSubcategory: 'allgemein',
        dictationState: 'idle',
        error: null,
        isProcessing: false,
        processingStage: undefined,
        billingCodes: [],
        warnings: [],
        // Settings
        settings: DEFAULT_SETTINGS,
        showSettings: false,
        selectedMaterial: '',
    });

    // ─── Setters ───────────────────────────────────────────────

    const setDictation = useCallback((text: string) => {
        setState(s => ({ ...s, dictation: text }));
    }, []);

    const setInsuranceType = useCallback((type: InsuranceType) => {
        setState(s => ({ ...s, insuranceType: type }));
    }, []);

    const setTextLength = useCallback((length: TextLength) => {
        setState(s => ({ ...s, textLength: length }));
    }, []);

    const setMKV = useCallback((hasMKV: boolean) => {
        setState(s => ({ ...s, hasMKV }));
    }, []);

    const setInsuranceModalOpen = useCallback((isInsuranceModalOpen: boolean) => {
        setState(s => ({ ...s, isInsuranceModalOpen }));
    }, []);

    // Category/Treatment Selection
    const setCategory = useCallback((category: string | null) => {
        setState(s => ({
            ...s,
            selectedCategory: category,
            selectedSubcategory: null  // Reset subcategory when category changes
        }));
    }, []);

    const setSubcategory = useCallback((subcategory: string | null) => {
        setState(s => ({ ...s, selectedSubcategory: subcategory }));
        // subcategory IS the treatmentType (e.g., 'filling', 'endo', 'extraction')
        // No separate treatmentType field needed — selectedSubcategory is used directly
    }, []);

    const setDictationState = useCallback((dictationState: DictationState) => {
        setState(s => ({ ...s, dictationState }));
    }, []);

    // ─── Audio Recording (Whisper Integration) ─────────────────
    const audioRecorderRef = useRef<AudioRecorder | null>(null);
    const whisperServiceRef = useRef<WhisperService | null>(null);

    // Initialize services on mount
    useEffect(() => {
        audioRecorderRef.current = new AudioRecorder();
        // @ts-ignore - VITE_OPENAI_API_KEY from env
        whisperServiceRef.current = new WhisperService(import.meta.env.VITE_OPENAI_API_KEY);

        return () => {
            audioRecorderRef.current?.cleanup();
        };
    }, []);

    const startRecording = useCallback(async () => {
        if (!audioRecorderRef.current) return;

        try {
            await audioRecorderRef.current.startRecording();
            setState(s => ({ ...s, dictationState: 'recording' }));
        } catch (error) {
            console.error('[V6] Recording start failed:', error);
            setState(s => ({ ...s, dictationState: 'idle' }));
        }
    }, []);

    const stopRecording = useCallback(async () => {
        if (!audioRecorderRef.current || !whisperServiceRef.current) return;

        const MIN_PROCESSING_TIME = 800; // ms — Gallery Piece spec
        const startTime = Date.now();

        try {
            // Enter processing state — synchronized
            setState(s => ({ ...s, dictationState: 'processing', isProcessing: true, processingStage: 'extraction' }));

            // Stop recording and get audio blob
            const audioBlob = await audioRecorderRef.current.stopRecording();

            // Transcribe with Whisper
            const transcribedText = await whisperServiceRef.current.transcribe(audioBlob);

            // Set dictation text (append to existing if any)
            setState(s => ({
                ...s,
                dictation: s.dictation
                    ? `${s.dictation} ${transcribedText}`
                    : transcribedText,
            }));

            // ─── CORE LOGIC: Extract and generate questions ───
            const { extractFromDictation } = await import('../services/extractionService');
            const fullDictation = state.dictation
                ? `${state.dictation} ${transcribedText}`
                : transcribedText;
            const extracted = await extractFromDictation(fullDictation);

            setState(s => ({ ...s, processingStage: 'question_generation' }));
            const { generateQuestions } = await import('../services/questionService');
            let questions = generateQuestions(extracted, state.insuranceType, state.hasMKV);

            // Pre-answer questions based on extracted data ("Diktat gewinnt")
            questions = questions.map(q => {
                let answered: string | undefined = undefined;
                if (q.id === 'forensic_vitality' && extracted.mentioned?.vitality) {
                    answered = extracted.mentioned.vitality === '+' ? 'pos' : 'neg';
                }
                if (q.id === 'forensic_percussion' && extracted.mentioned?.percussion) {
                    answered = extracted.mentioned.percussion === '+' ? 'pos' : 'neg';
                }
                if (q.id.includes('kofferdam') && extracted.mentioned?.kofferdam !== undefined) {
                    answered = extracted.mentioned.kofferdam ? 'yes' : 'relative';
                }
                if (q.id.includes('capping') && extracted.mentioned?.capping) {
                    answered = extracted.mentioned.capping.type;
                }
                return answered ? { ...q, answered } : q;
            });

            // Ensure minimum display time for premium feel
            const elapsed = Date.now() - startTime;
            if (elapsed < MIN_PROCESSING_TIME) {
                await new Promise(resolve => setTimeout(resolve, MIN_PROCESSING_TIME - elapsed));
            }

            // Exit processing and advance — with extracted data!
            setState(s => ({
                ...s,
                dictationState: 'idle',
                isProcessing: false,
                processingStage: undefined,
                extracted,
                questions,
                step: questions.length > 0 ? 'questions' : 'output'
            }));
        } catch (error) {
            console.error('[V6] Recording/Transcription failed:', error);
            setState(s => ({ ...s, dictationState: 'idle', isProcessing: false, processingStage: undefined }));
        }
    }, [state.dictation, state.insuranceType, state.hasMKV]);

    const toggleSettings = useCallback(() => {
        setState(s => ({ ...s, showSettings: !s.showSettings }));
    }, []);

    const updateSettings = useCallback((updates: Partial<PracticeSettings>) => {
        setState(s => ({
            ...s,
            settings: { ...s.settings, ...updates }
        }));
    }, []);

    const updateForensicDefault = useCallback((key: keyof PracticeSettings['forensicDefaults'], value: boolean) => {
        setState(s => ({
            ...s,
            settings: {
                ...s.settings,
                forensicDefaults: {
                    ...s.settings.forensicDefaults,
                    [key]: value
                }
            }
        }));
    }, []);

    const setMaterial = useCallback((material: string) => {
        setState(s => ({ ...s, selectedMaterial: material }));
    }, []);

    // ─── Step 1: Analyze Dictation ─────────────────────────────

    const analyzeDictation = useCallback(async () => {
        if (!state.dictation.trim()) return;

        setState(s => ({ ...s, isProcessing: true, processingStage: 'extraction' }));

        try {
            // Import extraction service
            const { extractFromDictation } = await import('../services/extractionService');
            const extracted = await extractFromDictation(state.dictation);

            setState(s => ({ ...s, processingStage: 'question_generation' }));
            // Import question service (pass hasMKV for MKV-specific questions)
            const { generateQuestions } = await import('../services/questionService');
            let questions = generateQuestions(extracted, state.insuranceType, state.hasMKV);

            // Pre-answer questions based on extracted data ("Diktat gewinnt")
            questions = questions.map(q => {
                let answered: string | undefined = undefined;

                // Pre-select based on what was extracted
                if (q.id === 'forensic_vitality' && extracted.mentioned?.vitality) {
                    answered = extracted.mentioned.vitality === '+' ? 'pos' : 'neg';
                }
                if (q.id === 'forensic_percussion' && extracted.mentioned?.percussion) {
                    answered = extracted.mentioned.percussion === '+' ? 'pos' : 'neg';
                }
                if (q.id.includes('kofferdam') && extracted.mentioned?.kofferdam !== undefined) {
                    answered = extracted.mentioned.kofferdam ? 'yes' : 'relative';
                }
                if (q.id.includes('capping') && extracted.mentioned?.capping) {
                    answered = extracted.mentioned.capping.type;
                }

                return answered ? { ...q, answered } : q;
            });

            setState(s => ({
                ...s,
                isProcessing: false,
                processingStage: undefined,
                extracted,
                questions,
                step: questions.length > 0 ? 'questions' : 'output'
            }));

            // If no questions, go directly to output
            if (questions.length === 0) {
                await generateOutput();
            }
        } catch (error) {
            console.error('[V6] Extraction failed:', error);
            setState(s => ({ ...s, isProcessing: false, processingStage: undefined, error: String(error) }));
        }
    }, [state.dictation, state.insuranceType, state.hasMKV]);

    // ─── Step 2: Answer Question ───────────────────────────────

    const answerQuestion = useCallback((questionId: string, answer: string | number | boolean) => {
        setState(s => {
            const newQuestions = s.questions.map(q =>
                q.id === questionId ? { ...q, answered: answer } : q
            );
            const newAnswers = new Map<string, any>(s.answers);
            newAnswers.set(questionId, answer);
            return {
                ...s,
                questions: newQuestions,
                answers: newAnswers
            };
        });
    }, []);

    const allQuestionsAnswered = useCallback(() => {
        return state.questions.every(q => q.answered !== undefined);
    }, [state.questions]);

    // ─── Step 3: Generate Output ───────────────────────────────

    const generateOutput = useCallback(async () => {
        if (!state.extracted) return;

        setState(s => ({ ...s, isProcessing: true, processingStage: 'output_generation' }));

        try {
            // Import output service
            const { generateFinalOutput } = await import('../services/outputService');

            // Collect all answers from the questions state
            const currentAnswers = new Map<string, any>();
            state.questions.forEach(q => {
                if (q.answered !== undefined) {
                    currentAnswers.set(q.id, q.answered);
                }
            });

            const result = await generateFinalOutput({
                extracted: state.extracted,
                answers: currentAnswers, // Pass the collected answers
                insuranceType: state.insuranceType,
                textLength: state.textLength,
                hasMKV: state.hasMKV,
                mkvBetrag: currentAnswers.get('mkv_betrag') // Pass explicit MKV amount
            });

            setState(s => ({
                ...s,
                isProcessing: false,
                processingStage: undefined,
                finalOutput: result,
                answers: currentAnswers, // Update answers in state
                error: null,
                step: 'output'
            }));
        } catch (error) {
            console.error('[V6] Output generation failed:', error);
            // PFLICHT: Error-State sichtbar machen (keine silent failures)
            setState(s => ({
                ...s,
                isProcessing: false,
                processingStage: undefined,
                error: String(error),
                step: 'output'  // Trotzdem zu output gehen um Fehler anzuzeigen
            }));
        }
    }, [state.extracted, state.questions, state.insuranceType, state.textLength, state.hasMKV, state.settings]);

    // ─── Live Update: Regenerate when textLength changes in output step ───
    const isFirstRender = useRef(true);
    useEffect(() => {
        // Skip first render
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // Only regenerate if we're in output step and have output
        if (state.step === 'output' && state.finalOutput && state.extracted) {
            generateOutput();
        }
    }, [state.textLength]); // Only trigger on textLength changes

    // ─── Navigation ────────────────────────────────────────────

    const proceedToOutput = useCallback(async () => {
        await generateOutput();
    }, [generateOutput]);

    const reset = useCallback(() => {
        setState(s => ({
            dictation: '',
            insuranceType: s.insuranceType,
            hasMKV: s.hasMKV,
            isInsuranceModalOpen: false,
            textLength: s.textLength,
            // Preserve category selection on reset
            selectedCategory: s.selectedCategory,
            selectedSubcategory: s.selectedSubcategory,
            dictationState: 'idle',
            settings: s.settings,
            showSettings: false,
            selectedMaterial: '',
            step: 'dictation',
            isProcessing: false,
            processingStage: undefined,
            extracted: null,
            questions: [],
            answers: new Map(),
            billingCodes: [],
            warnings: [],
            finalOutput: null,
            error: null
        }));
    }, []);

    // ─── Return ────────────────────────────────────────────────

    return {
        // State
        ...state,

        // Actions
        setDictation,
        setInsuranceType,
        setTextLength,
        setMKV,
        setInsuranceModalOpen,
        setCategory,
        setSubcategory,
        setDictationState,
        startRecording,
        stopRecording,
        setMaterial,
        toggleSettings,
        updateSettings,
        updateForensicDefault,
        analyzeDictation,
        answerQuestion,
        allQuestionsAnswered,
        proceedToOutput,
        reset
    };
}
