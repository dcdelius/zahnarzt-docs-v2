/**
 * V10 Questions Contract E2E Tests
 * 
 * Validates the DynamicQuestion contract is enforced in the UI:
 * - type='single' questions have options (no Ja/Nein fallback)
 * - Answers stored as strings (not booleans)
 * - Output never contains raw "true"/"false"
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

async function setE2EHandshake(page: Page): Promise<void> {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
}

async function setupRouteBlocking(page: Page): Promise<void> {
    await page.route('**/firestore.googleapis.com/**', route => route.abort());
    await page.route('**/firebaseio.com/**', route => route.abort());
    await page.route('**/google-analytics.com/**', route => route.abort());
    await page.route('**/analytics.google.com/**', route => route.abort());
    await page.route('**/sentry.io/**', route => route.abort());
}

async function waitForV10Ready(page: Page): Promise<void> {
    await page.waitForSelector('[data-testid="v10-dictation-input"], textarea', {
        timeout: 15000,
        state: 'visible',
    });
}

function getRunButton(page: Page) {
    return page.locator('[data-testid="v10-run-button"], [data-testid="run-button"], button:has-text("Start"), button:has-text("Starten")').first();
}

test.describe('V10 Questions Contract', () => {
    test.beforeEach(async ({ page }) => {
        await setE2EHandshake(page);
        await setupRouteBlocking(page);
        await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
        await waitForV10Ready(page);

        // Verify we're on the correct page (no parallel reality)
        await expect(page.locator('[data-testid="v10-docudent-page"]')).toBeVisible({ timeout: 10000 });
    });

    test('Route reality check - correct page and component', async ({ page }) => {
        // Verify URL
        expect(page.url()).toContain('/docudent/v10');

        // Verify V10 page testid
        await expect(page.locator('[data-testid="v10-docudent-page"]')).toBeVisible();
    });

    test('ueberkappung askback shows 3-way options (not Ja/Nein)', async ({ page }) => {
        // Input dictation that triggers ueberkappung askback
        const dictationInput = page.locator('textarea');
        await dictationInput.fill('Füllung 36 okklusal, profunda');

        // Click run/start button
        await getRunButton(page).click();

        // Wait for questions step
        await expect(page.locator('[data-testid="v10-questions-panel"]')).toBeVisible({ timeout: 15000 });

        // Verify 3-way options are shown (not Ja/Nein fallback)
        const optionJaIndirekt = page.locator('button:has-text("Ja, indirekt")');
        const optionJaDirekt = page.locator('button:has-text("Ja, direkt")');
        const optionNein = page.locator('button:has-text("Nein")');

        await expect(optionJaIndirekt).toBeVisible({ timeout: 5000 });
        await expect(optionJaDirekt).toBeVisible({ timeout: 5000 });
        await expect(optionNein).toBeVisible({ timeout: 5000 });

        // Verify NO error card is shown
        const errorCard = page.locator('[data-testid="error-no-options"]');
        await expect(errorCard).not.toBeVisible();
    });

    test('material askback shows Komposit/GIZ options', async ({ page }) => {
        // Input dictation that triggers material askback
        const dictationInput = page.locator('textarea');
        await dictationInput.fill('Füllung 37 okklusal');

        // Click run/start button
        await getRunButton(page).click();

        // Wait for questions step
        await expect(page.locator('[data-testid="v10-questions-panel"]')).toBeVisible({ timeout: 15000 });

        // Verify material options are shown
        const optionKomposit = page.locator('button:has-text("Komposit")');
        const optionGIZ = page.locator('button:has-text("GIZ"), button:has-text("Glasionomerzement")');

        await expect(optionKomposit).toBeVisible({ timeout: 5000 });
        await expect(optionGIZ).toBeVisible({ timeout: 5000 });
    });

    test('no error cards shown for valid questions', async ({ page }) => {
        // Input a standard dictation
        const dictationInput = page.locator('textarea');
        await dictationInput.fill('Füllung 36 okklusal');

        // Click run/start button
        await getRunButton(page).click();

        // Wait for potential questions step
        await page.waitForTimeout(3000);

        // Verify NO error cards
        const errorCard = page.locator('[data-testid="error-no-options"]');
        const errorCount = await errorCard.count();
        expect(errorCount).toBe(0);
    });

    test('output does not contain raw boolean strings', async ({ page }) => {
        // Input a dictation
        const dictationInput = page.locator('textarea');
        await dictationInput.fill('Füllung 36 okklusal, Komposit');

        // Click run/start button
        await getRunButton(page).click();

        // Wait for output
        await page.waitForTimeout(5000);

        // Get all visible text
        const bodyText = await page.locator('body').innerText();

        // Output should NOT contain raw " true" or " false" (with space to avoid word parts)
        expect(bodyText).not.toMatch(/\s+true\s+/i);
        expect(bodyText).not.toMatch(/\s+false\s+/i);
        expect(bodyText).not.toContain('mit true');
        expect(bodyText).not.toContain('mit false');
    });
});
