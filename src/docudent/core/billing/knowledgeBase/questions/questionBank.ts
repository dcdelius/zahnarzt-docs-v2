/**
 * Question Bank Loader — SSOT for question UI semantics
 * 
 * This module loads question definitions from JSON (no fachliche Logik in TS).
 * Questions contain: prompt text, options, form types, data fields.
 * 
 * SSOT Path: treatments/{treatmentId}/question_bank.json
 * Uses registry loaders for consistent treatmentId validation.
 */

import { loadQuestionBankConfig, isKnownTreatment, KNOWN_TREATMENTS } from '../registry';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface QuestionOption {
    id: string;
    label: string;
    dataValue: string | number | boolean;
    chipActivation?: string; // Chip to activate when this option is selected
}

export interface QuestionDefinition {
    key: string;
    category: 'forensic' | 'upsell' | 'mkv';
    prompt: string;
    type: 'single' | 'number' | 'multi';
    dataField?: string;
    options?: QuestionOption[];
    // For number type
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    presets?: number[];
}

export interface QuestionBankFile {
    _meta: {
        treatmentId: string;
        version: string;
        description?: string;
    };
    questions: QuestionDefinition[];
}

// ═══════════════════════════════════════════════════════════════
// SSOT LOADER — Uses registry for consistent validation
// ═══════════════════════════════════════════════════════════════

/**
 * Load the entire question bank for a treatment type.
 * 
 * @throws Error if treatmentId is unknown
 * @throws Error if question_bank.json is missing for treatment
 */
export function loadQuestionBank(treatmentId: string): QuestionBankFile {
    // Validate treatmentId via registry
    if (!isKnownTreatment(treatmentId)) {
        throw new Error(
            `Unknown treatment: "${treatmentId}". ` +
            `Available treatments: ${KNOWN_TREATMENTS.join(', ')}`
        );
    }

    // Load via centralized registry loader
    const config = loadQuestionBankConfig(treatmentId);

    return config as unknown as QuestionBankFile;
}

/**
 * Get a specific question definition by key.
 * 
 * @throws Error if treatmentId is unknown
 * @throws Error if questionId is not found in the bank
 */
export function getQuestionDef(treatmentId: string, key: string): QuestionDefinition {
    const bank = loadQuestionBank(treatmentId);

    const question = bank.questions.find(q => q.key === key);
    if (!question) {
        throw new Error(
            `Unknown questionId: "${key}" for treatment: "${treatmentId}". ` +
            `Available keys: ${bank.questions.map(q => q.key).join(', ')}`
        );
    }

    return question;
}

/**
 * Get a specific question definition by key, or null if not found.
 * Use this when you want to check existence without throwing.
 */
export function getQuestionDefOrNull(treatmentId: string, key: string): QuestionDefinition | null {
    try {
        return getQuestionDef(treatmentId, key);
    } catch {
        return null;
    }
}

/**
 * Get all questions for a specific category.
 */
export function getQuestionsByCategory(
    treatmentId: string,
    category: 'forensic' | 'upsell' | 'mkv'
): QuestionDefinition[] {
    const bank = loadQuestionBank(treatmentId);
    return bank.questions.filter(q => q.category === category);
}

/**
 * Get all question keys in the bank.
 */
export function getAllQuestionKeys(treatmentId: string): string[] {
    const bank = loadQuestionBank(treatmentId);
    return bank.questions.map(q => q.key);
}

/**
 * Get all available treatment IDs.
 */
export function getAvailableTreatmentIds(): string[] {
    return [...KNOWN_TREATMENTS];
}

/**
 * Check if a question exists in a treatment's bank.
 */
export function hasQuestion(treatmentId: string, key: string): boolean {
    try {
        const bank = loadQuestionBank(treatmentId);
        return bank.questions.some(q => q.key === key);
    } catch {
        return false;
    }
}
