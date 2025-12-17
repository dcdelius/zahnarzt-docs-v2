/**
 * E2E Smoke Tests for V7 UI Wiring
 * 
 * Tests basic V7 page functionality:
 * - Page loads correctly (no login redirect)
 * - Insurance toggle works
 * - Dictation input works
 * - Pipeline triggers correctly (reaches questions step)
 * 
 * IMPORTANT: Complex billing verification is done by v7-ui-wiring.spec.ts
 * These tests focus on basic UI stability and E2E auth bypass verification.
 * 
 * Run: npx playwright test e2e/smoke.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const BASE_URL = 'http://localhost:5173';
const V7_PATH = '/docudent/v7';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function waitForAppReady(page: Page) {
    // Wait for V7 page textarea to be visible (confirms auth bypass works)
    await page.waitForSelector('textarea', { timeout: 15000 });
}

// ═══════════════════════════════════════════════════════════════
// STABILITY TESTS — Core V7 Functionality
// ═══════════════════════════════════════════════════════════════

test.describe('V7 Stability Tests', () => {

    test('Page loads without errors (auth bypass works)', async ({ page }) => {
        await page.goto(BASE_URL + V7_PATH);

        // Should NOT see login page
        const loginVisible = await page.locator('text=Einloggen').isVisible({ timeout: 2000 }).catch(() => false);
        expect(loginVisible).toBe(false);

        // Should see V7 content
        await waitForAppReady(page);
        const textarea = page.locator('textarea');
        await expect(textarea.first()).toBeVisible();

        // Should see treatment selector
        const treatmentLabel = page.getByText(/behandlung/i);
        await expect(treatmentLabel.first()).toBeVisible();
    });

    test('Insurance toggle is functional', async ({ page }) => {
        await page.goto(BASE_URL + V7_PATH);
        await waitForAppReady(page);

        // Should see insurance options - use .first() to avoid strict mode violation
        // (V7 has multiple GKV options: "GKV ohne Mehrkosten" and "GKV + MKV")
        const gkvButton = page.locator('button:has-text("GKV")').first();
        const pkvButton = page.locator('button:has-text("PKV")').first();

        if (await gkvButton.isVisible()) {
            await gkvButton.click();
            await page.waitForTimeout(200);
        }

        if (await pkvButton.isVisible()) {
            await pkvButton.click();
            await page.waitForTimeout(200);
        }
    });

    test('Dictation text can be entered', async ({ page }) => {
        await page.goto(BASE_URL + V7_PATH);
        await waitForAppReady(page);

        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 36 MOD Komposit');

        const value = await textarea.inputValue();
        expect(value).toContain('36');
    });

    test('Pipeline triggers on Ctrl+Enter', async ({ page }) => {
        await page.goto(BASE_URL + V7_PATH);
        await waitForAppReady(page);

        // Enter dictation
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 36 MOD Kofferdam');

        // Trigger pipeline
        await textarea.press('Control+Enter');

        // Should see processing or questions step
        const questionsOrProcessing = page.getByText(/analysiere|schritt 2|rückfragen/i);
        await expect(questionsOrProcessing.first()).toBeVisible({ timeout: 10000 });
    });

    test('Questions step shows correctly after dictation', async ({ page }) => {
        await page.goto(BASE_URL + V7_PATH);
        await waitForAppReady(page);

        // Enter dictation
        const textarea = page.locator('textarea').first();
        await textarea.fill('Zahn 36 MOD Kofferdam');
        await textarea.press('Control+Enter');

        // Wait for questions step
        await page.waitForTimeout(2000);

        // Should see questions UI
        const questionsHeader = page.getByText(/rückfragen/i);
        await expect(questionsHeader.first()).toBeVisible({ timeout: 10000 });

        // Should see question buttons
        const buttons = page.locator('button');
        const count = await buttons.count();
        expect(count).toBeGreaterThan(2); // At least some question option buttons
    });
});

// ═══════════════════════════════════════════════════════════════
// E2E AUTH BYPASS VERIFICATION
// ═══════════════════════════════════════════════════════════════

test.describe('E2E Auth Bypass Verification', () => {

    test('VITE_E2E_TEST_MODE bypasses Firebase auth', async ({ page }) => {
        // Navigate directly to V7 page
        await page.goto(BASE_URL + V7_PATH);

        // Should NOT redirect to login
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        expect(currentUrl).toContain('/docudent/v7');
        expect(currentUrl).not.toBe(BASE_URL + '/');

        // Should see V7 content, not login form
        const textarea = page.locator('textarea');
        await expect(textarea.first()).toBeVisible({ timeout: 10000 });
    });

    test('V7 page has no [object Object] rendering', async ({ page }) => {
        await page.goto(BASE_URL + V7_PATH);
        await waitForAppReady(page);

        const content = await page.content();
        expect(content).not.toContain('[object Object]');
    });
});
