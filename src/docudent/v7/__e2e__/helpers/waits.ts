/**
 * E2E Wait Helpers — Deterministic State Waits
 * 
 * Provides robust wait functions that wait for the app's state machine
 * rather than arbitrary timeouts.
 * 
 * Key invariants:
 * - Always wait for specific testids/elements
 * - Never use broad sleep() calls
 * - Provide clear error messages on timeout
 */

import { Page, Locator } from '@playwright/test';

/**
 * Debug helper: Captures visibility state of key elements on timeout.
 * Used to provide actionable error messages.
 */
async function captureE2EDebugState(page: Page): Promise<string> {
    const states: string[] = [];

    const checks = [
        { name: 'multiinstance-panel', selector: '[data-testid="multiinstance-panel"]' },
        { name: 'multiinstance-questions-screen', selector: '[data-testid="multiinstance-questions-screen"]' },
        { name: 'multi-output-paper', selector: '[data-testid="multi-output-paper"]' },
        { name: 'multi-copy-button', selector: '[data-testid="multi-copy-button"]' },
        { name: 'apply-multiinstance', selector: '[data-testid="apply-multiinstance"]' },
        { name: 'multi-retry-after-questions', selector: '[data-testid="multi-retry-after-questions"]' },
    ];

    for (const check of checks) {
        const visible = await page.locator(check.selector).isVisible().catch(() => false);
        states.push(`${check.name}: ${visible ? '✓' : '✗'}`);
    }

    return states.join(', ');
}

/**
 * Wait for either questions screen or output paper to appear.
 * Uses Promise.race for robustness.
 * 
 * @returns 'questions' | 'output'
 * @throws Error with debug state if neither appears
 */
export async function waitForQuestionsOrOutput(
    page: Page,
    timeoutMs = 15000
): Promise<'questions' | 'output'> {
    const questionsScreen = page.locator('[data-testid="multiinstance-questions-screen"]');
    const outputPaper = page.locator('[data-testid="multi-output-paper"]');

    try {
        // Race: which appears first?
        const result = await Promise.race([
            questionsScreen.waitFor({ state: 'visible', timeout: timeoutMs })
                .then(() => 'questions' as const),
            outputPaper.waitFor({ state: 'visible', timeout: timeoutMs })
                .then(() => 'output' as const),
        ]);
        return result;
    } catch {
        const debugState = await captureE2EDebugState(page);
        throw new Error(
            `Neither questions nor output appeared within ${timeoutMs}ms.\n` +
            `Element visibility: ${debugState}`
        );
    }
}

/**
 * Wait for output to be fully ready (paper + copy button visible).
 * 
 * @throws Error with debug state if output not ready
 */
export async function waitForOutputReady(
    page: Page,
    timeoutMs = 15000
): Promise<void> {
    const outputPaper = page.locator('[data-testid="multi-output-paper"]');
    const copyButton = page.locator('[data-testid="multi-copy-button"]');

    try {
        await outputPaper.waitFor({ state: 'visible', timeout: timeoutMs });
        await copyButton.waitFor({ state: 'visible', timeout: timeoutMs });
    } catch {
        const debugState = await captureE2EDebugState(page);
        throw new Error(
            `Output not ready within ${timeoutMs}ms.\n` +
            `Element visibility: ${debugState}`
        );
    }
}

/**
 * Wait for MultiInstancePanel to appear.
 * If panel is hidden, clicks the reset button first.
 * 
 * @throws Error with debug state if panel doesn't appear
 */
export async function waitForPanel(
    page: Page,
    timeoutMs = 10000
): Promise<Locator> {
    const panel = page.locator('[data-testid="multiinstance-panel"]');
    const resetButton = page.locator('[data-testid="multiinstance-reset-panel"]');

    // First check if panel is already visible
    const isVisible = await panel.isVisible().catch(() => false);
    if (isVisible) {
        return panel;
    }

    // Check if reset button exists (panel was hidden)
    const hasResetButton = await resetButton.isVisible().catch(() => false);
    if (hasResetButton) {
        await resetButton.click();
        await page.waitForTimeout(500); // Brief wait for localStorage clear + re-render
    }

    try {
        await panel.waitFor({ state: 'visible', timeout: timeoutMs });
        return panel;
    } catch {
        const debugState = await captureE2EDebugState(page);
        throw new Error(
            `MultiInstancePanel did not appear within ${timeoutMs}ms.\n` +
            `Element visibility: ${debugState}`
        );
    }
}

/**
 * Answer all visible questions in an instance block.
 * Questions use OptionButton with data-testid="option-{label}"
 * 
 * @param instanceBlock - The instance questions container
 */
export async function answerQuestionsInInstance(
    instanceBlock: Locator
): Promise<void> {
    // Questions are rendered as rows with data-testid="question-row-{id}"
    // Each question has option buttons with data-testid="option-{label}"
    const questionRows = instanceBlock.locator('[data-testid^="question-row-"]');
    const rowCount = await questionRows.count();

    for (let i = 0; i < rowCount; i++) {
        const row = questionRows.nth(i);

        // Try option buttons first (most common - QuestionsFlowV2)
        const optionButtons = row.locator('[data-testid^="option-"]');
        const buttonCount = await optionButtons.count();

        if (buttonCount > 0) {
            // Click first option (first valid answer)
            await optionButtons.first().click();
            await row.page().waitForTimeout(100); // Brief wait for state update
        } else {
            // Fallback: Try v7-pill buttons (alternative style)
            const pillButtons = row.locator('.v7-pill');
            if (await pillButtons.count() > 0) {
                await pillButtons.first().click();
                await row.page().waitForTimeout(100);
            }
        }
    }
}

/**
 * Wait for at least one billing code element to appear.
 */
export async function waitForBillingCodes(
    page: Page,
    timeoutMs = 10000
): Promise<void> {
    const billingCodes = page.locator('[data-testid^="billing-code-"]');
    try {
        await billingCodes.first().waitFor({ state: 'visible', timeout: timeoutMs });
    } catch {
        const debugState = await captureE2EDebugState(page);
        throw new Error(
            `No billing codes appeared within ${timeoutMs}ms.\n` +
            `Element visibility: ${debugState}`
        );
    }
}
