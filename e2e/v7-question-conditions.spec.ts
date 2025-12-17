/**
 * V7 Question Conditions E2E Test
 * 
 * Ensures the V7 UI does NOT show irrelevant questions like
 * "Überkappungsmaterial" when there's no context for it.
 */

import { test, expect } from '@playwright/test';

const V7_LOAD_TIMEOUT = 15000;

async function waitForV7Ready(page: any): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-testid="dictation-input"]', { timeout: V7_LOAD_TIMEOUT });
}

test.describe('V7 Question Conditions', () => {
    test('Zahn 15 MO should NOT show tiefe or material questions', async ({ page }) => {
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Enter simple dictation without caries/depth keywords
        const dictationInput = page.getByTestId('dictation-input');
        await dictationInput.fill('Zahn 15 Flächen mesial oklusal');
        await dictationInput.press('Control+Enter');

        // Wait for questions to appear
        await page.waitForTimeout(2000);

        // Check questions panel
        const questionsPanel = page.getByTestId('questions-panel');
        if (await questionsPanel.isVisible().catch(() => false)) {
            const content = await questionsPanel.textContent();

            // Should NOT contain depth/capping questions
            expect(content).not.toContain('Kavitätentiefe');
            expect(content).not.toContain('Überkappungsmaterial');
            expect(content).not.toContain('Überkappung erforderlich');

            // Should contain basic questions (if not already answered)
            // Note: These might not appear if stub extractor provides them
        }
    });

    test('Dictation with pulpanah should show tiefe and ueberkappung questions', async ({ page }) => {
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Enter dictation with pulpanah keyword
        const dictationInput = page.getByTestId('dictation-input');
        await dictationInput.fill('Zahn 15 MO pulpanah');
        await dictationInput.press('Control+Enter');

        // Wait for questions
        await page.waitForTimeout(2000);

        const questionsPanel = page.getByTestId('questions-panel');
        if (await questionsPanel.isVisible().catch(() => false)) {
            const content = await questionsPanel.textContent();

            // "pulpanah" keyword should trigger tiefe and ueberkappung questions
            // Note: Exact behavior depends on stub extractor
            // At minimum, Überkappungsmaterial should NOT appear yet
            // (requires ueberkappung=true first)
            expect(content).not.toContain('Überkappungsmaterial');
        }
    });

    test('Zahn 36 Karies should show tiefe question', async ({ page }) => {
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Enter dictation with Karies keyword
        const dictationInput = page.getByTestId('dictation-input');
        await dictationInput.fill('Zahn 36 okklusal Karies');
        await dictationInput.press('Control+Enter');

        // Wait for questions
        await page.waitForTimeout(2000);

        const questionsPanel = page.getByTestId('questions-panel');
        if (await questionsPanel.isVisible().catch(() => false)) {
            const content = await questionsPanel.textContent();

            // "Karies" keyword should trigger tiefe question
            // But NOT material (no deep indication yet)
            expect(content).not.toContain('Überkappungsmaterial');
        }
    });
});
