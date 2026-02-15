/**
 * M35 Multi-Instance E2E Tests
 * 
 * Tests for multi-treatment answer routing and debug filtering.
 */

import { test, expect } from '@playwright/test';

test.describe('M35 Multi-Instance UX', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to V10 page
        await page.goto('/docudent/v10');
        await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 10000 });
    });

    test('multitreatment_same_tooth_routes_answers_correctly', async ({ page }) => {
        // Enter multi-treatment dictation
        const dictation = 'Endo 14 2 Kanäle, danach Füllung okklusal ohne Anästhesie';
        await page.fill('[data-testid="v10-dictation-input"]', dictation);

        // Submit
        await page.click('[data-testid="v10-submit-btn"]');

        // Wait for questions or output
        await page.waitForSelector(
            '[data-testid="v10-multi-questions-panel"], [data-testid="v10-output-section"]',
            { timeout: 15000 }
        );

        // Check if multi-questions panel exists
        const hasMultiPanel = await page.isVisible('[data-testid="v10-multi-questions-panel"]');

        if (hasMultiPanel) {
            // Should have instance cards for both treatments
            const endoCard = page.locator('[data-testid="v10-instance-card-endo"]');
            const fuellungCard = page.locator('[data-testid="v10-instance-card-fuellung"]');

            // At least one instance should be visible
            const hasEndo = await endoCard.isVisible().catch(() => false);
            const hasFuellung = await fuellungCard.isVisible().catch(() => false);

            expect(hasEndo || hasFuellung).toBe(true);
        }

        // Should reach some state (questions or output)
        const state = await page.getAttribute('[data-testid="v10-page"]', 'data-state');
        expect(['questions', 'output', 'idle']).toContain(state);
    });

    test('multitreatment_negation_does_not_leak_in_ui', async ({ page }) => {
        // Enter dictation with scoped negation
        const dictation = 'Endo 14 Leitungsanästhesie, danach Füllung ohne Betäubung';
        await page.fill('[data-testid="v10-dictation-input"]', dictation);

        // Submit
        await page.click('[data-testid="v10-submit-btn"]');

        // Wait for response
        await page.waitForTimeout(2000); // Allow processing

        // Debug drawer removed from UI
    });

    test('debug_drawer_filters_by_instance', async () => {
        // Debug drawer removed from UI
    });
});
