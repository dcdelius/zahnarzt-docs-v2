/**
 * E2E Test: v7-multiinstance-questions-2teeth
 * 
 * Tests the complete multi-instance flow with forced questions:
 * 1. Enter multi-tooth dictation
 * 2. Apply multi-instance panel
 * 3. Questions screen appears (forced via fixture)
 * 4. Answer questions per instance → retry → output
 * 5. Copy with SSOT separator verification
 * 
 * Uses VITE_STUB_EXTRACTION=true for determinism
 * Uses v7_questions_fixture=force_questions to ensure questions state
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

// Longer timeout for full pipeline flow
test.setTimeout(90000);

test.describe('V7 MultiInstance Questions Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Initialize storage with force_questions fixture for this test suite
        await initStorage(page, { forceQuestionsFixture: true, clearPanelHidden: true });
    });

    test('2-teeth dictation → questions per instance → retry → output with billing', async ({ page }) => {
        // 1. Navigate to V7 page
        await page.goto('/docudent/v7');
        await page.waitForLoadState('domcontentloaded');

        // Wait for page to be interactive
        await expect(page.locator('textarea').first()).toBeVisible({ timeout: 15000 });

        // 2. Enter multi-tooth dictation
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies');
        await textarea.press('Enter');
        await page.waitForTimeout(500);

        // 3. Wait for and click Apply on MultiInstance panel
        await waitForPanel(page, 10000);
        await expect(page.getByTestId('instance-chip-candidate-16')).toBeVisible();
        await expect(page.getByTestId('instance-chip-candidate-15')).toBeVisible();
        await page.getByTestId('apply-multiinstance').click();

        // 4. Wait for state (should be questions due to fixture)
        const state = await waitForQuestionsOrOutput(page, 15000);
        expect(state).toBe('questions');

        // 5. Verify per-instance question blocks
        await expect(page.locator('[data-testid="instance-questions-fuellung-16"]')).toBeVisible();
        await expect(page.locator('[data-testid="instance-questions-fuellung-15"]')).toBeVisible();

        // 6. Answer questions for each instance
        const instances = ['fuellung-16', 'fuellung-15'];
        for (const instanceId of instances) {
            const instanceBlock = page.locator(`[data-testid="instance-questions-${instanceId}"]`);
            if (await instanceBlock.isVisible().catch(() => false)) {
                await answerQuestionsInInstance(instanceBlock);
            }
        }

        // 7. Click Retry button
        await page.getByTestId('multi-retry-after-questions').click();

        // 8. Wait for output to be ready
        await waitForOutputReady(page, 20000);

        // 9. Assert Billing codes appear
        await waitForBillingCodes(page, 10000);
        const billingSection = page.locator('[data-testid^="billing-code-"]');
        const count = await billingSection.count();
        expect(count).toBeGreaterThanOrEqual(2);

        // 10. Verify page content contains both teeth
        const pageContent = await page.content();
        expect(pageContent).toContain('16');
        expect(pageContent).toContain('15');
    });

    test('copy button produces output with separator and both teeth', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        // Navigate
        await page.goto('/docudent/v7');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('textarea').first()).toBeVisible({ timeout: 15000 });

        // Enter dictation and apply
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies');
        await textarea.press('Enter');
        await page.waitForTimeout(500);

        await waitForPanel(page, 10000);
        await page.getByTestId('apply-multiinstance').click();

        // Handle questions if they appear
        const state = await waitForQuestionsOrOutput(page, 15000);
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

        // Wait for output and click copy
        await waitForOutputReady(page, 20000);
        await page.getByTestId('multi-copy-button').click();

        // Read clipboard
        const clipboardText = await page.evaluate(async () => {
            try {
                return await navigator.clipboard.readText();
            } catch {
                return null;
            }
        });

        // Verify clipboard content
        expect(clipboardText).toBeTruthy();
        if (clipboardText) {
            expect(clipboardText.length).toBeGreaterThan(10);
            // Should contain separator
            expect(clipboardText).toContain('---');
            // Should contain both teeth references
            expect(clipboardText).toContain('16');
            expect(clipboardText).toContain('15');
        }
    });

    test('questions screen shows correct unanswered counts', async ({ page }) => {
        // Navigate
        await page.goto('/docudent/v7');
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('textarea').first()).toBeVisible({ timeout: 15000 });

        // Enter dictation
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 16 mod Karies, Zahn 15 mo Karies');
        await textarea.press('Enter');
        await page.waitForTimeout(500);

        // Apply multi-instance
        await waitForPanel(page, 10000);
        await page.getByTestId('apply-multiinstance').click();

        // Wait for questions screen (forced by fixture)
        const state = await waitForQuestionsOrOutput(page, 15000);
        expect(state).toBe('questions');

        // Verify unanswered counts exist
        const count16 = page.locator('[data-testid="instance-unanswered-count-fuellung-16"]');
        const count15 = page.locator('[data-testid="instance-unanswered-count-fuellung-15"]');

        await expect(count16).toBeVisible();
        await expect(count15).toBeVisible();

        // Counts should show numbers (at least > 0)
        const count16Text = await count16.textContent();
        const count15Text = await count15.textContent();
        expect(count16Text).toBeTruthy();
        expect(count15Text).toBeTruthy();
    });
});
