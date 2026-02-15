/**
 * CONFIRMATION TYPES
 * 
 * Types for the Confirmation Cards UI - quick confirmation
 * of uncertain findings before final documentation.
 */

export interface ConfirmationOption {
    id: string;
    label: string;
    chipId?: string;      // Which chip to activate
    value?: any;          // Value to set
}

export interface ConfirmationItem {
    id: string;
    fieldId: string;
    question: string;
    evidence?: string[];
    currentValue?: any;
    confidence: number;
    options: ConfirmationOption[];
    category: 'befund' | 'meta' | 'prozess';
}

/**
 * Field-specific confirmation options
 */
export const CONFIRMATION_OPTIONS: Record<string, ConfirmationOption[]> = {
    vitality: [
        { id: 'vipr_pos', label: 'ViPr +', chipId: 'vipr_pos', value: '+' },
        { id: 'vipr_neg', label: 'ViPr −', chipId: 'vipr_neg', value: '-' },
        { id: 'vipr_none', label: 'Nicht erhoben', value: null }
    ],
    percussion: [
        { id: 'perk_neg', label: 'Perk −', chipId: 'perk_neg', value: '-' },
        { id: 'perk_pos', label: 'Perk +', chipId: 'perk_pos', value: '+' },
        { id: 'perk_none', label: 'Nicht erhoben', value: null }
    ],
    spontaneous_pain: [
        { id: 'spont_neg', label: 'Kein Spontanschmerz', chipId: 'spont_neg', value: '-' },
        { id: 'spont_pos', label: 'Spontanschmerz +', chipId: 'spont_pos', value: '+' },
        { id: 'spont_none', label: 'Nicht erhoben', value: null }
    ],
    diagnosis: [
        { id: 'c_media', label: 'C. media', value: 'Caries media' },
        { id: 'c_profunda', label: 'C. profunda', value: 'Caries profunda' },
        { id: 'c_superfic', label: 'C. superficialis', value: 'Caries superficialis' },
        { id: 'defekt', label: 'Zahndefekt', value: 'Zahndefekt' }
    ],
    // KOSTENAUFKLÄRUNG - häufige Beträge
    costs: [
        { id: 'cost_30', label: '30 €', value: '30' },
        { id: 'cost_50', label: '50 €', value: '50' },
        { id: 'cost_80', label: '80 €', value: '80' },
        { id: 'cost_120', label: '120 €', value: '120' },
        { id: 'cost_150', label: '150 €', value: '150' },
        { id: 'cost_none', label: 'Keine Kosten', value: '0' }
    ],
    tooth: [
        // Dynamic - filled based on context
    ],
    surfaces: [
        // Dynamic - filled based on context
    ]
};

/**
 * Human-readable question for each field
 */
export const FIELD_QUESTIONS: Record<string, string> = {
    vitality: 'Vitalität?',
    percussion: 'Perkussion?',
    spontaneous_pain: 'Spontanschmerz?',
    diagnosis: 'Diagnose?',
    costs: 'Kosten für Patient?',
    tooth: 'Welcher Zahn?',
    surfaces: 'Welche Flächen?'
};
