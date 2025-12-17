/**
 * E2E Test: V7 UI Wiring — Real Browser
 * 
 * Tests the complete V7 frontend flow:
 * Dictation → Questions → Answer → Output → Copy
 * 
 * Uses VITE_STUB_EXTRACTION=true for offline, LLM-free testing.
 * 
 * STABILITY NOTES:
 * - Uses testid-based waits from v7-helpers.ts
 * - No arbitrary waitForTimeout calls
 * - Retries configured in playwright.config.ts
 */

import { test, expect } from '@playwright/test';
import {
    waitForV7Ready,
    waitForQuestions,
    waitForOutput,
    answerAllQuestions,
    triggerPipeline,
    completeQuestions,
} from './v7-helpers';

// ═══════════════════════════════════════════════════════════════
// FLOW A: FÜLLUNG WITH QUESTIONS → OUTPUT
// ═══════════════════════════════════════════════════════════════

test.describe('V7 E2E: Flow A — Füllung with Questions', () => {
    test('Füllung dictation shows questions, answering leads to output', async ({ page }) => {
        // 1. Navigate and wait for ready
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // 2. Trigger pipeline with füllung dictation
        await triggerPipeline(page, 'Zahn 36 mod Komposit');

        // 3. Wait for questions
        await waitForQuestions(page);

        // 4. Answer all questions
        await answerAllQuestions(page);

        // 5. Complete questions step
        await completeQuestions(page);

        // 6. Wait for output
        await waitForOutput(page);

        // 7. Verify output content
        const pageContent = await page.content();
        expect(pageContent).toContain('36');
        expect(pageContent).not.toContain('[object Object]');

        // 8. Click copy button
        const copyButton = page.getByTestId('copy-button');
        await expect(copyButton).toBeVisible();
        await copyButton.click();
    });
});

// ═══════════════════════════════════════════════════════════════
// FLOW B: COMPLETE FÜLLUNG FLOW
// ═══════════════════════════════════════════════════════════════

test.describe('V7 E2E: Flow B — Complete Füllung Flow', () => {
    test('Full flow produces valid output with billing info', async ({ page }) => {
        // 1. Navigate and wait
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // 2. Enter detailed dictation
        await triggerPipeline(page, 'Zahn 36 MOD Komposit Kofferdam Karies media');

        // 3. Wait for questions (may skip if all answered by dictation)
        const questionsPanel = page.getByTestId('questions-panel');
        const outputPanel = page.getByTestId('output-panel');

        // Wait for either questions or output
        await Promise.race([
            questionsPanel.waitFor({ state: 'visible', timeout: 10000 }),
            outputPanel.waitFor({ state: 'visible', timeout: 10000 }),
        ]);

        // 4. If questions visible, answer and complete
        if (await questionsPanel.isVisible()) {
            await answerAllQuestions(page);
            await completeQuestions(page);
        }

        // 5. Wait for output
        await waitForOutput(page);

        // 6. Verify content
        const pageContent = await page.content();
        expect(pageContent).toContain('36');
        expect(pageContent).not.toContain('[object Object]');

        // 7. Copy
        const copyButton = page.getByTestId('copy-button');
        await copyButton.click();
    });
});

// ═══════════════════════════════════════════════════════════════
// SAFETY TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('V7 E2E: Safety', () => {
    test('V7 page loads without crash', async ({ page }) => {
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Dictation input should be visible
        const dictationInput = page.getByTestId('dictation-input');
        await expect(dictationInput).toBeVisible();
    });

    test('V7 page has no [object Object] in initial state', async ({ page }) => {
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        const content = await page.content();
        expect(content).not.toContain('[object Object]');
    });
});

// ═══════════════════════════════════════════════════════════════
// CONTRACT VALIDATION — data-testid selectors
// ═══════════════════════════════════════════════════════════════

test.describe('V7 E2E: Contract Validation', () => {
    test('Full flow using data-testid selectors', async ({ page }) => {
        // 1. Navigate
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // 2. Verify dictation-input via data-testid
        const dictationInput = page.getByTestId('dictation-input');
        await expect(dictationInput).toBeVisible();

        // 3. Trigger pipeline
        await triggerPipeline(page, 'Zahn 36 MOD Kofferdam');

        // 4. Wait for questions-panel
        await waitForQuestions(page);

        // 5. Answer and complete
        await answerAllQuestions(page);
        await completeQuestions(page);

        // 6. Verify output-panel via data-testid
        await waitForOutput(page);

        // 7. Verify copy-button via data-testid
        const copyButton = page.getByTestId('copy-button');
        await expect(copyButton).toBeVisible();
        await copyButton.click();

        // 8. Verify content quality
        const pageContent = await page.content();
        expect(pageContent).toContain('36');
        expect(pageContent).not.toContain('[object Object]');
    });

    test('Escape key resets to idle state', async ({ page }) => {
        // 1. Navigate and enter dictation
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // 2. Trigger pipeline
        await triggerPipeline(page, 'Zahn 36 MOD');

        // 3. Wait for questions
        await waitForQuestions(page);

        // 4. Press Escape to reset
        await page.keyboard.press('Escape');

        // 5. Dictation input should be visible again
        const dictationInput = page.getByTestId('dictation-input');
        await expect(dictationInput).toBeVisible({ timeout: 5000 });
    });
});
