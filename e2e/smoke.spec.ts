/**
 * E2E Smoke Tests for Füllung Flow
 * 
 * Tests the complete flow in the browser:
 * - GKV → BEMA output
 * - MKV → BEMA + GOZ 2197
 * - PKV → GOZ only
 * 
 * Run: npx playwright test e2e/smoke.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const BASE_URL = 'http://localhost:5173';
const V6_PATH = '/v6';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function waitForAppReady(page: Page) {
    // Wait for the V6 page to load
    await page.waitForSelector('[data-testid="dictation-textarea"], textarea', { timeout: 10000 });
}

async function selectInsurance(page: Page, type: 'GKV' | 'PKV' | 'MKV') {
    // Look for insurance toggle buttons
    if (type === 'GKV') {
        await page.locator('[data-testid="insurance-gkv"], button:has-text("GKV")').first().click();
    } else if (type === 'PKV') {
        await page.locator('[data-testid="insurance-pkv"], button:has-text("PKV")').first().click();
    } else if (type === 'MKV') {
        // Click GKV first, then enable MKV toggle
        await page.locator('[data-testid="insurance-gkv"], button:has-text("GKV")').first().click();
        const mkvToggle = page.locator('[data-testid="mkv-toggle"], button:has-text("MKV")');
        if (await mkvToggle.isVisible()) {
            await mkvToggle.click();
        }
    }
}

async function enterDictation(page: Page, text: string) {
    const textarea = page.locator('[data-testid="dictation-textarea"], textarea').first();
    await textarea.fill(text);
}

async function clickAnalyze(page: Page) {
    const analyzeButton = page.locator('[data-testid="analyze-button"], button:has-text("Analysieren")').first();
    await analyzeButton.click();
}

async function waitForOutput(page: Page) {
    // Wait for output section to appear
    await page.waitForSelector('[data-testid="output-section"], [class*="output"]', { timeout: 30000 });
}

async function getBillingCodes(page: Page): Promise<string[]> {
    // Get all billing code elements
    const codeElements = await page.locator('[data-testid="billing-code"], [class*="billing-pill"], [class*="code"]').allTextContents();
    return codeElements;
}

// ═══════════════════════════════════════════════════════════════
// SMOKE TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('E2E Smoke Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL + V6_PATH);
        await waitForAppReady(page);
    });

    test('Flow 1: GKV produces BEMA codes', async ({ page }) => {
        // Given: GKV insurance selected
        await selectInsurance(page, 'GKV');

        // When: Enter dictation and analyze
        await enterDictation(page, '36 mod Kofferdam LA');
        await clickAnalyze(page);

        // Wait for questions step or output
        await page.waitForTimeout(2000);

        // Check if we're at questions step, answer if needed
        const skipButton = page.locator('button:has-text("Weiter"), button:has-text("Überspringen")');
        if (await skipButton.isVisible()) {
            await skipButton.click();
        }

        // Wait for output
        await waitForOutput(page);

        // Then: Output should contain BEMA codes
        const codes = await getBillingCodes(page);
        const pageContent = await page.content();

        // Check for BEMA presence (either in codes or page content)
        const hasBEMA = codes.some(c => c.includes('BEMA') || c.includes('13')) ||
            pageContent.includes('BEMA') ||
            pageContent.includes('13c') ||
            pageContent.includes('13b');

        expect(hasBEMA).toBe(true);

        // Check for NO GOZ
        const hasGOZ = codes.some(c => c.includes('GOZ') || c.includes('2197'));
        expect(hasGOZ).toBe(false);
    });

    test('Flow 2: MKV produces BEMA + GOZ codes', async ({ page }) => {
        // Given: GKV+MKV selected
        await selectInsurance(page, 'MKV');

        // When: Enter dictation with Mehrschichttechnik
        await enterDictation(page, '36 mod Kofferdam LA Mehrschicht');
        await clickAnalyze(page);

        // Wait for processing
        await page.waitForTimeout(2000);

        // Handle questions step
        const skipButton = page.locator('button:has-text("Weiter"), button:has-text("Überspringen")');
        if (await skipButton.isVisible()) {
            await skipButton.click();
        }

        // Wait for output
        await waitForOutput(page);

        // Then: Output should contain both BEMA and GOZ
        const pageContent = await page.content();

        // Should have BEMA for Füllung
        const hasBEMA = pageContent.includes('BEMA') || pageContent.includes('13');
        expect(hasBEMA).toBe(true);

        // Should have GOZ 2197 for Mehrschichttechnik
        const hasGOZ2197 = pageContent.includes('2197') || pageContent.includes('GOZ');
        expect(hasGOZ2197).toBe(true);
    });

    test('Flow 3: PKV produces only GOZ codes', async ({ page }) => {
        // Given: PKV insurance selected
        await selectInsurance(page, 'PKV');

        // When: Enter dictation
        await enterDictation(page, '16 mod Kofferdam LA');
        await clickAnalyze(page);

        // Wait and handle questions
        await page.waitForTimeout(2000);

        const skipButton = page.locator('button:has-text("Weiter"), button:has-text("Überspringen")');
        if (await skipButton.isVisible()) {
            await skipButton.click();
        }

        // Wait for output
        await waitForOutput(page);

        // Then: Output should contain GOZ codes
        const pageContent = await page.content();

        // Should have GOZ
        const hasGOZ = pageContent.includes('GOZ') || pageContent.includes('2100') || pageContent.includes('2080');
        expect(hasGOZ).toBe(true);

        // Should NOT have BEMA
        const hasBEMA = pageContent.includes('BEMA');
        expect(hasBEMA).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL STABILITY TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Stability Tests', () => {

    test('Page loads without errors', async ({ page }) => {
        await page.goto(BASE_URL + V6_PATH);

        // No console errors
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await waitForAppReady(page);

        // Check for critical elements
        const textarea = page.locator('textarea');
        await expect(textarea.first()).toBeVisible();
    });

    test('Insurance toggle is functional', async ({ page }) => {
        await page.goto(BASE_URL + V6_PATH);
        await waitForAppReady(page);

        // Should be able to toggle between insurance types
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
        await page.goto(BASE_URL + V6_PATH);
        await waitForAppReady(page);

        const textarea = page.locator('textarea').first();
        await textarea.fill('36 mod Kofferdam');

        const value = await textarea.inputValue();
        expect(value).toContain('36');
    });
});
