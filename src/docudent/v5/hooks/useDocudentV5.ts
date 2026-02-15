/**
 * Docudent V5 Controller Hook
 * 
 * Schlanker State-Manager für den dokumentations-workflow
 * Nutzt das neue Billing-Backend für intelligente Vorschläge
 */

import { useState, useMemo, useCallback } from 'react';
import { inferBillingV2 } from '../../core/billing/knowledgeBase/logic/billingRegistry';
import type { ExtractedData, BillingInferenceResult, BillingContext } from '../../core/billing/knowledgeBase/logic/billingRegistry';
import { validateBillingCodes } from '../../core/billing/knowledgeBase/logic/billingValidation';
import type { ValidationResult } from '../../core/billing/knowledgeBase/logic/billingValidation';
import { loadPracticeProfile, getTreatmentDefaults } from '../models/PracticeProfile';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';
export type BonusStatus = 'ohne' | '5_jahre' | '10_jahre';

export interface ConfirmationQuestion {
    id: string;
    regelId: string;
    frage: string;
    options: {
        id: string;
        label: string;
        dokumentationsText?: string;  // Text der in Doku eingefügt wird
    }[];
    answered?: string;  // ID der gewählten Option
}

export interface DocudentV5State {
    // Input
    dictation: string;
    insuranceType: InsuranceType;
    bonusStatus: BonusStatus;

    // Workflow State
    isRecording: boolean;
    isTranscribing: boolean;
    isExtracting: boolean;
    isGenerating: boolean;

    // Extracted Data
    extracted: ExtractedData | null;

    // Billing Results
    billingResult: BillingInferenceResult | null;
    validationResult: ValidationResult | null;

    // Confirmations (die interaktiven Fragen!)
    confirmations: ConfirmationQuestion[];

    // Output
    preview: string;

    // Active Chips
    activeChips: string[];
}

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION QUESTIONS MAPPING
// ═══════════════════════════════════════════════════════════════

const CONFIRMATION_TEMPLATES: Record<string, Omit<ConfirmationQuestion, 'id' | 'regelId' | 'answered'>> = {
    'regel_bema25_tiefe_karies': {
        frage: 'War die Kavität pulpanah?',
        options: [
            { id: 'ja', label: '✅ Ja, pulpanah', dokumentationsText: 'tiefe Dentinkaries, pulpanahes Kavitätenniveau' },
            { id: 'nein', label: '❌ Nein', dokumentationsText: '' }
        ]
    },
    'regel_bema12_nur_kofferdam': {
        frage: 'Was wurde für die relative Trockenlegung verwendet?',
        options: [
            { id: 'kofferdam', label: '🩹 Kofferdam', dokumentationsText: 'absolute Trockenlegung mittels Kofferdam' },
            { id: 'blutstillung', label: '🩸 Blutstillung', dokumentationsText: 'Stillung übermäßiger Papillenblutung' },
            { id: 'zahnfleisch', label: '🦷 Zahnfleischentfernung', dokumentationsText: 'Beseitigung störenden Zahnfleisches' },
            { id: 'nein', label: '❌ Keines davon', dokumentationsText: '' }
        ]
    },
    'regel_bema26_pulpaeroeffnung': {
        frage: 'War die Pulpa sichtbar eröffnet?',
        options: [
            { id: 'ja', label: '✅ Ja, punktförmig', dokumentationsText: 'punktförmige Pulpaeröffnung, direkte Überkappung mit MTA' },
            { id: 'nein', label: '❌ Nein', dokumentationsText: '' }
        ]
    },
    'regel_bema13_flaechen_korrekt': {
        frage: 'Stimmt die Flächenanzahl mit dem F-Code überein?',
        options: [
            { id: 'ja', label: '✅ Ja, korrekt', dokumentationsText: '' },
            { id: 'korrigieren', label: '✏️ Korrigieren lassen', dokumentationsText: '' }
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useDocudentV5() {
    // State
    const [state, setState] = useState<DocudentV5State>({
        dictation: '',
        insuranceType: 'GKV',
        bonusStatus: 'ohne',
        isRecording: false,
        isTranscribing: false,
        isExtracting: false,
        isGenerating: false,
        extracted: null,
        billingResult: null,
        validationResult: null,
        confirmations: [],
        preview: '',
        activeChips: ['anaesthesie', 'kofferdam', 'adhesive', 'schicht']
    });

    // ─── Actions ───────────────────────────────────────────────

    const setDictation = useCallback((text: string) => {
        setState(s => ({ ...s, dictation: text }));
    }, []);

    const setInsuranceType = useCallback((type: InsuranceType) => {
        setState(s => ({ ...s, insuranceType: type }));
    }, []);

    const setBonusStatus = useCallback((status: BonusStatus) => {
        setState(s => ({ ...s, bonusStatus: status }));
    }, []);

    const toggleChip = useCallback((chipId: string) => {
        setState(s => ({
            ...s,
            activeChips: s.activeChips.includes(chipId)
                ? s.activeChips.filter(c => c !== chipId)
                : [...s.activeChips, chipId]
        }));
    }, []);

    // ─── Extraction & Billing ──────────────────────────────────

    const analyze = useCallback(async () => {
        if (!state.dictation.trim()) return;

        setState(s => ({ ...s, isExtracting: true }));

        try {
            // 1. LLM Extraction (simplified for now - mock data)
            // In production, this would call extractDictationV3
            const mockExtracted: ExtractedData = {
                tooth: '36',
                surfaces: ['m', 'o', 'd'],
                diagnosis: 'Caries profunda',
                material: 'Komposit',
                versorgungsart: 'fuellung'
            };

            // 2. Billing Inference (neue API!)
            const profile = loadPracticeProfile();
            const defaults = getTreatmentDefaults(profile, 'fuellung') || undefined;

            const billingContext: BillingContext = {
                extracted: mockExtracted,
                insuranceType: state.insuranceType,
                bonusStatus: state.bonusStatus,
                defaults,
                rawDictation: state.dictation
            };
            const billing = inferBillingV2(billingContext);

            // 3. Validation
            const codes = billing.suggestions
                .filter(s => s.code)
                .map(s => s.code!);
            const validation = validateBillingCodes(codes);

            // 4. Generate Confirmation Questions from Validation
            const confirmations: ConfirmationQuestion[] = [];
            for (const konflikt of validation.konflikte) {
                const template = CONFIRMATION_TEMPLATES[konflikt.regelId];
                if (template) {
                    confirmations.push({
                        id: `confirm_${konflikt.regelId}`,
                        regelId: konflikt.regelId,
                        ...template
                    });
                }
            }

            setState(s => ({
                ...s,
                isExtracting: false,
                extracted: mockExtracted,
                billingResult: billing,
                validationResult: validation,
                confirmations
            }));

        } catch (error) {
            console.error('Analysis failed:', error);
            setState(s => ({ ...s, isExtracting: false }));
        }
    }, [state.dictation, state.insuranceType, state.bonusStatus]);

    // ─── Answer Confirmation ───────────────────────────────────

    const answerConfirmation = useCallback((confirmationId: string, optionId: string) => {
        setState(s => ({
            ...s,
            confirmations: s.confirmations.map(c =>
                c.id === confirmationId ? { ...c, answered: optionId } : c
            )
        }));
    }, []);

    // ─── Generate Preview ──────────────────────────────────────

    const generatePreview = useCallback(() => {
        if (!state.extracted) return;

        setState(s => ({ ...s, isGenerating: true }));

        // Collect documentation text from answered confirmations
        const docTexts: string[] = [];
        for (const conf of state.confirmations) {
            if (conf.answered) {
                const option = conf.options.find(o => o.id === conf.answered);
                if (option?.dokumentationsText) {
                    docTexts.push(option.dokumentationsText);
                }
            }
        }

        // Build preview text
        const preview = `
=== ÜBERSICHT ===
Zahn: ${state.extracted.tooth}
Flächen: ${state.extracted.surfaces?.join('/').toUpperCase() || '?'}
Diagnose: ${state.extracted.diagnosis}${docTexts.length > 0 ? ` (${docTexts.join(', ')})` : ''}

=== ABRECHNUNG (${state.insuranceType}) ===
${state.billingResult?.suggestions.map(s => `• ${s.code || s.type}: ${s.label}`).join('\n') || 'Keine Codes'}

=== BEHANDLUNGSABLAUF ===
Leitungsanästhesie des N. alveolaris inferior links. 
Anlegen von Kofferdam zur absoluten Trockenlegung.
Exkavation der kariösen Dentinbereiche bis zur Sondenärte.
${docTexts.includes('tiefe Dentinkaries, pulpanahes Kavitätenniveau')
                ? 'Indirekte Überkappung mit Ca(OH)₂-haltiger Unterfüllung (Cp). '
                : ''}
Schichtweise Applikation des Komposits A2 in Adhäsivtechnik.
Ausarbeitung und Politur. Okklusionskontrolle.
        `.trim();

        setState(s => ({
            ...s,
            isGenerating: false,
            preview
        }));
    }, [state.extracted, state.confirmations, state.billingResult, state.insuranceType]);

    // ─── Reset ─────────────────────────────────────────────────

    const reset = useCallback(() => {
        setState({
            dictation: '',
            insuranceType: 'GKV',
            bonusStatus: 'ohne',
            isRecording: false,
            isTranscribing: false,
            isExtracting: false,
            isGenerating: false,
            extracted: null,
            billingResult: null,
            validationResult: null,
            confirmations: [],
            preview: '',
            activeChips: ['anaesthesie', 'kofferdam', 'adhesive', 'schicht']
        });
    }, []);

    // ─── Computed Values ───────────────────────────────────────

    const festzuschuss = useMemo(() => {
        return state.billingResult?.festzuschuss?.gesamtbetrag || 0;
    }, [state.billingResult]);

    const hasUnansweredConfirmations = useMemo(() => {
        return state.confirmations.some(c => !c.answered);
    }, [state.confirmations]);

    const allConfirmationsPositive = useMemo(() => {
        return state.confirmations.every(c => c.answered && c.answered !== 'nein');
    }, [state.confirmations]);

    // ─── Return ────────────────────────────────────────────────

    return {
        // State
        ...state,

        // Computed
        festzuschuss,
        hasUnansweredConfirmations,
        allConfirmationsPositive,

        // Actions
        setDictation,
        setInsuranceType,
        setBonusStatus,
        toggleChip,
        analyze,
        answerConfirmation,
        generatePreview,
        reset
    };
}
