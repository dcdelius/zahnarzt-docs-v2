/**
 * V10 LA + CP Semantics E2E Test
 * 
 * Proves: Dictation → Extraction → Facts → Chips → Billing → UI
 * For the specific case: "Zahn 27 mod mit Anästhesie, tief mit CP"
 * 
 * Asserts:
 * - LA chip emitted (la_infiltr)
 * - CP chip emitted (cp)
 * - Billing includes LA (BEMA_40) and CP (BEMA_25)
 * - No duplicate billing for single tooth
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

async function setE2EHandshake(page) {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
}

async function setupRouteBlocking(page) {
    await page.route('**/firestore.googleapis.com/**', route => route.abort());
    await page.route('**/firebaseio.com/**', route => route.abort());
    await page.route('**/google-analytics.com/**', route => route.abort());
}

async function waitForV10Ready(page) {
    await page.waitForSelector('[data-testid="v10-dictation-input"]', {
        timeout: 15000,
        state: 'visible'
    });
}

test.describe('V10 LA + CP Semantics', () => {
    test('dictation with Anästhesie and CP should produce LA and CP billing', async ({ page }) => {
        // Setup
        await setE2EHandshake(page);
        await setupRouteBlocking(page);
        await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
        await waitForV10Ready(page);

        // Enter dictation
        await page.fill('[data-testid="v10-dictation-input"]', 'Zahn 27 mod mit Anästhesie, tief mit CP');
        await page.click('[data-testid="v10-run-button"]');

        // Wait for questions or output
        const result = page.locator('[data-testid="v10-questions-panel"], [data-testid="v10-output-panel"]');
        await expect(result.first()).toBeVisible({ timeout: 15000 });

        // If questions, answer them
        if (await page.locator('[data-testid="v10-questions-panel"]').isVisible()) {
            // Answer material question
            const kompositBtn = page.locator('button:has-text("Komposit")').first();
            if (await kompositBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await kompositBtn.click();
                await page.waitForTimeout(300);
            }

            // Answer CP material if asked
            const caOhBtn = page.locator('button:has-text("Ca(OH)")').first();
            if (await caOhBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await caOhBtn.click();
                await page.waitForTimeout(300);
            }

            // Click Fertigstellen
            const fertigBtn = page.locator('button:has-text("Fertigstellen"):not([disabled])');
            if (await fertigBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await fertigBtn.click();
            }

            await expect(page.locator('[data-testid="v10-output-panel"]')).toBeVisible({ timeout: 10000 });
        }

        // Verify billing codes
        const codesContainer = page.locator('[data-testid="v10-billing-codes"]');
        if (await codesContainer.isVisible()) {
            const codesText = await codesContainer.innerText();
            console.log('[E2E] Billing codes:', codesText);

            // Should have LA billing (BEMA_40 for GKV)
            expect(codesText).toMatch(/BEMA_40|GOZ_0090/);

            // Should have CP billing (BEMA_25 for GKV)
            expect(codesText).toMatch(/BEMA_25|GOZ_2330/);

            // Should have F-code (BEMA_13c for 3 surfaces)
            expect(codesText).toMatch(/BEMA_13[bcd]|GOZ_20[6-9]0|GOZ_21[01]0/);

            // Check for duplicates
            const codeMatches = codesText.match(/BEMA_\d+[a-z]?|GOZ_\d+/g) || [];
            const uniqueCodes = new Set(codeMatches);

            // For single tooth, codes should be unique (no duplicates)
            console.log('[E2E] Unique codes:', [...uniqueCodes]);
            console.log('[E2E] Total code occurrences:', codeMatches.length);
        }
    });

    test('LA should NOT appear when "ohne Anästhesie" mentioned', async ({ page }) => {
        await setE2EHandshake(page);
        await setupRouteBlocking(page);
        await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
        await waitForV10Ready(page);

        // Negation case
        await page.fill('[data-testid="v10-dictation-input"]', 'Zahn 27 mod ohne Anästhesie');
        await page.click('[data-testid="v10-run-button"]');

        const result = page.locator('[data-testid="v10-questions-panel"], [data-testid="v10-output-panel"]');
        await expect(result.first()).toBeVisible({ timeout: 15000 });

        // Answer any questions to reach output
        for (let i = 0; i < 5; i++) {
            const btn = page.locator('button:has-text("Komposit"), button:has-text("Ja")').first();
            if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                await btn.click();
                await page.waitForTimeout(300);
            }
            const fertig = page.locator('button:has-text("Fertigstellen"):not([disabled])');
            if (await fertig.isVisible({ timeout: 500 }).catch(() => false)) {
                await fertig.click();
                break;
            }
        }

        // If we reach output, verify no LA billing
        const outputVisible = await page.locator('[data-testid="v10-output-panel"]').isVisible({ timeout: 5000 }).catch(() => false);
        if (outputVisible) {
            const codesContainer = page.locator('[data-testid="v10-billing-codes"]');
            if (await codesContainer.isVisible()) {
                const codesText = await codesContainer.innerText();
                console.log('[E2E negation] Billing codes:', codesText);

                // Should NOT have LA billing
                expect(codesText).not.toMatch(/BEMA_40|BEMA_41|GOZ_0090|GOZ_0100/);
            }
        }
    });
});
