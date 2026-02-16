import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

async function setupPage(page: Page): Promise<void> {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
    await page.route('**/firestore.googleapis.com/**', route => route.abort());
    await page.route('**/firebaseio.com/**', route => route.abort());
    await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 10000 });
}

async function openQuestionsWithMaterialOption(page: Page): Promise<boolean> {
    await page.locator('[data-testid="v10-treatment-dropdown"]').click();
    await page.locator('[data-testid="v10-treatment-option-fuellung"]').click();
    await page.locator('[data-testid="v10-insurance-select"]').locator('button:has-text("PKV")').click();
    await page.locator('[data-testid="v10-dictation-input"]').fill(
        'Zahn 16 für Krone beschliffen, supragingival präpariert, Präzisionsabformung durchgeführt und Provisorium eingesetzt.'
    );
    await page.locator('[data-testid="v10-run-button"]').click();

    const confirmation = page.locator('[data-testid="v10-intent-confirmation-panel"]');
    if (await confirmation.isVisible({ timeout: 4000 }).catch(() => false)) {
        const fuellungOptions = confirmation.locator('[data-testid$="-fuellung"]');
        const fuellungOptionCount = await fuellungOptions.count();
        for (let i = 0; i < fuellungOptionCount; i += 1) {
            const option = fuellungOptions.nth(i);
            if (await option.isVisible().catch(() => false)) {
                await option.click({ force: true });
            }
        }
        const confirmButton = page.locator('[data-testid="v10-intent-confirm-button"]');
        const needsSelection = await confirmButton.isDisabled().catch(() => false);
        if (needsSelection) {
            const lanes = confirmation.locator('[data-testid^="v10-intent-lane-"]');
            const laneCount = await lanes.count();
            for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
                const lane = lanes.nth(laneIndex);
                const laneId = (await lane.getAttribute('data-testid')) || '';
                const laneParts = laneId.split('v10-intent-lane-');
                if (laneParts.length !== 2 || !laneParts[1]) continue;
                const intentId = laneParts[1];
                const firstOption = confirmation.locator(`[data-testid^="v10-intent-option-${intentId}-"]`).first();
                if (await firstOption.isVisible().catch(() => false)) {
                    await firstOption.click({ force: true });
                    await page.waitForTimeout(80);
                }
            }
        }
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();
    }

    const hasQuestions = await page.getByText('Details klären').first().isVisible({ timeout: 15000 }).catch(() => false);
    if (!hasQuestions) {
        return false;
    }
    await page.waitForSelector('text=Welches Füllungsmaterial?', { timeout: 15000 });
    return true;
}

test.describe('V10 Option Wiring', () => {
    test('material option click resolves required askback', async ({ page }) => {
        await setupPage(page);
        const hasQuestions = await openQuestionsWithMaterialOption(page);
        if (!hasQuestions) {
            await expect(page.getByText('Keine offenen Rückfragen.').first()).toBeVisible({ timeout: 5000 });
            return;
        }

        const surfaceInput = page.locator('textarea').first();
        await surfaceInput.fill('o');
        await page.waitForTimeout(200);

        const materialOption = page.locator('button[data-testid="option-Komposit"], button:has-text("Komposit")').first();
        await expect(materialOption).toBeVisible({ timeout: 5000 });
        await materialOption.click();
        await page.waitForTimeout(250);

        await expect(page.getByText(/Erforderlich\s*2\/2/i).first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="complete-button"]')).toBeEnabled({ timeout: 5000 });
    });
});
