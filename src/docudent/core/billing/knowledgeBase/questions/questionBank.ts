/**
 * Question Bank Loader — SSOT for question UI semantics
 * 
 * This module loads question definitions from JSON (no fachliche Logik in TS).
 * Questions contain: prompt text, options, form types, data fields.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface QuestionOption {
    id: string;
    label: string;
    dataValue: string | number | boolean;
    chipActivation?: string; // NEW: Chip to activate
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

interface QuestionBankFile {
    _meta: {
        treatmentId: string;
        version: string;
        description?: string;
    };
    questions: QuestionDefinition[];
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

const questionBankCache = new Map<string, QuestionBankFile>();

// ═══════════════════════════════════════════════════════════════
// LOADERS
// ═══════════════════════════════════════════════════════════════

/**
 * Load the entire question bank for a treatment type.
 */
export function loadQuestionBank(treatmentId: string): QuestionBankFile | null {
    if (questionBankCache.has(treatmentId)) {
        return questionBankCache.get(treatmentId)!;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const data = require(`./${treatmentId}_question_bank.json`) as QuestionBankFile;
        questionBankCache.set(treatmentId, data);
        return data;
    } catch {
        console.warn(`[QuestionBank] No question bank for treatment: ${treatmentId}`);
        return null;
    }
}

/**
 * Get a specific question definition by key.
 */
export function getQuestionDef(treatmentId: string, key: string): QuestionDefinition | null {
    const bank = loadQuestionBank(treatmentId);
    if (!bank) return null;

    return bank.questions.find(q => q.key === key) || null;
}

/**
 * Get all questions for a specific category.
 */
export function getQuestionsByCategory(
    treatmentId: string,
    category: 'forensic' | 'upsell' | 'mkv'
): QuestionDefinition[] {
    const bank = loadQuestionBank(treatmentId);
    if (!bank) return [];

    return bank.questions.filter(q => q.category === category);
}

/**
 * Get all question keys in the bank.
 */
export function getAllQuestionKeys(treatmentId: string): string[] {
    const bank = loadQuestionBank(treatmentId);
    if (!bank) return [];

    return bank.questions.map(q => q.key);
}
