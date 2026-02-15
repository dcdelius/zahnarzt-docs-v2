/**
 * Question Bank Adapter
 *
 * Simple adapter to read questions from treatment-specific question_bank.json.
 * NO business logic—just data access.
 */

import type { QuestionOption } from '../../../contracts/questions';

export interface QuestionBankEntry {
    key: string;
    category: string;
    prompt: string;
    type: 'single' | 'multi' | 'number';
    dataField?: string;
    options?: QuestionOption[];
    when?: unknown;
}

export interface QuestionBank {
    _meta: {
        treatmentId: string;
        version: string;
    };
    questions: QuestionBankEntry[];
}

// Cache for loaded question banks (per treatmentId)
const questionBankCache: Map<string, QuestionBank> = new Map();

/**
 * Get the question bank for a treatment.
 * Loads from file or returns cached copy.
 */
export function getQuestionBank(treatmentId: string): QuestionBank | null {
    if (questionBankCache.has(treatmentId)) {
        return questionBankCache.get(treatmentId)!;
    }

    try {
        // Import question bank (synchronous for now)
        // In production, this comes from the bundled JSON
        const qb = loadQuestionBankSync(treatmentId);
        if (qb) {
            questionBankCache.set(treatmentId, qb);
            return qb;
        }
    } catch (e) {
        console.warn(`Failed to load question bank for ${treatmentId}:`, e);
    }

    return null;
}

/**
 * Get a single question by key from a treatment's question bank.
 */
export function getQuestionByKey(
    treatmentId: string,
    key: string
): QuestionBankEntry | null {
    const qb = getQuestionBank(treatmentId);
    if (!qb) return null;

    return qb.questions.find(q => q.key === key) ?? null;
}

/**
 * Check if a question key exists in a treatment's question bank.
 */
export function hasQuestionKey(treatmentId: string, key: string): boolean {
    return getQuestionByKey(treatmentId, key) !== null;
}

// ═══════════════════════════════════════════════════════════════
// LOADER — Sync loader for question banks (bundled at build time)
// ═══════════════════════════════════════════════════════════════

function loadQuestionBankSync(treatmentId: string): QuestionBank | null {
    // These are imported statically to ensure bundler includes them
    switch (treatmentId) {
        case 'fuellung':
            return require('../../../core/billing/knowledgeBase/treatments/fuellung/question_bank.json');
        case 'endo':
            return require('../../../core/billing/knowledgeBase/treatments/endo/question_bank.json');
        case 'extraction':
            return require('../../../core/billing/knowledgeBase/treatments/extraction/question_bank.json');
        case 'pzr':
            return require('../../../core/billing/knowledgeBase/treatments/pzr/question_bank.json');
        case 'crown_prep':
            return require('../../../core/billing/knowledgeBase/treatments/crown_prep/question_bank.json');
        default:
            return null;
    }
}
