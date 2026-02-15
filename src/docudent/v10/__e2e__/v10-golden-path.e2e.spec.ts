/**
 * V10 Golden Path E2E Test
 * 
 * Tests the exact repro scenario from the GIGAPROMPT:
 * - treatment: Füllung
 * - insurance: MKV
 * - dictation: "Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie, 120 Euro"
 * 
 * Expected behavior:
 * - Either questions (medical_ueberkappung) OR
 * - Output with tooth=26, surfaces=[m,o,d], billing codes
 * - NEVER "Keine abrechnungsrelevanten Positionen" for valid case
 */

import { test, expect } from '@playwright/test';

test.describe('V10 Golden Path - Deep Filling Repro', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/docudent/v10');
        // Wait for page to fully load
        await page.waitForSelector('[data-testid="v10-dictation-area"], .v7-jeton-dock', { timeout: 10000 });
    });

    test('repro dictation shows questions OR output with tooth', async ({ page }) => {
        // Enter the repro dictation
        const dictationInput = page.locator('textarea, [contenteditable="true"]').first();
        await dictationInput.fill('Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie, 120 Euro');

        // Click Run button
        const runButton = page.locator('[data-testid="v10-run-button"], button:has-text("Verarbeiten"), button:has-text("Run")').first();
        await runButton.click();

        // Wait for processing to complete (max 10 seconds)
        await page.waitForTimeout(1000); // Initial processing time
        await page.waitForSelector('[data-testid="v10-questions-panel"], [data-testid="v10-output-panel"], [data-testid="v10-questions-fallback"]', { timeout: 15000 });

        // Check what we got
        const hasQuestionsPanel = await page.locator('[data-testid="v10-questions-panel"]').isVisible().catch(() => false);
        const hasOutputPanel = await page.locator('[data-testid="v10-output-panel"]').isVisible().catch(() => false);
        const hasFallback = await page.locator('[data-testid="v10-questions-fallback"]').isVisible().catch(() => false);

        console.log('[E2E] Result: questions=' + hasQuestionsPanel + ', output=' + hasOutputPanel + ', fallback=' + hasFallback);

        // At minimum, we should see SOMETHING (not the idle state)
        expect(hasQuestionsPanel || hasOutputPanel || hasFallback).toBe(true);

        // MUST NOT show "Keine abrechnungsrelevanten Positionen" for this valid case
        const noPositionsText = await page.locator('text=Keine abrechnungsrelevanten Positionen').isVisible().catch(() => false);
        expect(noPositionsText).toBe(false);

        // If output panel, verify tooth appears
        if (hasOutputPanel) {
            const outputText = await page.locator('[data-testid="v10-output-panel"]').textContent();
            expect(outputText).toContain('26'); // Tooth number must appear
        }
    });

    test('"Bearbeiten" button is clickable when output shown', async ({ page }) => {
        // First get to output state (use simpler dictation that goes straight to output)
        const dictationInput = page.locator('textarea, [contenteditable="true"]').first();
        await dictationInput.fill('Zahn 36 mo Komposit');

        const runButton = page.locator('[data-testid="v10-run-button"], button:has-text("Verarbeiten"), button:has-text("Run")').first();
        await runButton.click();

        await page.waitForTimeout(1000);

        // Wait for either questions or output
        await page.waitForSelector('[data-testid="v10-questions-panel"], [data-testid="v10-output-panel"]', { timeout: 15000 });

        // If questions, answer them first
        const hasQuestions = await page.locator('[data-testid="v10-questions-panel"]').isVisible().catch(() => false);
        if (hasQuestions) {
            // Click first option and continue
            await page.locator('[data-testid="v10-submit-answers"], button:has-text("Weiter")').first().click();
            await page.waitForSelector('[data-testid="v10-output-panel"]', { timeout: 15000 });
        }

        // Now check Bearbeiten button
        const editButton = page.locator('[data-testid="edit-button"], button:has-text("Bearbeiten")').first();

        // Button should exist and be clickable
        await expect(editButton).toBeEnabled();

        // Click it and verify it navigates (doesn't throw)
        await editButton.click();

        // Should show questions panel after clicking Bearbeiten
        await page.waitForSelector('[data-testid="v10-questions-panel"], [data-testid="v10-questions-fallback"]', { timeout: 5000 });
    });

    test('insurance toggle changes payload', async ({ page }) => {
        // Open DevTools console to capture logs
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            if (msg.text().includes('[V10_UI]')) {
                consoleLogs.push(msg.text());
            }
        });

        // Select PKV
        const pkvButton = page.locator('button:has-text("PKV")').first();
        await pkvButton.click();

        // Enter dictation
        const dictationInput = page.locator('textarea, [contenteditable="true"]').first();
        await dictationInput.fill('Zahn 16 mo Komposit');

        // Run
        const runButton = page.locator('[data-testid="v10-run-button"], button:has-text("Verarbeiten"), button:has-text("Run")').first();
        await runButton.click();

        await page.waitForTimeout(2000);

        // Check console log contains PKV
        const payloadLog = consoleLogs.find(log => log.includes('payload='));
        expect(payloadLog).toBeTruthy();
        expect(payloadLog).toContain('PKV');
    });
});
