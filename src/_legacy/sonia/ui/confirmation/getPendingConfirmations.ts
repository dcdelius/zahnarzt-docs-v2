/**
 * Get Pending Confirmations
 * 
 * Analyzes chip states and extracted data to find items
 * that need user confirmation before final documentation.
 * 
 * PHILOSOPHY: Only ask when truly uncertain. 
 * - Don't ask for default befund values unless dictation was ambiguous
 * - Missing tooth/surfaces = validation error, not confirmation
 */

import { ChipState } from '../../behandlungen/_shared/types';
import { ConfirmationItem, CONFIRMATION_OPTIONS, FIELD_QUESTIONS } from './types';

/**
 * Find chips that genuinely need confirmation
 * 
 * Only shows confirmations when:
 * - User explicitly mentioned something contradictory OR
 * - A critical field has very low confidence (< 0.3)
 */
export function getPendingConfirmations(
    chipStates: ChipState[],
    extractedData: Record<string, any>,
    dictation?: string  // Optional raw dictation for context
): ConfirmationItem[] {
    const pending: ConfirmationItem[] = [];
    const lower = (dictation || '').toLowerCase();

    // Only ask for befund confirmations if:
    // 1. needsConfirmation is true AND
    // 2. confidence is below threshold (0.3) AND
    // 3. The dictation contained ambiguous mentions

    for (const chip of chipStates) {
        if (!chip.needsConfirmation || !chip.active) continue;

        // Higher threshold: only ask if very uncertain
        if (chip.confidence > 0.3) continue;

        // Map chip to field
        const fieldId = chipToField(chip.id);
        if (!fieldId) continue;

        // Skip if already added
        if (pending.some(p => p.fieldId === fieldId)) continue;

        // Check if we should really ask based on dictation context
        if (!shouldAskField(fieldId, lower)) continue;

        const options = CONFIRMATION_OPTIONS[fieldId];
        if (!options || options.length === 0) continue;

        pending.push({
            id: `confirm_${fieldId}`,
            fieldId,
            question: FIELD_QUESTIONS[fieldId] || `${fieldId}?`,
            currentValue: extractedData[fieldId],
            confidence: chip.confidence,
            options,
            category: 'befund'
        });
    }

    // KOSTENAUFKLÄRUNG - immer nachfragen wenn nicht diktiert!
    // (Bei Füllungen muss immer über Kosten aufgeklärt werden)
    if (extractedData.tooth && !extractedData.costs && !extractedData.kosten) {
        const costOptions = CONFIRMATION_OPTIONS['costs'];
        if (costOptions && costOptions.length > 0) {
            pending.push({
                id: 'confirm_costs',
                fieldId: 'costs',
                question: FIELD_QUESTIONS['costs'] || 'Kosten?',
                confidence: 0,
                options: costOptions,
                category: 'meta'
            });
        }
    }

    return pending;
}

/**
 * Decide if we should ask about a field based on dictation
 */
function shouldAskField(fieldId: string, dictation: string): boolean {
    switch (fieldId) {
        case 'vitality':
            // Ask if explicitly mentioned but unclear
            return dictation.includes('vital') && !dictation.includes('vipr') ||
                dictation.includes('lebt') || dictation.includes('sensibel');
        case 'percussion':
            // Ask if mentioned
            return dictation.includes('perk');
        case 'spontaneous_pain':
            // Ask only if mentioned
            return dictation.includes('schmerz') || dictation.includes('spontan');
        default:
            return false;
    }
}

/**
 * Map chip ID to field ID
 */
function chipToField(chipId: string): string | null {
    const mapping: Record<string, string> = {
        'vipr_pos': 'vitality',
        'vipr_neg': 'vitality',
        'perk_neg': 'percussion',
        'perk_pos': 'percussion',
        'spont_neg': 'spontaneous_pain',
        'spont_pos': 'spontaneous_pain'
    };
    return mapping[chipId] || null;
}

/**
 * Check if there are any pending confirmations
 */
export function hasPendingConfirmations(
    chipStates: ChipState[],
    extractedData: Record<string, any>,
    dictation?: string
): boolean {
    return getPendingConfirmations(chipStates, extractedData, dictation).length > 0;
}
