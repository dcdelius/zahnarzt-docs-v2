/**
 * V7 UI Selectors — Testing utility for E2E tests
 * 
 * Provides type-safe selectors for interacting with V7 UI components.
 * Uses data-testid attributes for stable selection.
 */

import { screen, within } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// STEP 1: HERO / DICTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get the dictation textarea
 */
export function getDictationInput(): HTMLTextAreaElement | null {
    return screen.queryByTestId('dictation-input') as HTMLTextAreaElement | null;
}

/**
 * Get treatment selector button by label
 * The button displays the current treatment and opens a menu
 */
export function getTreatmentTrigger(): HTMLButtonElement | null {
    // Treatment selector trigger contains current treatment label + ▼
    const allButtons = screen.queryAllByRole('button');
    return allButtons.find(btn =>
        btn.textContent?.includes('Füllung') ||
        btn.textContent?.includes('Endo') ||
        btn.textContent?.includes('Kontrolle') ||
        btn.textContent?.includes('PZR') ||
        btn.textContent?.includes('Extraktion') ||
        btn.textContent?.includes('PAR') ||
        btn.textContent?.includes('ZE')
    ) as HTMLButtonElement | null;
}

/**
 * Get treatment option from dropdown menu
 */
export function getTreatmentOption(treatment: 'fuellung' | 'endo' | 'kontrolle' | 'pzr' | 'extraktion' | 'par' | 'ze'): HTMLButtonElement | null {
    const labelMap: Record<string, string> = {
        fuellung: 'Füllung',
        endo: 'Endo',
        kontrolle: 'Kontrolle',
        pzr: 'PZR',
        extraktion: 'Extraktion',
        par: 'PAR',
        ze: 'ZE/Prothetik'
    };
    return screen.queryByRole('button', { name: labelMap[treatment] }) as HTMLButtonElement | null;
}

/**
 * Get insurance toggle buttons
 */
export function getInsuranceButtons() {
    return {
        gkv: screen.queryByRole('button', { name: /GKV/i }) as HTMLButtonElement | null,
        pkv: screen.queryByRole('button', { name: /PKV/i }) as HTMLButtonElement | null,
    };
}

/**
 * Get MKV toggle checkbox
 */
export function getMKVToggle(): HTMLInputElement | null {
    // Look for checkbox near MKV label
    const allCheckboxes = screen.queryAllByRole('checkbox');
    return allCheckboxes.find(cb => {
        const label = cb.closest('label');
        return label?.textContent?.toLowerCase().includes('mkv');
    }) as HTMLInputElement | null;
}

/**
 * Get the send/analyze button (in ActionDock)
 */
export function getSendButton(): HTMLButtonElement | null {
    return screen.queryByTestId('send-button') as HTMLButtonElement | null;
}

/**
 * Get the microphone button (in ActionDock)
 */
export function getMicButton(): HTMLButtonElement | null {
    return screen.queryByTestId('mic-button') as HTMLButtonElement | null;
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: QUESTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get questions panel container
 */
export function getQuestionsPanel(): HTMLElement | null {
    return screen.queryByTestId('questions-panel');
}

/**
 * Get all question rows
 */
export function getAllQuestionRows(): HTMLElement[] {
    const panel = getQuestionsPanel();
    if (!panel) return [];
    return Array.from(panel.querySelectorAll('[data-testid^="question-row-"]'));
}

/**
 * Get a specific question row by question ID
 */
export function getQuestionRow(questionId: string): HTMLElement | null {
    return screen.queryByTestId(`question-row-${questionId}`);
}

/**
 * Get option button by label
 */
export function getOptionButton(optionLabel: string): HTMLButtonElement | null {
    return screen.queryByTestId(`option-${optionLabel}`) as HTMLButtonElement | null;
}

/**
 * Get the proceed/complete button
 */
export function getCompleteButton(): HTMLButtonElement | null {
    return screen.queryByRole('button', { name: /Fertigstellen/i }) as HTMLButtonElement | null;
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: OUTPUT
// ═══════════════════════════════════════════════════════════════

/**
 * Get output panel container
 */
export function getOutputPanel(): HTMLElement | null {
    return screen.queryByTestId('output-panel');
}

/**
 * Get output paper (document container)
 */
export function getOutputPaper(): HTMLElement | null {
    return screen.queryByTestId('output-paper');
}

/**
 * Get a specific section by ID
 */
export function getSection(sectionId: string): HTMLElement | null {
    return screen.queryByTestId(`section-${sectionId}`);
}

/**
 * Get all sections
 */
export function getAllSections(): HTMLElement[] {
    return Array.from(screen.queryAllByTestId(/^section-/));
}

/**
 * Get billing toggle
 */
export function getBillingToggle(): HTMLButtonElement | null {
    return screen.queryByTestId('billing-toggle') as HTMLButtonElement | null;
}

/**
 * Get billing list (when expanded)
 */
export function getBillingList(): HTMLElement | null {
    return screen.queryByTestId('billing-list');
}

/**
 * Get no-billing message
 */
export function getNoBillingMessage(): HTMLElement | null {
    return screen.queryByTestId('no-billing-message');
}

/**
 * Get copy button
 */
export function getCopyButton(): HTMLButtonElement | null {
    return screen.queryByTestId('copy-button') as HTMLButtonElement | null;
}

/**
 * Get edit button
 */
export function getEditButton(): HTMLButtonElement | null {
    return screen.queryByTestId('edit-button') as HTMLButtonElement | null;
}

/**
 * Get reset/new case button
 */
export function getResetButton(): HTMLButtonElement | null {
    return screen.queryByTestId('reset-button') as HTMLButtonElement | null;
}

/**
 * Get warnings section
 */
export function getWarningsSection(): HTMLElement | null {
    return screen.queryByTestId('warnings-section');
}

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

/**
 * Get all text content from an element
 */
export function getTextContent(element: HTMLElement | null): string {
    return element?.textContent || '';
}

/**
 * Check if element is visible (has non-zero dimensions)
 */
export function isVisible(element: HTMLElement | null): boolean {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

/**
 * Get step dots state
 */
export function getStepDotsState() {
    return {
        idle: screen.queryByTestId('v7-step-dot-idle'),
        questions: screen.queryByTestId('v7-step-dot-questions'),
        output: screen.queryByTestId('v7-step-dot-output'),
    };
}
