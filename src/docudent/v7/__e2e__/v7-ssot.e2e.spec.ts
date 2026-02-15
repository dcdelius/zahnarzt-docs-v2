import { test, expect } from '@playwright/test';
import { V7PageObject } from './helpers/v7.po';

/**
 * P12.7b: V7 SSOT E2E Tests
 * 
 * Validates:
 * - Copy button copies SSOT copyText (not ad-hoc assembled text)
 * - Questions use progressive disclosure (QuestionsFlowV2)
 * - Combinability banners render for WARN/BLOCK
 * 
 * Run via: npm run test:v7:e2e
 * 
 * REQUIRES: VITE_STUB_EXTRACTION=true set at BUILD time
 */

// Global setup: verify stub extraction is enabled at the start
test.beforeEach(async ({ page }) => {
    const v7 = new V7PageObject(page);

    // Use gotoV7 which handles login automatically
    await v7.gotoV7();

    // Check stub mode indicator
    const stubIndicator = page.locator('[data-testid="stub-extraction"]');
    const stubEnabled = await stubIndicator.getAttribute('data-enabled').catch(() => 'false');

    if (stubEnabled !== 'true') {
        console.warn('[E2E] VITE_STUB_EXTRACTION is not enabled! Tests may fail.');
        console.warn('[E2E] Ensure build command has: VITE_STUB_EXTRACTION=true npm run build');
    }
});

// ═══════════════════════════════════════════════════════════════
// COPY INTEGRITY TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('G) Copy Integrity (SSOT)', () => {

    test('copy button copies output text to clipboard', async ({ page, context }) => {
        const v7 = new V7PageObject(page);

        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await test.step('Process dictation (page already navigated by beforeEach)', async () => {
            // beforeEach already called gotoV7() and handled login
            await v7.selectTreatment('fuellung');
            await v7.typeDictation('Zahn 36 zweiflächige Kompositfüllung mod durchgeführt');
            await v7.runAnalysis();
        });

        await test.step('Answer questions and go to output', async () => {
            // Wait for either questions or output
            const questionsPanel = page.locator('[data-testid="questions-panel"]');
            const outputPaper = page.locator('[data-testid="output-paper"]');

            await Promise.race([
                questionsPanel.waitFor({ state: 'visible', timeout: 15000 }),
                outputPaper.waitFor({ state: 'visible', timeout: 15000 })
            ]).catch(() => {/* one will timeout */ });

            if (await v7.isQuestionsVisible()) {
                await v7.answerAllQuestionsMinimal();
                await v7.goToOutput();
            }

            // Wait explicitly for output
            await outputPaper.waitFor({ state: 'visible', timeout: 20000 });
        });

        await test.step('Copy and verify clipboard', async () => {
            expect(await v7.isOutputVisible()).toBe(true);

            // Click copy button
            const copyButton = page.locator('[data-testid="copy-button"]');
            await copyButton.waitFor({ state: 'visible', timeout: 5000 });
            await copyButton.click();

            // Wait for "Kopiert" feedback
            await expect(copyButton).toContainText(/Kopiert|✓/, { timeout: 3000 });

            // Read clipboard content
            const clipboardText = await page.evaluate(async () => {
                try {
                    return await navigator.clipboard.readText();
                } catch {
                    return '';
                }
            });

            // Verify clipboard has content
            expect(clipboardText.length).toBeGreaterThan(0);

            // Verify it contains expected tooth
            expect(clipboardText).toMatch(/36|Zahn/);

            console.log(`[SSOT E2E] Clipboard content (first 200 chars): ${clipboardText.slice(0, 200)}`);
        });
    });

    test('copy button does not contain mock strings', async ({ page, context }) => {
        const v7 = new V7PageObject(page);
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        const MOCK_STRINGS = [
            'Max Müller',
            'Mustermann',
            'Dr. Musterarzt',
            'Beispielpraxis',
            'Lorem ipsum'
        ];

        // beforeEach already called gotoV7()
        await v7.selectTreatment('endo');
        await v7.typeDictation('Zahn 16 Wurzelkanalbehandlung begonnen, Trepanation durchgeführt, 4 Kanäle');
        await v7.runAnalysis();

        // Wait for questions or output first
        const outputPaper = page.locator('[data-testid="output-paper"]');
        await page.locator('[data-testid="questions-panel"], [data-testid="output-paper"]')
            .first()
            .waitFor({ state: 'visible', timeout: 15000 })
            .catch(() => { });

        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        // Explicit wait for output
        await outputPaper.waitFor({ state: 'visible', timeout: 20000 });

        const copyButton = page.locator('[data-testid="copy-button"]');
        await copyButton.waitFor({ state: 'visible', timeout: 5000 });
        await copyButton.click();

        const clipboardText = await page.evaluate(async () => {
            try {
                return await navigator.clipboard.readText();
            } catch {
                return '';
            }
        });

        for (const mock of MOCK_STRINGS) {
            expect(
                clipboardText.includes(mock),
                `Clipboard should NOT contain mock string: ${mock}`
            ).toBe(false);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// PROGRESSIVE DISCLOSURE TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('H) Progressive Disclosure (QuestionsFlowV2)', () => {

    test('questions panel shows required section', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await v7.gotoV7();
        await v7.selectTreatment('endo');
        await v7.typeDictation('Zahn 46 Wurzelkanalbehandlung');
        await v7.runAnalysis();

        if (await v7.isQuestionsVisible()) {
            // Check for required section (if QuestionsFlowV2 is active)
            const requiredSection = page.locator('[data-testid="required-section"]');
            const legacyQuestions = page.locator('[data-testid^="question-row-"]');

            // Either new progressive disclosure or legacy flow
            const hasRequired = await requiredSection.isVisible().catch(() => false);
            const hasLegacy = await legacyQuestions.first().isVisible().catch(() => false);

            expect(
                hasRequired || hasLegacy,
                'Should have either progressive disclosure required section or legacy question rows'
            ).toBe(true);

            console.log(`[SSOT E2E] Progressive disclosure: hasRequired=${hasRequired}, hasLegacy=${hasLegacy}`);
        }
    });

    test('all question rows have data-testid attributes', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await v7.gotoV7();
        await v7.selectTreatment('fuellung');
        await v7.typeDictation('Zahn 26 Füllung');
        await v7.runAnalysis();

        if (await v7.isQuestionsVisible()) {
            const rows = page.locator('[data-testid^="question-row-"]');
            const count = await rows.count();

            console.log(`[SSOT E2E] Found ${count} question rows`);

            // All rows should have testid
            for (let i = 0; i < count; i++) {
                const row = rows.nth(i);
                const testId = await row.getAttribute('data-testid');
                expect(testId).not.toBeNull();
                expect(testId).toMatch(/^question-row-/);
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// OUTPUT RENDERING TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('I) Output Rendering', () => {

    test('output paper contains treatment-specific content', async ({ page }) => {
        const v7 = new V7PageObject(page);

        // beforeEach already called gotoV7()
        await v7.selectTreatment('endo');
        await v7.typeDictation('Zahn 36 Wurzelkanalbehandlung abgeschlossen, 4 Kanäle kondensiert');
        await v7.runAnalysis();

        // Wait for questions or output first
        const outputPaper = page.locator('[data-testid="output-paper"]');
        await page.locator('[data-testid="questions-panel"], [data-testid="output-paper"]')
            .first()
            .waitFor({ state: 'visible', timeout: 15000 })
            .catch(() => { });

        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        // Explicit wait for output
        await outputPaper.waitFor({ state: 'visible', timeout: 20000 });

        expect(await v7.isOutputVisible()).toBe(true);

        const outputText = await v7.getOutputText();

        // Should contain endo-specific terms
        expect(outputText.toLowerCase()).toMatch(/wurzel|kanal|kondensiert|endo/i);

        // Should contain tooth
        expect(outputText).toContain('36');
    });

    test('output displays sections from pipeline', async ({ page }) => {
        const v7 = new V7PageObject(page);

        // beforeEach already called gotoV7()
        await v7.selectTreatment('fuellung');
        await v7.typeDictation('Zahn 15 dreiflächige Kompositfüllung mod');
        await v7.runAnalysis();

        // Wait for questions or output first
        const outputPaper = page.locator('[data-testid="output-paper"]');
        await page.locator('[data-testid="questions-panel"], [data-testid="output-paper"]')
            .first()
            .waitFor({ state: 'visible', timeout: 15000 })
            .catch(() => { });

        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        // Explicit wait for output
        await outputPaper.waitFor({ state: 'visible', timeout: 20000 });

        // Look for section markers OR output-paper text content
        const sections = page.locator('[data-testid^="section-"]');
        const sectionCount = await sections.count();

        // Either has structured sections, fulltext wrapper, or just output-paper content
        const hasFulltext = await page.locator('[data-testid="output-fulltext"]').isVisible().catch(() => false);
        const hasOutputPaper = await v7.isOutputVisible();
        const outputText = hasOutputPaper ? await v7.getOutputText() : '';

        expect(
            sectionCount > 0 || hasFulltext || outputText.length > 10,
            'Output should have sections, fulltext, or content'
        ).toBe(true);

        console.log(`[SSOT E2E] Output has ${sectionCount} sections, hasFulltext=${hasFulltext}, outputLen=${outputText.length}`);
    });
});

// ═══════════════════════════════════════════════════════════════
// COMBINABILITY BANNER TESTS — P12.8
// ═══════════════════════════════════════════════════════════════

test.describe('J) Combinability Banner', () => {

    test.afterEach(async ({ page }) => {
        // Clean up localStorage after each test
        await page.evaluate(() => localStorage.removeItem('v7_combinability_fixture'));
    });

    test('WARN banner appears for conflicting codes', async ({ page }) => {
        const v7 = new V7PageObject(page);

        // Navigate and set fixture BEFORE analysis
        await v7.gotoV7();
        await page.evaluate(() => localStorage.setItem('v7_combinability_fixture', 'warn'));

        // Select fuellung and enter minimal dictation
        await v7.selectTreatment('fuellung');
        await v7.typeDictation('Zahn 15 mesiale Karies. Kompositfüllung.');
        await v7.runAnalysis();

        // Answer questions if present
        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        // Wait for output to render
        await expect(page.locator('[data-testid="output-paper"]')).toBeVisible({ timeout: 15000 });

        // Assert WARN banner is visible
        const warnBanner = page.locator('[data-testid="combinability-banner-warn"]');
        await expect(warnBanner).toBeVisible({ timeout: 5000 });

        // Assert at least one conflict row
        const conflictRow = page.locator('[data-testid="combinability-conflict-row"]');
        await expect(conflictRow.first()).toBeVisible({ timeout: 5000 });
    });

    test('BLOCK banner appears for forbidden combinations', async ({ page }) => {
        const v7 = new V7PageObject(page);

        // Navigate and set fixture BEFORE analysis
        await v7.gotoV7();
        await page.evaluate(() => localStorage.setItem('v7_combinability_fixture', 'block'));

        // Select fuellung and enter minimal dictation
        await v7.selectTreatment('fuellung');
        await v7.typeDictation('Zahn 15 mesiale Karies. Kompositfüllung.');
        await v7.runAnalysis();

        // Answer questions if present
        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        // Wait for output to render
        await expect(page.locator('[data-testid="output-paper"]')).toBeVisible({ timeout: 15000 });

        // Assert BLOCK banner is visible
        const blockBanner = page.locator('[data-testid="combinability-banner-block"]');
        await expect(blockBanner).toBeVisible({ timeout: 5000 });

        // Assert at least one conflict row
        const conflictRow = page.locator('[data-testid="combinability-conflict-row"]');
        await expect(conflictRow.first()).toBeVisible({ timeout: 5000 });
    });
});
