/**
 * V7 Render Helper — Wraps component in required providers
 * 
 * Provides:
 * - MemoryRouter for routing
 * - Test-friendly setup
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocudentV7Page } from '../../pages/DocudentV7Page';

interface RenderV7Options {
    initialRoute?: string;
}

/**
 * Render DocudentV7Page with all required providers
 */
export function renderV7(options: RenderV7Options = {}): RenderResult {
    const { initialRoute = '/docudent/v7' } = options;

    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <DocudentV7Page />
        </MemoryRouter>
    );
}

/**
 * Get common test selectors
 */
export const selectors = {
    // Step 1 (Hero/Dictation)
    dictationTextarea: '[data-testid="dictation-input"], textarea',
    treatmentSelector: '[data-testid="treatment-selector"]',
    insuranceSelector: '[data-testid="insurance-selector"]',
    sendButton: '[data-testid="send-button"], button:has-text("Analysieren")',

    // Step 2 (Questions)
    questionsPanel: '[data-testid="questions-panel"]',
    questionItem: '[data-testid^="question-"]',
    optionButton: '[data-testid^="option-"]',
    proceedButton: '[data-testid="proceed-button"]',

    // Step 3 (Output)
    outputPanel: '[data-testid="output-panel"]',
    outputPaper: '[data-testid="output-paper"]',
    copyButton: '[data-testid="copy-button"]',
    editButton: '[data-testid="edit-button"]',
    resetButton: '[data-testid="reset-button"]',
    billingToggle: '[data-testid="billing-toggle"]',
    billingList: '[data-testid="billing-list"]',
    noBillingMessage: '[data-testid="no-billing-message"]',
    warningsSection: '[data-testid="warnings-section"]',
};

/**
 * Forbidden mock strings that should NEVER appear in V7 output
 */
export const FORBIDDEN_MOCK_STRINGS = [
    'Mustermann',
    'Max Müller',
    'Behandlungsblatt',
    '19.12.2025',  // Hardcoded old date
    '~ 145,20 €',  // Hardcoded price
];

/**
 * Check if text contains any forbidden mock strings
 */
export function containsForbiddenMockStrings(text: string): string[] {
    return FORBIDDEN_MOCK_STRINGS.filter(forbidden => text.includes(forbidden));
}
