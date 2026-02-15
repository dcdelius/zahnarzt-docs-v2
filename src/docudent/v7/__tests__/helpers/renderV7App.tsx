/**
 * renderV7App — Render helper for real UI E2E tests
 * 
 * Mounts the REAL DocudentV7Page with router for headless testing.
 * 
 * USAGE:
 * ```tsx
 * const { user, ...queries } = renderV7App();
 * await user.type(screen.getByRole('textbox'), 'Zahn 36...');
 * await user.click(screen.getByRole('button', { name: /weiter/i }));
 * ```
 * 
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Import the real V7 page
import DocudentV7Page from '../../pages/DocudentV7Page';

// ═══════════════════════════════════════════════════════════════
// RENDER HELPER
// ═══════════════════════════════════════════════════════════════

interface RenderV7AppOptions {
    initialRoute?: string;
}

/**
 * Render the REAL DocudentV7Page with router and user-event
 */
export function renderV7App(options: RenderV7AppOptions = {}) {
    const { initialRoute = '/docudent/v7' } = options;

    const user = userEvent.setup();

    const result = render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
                <Route path="/docudent/v7" element={<DocudentV7Page />} />
                <Route path="*" element={<DocudentV7Page />} />
            </Routes>
        </MemoryRouter>
    );

    return {
        ...result,
        user,
    };
}

// ═══════════════════════════════════════════════════════════════
// UI SELECTORS
// ═══════════════════════════════════════════════════════════════

export const selectors = {
    // Step 1 — Dictation
    dictationInput: () => document.querySelector('textarea'),
    sendButton: () => document.querySelector('[data-testid="send-button"]') as HTMLButtonElement | null,
    treatmentSelector: () => document.querySelector('[data-testid="treatment-selector"]') as HTMLButtonElement | null,

    // Step 2 — Questions
    questionsPanel: () => document.querySelector('.v7-questions-panel'),
    questionRows: () => document.querySelectorAll('[data-testid^="question-row-"]'),
    completeButton: () => document.querySelector('button.v7-cta') as HTMLButtonElement | null,

    // Step 3 — Output
    outputPaper: () => document.querySelector('[data-testid="output-paper"]'),
    outputHeader: () => document.querySelector('[data-testid="output-header"]'),
    headerFallId: () => document.querySelector('[data-testid="header-fall-id"]'),
    copyButton: () => document.querySelector('[data-testid="copy-button"]') as HTMLButtonElement | null,
    editButton: () => document.querySelector('[data-testid="edit-button"]') as HTMLButtonElement | null,
    resetButton: () => document.querySelector('[data-testid="reset-button"]') as HTMLButtonElement | null,

    // Sections
    getSection: (id: string) => document.querySelector(`[data-testid="section-${id}"]`),
    getAllSections: () => document.querySelectorAll('[data-testid^="section-"]'),
};

// ═══════════════════════════════════════════════════════════════
// TEXT HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all visible text content from the output
 */
export function getOutputText(): string {
    const paper = selectors.outputPaper();
    return paper?.textContent || '';
}

/**
 * Check if output contains text (case-insensitive)
 */
export function outputContains(text: string): boolean {
    return getOutputText().toLowerCase().includes(text.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN STRINGS
// ═══════════════════════════════════════════════════════════════

export const FORBIDDEN_MOCK_STRINGS = [
    'Mustermann',
    'Max Müller',
    'Herr Müller',
    'Dr. Musterarzt',
    'Beispielpraxis',
    'MOCK_',
    'TODO:',
    'PLACEHOLDER',
    'Behandlungsblatt',
    'Lorem ipsum',
];

/**
 * Check if output contains any forbidden mock strings
 */
export function checkForbiddenStrings(text: string): string[] {
    return FORBIDDEN_MOCK_STRINGS.filter(s => text.includes(s));
}

export default renderV7App;
