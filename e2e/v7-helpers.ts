/**
 * V7 E2E Test Helpers
 * 
 * Robust, testid-based utilities for Playwright E2E tests.
 * Eliminates flakiness by using explicit element waits instead of timeouts.
 */

import { Page, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════
// WAIT FOR V7 READY — Full page readiness
// ═══════════════════════════════════════════════════════════════

/**
 * Wait for V7 page to be fully ready for interaction.
 * Checks:
 * 1. DOM loaded
 * 2. data-testid="dictation-input" visible
 * 3. No auth redirect (still on /docudent/v7)
 */
export async function waitForV7Ready(page: Page): Promise<void> {
    // Wait for network to be idle (most resources loaded)
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
        // networkidle can fail on long-polling - fall back to domcontentloaded
        return page.waitForLoadState('domcontentloaded');
    });

    // Wait for the critical element: dictation input
    const dictationInput = page.getByTestId('dictation-input');
    await expect(dictationInput).toBeVisible({ timeout: 15000 });

    // Verify we're still on V7 (no auth redirect)
    expect(page.url()).toContain('/docudent/v7');
}

// ═══════════════════════════════════════════════════════════════
// WAIT FOR QUESTIONS — After pipeline trigger
// ═══════════════════════════════════════════════════════════════

/**
 * Wait for questions panel to appear after triggering pipeline.
 */
export async function waitForQuestions(page: Page): Promise<void> {
    const questionsPanel = page.getByTestId('questions-panel');
    await expect(questionsPanel).toBeVisible({ timeout: 15000 });
}

// ═══════════════════════════════════════════════════════════════
// WAIT FOR OUTPUT — After completing questions
// ═══════════════════════════════════════════════════════════════

/**
 * Wait for output panel to appear after completing questions.
 */
export async function waitForOutput(page: Page): Promise<void> {
    const outputPanel = page.getByTestId('output-panel');
    await expect(outputPanel).toBeVisible({ timeout: 15000 });
}

// ═══════════════════════════════════════════════════════════════
// ANSWER ALL QUESTIONS — Click first option for each question
// ═══════════════════════════════════════════════════════════════

/**
 * Answer all visible questions by clicking the first option for each.
 * Uses explicit button visibility checks instead of timeouts.
 */
export async function answerAllQuestions(page: Page): Promise<void> {
    // Wait for at least one option button to be visible
    await page.waitForSelector('button', { state: 'visible', timeout: 5000 });

    // Common answer patterns - click if visible
    const commonAnswers = [
        'ViPr +',
        'ViPr −',
        'Perk −',
        'Perk +',
        'Normale Tiefe',
        'Kofferdam',
        'Relativ',
        'Ca(OH)₂',
        'Ja',
        'Nein',
    ];

    for (const text of commonAnswers) {
        const btn = page.getByRole('button', { name: text, exact: true });
        const isVisible = await btn.isVisible().catch(() => false);
        if (isVisible) {
            await btn.click();
            // Small wait for React state to settle
            await page.waitForTimeout(100);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// TRIGGER PIPELINE — Submit dictation
// ═══════════════════════════════════════════════════════════════

/**
 * Enter dictation text and trigger the pipeline.
 */
export async function triggerPipeline(page: Page, dictation: string): Promise<void> {
    const dictationInput = page.getByTestId('dictation-input');
    await expect(dictationInput).toBeVisible();
    await dictationInput.fill(dictation);
    await dictationInput.press('Control+Enter');
}

// ═══════════════════════════════════════════════════════════════
// COMPLETE QUESTIONS — Click Fertigstellen button
// ═══════════════════════════════════════════════════════════════

/**
 * Complete the questions step by clicking Fertigstellen.
 */
export async function completeQuestions(page: Page): Promise<void> {
    const completeBtn = page.getByRole('button', { name: /fertigstellen/i }).first();
    await expect(completeBtn).toBeEnabled({ timeout: 5000 });
    await completeBtn.click();
}
