/**
 * Billing V5 Controller
 * 
 * Vollständig integrierter Controller für Docudent V5.
 * Nutzt die bewährte V3 Backend-Logik (Extraktion, Billing, Chips).
 * 
 * WICHTIG: Keine Mock-Daten! Alle Daten kommen aus echter LLM-Extraktion
 * und der Knowledge Base.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// V3 BACKEND IMPORTS (Die bewährte Logik!)
// ═══════════════════════════════════════════════════════════════

import { inferBillingV2, type BillingContext, type BillingInferenceResult, type ExtractedData, type TreatmentDefaults } from '../../core/billing/knowledgeBase/logic/billingRegistry';
import { validateBillingCodes } from '../../core/billing/knowledgeBase/logic/billingValidation';
import type { ValidationResult } from '../../core/billing/knowledgeBase/logic/billingValidation';
import { getTreatment, getDefaultActiveChips } from '../../core/behandlungen';
import type { TreatmentDefinition } from '../../core/behandlungen/_shared/types';
// NEU: Migrierte Funktionen aus treatmentEngine (Single Source of Truth!)
import {
    inferChipsFromDictation,
    resolveChipStates,
    getActiveChipIds,
    generateFinalDocumentation,
    // SSOT-konforme Chip-Billing-Lookups (keine hardcodierten Codes!)
    hasChipBillingCode,
    getChipBillingInfo
} from '../../core/billing/knowledgeBase/logic/treatmentEngine';
// getActiveUpsells bleibt vorerst in engine.ts (TODO: später migrieren)
import { getActiveUpsells } from '../../core/behandlungen/_shared/engine';
import { loadPracticeProfile, getTreatmentDefaults as getProfileDefaults } from '../models/PracticeProfile';
import { getTemplatesForTreatment, getTemplateOrThrow } from '../../core/templates/catalog';
import { SettingsManager } from '../../core/settings/settingsManager';
// Regress-Prüfung und Optimierungstipps
import { getRulesForCodes, getTipsForCategory, knowledgeBase } from '../../core/billing/knowledgeBase';
// NEW: Question Engine for 3-tier question system
import { QuestionEngine, getQuestionEngine, type ActiveQuestion, type QuestionLevel } from '../../core/behandlungen/_shared/questionEngine';
// NEW: Cross Validator for combination rule checking
import { validateCodes as checkCombinationConflicts } from '../../core/billing/knowledgeBase/logic/crossValidator';
// NEW: Analog Justification Service
import {
    type AnalogJustification,
    type AnalogJustificationMap,
    createAnalogJustification,
    getJustificationStatus,
    JUSTIFICATION_MIN_LENGTH
} from '../../core/billing/knowledgeBase/logic/analogJustificationService';
// NEW: Analog Completion Validator
import {
    validateAnalogJustifications,
    type AnalogValidationResult,
    type AnalogValidationError
} from '../../core/billing/knowledgeBase/logic/analogCompletionValidator';
// NEW: Analog Export Guard
import {
    buildAnalogExportPayload,
    assertNoCommentaryLeak,
    type AnalogExportItem
} from '../../core/billing/knowledgeBase/logic/analogExportGuard';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';
export type BonusStatus = 'ohne' | '5_jahre' | '10_jahre';

export interface BillingSuggestion {
    id: string;
    code?: string;
    label: string;
    description?: string;
    priority: 'hoch' | 'mittel' | 'niedrig';
    type: 'bema' | 'goz' | 'festzuschuss' | 'warnung' | 'optimierung';
    autoAccept?: boolean;
    betrag?: number;
    textSnippet?: string;
    fromQuestion?: string; // Track which question added this code
    hasConflict?: boolean; // NEW: Flag if this code has combination conflict
}

// NEW: Warning type for combination conflicts
export interface BillingWarning {
    id: string;
    type: 'combination_conflict' | 'frequency' | 'missing_documentation';
    severity: 'regress' | 'warnung' | 'info';
    title: string;
    description: string;
    affectedCodes: string[];
}

export interface ConfirmationQuestion {
    id: string;
    regelId: string;
    frage: string;
    tier?: 1 | 2 | 3; // NEW: Question tier
    triggeredBy?: string; // NEW: Why this question was triggered
    importance?: string; // NEW: billing, forensic, etc.
    options: {
        id: string;
        label: string;
        dokumentationsText?: string;
        billingCode?: { code: string; autoAccept: boolean }; // NEW: Direct billing link
    }[];
    answered?: string;
}

export interface BillingV5State {
    // Input
    dictation: string;
    insuranceType: InsuranceType;
    bonusStatus: BonusStatus;
    treatmentType: string;

    // Zuzahlung (Patient additional payment)
    hasZuzahlung: boolean;
    zuzahlungBetrag: number | null;

    // Workflow State
    isRecording: boolean;
    isTranscribing: boolean;
    isExtracting: boolean;
    isGenerating: boolean;

    // Extracted Data (von LLM)
    extracted: Record<string, any> | null;

    // Billing Results (von Knowledge Base)
    billingResult: BillingInferenceResult | null;
    validationResult: ValidationResult | null;
    suggestions: BillingSuggestion[];

    // Chips (aktive/inaktive Standards)
    activeChipIds: string[];
    inactiveChipIds: string[];

    // Confirmations (Rückfragen)
    confirmations: ConfirmationQuestion[];

    // Warnings (Kombinations-Konflikte etc.)
    warnings: BillingWarning[];

    // Analog Justifications (keyed by analogCode)
    analogJustifications: AnalogJustificationMap;

    // Analog Validation Result
    analogValidation: AnalogValidationResult | null;

    // Output
    preview: string;
}

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION TEMPLATES (Mapping Validation → UI Questions)
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
        frage: 'Was wurde für die Trockenlegung verwendet?',
        options: [
            { id: 'kofferdam', label: '🩹 Kofferdam', dokumentationsText: 'absolute Trockenlegung mittels Kofferdam' },
            { id: 'relativ', label: '💧 Relativ', dokumentationsText: 'relative Trockenlegung' }
        ]
    },
    'regel_bema26_pulpaeroeffnung': {
        frage: 'War die Pulpa sichtbar eröffnet?',
        options: [
            { id: 'ja', label: '✅ Ja, punktförmig', dokumentationsText: 'punktförmige Pulpaeröffnung, direkte Überkappung mit MTA' },
            { id: 'nein', label: '❌ Nein', dokumentationsText: '' }
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useBillingV5Controller(initialTreatmentType: string = 'fuellung') {
    // Load Treatment Definition
    const treatment = useMemo(() => getTreatment(initialTreatmentType), [initialTreatmentType]);

    // Load Template for LLM Extraction
    const template = useMemo(() => {
        if (!treatment) return null;
        const templates = getTemplatesForTreatment(initialTreatmentType);
        return templates[0] || null;
    }, [treatment, initialTreatmentType]);

    // State
    const [state, setState] = useState<BillingV5State>({
        dictation: '',
        insuranceType: 'GKV',
        bonusStatus: 'ohne',
        treatmentType: initialTreatmentType,
        hasZuzahlung: false,
        zuzahlungBetrag: null,
        isRecording: false,
        isTranscribing: false,
        isExtracting: false,
        isGenerating: false,
        extracted: null,
        billingResult: null,
        validationResult: null,
        suggestions: [],
        activeChipIds: [], // DO NOT use getDefaultActiveChips! Chips only from dictation/toggles
        inactiveChipIds: SettingsManager.getInactiveChips(initialTreatmentType),
        confirmations: [],
        warnings: [],
        analogJustifications: {},
        analogValidation: null,
        preview: '',
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

    const setHasZuzahlung = useCallback((value: boolean) => {
        setState(s => ({ ...s, hasZuzahlung: value }));
    }, []);

    const setZuzahlungBetrag = useCallback((betrag: number | null) => {
        setState(s => ({ ...s, zuzahlungBetrag: betrag }));
    }, []);

    const toggleChip = useCallback((chipId: string) => {
        setState(s => {
            const newInactive = s.inactiveChipIds.includes(chipId)
                ? s.inactiveChipIds.filter(id => id !== chipId)
                : [...s.inactiveChipIds, chipId];

            // Persist to SettingsManager
            SettingsManager.toggleChip(s.treatmentType, chipId);

            return {
                ...s,
                inactiveChipIds: newInactive,
                activeChipIds: treatment?.chips
                    .map(c => c.id)
                    .filter(id => !newInactive.includes(id)) || []
            };
        });
    }, [treatment]);

    // ─── MAIN ANALYSIS (REAL EXTRACTION!) ──────────────────────

    const analyze = useCallback(async (): Promise<{ confirmationsCount: number }> => {
        if (!state.dictation.trim()) return { confirmationsCount: 0 };
        if (!template) {
            console.error('[BillingV5] No template available for extraction');
            return { confirmationsCount: 0 };
        }

        setState(s => ({ ...s, isExtracting: true }));

        try {
            // ═══════════════════════════════════════════════════════════
            // 1. ECHTE LLM EXTRAKTION (Keine Mock-Daten!)
            // ═══════════════════════════════════════════════════════════
            const { extractDictationV3 } = await import('../../core/extraction/extractDictationV3');

            const { extracted, meta } = await extractDictationV3({
                template,
                rawText: state.dictation,
                model: 'gpt-4o-mini' // Schnell und günstig
            });

            console.log('[BillingV5] Extraction complete:', extracted);

            // ═══════════════════════════════════════════════════════════
            // 2. PRAXIS-DEFAULTS LADEN
            // ═══════════════════════════════════════════════════════════
            const profile = loadPracticeProfile();
            const defaults = getProfileDefaults(profile, 'fuellung') || undefined;

            // ═══════════════════════════════════════════════════════════
            // 3. BILLING INFERENCE (Knowledge Base!)
            // ═══════════════════════════════════════════════════════════
            const billingInput: ExtractedData = {
                tooth: extracted.tooth,
                surfaces: extracted.surfaces,
                diagnosis: extracted.diagnosis,
                material: extracted.material,
                versorgungsart: 'fuellung'
            };

            // ═══════════════════════════════════════════════════════════
            // USE BILLING REGISTRY (supports hasZuzahlung for MKV!)
            // ═══════════════════════════════════════════════════════════
            const billingContext: BillingContext = {
                extracted: billingInput,
                insuranceType: state.insuranceType,
                bonusStatus: state.bonusStatus,
                defaults: defaults as TreatmentDefaults,
                rawDictation: state.dictation,
                hasZuzahlung: state.hasZuzahlung,
                zuzahlungBetrag: state.zuzahlungBetrag || undefined
            };

            const billingResult = inferBillingV2(billingContext);

            console.log('[BillingV5] Billing inference:', billingResult);

            // ═══════════════════════════════════════════════════════════
            // 4. VALIDATION (Regress-Prüfung)
            // ═══════════════════════════════════════════════════════════
            const codes = billingResult.suggestions
                .filter(s => s.code)
                .map(s => s.code!);
            const validation = validateBillingCodes(codes);

            // ═══════════════════════════════════════════════════════════
            // 5. TREATMENT ENGINE UPSELLS
            // ═══════════════════════════════════════════════════════════
            let treatmentUpsells: BillingSuggestion[] = [];
            if (treatment) {
                const chipVisibility = SettingsManager.getAllChipVisibility(state.treatmentType);
                const upsells = getActiveUpsells(treatment, extracted, chipVisibility, state.inactiveChipIds);

                treatmentUpsells = upsells.map(u => ({
                    id: u.id,
                    code: u.billingRefs?.GKV || u.billingRefs?.PKV || undefined,
                    label: u.label,
                    description: u.description,
                    priority: 'mittel' as const,
                    type: 'optimierung' as const,
                    textSnippet: u.textSnippet
                }));
            }

            // ═══════════════════════════════════════════════════════════
            // 6. MERGE & DEDUPE SUGGESTIONS
            // ═══════════════════════════════════════════════════════════
            const billingSuggestions: BillingSuggestion[] = billingResult.suggestions.map(s => ({
                id: s.id || `billing_${Math.random()}`,
                code: s.code,
                label: s.label,
                description: s.description,
                priority: s.priority as 'hoch' | 'mittel' | 'niedrig',
                type: s.type as 'bema' | 'goz',
                autoAccept: s.autoAccept,
                betrag: s.betrag
            }));

            // ═══════════════════════════════════════════════════════════
            // 6a. REGRESS-PRÜFUNG (kombinationen.json)
            // ═══════════════════════════════════════════════════════════
            const relevantRules = getRulesForCodes(codes);
            for (const regel of relevantRules) {
                if (regel.typ === 'ausschluss') {
                    const betroffene = regel.betrifft.filter((b: string) => codes.includes(b));
                    if (betroffene.length > 1) {
                        // REGRESS-WARNUNG!
                        billingSuggestions.push({
                            id: `regress_${regel.id}`,
                            type: 'warnung',
                            priority: 'hoch',
                            label: `⚠️ REGRESS: ${regel.titel}`,
                            description: regel.beschreibung || betroffene.join(' + ')
                        });
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════
            // 6b. OPTIMIERUNGSTIPPS AUS KNOWLEDGE BASE
            // ═══════════════════════════════════════════════════════════
            const tipps = getTipsForCategory('konservierend', state.insuranceType === 'GKV' ? 'GKV' : 'PKV');
            const tipSuggestions: BillingSuggestion[] = tipps.slice(0, 3).map(tipp => ({
                id: `tipp_${tipp.id}`,
                type: 'optimierung' as const,
                priority: 'niedrig' as const,
                label: `💡 ${tipp.titel}`,
                description: tipp.strategie || tipp.beschreibung,
                betrag: tipp.beispiel?.differenz ? parseFloat(tipp.beispiel.differenz.replace(/[^\d.]/g, '')) : undefined
            }));

            // ═══════════════════════════════════════════════════════════
            // 6c. "VERGESSEN?" HINWEISE (Smart Detection)
            // ═══════════════════════════════════════════════════════════
            const vergessenSuggestions: BillingSuggestion[] = [];

            // Check 1: Oberflächenanästhesie bei PKV vergessen?
            // Wenn Injektion vorhanden (009x) aber keine Oberfläche (0080)
            const hasInjection = codes.some(c => c.match(/GOZ_009[0-5]/) || c.match(/BEMA_4[0-2]/));
            const hasOberflaeche = codes.includes('GOZ_0080');
            if (state.insuranceType === 'PKV' && hasInjection && !hasOberflaeche) {
                // SSOT: Preis dynamisch aus goz.json holen!
                const { lookupBillingCode } = await import('../../core/billing/knowledgeBase/logic/treatmentEngine');
                const oberflaecheData = lookupBillingCode('GOZ_0080');
                const oberflaechePreis = oberflaecheData?.betrag_23 || 7.25; // Fallback

                vergessenSuggestions.push({
                    id: 'vergessen_oberflaeche',
                    type: 'optimierung' as const,
                    priority: 'mittel' as const,
                    label: '💡 Oberflächenanästhesie vergessen?',
                    description: 'GOZ 0080 vor jeder Injektion',
                    code: 'GOZ_0080',
                    betrag: oberflaechePreis
                });
            }

            // Check 2: Kofferdam vergessen (wenn in Settings aktiviert)?
            // SSOT: Verwendet hasChipBillingCode statt hardcodierter Code-Checks!
            const hasKofferdam = hasChipBillingCode(state.treatmentType, 'kofferdam', codes);
            const kofferdamInSettings = defaults?.methodik?.kofferdamStandard === true;
            const dictMentionsNoKofferdam = state.dictation.toLowerCase().includes('ohne kofferdam') ||
                state.dictation.toLowerCase().includes('kein kofferdam') ||
                state.dictation.toLowerCase().includes('relativ');

            if (kofferdamInSettings && !hasKofferdam && !dictMentionsNoKofferdam) {
                // SSOT: Code und Preis dynamisch aus Chip-Definition holen!
                const kofferdamBilling = getChipBillingInfo(state.treatmentType, 'kofferdam', state.insuranceType);
                if (kofferdamBilling.code) {
                    vergessenSuggestions.push({
                        id: 'vergessen_kofferdam',
                        type: 'optimierung' as const,
                        priority: 'mittel' as const,
                        label: '💡 Kofferdam vergessen?',
                        description: 'In deinen Standards aktiviert',
                        code: kofferdamBilling.code,
                        betrag: kofferdamBilling.price
                    });
                }
            }

            // Check 3: Unterfüllung bei tiefer Karies vergessen (PKV)?
            const hasTiefeKaries = state.dictation.toLowerCase().includes('tief') ||
                state.dictation.toLowerCase().includes('profunda') ||
                state.dictation.toLowerCase().includes('pulpanah');
            // SSOT: Verwendet hasChipBillingCode statt hardcodierter Code-Checks!
            const hasUnterfuellung = hasChipBillingCode(state.treatmentType, 'unterfuellung', codes);
            const unterfuellungInSettings = defaults?.tiefKaries?.unterfuellungStandard === true;

            if (state.insuranceType === 'PKV' && hasTiefeKaries && !hasUnterfuellung && unterfuellungInSettings) {
                // SSOT: Code und Preis dynamisch aus Chip-Definition holen!
                const unterfuellungBilling = getChipBillingInfo(state.treatmentType, 'unterfuellung', state.insuranceType);
                if (unterfuellungBilling.code) {
                    vergessenSuggestions.push({
                        id: 'vergessen_unterfuellung',
                        type: 'optimierung' as const,
                        priority: 'mittel' as const,
                        label: '💡 Unterfüllung vergessen?',
                        description: `${unterfuellungBilling.code.replace('_', ' ')} bei tiefer Karies`,
                        code: unterfuellungBilling.code,
                        betrag: unterfuellungBilling.price
                    });
                }
            }

            // Check 4: Fluoridierung vergessen (wenn in Settings aktiviert)?
            // SSOT: Verwendet hasChipBillingCode statt hardcodierter Code-Checks!
            const hasFluorid = hasChipBillingCode(state.treatmentType, 'fluor', codes);
            const fluoridInSettings = (defaults as any)?.finishing?.fluoridImmer === true;

            if (fluoridInSettings && !hasFluorid) {
                // SSOT: Code und Preis dynamisch aus Chip-Definition holen!
                const fluorBilling = getChipBillingInfo(state.treatmentType, 'fluor', state.insuranceType);
                if (fluorBilling.code) {
                    vergessenSuggestions.push({
                        id: 'vergessen_fluorid',
                        type: 'optimierung' as const,
                        priority: 'niedrig' as const,
                        label: '💡 Fluoridierung vergessen?',
                        description: fluorBilling.code.replace('_', ' '),
                        code: fluorBilling.code,
                        betrag: fluorBilling.price
                    });
                }
            }

            const allSuggestions = [...billingSuggestions, ...vergessenSuggestions, ...tipSuggestions, ...treatmentUpsells];
            const seenIds = new Set<string>();
            const dedupedSuggestions = allSuggestions.filter(s => {
                if (seenIds.has(s.id)) return false;
                seenIds.add(s.id);
                return true;
            });

            // ═══════════════════════════════════════════════════════════
            // 7. CONFIRMATION QUESTIONS
            // ═══════════════════════════════════════════════════════════
            const confirmations: ConfirmationQuestion[] = [];

            // 7a. Konflikte aus Validation
            for (const konflikt of validation.konflikte) {
                const tpl = CONFIRMATION_TEMPLATES[konflikt.regelId];
                if (tpl) {
                    confirmations.push({
                        id: `confirm_${konflikt.regelId}`,
                        regelId: konflikt.regelId,
                        ...tpl
                    });
                }
            }

            // 7b. ConditionalRules aus Treatment Definition (z.B. profunda → Cp-Check)
            if (treatment?.conditionalRules) {
                for (const rule of treatment.conditionalRules) {
                    let triggered = false;

                    // Check trigger conditions
                    if (rule.trigger?.fieldContains) {
                        const { field, value } = rule.trigger.fieldContains;
                        const fieldValue = extracted[field as keyof typeof extracted] || state.dictation;
                        if (typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(value.toLowerCase())) {
                            triggered = true;
                        }
                    }

                    if (triggered) {
                        // Check if required fields are missing
                        // For chips, check if they're active
                        const activeChips = billingResult?.suggestions?.map((s: BillingSuggestion) => (s.code || '').toLowerCase()) || [];
                        const hasCp = activeChips.some((c: string) => c.includes('cp') || c.includes('2330') || c.includes('bema_25'));
                        const hasCpNotRequired = state.dictation.toLowerCase().includes('keine pulpa') ||
                            state.dictation.toLowerCase().includes('cp nicht') ||
                            state.dictation.toLowerCase().includes('keine überkappung');

                        // Only show if neither Cp nor "Cp not required" is documented
                        if (rule.id === 'profunda_cp_check' && !hasCp && !hasCpNotRequired) {
                            confirmations.push({
                                id: `conditional_${rule.id}`,
                                regelId: rule.id,
                                frage: '⚠️ ' + rule.warningIfMissing,
                                options: [
                                    { id: 'cp', label: 'Cp (ind. Überkappung)', dokumentationsText: state.insuranceType === 'PKV' ? 'GOZ 2330' : 'BEMA 25' },
                                    { id: 'p', label: 'P (dir. Überkappung)', dokumentationsText: state.insuranceType === 'PKV' ? 'GOZ 2340' : 'BEMA 26' },
                                    { id: 'none', label: 'Nicht erforderlich' }
                                ]
                            });
                        }

                        // Matrix check for approximal
                        if (rule.id === 'approx_matrix') {
                            const hasMatrix = state.dictation.toLowerCase().includes('matrize') ||
                                state.dictation.toLowerCase().includes('teilmatrize');
                            if (!hasMatrix) {
                                confirmations.push({
                                    id: `conditional_${rule.id}`,
                                    regelId: rule.id,
                                    frage: '⚠️ ' + rule.warningIfMissing,
                                    options: [
                                        { id: 'yes', label: 'Ja, Matrize verwendet', dokumentationsText: 'Teilmatrize + Keil' },
                                        { id: 'no', label: 'Nein' }
                                    ]
                                });
                            }
                        }
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════
            // 7c. QUESTION ENGINE - 3-Tier System from questions.json
            // ═══════════════════════════════════════════════════════════
            try {
                const questionEngine = await getQuestionEngine(state.treatmentType);
                const questionLevel = (defaults as any)?.questionLevel || 'standard';

                const activeQuestions = questionEngine.getActiveQuestions({
                    rawDictation: state.dictation,
                    extracted: billingInput,
                    insuranceType: state.insuranceType,
                    settings: {
                        questionLevel: questionLevel as QuestionLevel,
                        methodik: defaults?.methodik,
                        tiefKaries: defaults?.tiefKaries,
                        finishing: (defaults as any)?.finishing,
                        anaesthesie: defaults?.anaesthesie
                    }
                });

                // Convert ActiveQuestions to ConfirmationQuestions
                for (const aq of activeQuestions) {
                    // Skip if already asked by validation/conditional rules
                    const alreadyAsked = confirmations.some(c =>
                        c.regelId === aq.id || c.id.includes(aq.id)
                    );
                    if (alreadyAsked) continue;

                    confirmations.push({
                        id: `question_${aq.id}`,
                        regelId: aq.id,
                        frage: aq.question,
                        tier: aq.tier,
                        triggeredBy: aq.triggeredBy,
                        importance: aq.importance,
                        options: aq.options.map(opt => {
                            const billing = questionEngine.getBillingForOption(opt, state.insuranceType);
                            return {
                                id: opt.id,
                                label: opt.label,
                                dokumentationsText: opt.documentation,
                                billingCode: billing || undefined
                            };
                        })
                    });
                }

                console.log(`[BillingV5] QuestionEngine: ${activeQuestions.length} questions (level: ${questionLevel})`);
            } catch (e) {
                console.warn('[BillingV5] QuestionEngine failed:', e);
            }

            // ═══════════════════════════════════════════════════════════
            // 7d. ZUZAHLUNG COST QUESTION (if toggle enabled but no cost extracted)
            // ═══════════════════════════════════════════════════════════
            if (state.hasZuzahlung && !extracted.costs) {
                confirmations.push({
                    id: 'zuzahlung_betrag',
                    regelId: 'zuzahlung_betrag',
                    frage: '💰 Welche Zuzahlung wurde vereinbart?',
                    tier: 1, // High priority - ask first
                    importance: 'billing',
                    options: [
                        { id: 'preset_70', label: '70€', dokumentationsText: 'Patientenzuzahlung 70€ vereinbart' },
                        { id: 'preset_90', label: '90€', dokumentationsText: 'Patientenzuzahlung 90€ vereinbart' },
                        { id: 'preset_120', label: '120€', dokumentationsText: 'Patientenzuzahlung 120€ vereinbart' },
                        { id: 'preset_140', label: '140€', dokumentationsText: 'Patientenzuzahlung 140€ vereinbart' }
                    ]
                });
            }

            // Sort confirmations: Tier 1 first, then Tier 2, then Tier 3
            confirmations.sort((a, b) => (a.tier || 0) - (b.tier || 0));

            // ═══════════════════════════════════════════════════════════
            // 8. UPDATE STATE - Including inferred chips from dictation!
            // ═══════════════════════════════════════════════════════════
            const inferredChipsFromDict = inferChipsFromDictation(
                state.dictation,
                state.treatmentType,
                extracted
            );
            console.log('[BillingV5] Inferred chips from dictation:', inferredChipsFromDict);

            setState(s => ({
                ...s,
                isExtracting: false,
                extracted,
                billingResult,
                validationResult: validation,
                suggestions: dedupedSuggestions,
                confirmations,
                activeChipIds: inferredChipsFromDict // BUG 2 FIX: Set from dictation!
            }));

            return { confirmationsCount: confirmations.length };

        } catch (error) {
            console.error('[BillingV5] Analysis failed:', error);
            setState(s => ({ ...s, isExtracting: false }));
            return { confirmationsCount: 0 };
        }
    }, [state.dictation, state.insuranceType, state.bonusStatus, state.treatmentType, state.inactiveChipIds, template, treatment]);

    // ─── Answer Confirmation ───────────────────────────────────

    const answerConfirmation = useCallback((confirmationId: string, optionId: string) => {
        setState(s => {
            // Find the confirmation and selected option
            const confirmation = s.confirmations.find(c => c.id === confirmationId);
            const selectedOption = confirmation?.options.find(o => o.id === optionId);

            // Update confirmations with the answer
            const updatedConfirmations = s.confirmations.map(c =>
                c.id === confirmationId ? { ...c, answered: optionId } : c
            );

            // If the selected option has a billing code, add it to suggestions
            let updatedSuggestions = [...s.suggestions];
            let newWarnings = [...(s.warnings || [])];
            let newZuzahlungBetrag = s.zuzahlungBetrag;

            // ═══════════════════════════════════════════════════════════
            // Handle Zuzahlung preset selection
            // ═══════════════════════════════════════════════════════════
            if (confirmationId === 'zuzahlung_betrag' && optionId.startsWith('preset_')) {
                const amount = parseInt(optionId.replace('preset_', ''), 10);
                if (!isNaN(amount)) {
                    newZuzahlungBetrag = amount;
                    console.log(`[BillingV5] Zuzahlung set to: ${amount}€`);
                }
            }

            if (selectedOption?.billingCode && selectedOption.billingCode.code) {
                const { code, autoAccept } = selectedOption.billingCode;

                // Check if this code isn't already in suggestions
                const alreadyExists = updatedSuggestions.some(sug => sug.code === code);
                if (!alreadyExists) {
                    // ═══════════════════════════════════════════════════════════════
                    // NEW: Check for combination conflicts BEFORE adding
                    // ═══════════════════════════════════════════════════════════════
                    const existingCodes = updatedSuggestions.map(sug => sug.code).filter((c): c is string => !!c);
                    const allCodes = [...existingCodes, code];
                    const conflicts = checkCombinationConflicts(allCodes);

                    if (conflicts.length > 0) {
                        // Add warning for each conflict
                        for (const conflict of conflicts) {
                            const warningId = `conflict_${conflict.id || conflict.type}`;
                            if (!newWarnings.some(w => w.id === warningId)) {
                                newWarnings.push({
                                    id: warningId,
                                    type: 'combination_conflict',
                                    severity: conflict.severity as 'regress' | 'warnung' | 'info',
                                    title: conflict.title,
                                    description: conflict.description,
                                    affectedCodes: conflict.affectedCodes
                                });
                                console.warn(`[BillingV5] ⚠️ KONFLIKT erkannt: ${conflict.title}`, conflict.affectedCodes);
                            }
                        }
                    }

                    updatedSuggestions.push({
                        id: `from_question_${confirmationId}_${code}`,
                        code,
                        label: selectedOption.label,
                        description: `Aus Rückfrage: ${confirmation?.frage}`,
                        priority: 'hoch',
                        type: code.startsWith('GOZ') ? 'goz' : 'bema',
                        autoAccept,
                        fromQuestion: confirmationId,
                        hasConflict: conflicts.length > 0
                    });
                    console.log(`[BillingV5] Added billing code from question: ${code}`);
                }
            }

            return {
                ...s,
                confirmations: updatedConfirmations,
                suggestions: updatedSuggestions,
                warnings: newWarnings,
                zuzahlungBetrag: newZuzahlungBetrag
            };
        });
    }, []);

    // ─── Generate Preview ──────────────────────────────────────

    const generatePreview = useCallback(async () => {
        if (!state.extracted || !treatment) return;

        setState(s => ({ ...s, isGenerating: true }));

        try {
            // ═══════════════════════════════════════════════════════════
            // 1. INFER CHIPS FROM DICTATION (The Critical Bridge!)
            // Dictation → Chips → billingRefs → feeCatalog → Output
            // ═══════════════════════════════════════════════════════════
            const extractedChipsFromDictation = inferChipsFromDictation(
                state.dictation,
                state.treatmentType,
                state.extracted
            );

            console.log('[BillingV5] Inferred chips from dictation:', extractedChipsFromDictation);

            // ═══════════════════════════════════════════════════════════
            // 2. CHIP RESOLUTION - Merge: dictation chips + user overrides + UI toggles
            // ═══════════════════════════════════════════════════════════
            const chipVisibility = SettingsManager.getAllChipVisibility(state.treatmentType);
            const userOverrides = new Map<string, boolean>();

            // Chips explicitly toggled OFF by user → set to false
            state.inactiveChipIds.forEach(id => userOverrides.set(id, false));

            // Chips explicitly toggled ON by user (from state.activeChipIds) → set to true
            // This is the FIX: UI toggle buttons now affect the final output!
            state.activeChipIds.forEach(id => {
                if (!state.inactiveChipIds.includes(id)) {
                    userOverrides.set(id, true);
                }
            });

            // Also add chips from answered questions to the extracted chips
            const chipsFromQuestions: string[] = [];
            for (const conf of state.confirmations) {
                if (conf.answered) {
                    // Map question answers to chip IDs
                    // e.g., if user answered 'cp' on capping question → activate 'cp' chip
                    const answerId = conf.answered;
                    const option = conf.options.find(o => o.id === answerId);

                    // Check if this answer maps to a chip
                    if (answerId === 'cp' || option?.label?.toLowerCase().includes('cp')) {
                        chipsFromQuestions.push('cp');
                    } else if (answerId === 'p' || option?.label?.toLowerCase().includes('direkte überkappung')) {
                        chipsFromQuestions.push('p');
                    } else if (answerId === 'none' || answerId === 'nein') {
                        chipsFromQuestions.push('cp_not_required');
                    } else if (answerId === 'kofferdam' || option?.label?.toLowerCase().includes('kofferdam')) {
                        chipsFromQuestions.push('kofferdam');
                    } else if (answerId === 'yes' && conf.frage?.includes('Matrize')) {
                        chipsFromQuestions.push('matrize');
                    }
                }
            }

            // Merge: dictation chips + question chips + explicitly active UI chips
            // Priority: dictation > user toggles > defaults (resolveChipStates handles this)
            const allExtractedChips = [...new Set([
                ...extractedChipsFromDictation,
                ...chipsFromQuestions,
                ...state.activeChipIds.filter(id => !state.inactiveChipIds.includes(id))
            ])];
            console.log('[BillingV5] All chips (dictation + questions + UI toggles):', allExtractedChips);

            const chipStates = resolveChipStates(state.treatmentType, allExtractedChips, userOverrides, chipVisibility);
            const finalActiveChips = getActiveChipIds(chipStates);
            console.log('[BillingV5] Final active chips:', finalActiveChips);


            // ═══════════════════════════════════════════════════════════
            // 3. DIAGNOSIS INFERENCE (fallback if extraction failed)
            // ═══════════════════════════════════════════════════════════
            let diagnosis = state.extracted.diagnosis;
            if (!diagnosis || diagnosis === '?') {
                const dictLower = state.dictation.toLowerCase();
                if (dictLower.includes('profunda') || dictLower.includes('tief') && dictLower.includes('karies')) {
                    diagnosis = 'Caries profunda';
                } else if (dictLower.includes('media') || dictLower.includes('karies')) {
                    diagnosis = 'Caries media';
                } else if (dictLower.includes('superficialis')) {
                    diagnosis = 'Caries superficialis';
                }
            }

            // ═══════════════════════════════════════════════════════════
            // 3. GENERATE DOCUMENTATION (chips → text + billing)
            // ═══════════════════════════════════════════════════════════
            const extractedWithDiagnosis = { ...state.extracted, diagnosis };
            const doc = generateFinalDocumentation(
                state.treatmentType,
                state.insuranceType,
                finalActiveChips,
                extractedWithDiagnosis,
                state.hasZuzahlung, // hasMKV
                'mittel'
            );

            // ═══════════════════════════════════════════════════════════
            // 4. BILLING CODES - From Engine (Chip-Derived!)
            // This is the fix: use doc.uebersicht.codes, NOT state.suggestions
            // ═══════════════════════════════════════════════════════════
            const chipBillingCodes = doc.uebersicht.codes;

            // Build display-friendly billing list from central catalog (treatmentEngine)
            const { lookupBillingCode } = await import('../../core/billing/knowledgeBase/logic/treatmentEngine');
            const billingDisplay: { code: string; label: string }[] = [];
            const seenCodes = new Set<string>();

            for (const code of chipBillingCodes) {
                if (seenCodes.has(code)) continue;
                seenCodes.add(code);

                // Lookup in central catalog (bema.json / goz.json)
                const codeData = lookupBillingCode(code);
                billingDisplay.push({
                    code,
                    label: codeData?.bezeichnung || code
                });
            }

            // ═══════════════════════════════════════════════════════════
            // 5. QUESTION DOCS - Collect but DEDUPE against prose
            // ═══════════════════════════════════════════════════════════
            const questionDocs: string[] = [];
            const proseWords = doc.fliesstext.toLowerCase();

            for (const conf of state.confirmations) {
                if (conf.answered) {
                    const option = conf.options.find(o => o.id === conf.answered);
                    if (option?.dokumentationsText) {
                        // Dedupe: Skip if already in prose
                        const docTextLower = option.dokumentationsText.toLowerCase();
                        const keyPhrases = docTextLower.split(' ').slice(0, 3).join(' ');
                        if (!proseWords.includes(keyPhrases)) {
                            questionDocs.push(option.dokumentationsText);
                        }
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════
            // 6. PROSE CLEANUP - Remove contradictions
            // ═══════════════════════════════════════════════════════════
            let improvedProse = doc.fliesstext;

            // Fix LA contradiction: If LA chip is active, remove "Ohne LA" text
            const hasLaChip = finalActiveChips.includes('la_infiltr') || finalActiveChips.includes('la_leitung');
            if (hasLaChip) {
                improvedProse = improvedProse.replace(/Ohne Lokalanästhesie\.\s*/g, '');
            }

            // Fix: If "ohne_la" chip is active but LA billing exists from questions
            const hasLaBillingFromQuestion = state.confirmations.some(c =>
                c.answered && c.options.find(o => o.id === c.answered)?.billingCode?.code?.includes('BEMA_4')
            );
            if (hasLaBillingFromQuestion) {
                improvedProse = improvedProse.replace(/Ohne Lokalanästhesie\.\s*/g, '');
            }

            // Fix: Remove "Ggf. Rö-Kontrolle" if röntgen chip is NOT active
            if (!finalActiveChips.includes('rö_kontrolle')) {
                improvedProse = improvedProse.replace(/Ggf\. Rö-Kontrolle\.\s*/g, '');
                improvedProse = improvedProse.replace(/Rö-Kontrolle\/Endabnahme\s*/g, '');
            }

            // Fix: Remove Kariesdetektor text if NOT active
            if (!finalActiveChips.includes('kariesdetektor')) {
                improvedProse = improvedProse.replace(/Kariesanfärbung mittels Kariesdetektor\.\s*/g, '');
                improvedProse = improvedProse.replace(/Kariesdetektor\.\s*/g, '');
            }

            // Normalize whitespace
            improvedProse = improvedProse.replace(/\s+/g, ' ').trim();

            // ═══════════════════════════════════════════════════════════
            // 7. BUILD FINAL PREVIEW
            // ═══════════════════════════════════════════════════════════
            const surfacesStr = (state.extracted.surfaces || []).map((s: string) => s.toUpperCase()).join('/');

            const preview = `
=== ÜBERSICHT ===
Zahn: ${state.extracted.tooth || '?'}
Flächen: ${surfacesStr || '?'}
Diagnose: ${diagnosis || '?'}

=== ABRECHNUNG (${state.insuranceType}) ===
${billingDisplay.map(b => `• ${b.code}: ${b.label}`).join('\n')}

=== BEHANDLUNGSABLAUF ===
${improvedProse}${questionDocs.length > 0 ? '\n\n' + questionDocs.join('. ') + '.' : ''}
            `.trim();

            setState(s => ({
                ...s,
                isGenerating: false,
                preview
            }));

        } catch (error) {
            console.error('[BillingV5] Preview generation failed:', error);
            setState(s => ({ ...s, isGenerating: false }));
        }
    }, [state.extracted, state.activeChipIds, state.inactiveChipIds, state.treatmentType, state.insuranceType, state.suggestions, state.dictation, state.confirmations, treatment]);



    // ─── Reset ─────────────────────────────────────────────────

    const reset = useCallback(() => {
        setState({
            dictation: '',
            insuranceType: 'GKV',
            bonusStatus: 'ohne',
            treatmentType: initialTreatmentType,
            hasZuzahlung: false,
            zuzahlungBetrag: null,
            isRecording: false,
            isTranscribing: false,
            isExtracting: false,
            isGenerating: false,
            extracted: null,
            billingResult: null,
            validationResult: null,
            suggestions: [],
            activeChipIds: treatment ? getDefaultActiveChips(treatment) : [],
            inactiveChipIds: SettingsManager.getInactiveChips(initialTreatmentType),
            confirmations: [],
            warnings: [],
            analogJustifications: {},
            analogValidation: null,
            preview: '',
        });
    }, [initialTreatmentType, treatment]);

    // ─── Validate and Finalize Billing ──────────────────────────

    const validateAndFinalizeBilling = useCallback((): {
        ok: boolean;
        errors: AnalogValidationError[];
        exportPayload?: AnalogExportItem[];
    } => {
        // Run analog justification validation
        const validation = validateAnalogJustifications(
            state.suggestions,
            state.analogJustifications
        );

        // Update state with validation result
        setState(s => ({ ...s, analogValidation: validation }));

        if (!validation.ok) {
            console.warn('[BillingV5] Analog validation failed:', validation.missing);
            return {
                ok: false,
                errors: validation.missing
            };
        }

        // Build safe export payload (no commentary leaks)
        const exportPayload = buildAnalogExportPayload(state.analogJustifications);

        // Assert no commentary leaks (throws if found)
        try {
            assertNoCommentaryLeak(exportPayload);
        } catch (e) {
            console.error('[BillingV5] Export safety check failed:', e);
            return {
                ok: false,
                errors: [{
                    analogCode: 'EXPORT_GUARD',
                    type: 'missing_justification',
                    reason: 'Export enthält verbotene Kommentar-Inhalte',
                    severity: 'error'
                }]
            };
        }

        console.log('[BillingV5] Billing finalized successfully');
        return {
            ok: true,
            errors: [],
            exportPayload
        };
    }, [state.suggestions, state.analogJustifications]);

    // ─── Save Analog Justification ──────────────────────────────

    const saveAnalogJustification = useCallback((analogCode: string, justificationText: string, selectedComparisonCode?: string) => {
        const justification = createAnalogJustification(
            analogCode,
            justificationText,
            selectedComparisonCode
        );

        setState(s => ({
            ...s,
            analogJustifications: {
                ...s.analogJustifications,
                [analogCode]: justification
            }
        }));

        console.log(`[BillingV5] Saved analog justification for ${analogCode}`);
    }, []);

    // ─── Computed Values ───────────────────────────────────────

    const festzuschuss = useMemo(() => {
        return state.billingResult?.festzuschuss?.gesamtbetrag || 0;
    }, [state.billingResult]);

    const hasUnansweredConfirmations = useMemo(() => {
        return state.confirmations.some(c => !c.answered);
    }, [state.confirmations]);

    const availableChips = useMemo(() => {
        return treatment?.chips || [];
    }, [treatment]);

    // ─── Return ────────────────────────────────────────────────

    return {
        // State
        ...state,

        // Computed
        festzuschuss,
        hasUnansweredConfirmations,
        availableChips,
        treatment,
        template,

        // Actions
        setDictation,
        setInsuranceType,
        setBonusStatus,
        setHasZuzahlung,
        setZuzahlungBetrag,
        toggleChip,
        analyze,
        answerConfirmation,
        generatePreview,
        reset,
        saveAnalogJustification,
        validateAndFinalizeBilling,
    };
}

// Re-export types for consumers
export type { ExtractedData, BillingInferenceResult, TreatmentDefaults };
