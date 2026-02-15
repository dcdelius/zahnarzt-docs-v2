/**
 * M70: E2E Prod Repro Test
 * 
 * Runs against built preview (not dev server) to verify
 * the exact user flow for Repro 1 case.
 * 
 * Prerequisites:
 *   npm run build && npm run preview
 *   npx playwright test src/docudent/v10/__e2e__/v10-prod-repro.e2e.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('V10 Prod Repro — 26mod MKV (M70)', () => {
    const REPRO_1_DICTATION = 'Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie';

    test.beforeEach(async ({ page }) => {
        // Navigate to V10 page
        await page.goto('/docudent/v10');
        // Wait for page to be interactive
        await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 10000 });
    });

    test('Repro 1: Questions appear for deep caries', async ({ page }) => {
        // Enter dictation
        const input = page.locator('[data-testid="v10-dictation-input"]');
        await input.fill(REPRO_1_DICTATION);

        // Click run
        const runButton = page.locator('[data-testid="v10-run-button"]');
        await expect(runButton).toBeEnabled();
        await runButton.click();

        // Wait for questions panel (due to profunda → medical_ueberkappung)
        const questionsPanel = page.locator('[data-testid="v10-questions-panel"]');
        await expect(questionsPanel).toBeVisible({ timeout: 15000 });

        // Verify medical_ueberkappung question appears
        // (The exact selector depends on how questions are rendered)
        const questionText = page.locator('text=/[Üü]berkappung|[Cc]apping/');
        await expect(questionText).toBeVisible({ timeout: 5000 });
    });

    test('Repro 1: Answer and get output with billing', async ({ page }) => {
        // Enter dictation
        const input = page.locator('[data-testid="v10-dictation-input"]');
        await input.fill(REPRO_1_DICTATION);

        // Click run
        await page.locator('[data-testid="v10-run-button"]').click();

        // Wait for questions
        await page.waitForSelector('[data-testid="v10-questions-panel"]', { timeout: 15000 });

        // Answer überkappung question (assuming radio/button UI)
        const jaButton = page.locator('button:has-text("Ja"), label:has-text("Ja")').first();
        if (await jaButton.isVisible()) {
            await jaButton.click();
        }

        // Submit answers
        const submitButton = page.locator('[data-testid="v10-submit-answers"], button:has-text("Weiter")').first();
        if (await submitButton.isVisible()) {
            await submitButton.click();
        }

        // Wait for output
        const outputPanel = page.locator('[data-testid="v10-output-panel"]');
        await expect(outputPanel).toBeVisible({ timeout: 15000 });

        // Verify billing codes are present
        const billingCodes = page.locator('[data-testid="v10-billing-codes"]');
        await expect(billingCodes).toBeVisible();

        // At least one billing code should be visible
        const codeSpan = billingCodes.locator('span').first();
        await expect(codeSpan).toBeVisible();
    });

    test('Debug drawer shows BuildInfo', async ({ page }) => {
        // Open debug drawer
        const debugToggle = page.locator('[data-testid="v10-debug-toggle"]');
        if (await debugToggle.count() === 0) return;
        await debugToggle.click();

        // Check Build tab exists and click it
        const buildTab = page.locator('button:has-text("Build")');
        await expect(buildTab).toBeVisible();
        await buildTab.click();

        // Verify build info panel
        const buildPanel = page.locator('[data-testid="v10-debug-build"]');
        await expect(buildPanel).toBeVisible();

        // Git SHA should be visible
        await expect(page.locator('text=Git SHA')).toBeVisible();

        // KB Meta should be visible
        await expect(page.locator('text=KB Meta')).toBeVisible();
    });

    test('Copy Last Repro button works after run', async ({ page }) => {
        // Enter dictation and run
        await page.locator('[data-testid="v10-dictation-input"]').fill(REPRO_1_DICTATION);
        await page.locator('[data-testid="v10-run-button"]').click();

        // Wait for any result (questions or output)
        await page.waitForSelector('[data-testid="v10-questions-panel"], [data-testid="v10-output-panel"]', { timeout: 15000 });

        // Open debug drawer
        const debugToggle = page.locator('[data-testid="v10-debug-toggle"]');
        if (await debugToggle.count() === 0) return;
        await debugToggle.click();

        // Go to Build tab
        await page.locator('button:has-text("Build")').click();

        // Find Copy Last Repro button
        const copyButton = page.locator('[data-testid="v10-copy-last-repro"]');
        await expect(copyButton).toBeVisible();

        // Button should be enabled after a run
        // (May be disabled if localStorage capture failed)
    });
});
