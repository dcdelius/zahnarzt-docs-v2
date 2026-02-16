import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

async function setupPage(page: Page): Promise<void> {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
        window.localStorage.setItem('v10_debug', 'true');
    });
    await page.route('**/firestore.googleapis.com/**', route => route.abort());
    await page.route('**/firebaseio.com/**', route => route.abort());
    await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    const dictationInput = page.locator('[data-testid="v10-dictation-input"]');
    if (await dictationInput.isVisible({ timeout: 3000 }).catch(() => false)) return;

    const emailInput = page.locator('input[type="email"], input[placeholder*="E-Mail" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button:has-text("Einloggen")').first();
    const loginVisible = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (loginVisible) {
        const email = process.env.E2E_LOGIN_EMAIL;
        const password = process.env.E2E_LOGIN_PASSWORD;
        if (!email || !password) {
            throw new Error('Hosted Login erkannt, aber Credentials fehlen. Setze E2E_LOGIN_EMAIL und E2E_LOGIN_PASSWORD.');
        }
        await emailInput.fill(email);
        await passwordInput.fill(password);
        await loginButton.click();
    }

    await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 20000 });
}

async function selectInsuranceMode(page: Page, mode: 'GKV' | 'GKV+MKV' | 'PKV'): Promise<void> {
    const selector = page.locator('[data-testid="v10-insurance-select"]');
    if (mode === 'GKV') await selector.locator('button:has-text("GKV")').click();
    if (mode === 'GKV+MKV') await selector.locator('button:has-text("+MKV")').click();
    if (mode === 'PKV') await selector.locator('button:has-text("PKV")').click();
}

async function selectTreatment(page: Page, treatmentId: 'fuellung' | 'endo' | 'crown_prep'): Promise<void> {
    await page.locator('[data-testid="v10-treatment-dropdown"]').click();
    await page.locator(`[data-testid="v10-treatment-option-${treatmentId}"]`).click();
}

async function triggerRun(page: Page): Promise<void> {
    const runButton = page.locator('[data-testid="v10-run-button"]');
    await expect(runButton).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="v10-dictation-input"]').focus();
    await page.keyboard.press('Control+Enter');

    await page.waitForFunction(() => {
        const lifecycle = document.querySelector('[data-testid="v10-run-lifecycle"]');
        if (!lifecycle) return false;
        const phase = lifecycle.getAttribute('data-phase');
        return phase === 'preanalysis' || phase === 'pipeline';
    }, undefined, { timeout: 12000 }).catch(() => {});
}

async function answerQuestionsUntilDashboard(page: Page): Promise<void> {
    for (let i = 0; i < 45; i += 1) {
        const dashboard = page.locator('[data-testid="v10-postanalysis-dashboard"]');
        if (await dashboard.isVisible().catch(() => false)) return;

        const laneButtons = page.locator('[data-testid^="v10-askback-lane-"]');
        const laneCount = await laneButtons.count();
        for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
            const lane = laneButtons.nth(laneIndex);
            const testId = (await lane.getAttribute('data-testid')) || '';
            if (testId === 'v10-askback-lane-all') continue;
            const laneText = ((await lane.textContent()) || '').toLowerCase();
            const match = laneText.match(/pflicht\s*(\d+)\s*\/?\s*(\d+)/i);
            if (!match) continue;
            const answered = Number(match[1] || '0');
            const total = Number(match[2] || '0');
            if (total > answered) {
                await lane.click();
                await page.waitForTimeout(160);
                break;
            }
        }

        const textInputs = page.locator('[data-testid^="input-"]');
        const inputCount = await textInputs.count();
        for (let t = 0; t < inputCount; t += 1) {
            const input = textInputs.nth(t);
            if (!(await input.isVisible().catch(() => false))) continue;
            const currentValue = await input.inputValue().catch(() => '');
            if (currentValue && currentValue.trim().length > 0) continue;
            const testId = (await input.getAttribute('data-testid')) || '';
            const inputId = testId.replace('input-', '');
            let value = 'ja';
            if (inputId.includes('betrag')) value = '150';
            if (inputId.includes('surface')) value = 'o';
            await input.fill(value);
            await page.waitForTimeout(120);
        }

        const textareas = page.locator('textarea');
        const textareaCount = await textareas.count();
        for (let t = 0; t < textareaCount; t += 1) {
            const area = textareas.nth(t);
            if (!(await area.isVisible().catch(() => false))) continue;
            const currentValue = await area.inputValue().catch(() => '');
            if (currentValue && currentValue.trim().length > 0) continue;
            const contextText = ((
                await area.locator('xpath=ancestor::*[@data-testid][1]').textContent().catch(() => '')
            ) || '').toLowerCase();
            let value = 'ja';
            if (contextText.includes('betrag')) value = '150';
            if (contextText.includes('flächen') || contextText.includes('flaechen') || contextText.includes('surface')) value = 'o';
            await area.fill(value);
            await page.waitForTimeout(120);
        }

        const completeBtn = page.locator('[data-testid="complete-button"]');
        if (await completeBtn.isVisible().catch(() => false)) {
            const disabled = await completeBtn.isDisabled().catch(() => true);
            if (!disabled) {
                await completeBtn.click({ force: true });
                await page.waitForTimeout(320);
                continue;
            }
        }

        const questionRows = page.locator('[data-testid^="question-row-"]');
        const rowCount = await questionRows.count();
        let answered = false;
        for (let r = 0; r < rowCount; r += 1) {
            const row = questionRows.nth(r);
            const activeCount = await row.locator('button[aria-pressed="true"]').count();
            if (activeCount > 0) continue;

            const options = row.locator('button[aria-pressed="false"]');
            const optionCount = await options.count();
            if (optionCount === 0) continue;

            let picked = options.first();
            for (let o = 0; o < optionCount; o += 1) {
                const candidate = options.nth(o);
                const label = ((await candidate.textContent()) || '').toLowerCase();
                if (label.includes('komposit') || label.includes('ja') || label.includes('mehrschicht')) {
                    picked = candidate;
                    break;
                }
            }
            await picked.click({ force: true });
            answered = true;
            await page.waitForTimeout(180);
            break;
        }
        if (answered) continue;

        await page.waitForTimeout(200);
    }

    throw new Error('Post-Analysis Dashboard wurde nicht erreicht.');
}

test.describe('V10 Postanalysis Visibility', () => {
    test.setTimeout(120000);

    test('shows komposit fact and billing codes in postanalysis dashboard', async ({ page }) => {
        await setupPage(page);
        await selectTreatment(page, 'fuellung');
        await selectInsuranceMode(page, 'GKV+MKV');
        await page.fill(
            '[data-testid="v10-dictation-input"]',
            'Zahn 16 OD Kompositversorgung unter Kofferdam, Mehrkostenvereinbarung mit Patient besprochen und unterschrieben, Okklusion kontrolliert.'
        );
        await triggerRun(page);
        await answerQuestionsUntilDashboard(page);

        const dashboard = page.locator('[data-testid="v10-postanalysis-dashboard"]');
        await expect(dashboard).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Material: Komposit')).toBeVisible({ timeout: 10000 });

        const llmRuntimeMeta = page.locator('[data-testid="v10-llm-runtime-meta"]');
        await expect(llmRuntimeMeta).toHaveAttribute('data-preanalysis-source', /(llm|fallback)/);
        await expect(llmRuntimeMeta).toHaveAttribute('data-preanalysis-fallback', 'true');
        await expect(page.locator('[data-testid="v10-llm-fallback-banner"]')).toBeVisible({ timeout: 10000 });

        const billingContainer = page.locator('[data-testid="v10-postanalysis-billing-codes"]');
        await expect(billingContainer).toBeVisible({ timeout: 10000 });

        const codeNodes = page.locator('[data-testid^="v10-postanalysis-billing-code-"]');
        const codeCount = await codeNodes.count();
        expect(codeCount).toBeGreaterThan(0);

        const codes: string[] = [];
        for (let i = 0; i < codeCount; i += 1) {
            const text = ((await codeNodes.nth(i).textContent()) || '').trim().toUpperCase();
            if (text.length > 0) codes.push(text);
        }
        expect(codes.some(code => code.startsWith('BEMA_') || code.startsWith('GOZ_'))).toBe(true);

        const tracePanel = page.locator('[data-testid="v10-trace-panel"]');
        await expect(tracePanel).toBeVisible({ timeout: 10000 });
        await page.locator('[data-testid="v10-trace-toggle"]').click();
        await page.locator('[data-testid="v10-trace-billing-toggle"]').click();
        await expect(page.getByText('Code → Chip → Fakt‑Herkunft')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Emitter:').first()).toBeVisible({ timeout: 10000 });
    });
});
