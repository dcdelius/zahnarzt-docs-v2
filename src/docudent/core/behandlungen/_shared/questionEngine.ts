/**
 * Question Engine for Treatment-Specific Confirmations
 * 
 * Loads questions from treatment JSON files and filters based on:
 * 1. Dictation context (keywords, extracted data)
 * 2. Settings (questionLevel, treatment-specific settings)
 * 3. Insurance type (GKV/PKV)
 */

// Minimal ExtractedData type (matches the shape from extraction)
export interface ExtractedData {
    tooth?: string;
    surfaces?: string[];
    diagnosis?: string;
    material?: string;
    anesthesia?: string;
    // NEW: Inferred context from LLM for billing optimization
    inferred?: {
        deepCavity?: boolean;
        ukMolar?: boolean;
        multiSurface?: boolean;
        approximal?: boolean;
        cappingLikely?: boolean;
        cappingMaterial?: string;
        kofferdamMentioned?: boolean;
        anesthesiaType?: 'leitung' | 'infiltration' | 'ila';
        fluorideMentioned?: boolean;
    };
    [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type QuestionLevel = 'minimal' | 'standard' | 'aggressive';

export interface QuestionTrigger {
    keywords?: string[];
    notMentioned?: string[];
    extractedFields?: Record<string, string[]>;
    dependsOn?: string[];
    always?: boolean;
    condition?: string;
    insuranceType?: 'GKV' | 'PKV';
    settingOverride?: {
        key: string;
        ifTrue: 'skip_and_autoAccept' | 'suggest_first';
    };
    patientData?: {
        field: string;
        condition: 'olderThan';
        days: number;
    };
    fallback?: {
        question: string;
    };
    probability?: number;
}

export interface QuestionOption {
    id: string;
    label: string;
    icon?: string;
    value?: string;
    billing?: {
        GKV?: { code: string; autoAccept?: boolean; isAnalog?: boolean };
        PKV?: { code: string; autoAccept?: boolean; isAnalog?: boolean };
    } | null;
    followup?: string | string[];
    documentation?: string;
    warning?: string;
    action?: string;
}

export interface Question {
    id: string;
    trigger: QuestionTrigger;
    priority: number;
    question: string;
    subtext?: string;
    importance: 'billing' | 'forensic' | 'billing_and_forensic' | 'preventive_billing' | 'workflow';
    options: QuestionOption[];
    icon?: string;
}

export interface TreatmentQuestions {
    id: string;
    version: string;
    tier1_contextual: { description: string; questions: Question[] };
    tier2_optimization: { description: string; settingKey: string; minimumLevel: QuestionLevel; questions: Question[] };
    tier3_opportunistic: { description: string; settingKey: string; minimumLevel: QuestionLevel; timing: string; questions: Question[] };
}

export interface QuestionContext {
    rawDictation: string;
    extracted: ExtractedData;
    insuranceType: 'GKV' | 'PKV';
    settings: {
        questionLevel: QuestionLevel;
        [key: string]: any;
    };
    patientHistory?: Record<string, any>;
}

export interface ActiveQuestion extends Question {
    tier: 1 | 2 | 3;
    triggeredBy: string;
}

// ═══════════════════════════════════════════════════════════════
// QUESTION ENGINE
// ═══════════════════════════════════════════════════════════════

export class QuestionEngine {
    private questionsData: TreatmentQuestions | null = null;
    private treatmentId: string;

    constructor(treatmentId: string) {
        this.treatmentId = treatmentId;
    }

    /**
     * Load questions JSON for the treatment
     */
    async loadQuestions(): Promise<void> {
        try {
            // Dynamic import - use explicit mapping to avoid esbuild glob issues
            // This is legacy code, new implementations use playbooks
            // NOTE: Endo now uses playbooks (core/playbooks/endo/), not questions.json
            // NOTE: PA/PAR doesn't have questions.json yet
            // NOTE: 'filling' is aliased to 'fuellung' (German folder name)
            const treatmentModules: Record<string, () => Promise<unknown>> = {
                'fuellung': () => import('../fuellung/questions.json'),
            };

            const loader = treatmentModules[this.treatmentId];
            if (loader) {
                const module = await loader();
                this.questionsData = (module as { default?: unknown }).default || module;
            } else {
                console.warn(`No questions loader for treatment: ${this.treatmentId}`);
                this.questionsData = null;
            }
        } catch (e) {
            console.warn(`No questions.json found for treatment: ${this.treatmentId}`);
            this.questionsData = null;
        }
    }

    /**
     * Get relevant questions based on context
     */
    getActiveQuestions(context: QuestionContext): ActiveQuestion[] {
        if (!this.questionsData) return [];

        const activeQuestions: ActiveQuestion[] = [];
        const dictLower = context.rawDictation.toLowerCase();

        // Tier 1: Always check contextual questions
        for (const q of this.questionsData.tier1_contextual.questions) {
            const result = this.evaluateTrigger(q.trigger, dictLower, context);
            if (result.triggered) {
                activeQuestions.push({
                    ...q,
                    tier: 1,
                    triggeredBy: result.reason
                });
            }
        }

        // Tier 2: Check if questionLevel >= standard
        if (context.settings.questionLevel !== 'minimal') {
            for (const q of this.questionsData.tier2_optimization.questions) {
                const result = this.evaluateTrigger(q.trigger, dictLower, context);
                if (result.triggered) {
                    activeQuestions.push({
                        ...q,
                        tier: 2,
                        triggeredBy: result.reason
                    });
                }
            }
        }

        // Tier 3: Only if questionLevel === aggressive
        if (context.settings.questionLevel === 'aggressive') {
            for (const q of this.questionsData.tier3_opportunistic.questions) {
                const result = this.evaluateTrigger(q.trigger, dictLower, context);
                if (result.triggered) {
                    activeQuestions.push({
                        ...q,
                        tier: 3,
                        triggeredBy: result.reason
                    });
                }
            }
        }

        // Sort by tier, then priority
        activeQuestions.sort((a, b) => {
            if (a.tier !== b.tier) return a.tier - b.tier;
            return a.priority - b.priority;
        });

        // Filter out questions with unsatisfied dependencies
        return this.resolveDependencies(activeQuestions);
    }

    /**
     * Evaluate if a trigger condition is met
     */
    private evaluateTrigger(
        trigger: QuestionTrigger,
        dictLower: string,
        context: QuestionContext
    ): { triggered: boolean; reason: string } {
        // Check dependsOn (handled separately in resolveDependencies)
        if (trigger.dependsOn) {
            return { triggered: true, reason: 'dependency' };
        }

        // Always trigger
        if (trigger.always) {
            return { triggered: true, reason: 'always' };
        }

        // Insurance type filter
        if (trigger.insuranceType && trigger.insuranceType !== context.insuranceType) {
            return { triggered: false, reason: '' };
        }

        // Setting override (e.g., kofferdamStandard = true → skip question)
        if (trigger.settingOverride) {
            const settingValue = this.getNestedSetting(context.settings, trigger.settingOverride.key);
            if (settingValue === true && trigger.settingOverride.ifTrue === 'skip_and_autoAccept') {
                return { triggered: false, reason: '' }; // Skip, will be auto-accepted elsewhere
            }
        }

        // Keyword match
        if (trigger.keywords) {
            for (const kw of trigger.keywords) {
                if (dictLower.includes(kw.toLowerCase())) {
                    return { triggered: true, reason: `keyword: "${kw}"` };
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // COMBINED CHECK: extractedFields + notMentioned (e.g., matrix_approximal)
        // If BOTH are defined, BOTH must be satisfied (AND logic)
        // ═══════════════════════════════════════════════════════════════
        if (trigger.extractedFields && trigger.notMentioned) {
            // Check extracted fields first
            let extractedMatch = false;
            for (const [field, values] of Object.entries(trigger.extractedFields)) {
                const extractedValue = (context.extracted as any)[field];
                if (extractedValue) {
                    if (Array.isArray(extractedValue)) {
                        const extractedLower = extractedValue.map((v: string) => v.toLowerCase());
                        for (const v of values) {
                            if (extractedLower.includes(v.toLowerCase())) {
                                extractedMatch = true;
                                break;
                            }
                        }
                    } else {
                        const extractedLower = String(extractedValue).toLowerCase();
                        for (const v of values) {
                            if (extractedLower.includes(v.toLowerCase())) {
                                extractedMatch = true;
                                break;
                            }
                        }
                    }
                }
                if (extractedMatch) break;
            }

            // Check notMentioned
            const noneExplicitlyMentioned = !trigger.notMentioned.some(kw =>
                dictLower.includes(kw.toLowerCase())
            );

            // Both must be true
            if (extractedMatch && noneExplicitlyMentioned) {
                return { triggered: true, reason: 'extracted field match + not mentioned' };
            }
            // If combined check failed, don't continue to individual checks
            return { triggered: false, reason: '' };
        }

        // Not mentioned ONLY (no extractedFields)
        if (trigger.notMentioned && !trigger.extractedFields) {
            const anyMentioned = trigger.notMentioned.some(kw => dictLower.includes(kw.toLowerCase()));
            if (!anyMentioned) {
                return { triggered: true, reason: 'not mentioned in dictation' };
            }
        }

        // Extracted fields ONLY (no notMentioned)
        if (trigger.extractedFields && !trigger.notMentioned) {
            for (const [field, values] of Object.entries(trigger.extractedFields)) {
                const extractedValue = (context.extracted as any)[field];
                if (extractedValue) {
                    if (Array.isArray(extractedValue)) {
                        const extractedLower = extractedValue.map((v: string) => v.toLowerCase());
                        for (const v of values) {
                            if (extractedLower.includes(v.toLowerCase())) {
                                return { triggered: true, reason: `extracted.${field} contains "${v}"` };
                            }
                        }
                    } else {
                        const extractedLower = String(extractedValue).toLowerCase();
                        for (const v of values) {
                            if (extractedLower.includes(v.toLowerCase())) {
                                return { triggered: true, reason: `extracted.${field} contains "${v}"` };
                            }
                        }
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // NEW: Use LLM-inferred context for smarter triggering
        // ═══════════════════════════════════════════════════════════════
        const inferred = context.extracted.inferred;
        if (inferred) {
            // Deep cavity detection - trigger capping questions
            if (trigger.keywords?.some(kw => ['tief', 'profunda', 'pulpanah', 'cp'].includes(kw.toLowerCase()))) {
                if (inferred.deepCavity) {
                    return { triggered: true, reason: 'inferred.deepCavity = true' };
                }
            }

            // Kofferdam already mentioned - skip kofferdam question
            if (trigger.notMentioned?.includes('kofferdam') && inferred.kofferdamMentioned === true) {
                return { triggered: false, reason: '' }; // Already mentioned, don't ask
            }

            // Fluoride already mentioned - skip fluoride question
            if (trigger.keywords?.some(kw => kw.toLowerCase().includes('fluorid'))) {
                if (inferred.fluorideMentioned) {
                    return { triggered: false, reason: '' }; // Already mentioned
                }
            }

            // Anesthesia type already inferred - skip anesthesia question
            if (trigger.notMentioned?.includes('leitung') || trigger.notMentioned?.includes('infiltration')) {
                if (inferred.anesthesiaType) {
                    return { triggered: false, reason: '' }; // Already inferred
                }
            }
        }

        // Condition string evaluation (simple cases)
        if (trigger.condition) {
            // For now, just check simple !extracted.X patterns
            const match = trigger.condition.match(/!extracted\.(\w+)/);
            if (match) {
                const field = match[1];
                if (!(context.extracted as any)[field]) {
                    return { triggered: true, reason: `extracted.${field} is empty` };
                }
            }
        }

        // Probability (random trigger for sampling)
        if (trigger.probability !== undefined) {
            if (Math.random() < trigger.probability) {
                return { triggered: true, reason: 'probabilistic' };
            }
        }

        // Patient data check (future: when we have PVS integration)
        if (trigger.patientData && context.patientHistory) {
            const lastDate = context.patientHistory[trigger.patientData.field];
            if (lastDate) {
                const daysSince = this.daysSince(new Date(lastDate));
                if (daysSince > trigger.patientData.days) {
                    return { triggered: true, reason: `${trigger.patientData.field} > ${trigger.patientData.days} days` };
                }
            }
        }

        // Fallback for patient data when no history available
        if (trigger.patientData && !context.patientHistory && trigger.fallback) {
            return { triggered: true, reason: 'fallback (no patient history)' };
        }

        return { triggered: false, reason: '' };
    }

    /**
     * Remove questions whose dependencies are not satisfied
     */
    private resolveDependencies(questions: ActiveQuestion[]): ActiveQuestion[] {
        const answeredIds = new Set<string>();
        const result: ActiveQuestion[] = [];

        for (const q of questions) {
            if (!q.trigger.dependsOn) {
                result.push(q);
                continue;
            }

            // TODO: In the actual flow, we'd check if the dependency was answered
            // For now, include all dependency questions but mark them
            result.push(q);
        }

        return result;
    }

    /**
     * Get nested setting value (e.g., "methodik.kofferdamStandard")
     */
    private getNestedSetting(settings: Record<string, any>, path: string): any {
        const parts = path.split('.');
        let current = settings;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        return current;
    }

    /**
     * Calculate days since a date
     */
    private daysSince(date: Date): number {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Get billing codes for a selected option
     */
    getBillingForOption(option: QuestionOption, insuranceType: 'GKV' | 'PKV'): { code: string; autoAccept: boolean } | null {
        if (!option.billing) return null;
        const billing = option.billing[insuranceType];
        if (!billing) return null;
        return {
            code: billing.code,
            autoAccept: billing.autoAccept ?? false
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════

const engineCache = new Map<string, QuestionEngine>();

export async function getQuestionEngine(treatmentId: string): Promise<QuestionEngine> {
    if (!engineCache.has(treatmentId)) {
        const engine = new QuestionEngine(treatmentId);
        await engine.loadQuestions();
        engineCache.set(treatmentId, engine);
    }
    return engineCache.get(treatmentId)!;
}
