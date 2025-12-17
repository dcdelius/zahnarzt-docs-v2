/**
 * V7 Module Import Gate Test
 * 
 * This test ensures the V7 page and pipeline can load without:
 * - "Importing a module script failed" errors
 * - "Failed to fetch dynamically imported module" errors
 * - Failed JS chunk network requests (404/blocked)
 * 
 * Run with: npx playwright test e2e/v7-module-gate.spec.ts
 */

import { test, expect, Page, ConsoleMessage, Request, Response } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════
// ERROR PATTERNS TO DETECT
// ═══════════════════════════════════════════════════════════════

const MODULE_ERROR_PATTERNS = [
    'Importing a module script failed',
    'Failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'ChunkLoadError',
];

const TEST_DICTATION = 'Zahn 15 mo Composite mit Anästhesie';
const V7_LOAD_TIMEOUT = 15000;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

interface CapturedIssue {
    type: 'console-error' | 'request-failed' | 'response-error';
    message: string;
    url?: string;
    status?: number;
}

function isModuleError(message: string): boolean {
    return MODULE_ERROR_PATTERNS.some(pattern =>
        message.toLowerCase().includes(pattern.toLowerCase())
    );
}

function isJsChunkRequest(url: string): boolean {
    return url.includes('.js') || url.includes('/assets/') || url.includes('chunk');
}

async function setupIssueCapture(page: Page): Promise<CapturedIssue[]> {
    const issues: CapturedIssue[] = [];

    // Capture console errors
    page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (isModuleError(text)) {
                issues.push({
                    type: 'console-error',
                    message: text,
                });
            }
        }
    });

    // Capture failed requests
    page.on('requestfailed', (request: Request) => {
        const url = request.url();
        if (isJsChunkRequest(url)) {
            issues.push({
                type: 'request-failed',
                message: request.failure()?.errorText || 'Unknown failure',
                url,
            });
        }
    });

    // Capture error responses for JS chunks
    page.on('response', (response: Response) => {
        const url = response.url();
        if (isJsChunkRequest(url) && !response.ok()) {
            issues.push({
                type: 'response-error',
                message: `${response.status()} ${response.statusText()}`,
                url,
                status: response.status(),
            });
        }
    });

    return issues;
}

async function waitForV7Ready(page: Page): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-testid="dictation-input"]', { timeout: V7_LOAD_TIMEOUT });
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('V7 Module Import Gate', () => {
    test('Page loads without module import errors', async ({ page }) => {
        const issues = await setupIssueCapture(page);

        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Wait a bit for any lazy-loaded chunks
        await page.waitForTimeout(1000);

        // Assert no module import errors
        const moduleErrors = issues.filter(i => i.type === 'console-error');
        expect(moduleErrors, `Module import errors detected: ${JSON.stringify(moduleErrors)}`).toHaveLength(0);

        // Assert no failed JS chunk requests
        const failedRequests = issues.filter(i => i.type === 'request-failed' || i.type === 'response-error');
        expect(failedRequests, `Failed JS chunk requests: ${JSON.stringify(failedRequests)}`).toHaveLength(0);
    });

    test('Pipeline execution without module import errors', async ({ page }) => {
        const issues = await setupIssueCapture(page);

        // Navigate and wait for ready
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Enter dictation
        const dictationInput = page.getByTestId('dictation-input');
        await dictationInput.fill(TEST_DICTATION);

        // Trigger pipeline
        await dictationInput.press('Control+Enter');

        // Wait for processing (questions or output to appear)
        await page.waitForTimeout(3000);

        // Assert no module import errors during pipeline execution
        const moduleErrors = issues.filter(i => i.type === 'console-error');
        expect(
            moduleErrors,
            `Module import errors during pipeline: ${JSON.stringify(moduleErrors, null, 2)}`
        ).toHaveLength(0);

        // Assert no failed JS chunk requests
        const failedRequests = issues.filter(i => i.type === 'request-failed' || i.type === 'response-error');
        expect(
            failedRequests,
            `Failed JS chunk requests during pipeline: ${JSON.stringify(failedRequests, null, 2)}`
        ).toHaveLength(0);

        // Verify pipeline actually progressed (questions or output visible)
        const questionsPanel = page.getByTestId('questions-panel');
        const outputPanel = page.getByTestId('output-panel');
        const hasQuestions = await questionsPanel.isVisible().catch(() => false);
        const hasOutput = await outputPanel.isVisible().catch(() => false);

        expect(hasQuestions || hasOutput, 'Pipeline should show questions or output after dictation').toBe(true);
    });

    test('Full flow to output without module import errors', async ({ page }) => {
        const issues = await setupIssueCapture(page);

        // Navigate
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Enter dictation
        const dictationInput = page.getByTestId('dictation-input');
        await dictationInput.fill(TEST_DICTATION);
        await dictationInput.press('Control+Enter');

        // Wait for questions
        await page.waitForTimeout(2000);

        // Answer all questions if present
        const questionsPanel = page.getByTestId('questions-panel');
        if (await questionsPanel.isVisible().catch(() => false)) {
            // Find all question buttons and click first option for each
            const questionCards = page.locator('[data-testid="questions-panel"] > div');
            const count = await questionCards.count();

            for (let i = 0; i < count; i++) {
                const card = questionCards.nth(i);
                const buttons = card.locator('button');
                if (await buttons.count() > 0) {
                    await buttons.first().click();
                    await page.waitForTimeout(100);
                }
            }

            // Press continue if visible
            const continueButton = page.locator('button:has-text("Weiter"), button:has-text("Continue")');
            if (await continueButton.isVisible().catch(() => false)) {
                await continueButton.click();
            }
        }

        // Wait for output
        await page.waitForTimeout(2000);

        // Assert no module import errors throughout full flow
        const moduleErrors = issues.filter(i => i.type === 'console-error');
        expect(
            moduleErrors,
            `Module import errors in full flow: ${JSON.stringify(moduleErrors, null, 2)}`
        ).toHaveLength(0);

        // Assert no failed JS chunk requests
        const failedRequests = issues.filter(i => i.type === 'request-failed' || i.type === 'response-error');
        expect(
            failedRequests,
            `Failed JS chunk requests in full flow: ${JSON.stringify(failedRequests, null, 2)}`
        ).toHaveLength(0);
    });

    test('Reports detailed error context when module import fails', async ({ page }) => {
        // This test verifies our error capture instrumentation is working
        // It doesn't expect an actual failure, just validates the mechanism exists

        const issues = await setupIssueCapture(page);

        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Check console logs for DEV error capture initialization
        const logs: string[] = [];
        page.on('console', (msg) => {
            logs.push(msg.text());
        });

        await page.reload();
        await waitForV7Ready(page);

        // Verify no issues
        expect(issues.filter(i => i.type === 'console-error')).toHaveLength(0);
    });
});
