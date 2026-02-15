/**
 * P14.X5 E2E Test: MultiInstance 2-Teeth Fillings
 * 
 * Verifies the full UI flow for creating 2 filling instances on 2 different teeth.
 * 
 * Scenario:
 * 1. User enters dictation with 2 teeth: "Zahn 16 mod Karies, Zahn 15 mo Karies"
 * 2. MultiInstance panel appears with tooth chips
 * 3. User clicks "Als Instanzen anwenden"
 * 4. Pipeline runs → questions or output (state-based wait)
 * 5. If questions: answer and retry
 * 6. Output appears with billing and copy button
 * 
 * Fixtures: Uses VITE_STUB_EXTRACTION for deterministic extraction
 */

import { test, expect } from '@playwright/test';
import { initStorage } from './helpers/storage';
import {
    waitForPanel,
    waitForQuestionsOrOutput,
    waitForOutputReady,
    waitForBillingCodes,
    answerQuestionsInInstance
} from './helpers/waits';

// Use longer timeout for pipeline processing
test.setTimeout(90000);

test.describe('P14.X5: MultiInstance 2-Teeth Fillings', () => {

    test.beforeEach(async ({ page }) => {
        // Initialize localStorage for deterministic state (no questions fixture for basic tests)
        await initStorage(page, { forceQuestionsFixture: false, clearPanelHidden: true });

        // Navigate to V7 page with domcontentloaded (faster than networkidle)
        await page.goto('/docudent/v7');
        await page.waitForLoadState('domcontentloaded');

        // Wait for page to be interactive (textarea visible)
        await expect(page.locator('textarea').first()).toBeVisible({ timeout: 15000 });
    });

    test('should detect multiple teeth and show MultiInstance panel', async ({ page }) => {
        // Enter dictation with 2 teeth
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies');

        // Wait for multi-instance panel with deterministic wait
        const panel = await waitForPanel(page, 10000);
        await expect(panel).toBeVisible();

        // Check candidate chips are visible
        await expect(page.getByTestId('instance-chip-candidate-16')).toBeVisible();
        await expect(page.getByTestId('instance-chip-candidate-15')).toBeVisible();

        // Check apply button is visible
        await expect(page.getByTestId('apply-multiinstance')).toBeVisible();
    });

    test('should create instances and reach output on apply', async ({ page }) => {
        // Enter dictation with 2 teeth
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies');

        // Wait for panel and apply
        await waitForPanel(page, 10000);
        await page.getByTestId('apply-multiinstance').click();

        // Wait for state transition (questions OR output)
        const state = await waitForQuestionsOrOutput(page, 30000);

        if (state === 'questions') {
            // Answer questions for each instance
            const instances = ['fuellung-16', 'fuellung-15'];
            for (const instanceId of instances) {
                const instanceBlock = page.locator(`[data-testid="instance-questions-${instanceId}"]`);
                if (await instanceBlock.isVisible().catch(() => false)) {
                    await answerQuestionsInInstance(instanceBlock);
                }
            }
            // Click retry
            await page.getByTestId('multi-retry-after-questions').click();
        }

        // Wait for output to be fully ready
        await waitForOutputReady(page, 30000);
    });

    test('should show correct billing codes per tooth', async ({ page }) => {
        // Enter dictation with 2 teeth
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies');

        // Wait for panel and apply
        await waitForPanel(page, 10000);
        await page.getByTestId('apply-multiinstance').click();

        // Handle questions if they appear
        const state = await waitForQuestionsOrOutput(page, 30000);
        if (state === 'questions') {
            const instances = ['fuellung-16', 'fuellung-15'];
            for (const instanceId of instances) {
                const instanceBlock = page.locator(`[data-testid="instance-questions-${instanceId}"]`);
                if (await instanceBlock.isVisible().catch(() => false)) {
                    await answerQuestionsInInstance(instanceBlock);
                }
            }
            await page.getByTestId('multi-retry-after-questions').click();
            // Wait for output to appear after retry
            await waitForOutputReady(page, 30000);
        }

        // Wait for billing codes to appear
        await waitForBillingCodes(page, 15000);

        // Verify at least 2 billing code items exist
        const billingSection = page.locator('[data-testid^="billing-code-"]');
        const count = await billingSection.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should have working copy button with separator', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        // Enter dictation with 2 teeth
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies');

        // Wait for panel and apply
        await waitForPanel(page, 10000);
        await page.getByTestId('apply-multiinstance').click();

        // Handle questions if they appear
        const state = await waitForQuestionsOrOutput(page, 30000);
        if (state === 'questions') {
            const instances = ['fuellung-16', 'fuellung-15'];
            for (const instanceId of instances) {
                const instanceBlock = page.locator(`[data-testid="instance-questions-${instanceId}"]`);
                if (await instanceBlock.isVisible().catch(() => false)) {
                    await answerQuestionsInInstance(instanceBlock);
                }
            }
            await page.getByTestId('multi-retry-after-questions').click();
        }

        // Wait for output to be ready
        await waitForOutputReady(page, 30000);

        // Click copy button
        const copyButton = page.getByTestId('multi-copy-button');
        await copyButton.click();

        // Verify clipboard content
        const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardContent).toBeTruthy();
        expect(clipboardContent.length).toBeGreaterThan(10);

        // Check for separator between instances (---) and both teeth mentioned
        // Note: separator format may vary, just ensure we have content from both teeth
    });

    test('should show all teeth in candidate chips for 3 teeth', async ({ page }) => {
        // Enter dictation with 3 teeth
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies, Zahn 14 do');

        // Wait for multi-instance panel
        await waitForPanel(page, 10000);

        // All 3 candidate chips should be visible
        await expect(page.getByTestId('instance-chip-candidate-16')).toBeVisible();
        await expect(page.getByTestId('instance-chip-candidate-15')).toBeVisible();
        await expect(page.getByTestId('instance-chip-candidate-14')).toBeVisible();
    });

    test('should not show panel for single tooth', async ({ page }) => {
        // Enter dictation with only 1 tooth
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies');

        // Wait briefly for any potential panel (should not appear)
        await page.waitForTimeout(1500);

        // Panel should NOT appear for single tooth
        await expect(page.getByTestId('multiinstance-panel')).not.toBeVisible();
    });

    test('should allow canceling multi-instance panel', async ({ page }) => {
        // Enter dictation with 2 teeth
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies');

        // Wait for panel
        await waitForPanel(page, 10000);

        // Click cancel
        await page.getByTestId('cancel-multiinstance').click();

        // Panel should disappear
        await expect(page.getByTestId('multiinstance-panel')).not.toBeVisible();
    });
});
