import { Page, expect } from '@playwright/test';

/**
 * V7 Page Object — Minimal, surgical, high-signal
 * 
 * Provides helpers for the V7 UI flow:
 * Step 1: Select treatment, enter dictation, run analysis
 * Step 2: Answer questions
 * Step 3: View output
 * 
 * ~150 lines max. No framework.
 */
export class V7PageObject {
    constructor(private page: Page) { }

    // ═══════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════

    async gotoV7() {
        await this.page.goto('/docudent/v7');
        await this.page.waitForLoadState('domcontentloaded');

        // Handle login if needed
        await this.handleLoginIfNeeded();

        // Wait for V7 page to be ready (dictation input visible)
        await this.page.locator('[data-testid="dictation-input"]').waitFor({ timeout: 10000 });
    }

    private async handleLoginIfNeeded() {
        // Check if we're on a login page
        const emailInput = this.page.locator('input[type="email"], input[name="email"]');
        const isLoginPage = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);

        if (isLoginPage) {
            // Fill login credentials from env or defaults
            const email = process.env.E2E_LOGIN_EMAIL || 'dcdelius@me.com';
            const password = process.env.E2E_LOGIN_PASSWORD || 'Magenta!';

            await emailInput.fill(email);

            const passwordInput = this.page.locator('input[type="password"]');
            await passwordInput.fill(password);

            // Submit login (button text is "Einloggen" in App.jsx)
            const submitButton = this.page.locator('button:has-text("Einloggen"), button:has-text("Login"), button:has-text("Anmelden")');
            await submitButton.click();

            // Wait for login to complete (app redirects to /home after login)
            await this.page.waitForURL('**/home**', { timeout: 15000 });

            // Now navigate to V7
            await this.page.goto('/docudent/v7');
            await this.page.waitForLoadState('domcontentloaded');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Treatment Selection & Dictation
    // ═══════════════════════════════════════════════════════════════

    async selectTreatment(treatment: 'fuellung' | 'endo') {
        // Click treatment selector to open menu
        const selector = this.page.locator('[data-testid="treatment-selector"]');
        await selector.click();

        // Wait for menu and click option
        const option = this.page.locator(`[data-testid="treatment-option-${treatment}"]`);
        await option.click();

        // Wait for menu to close
        await this.page.waitForTimeout(300);
    }

    async typeDictation(text: string) {
        const textarea = this.page.locator('[data-testid="dictation-input"]');
        await textarea.fill(text);
    }

    async runAnalysis() {
        // Capture console messages for debugging
        const consoleLogs: string[] = [];
        const consoleHandler = (msg: any) => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        };
        this.page.on('console', consoleHandler);

        // Verify send button exists and is clickable
        const sendButton = this.page.locator('[data-testid="send-button"]');
        const buttonVisible = await sendButton.isVisible().catch(() => false);
        const buttonEnabled = await sendButton.isEnabled().catch(() => false);
        console.log(`[V7 PO] Send button: visible=${buttonVisible}, enabled=${buttonEnabled}`);

        if (!buttonVisible || !buttonEnabled) {
            console.log('[V7 PO] Send button not ready, waiting...');
            await sendButton.waitFor({ state: 'visible', timeout: 5000 });
        }

        await sendButton.click();
        console.log('[V7 PO] Send button clicked');

        // Wait for UI to transition (processing → questions/output)
        // First wait a bit for the click to register
        await this.page.waitForTimeout(500);

        // Wait for either questions or output to appear
        const result = await Promise.race([
            this.page.locator('[data-testid="questions-panel"]').waitFor({ timeout: 15000 }).then(() => 'questions'),
            this.page.locator('[data-testid="output-paper"]').waitFor({ timeout: 15000 }).then(() => 'output'),
        ]).catch(() => 'timeout');

        // Dump console logs if we timed out
        if (result === 'timeout') {
            console.log('[V7 PO] Timeout waiting for UI transition. Console logs:');
            consoleLogs.forEach(log => console.log(`  ${log}`));

            // Check if there's an error state
            const errorVisible = await this.page.locator('[data-testid="error-message"]').isVisible().catch(() => false);
            const loadingVisible = await this.page.locator('[data-testid="loading-indicator"]').isVisible().catch(() => false);
            console.log(`[V7 PO] Error visible: ${errorVisible}, Loading visible: ${loadingVisible}`);
        } else {
            console.log(`[V7 PO] UI transitioned to: ${result}`);
        }

        this.page.off('console', consoleHandler);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Questions
    // ═══════════════════════════════════════════════════════════════

    async isQuestionsVisible(): Promise<boolean> {
        return this.page.locator('[data-testid="questions-panel"]').isVisible();
    }

    /**
     * Robustly answer all visible questions.
     * - Iterates all question rows
     * - Clicks first option button OR fills number input
     * - Re-scans for conditional questions that may appear
     */
    async answerAllQuestionsMinimal() {
        const MAX_ITERATIONS = 10; // Safety limit for conditional question loops
        let iteration = 0;
        let previousRowCount = 0;

        while (iteration < MAX_ITERATIONS) {
            iteration++;

            // Get all question rows
            const questionRows = this.page.locator('[data-testid^="question-row-"]');
            const rowCount = await questionRows.count();

            if (rowCount === 0) {
                console.log('[V7 PO] No question rows found');
                break;
            }

            console.log(`[V7 PO] Iteration ${iteration}: Found ${rowCount} question rows`);

            // Answer each question row
            for (let i = 0; i < rowCount; i++) {
                const row = questionRows.nth(i);
                const rowId = await row.getAttribute('data-testid');

                // Try option buttons first (v7-pill class)
                const buttons = row.locator('button.v7-pill');
                const buttonCount = await buttons.count();

                if (buttonCount > 0) {
                    // Click first button
                    const firstButton = buttons.first();
                    console.log(`[V7 PO] Clicking first button in ${rowId} (${buttonCount} buttons)`);
                    await firstButton.click();
                    await this.page.waitForTimeout(150);
                    continue;
                }

                // Try number input
                const numberInput = row.locator('input[type="number"]');
                if (await numberInput.isVisible().catch(() => false)) {
                    const currentVal = await numberInput.inputValue().catch(() => '');
                    if (!currentVal) {
                        console.log(`[V7 PO] Filling number input in ${rowId}`);
                        await numberInput.fill('1');
                        await numberInput.blur();
                        await this.page.waitForTimeout(150);
                    }
                }
            }

            // Check if new conditional questions appeared
            const newRowCount = await this.page.locator('[data-testid^="question-row-"]').count();
            if (newRowCount === previousRowCount) {
                console.log(`[V7 PO] Row count stable at ${newRowCount}, done answering`);
                break;
            }
            previousRowCount = newRowCount;

            // Brief wait for conditional questions
            await this.page.waitForTimeout(200);
        }

        // Final verification
        const completeBtn = this.page.locator('[data-testid="complete-button"]');
        const isEnabled = await completeBtn.isEnabled().catch(() => false);
        console.log(`[V7 PO] After answering: complete-button enabled=${isEnabled}`);
    }

    /**
     * Dump diagnostic info about current question state.
     * Use before timeout to understand what's happening.
     */
    async dumpQuestionDiagnostics(): Promise<string> {
        const diagnostics: string[] = [];
        diagnostics.push('=== QUESTION DIAGNOSTICS ===');

        // Check questions panel
        const questionsPanel = this.page.locator('[data-testid="questions-panel"]');
        const panelVisible = await questionsPanel.isVisible().catch(() => false);
        diagnostics.push(`Questions panel visible: ${panelVisible}`);

        if (!panelVisible) {
            // Maybe already at output?
            const outputVisible = await this.page.locator('[data-testid="output-paper"]').isVisible().catch(() => false);
            diagnostics.push(`Output paper visible: ${outputVisible}`);
            return diagnostics.join('\n');
        }

        // List question rows
        const rows = this.page.locator('[data-testid^="question-row-"]');
        const rowCount = await rows.count();
        diagnostics.push(`Question rows found: ${rowCount}`);

        for (let i = 0; i < rowCount; i++) {
            const row = rows.nth(i);
            const testId = await row.getAttribute('data-testid');
            const buttons = row.locator('button.v7-pill');
            const buttonCount = await buttons.count();
            const numberInput = row.locator('input[type="number"]');
            const hasNumber = await numberInput.isVisible().catch(() => false);
            diagnostics.push(`  Row ${i}: ${testId} | buttons: ${buttonCount} | hasNumber: ${hasNumber}`);
        }

        // Check complete button
        const completeBtn = this.page.locator('[data-testid="complete-button"]');
        const completeBtnVisible = await completeBtn.isVisible().catch(() => false);
        const completeBtnDisabled = await completeBtn.isDisabled().catch(() => true);
        diagnostics.push(`Complete button: visible=${completeBtnVisible}, disabled=${completeBtnDisabled}`);

        const result = diagnostics.join('\n');
        console.log(result);
        return result;
    }

    async goToOutput() {
        // First dump diagnostics in case we timeout
        const diag = await this.dumpQuestionDiagnostics();

        // Capture console messages for debugging
        const consoleLogs: string[] = [];
        const consoleHandler = (msg: any) => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        };
        this.page.on('console', consoleHandler);

        // Check if complete button exists and is enabled
        const completeButton = this.page.locator('[data-testid="complete-button"]');
        const btnVisible = await completeButton.isVisible().catch(() => false);
        const btnEnabled = btnVisible ? await completeButton.isEnabled().catch(() => false) : false;

        console.log(`[V7 PO] Complete button: visible=${btnVisible}, enabled=${btnEnabled}`);

        if (!btnVisible) {
            // Check if we're already at output
            const outputVisible = await this.page.locator('[data-testid="output-paper"]').isVisible().catch(() => false);
            if (outputVisible) {
                console.log('[V7 PO] Already at output page');
                this.page.off('console', consoleHandler);
                return;
            }

            // Try alternative button text
            const altButton = this.page.locator('button:has-text("Fertigstellen"), button:has-text("Weiter")').first();
            if (await altButton.isVisible()) {
                await altButton.click();
            } else {
                this.page.off('console', consoleHandler);
                throw new Error(`Cannot find complete button. Diagnostics:\n${diag}`);
            }
        } else if (!btnEnabled) {
            // Button visible but disabled - some questions not answered
            this.page.off('console', consoleHandler);
            throw new Error(`Complete button is disabled - not all questions answered.\n${diag}`);
        } else {
            console.log('[V7 PO] Clicking complete button...');
            await completeButton.click();
            console.log('[V7 PO] Complete button clicked, waiting for output...');
        }

        // Wait a bit for the pipeline to start
        await this.page.waitForTimeout(1000);

        // Wait for either output OR error state
        const outputLocator = this.page.locator('[data-testid="output-paper"]');
        const errorLocator = this.page.locator('text="❌ Fehler"');

        const result = await Promise.race([
            outputLocator.waitFor({ timeout: 25000 }).then(() => 'output'),
            errorLocator.waitFor({ timeout: 25000 }).then(() => 'error'),
        ]).catch(() => 'timeout');

        // Dump console logs
        console.log('[V7 PO] Console logs during goToOutput:');
        consoleLogs.forEach(log => console.log(`  ${log}`));
        this.page.off('console', consoleHandler);

        if (result === 'error') {
            // Capture error message
            const errorMsg = await this.page.locator('text="Output generation failed"').textContent().catch(() => 'Unknown error');
            console.log(`[V7 PO] Pipeline error: ${errorMsg}`);
            throw new Error(`Pipeline crashed during output generation: ${errorMsg}`);
        }

        if (result === 'timeout') {
            // Take screenshot and throw
            const state = await this.page.content().catch(() => 'Could not get page content');
            console.log('[V7 PO] Timeout waiting for output. Page state includes error?', state.includes('Fehler'));
            throw new Error('Timeout waiting for output-paper. Neither output nor error state detected.');
        }

        console.log('[V7 PO] Output page visible');
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Output
    // ═══════════════════════════════════════════════════════════════

    async isOutputVisible(): Promise<boolean> {
        return this.page.locator('[data-testid="output-paper"]').isVisible();
    }

    async getOutputText(): Promise<string> {
        const paper = this.page.locator('[data-testid="output-paper"]');
        return paper.textContent() || '';
    }

    async openBillingAccordionIfPresent() {
        const billingToggle = this.page.locator('[data-testid="billing-toggle"]');
        if (await billingToggle.isVisible()) {
            await billingToggle.click();
        }
    }

    async getBillingCodesText(): Promise<string> {
        // Try billing section
        const billing = this.page.locator('[data-testid^="section-billing"]');
        if (await billing.isVisible()) {
            return await billing.textContent() || '';
        }
        return '';
    }

    async clickEdit() {
        const editButton = this.page.locator('[data-testid="edit-button"]');
        await editButton.click();
        await this.page.locator('[data-testid="questions-panel"]').waitFor({ timeout: 10000 });
    }

    async clickReset() {
        const resetButton = this.page.locator('[data-testid="reset-button"]');
        await resetButton.click();
    }

    // ═══════════════════════════════════════════════════════════════
    // DIAGNOSTICS
    // ═══════════════════════════════════════════════════════════════

    async getCurrentRoute(): Promise<string> {
        return this.page.url();
    }

    async diagnose() {
        const route = await this.getCurrentRoute();
        const outputVisible = await this.isOutputVisible();
        const questionsVisible = await this.isQuestionsVisible();
        let outputText = '';

        if (outputVisible) {
            outputText = await this.getOutputText();
        }

        console.log(`
═══════════════════════════════════════════════════════════════
V7 E2E DIAGNOSIS
═══════════════════════════════════════════════════════════════
Route: ${route}
Questions Visible: ${questionsVisible}
Output Visible: ${outputVisible}
Output (first 400 chars): ${outputText.slice(0, 400)}...
═══════════════════════════════════════════════════════════════
        `);
    }
}

export default V7PageObject;
