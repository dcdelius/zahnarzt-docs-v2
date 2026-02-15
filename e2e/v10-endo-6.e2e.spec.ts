/**
 * V10 Endo-16 E2E Test Suite
 *
 * UI-level verification for Endo flows:
 * - Treatment selection (endo)
 * - Askback → output flow (questions state)
 * - Billing prefixes / forbidden codes
 * - Critical negations (no false Kofferdam billing)
 *
 * NOTE: By default we block Firestore/analytics to keep tests deterministic.
 * Set `DOCUDENT_E2E_LIVE=1` to allow network calls (Firestore/analytics not blocked).
 *
 * Run: npm run e2e:v10:endo6
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ENDO_SCENARIOS, type EndoScenario } from './scenarios/endo6.scenarios';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const LIVE = process.env.DOCUDENT_E2E_LIVE === '1';

interface EndoScenarioResult {
    id: string;
    title: string;
    status: 'pass' | 'fail';
    phase?: 'output' | 'questions';
    billingRefs: string[];
    errors: string[];
}

const results: EndoScenarioResult[] = [];

async function setE2EHandshake(page: Page): Promise<void> {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
}

async function setupRouteBlocking(page: Page): Promise<void> {
    if (LIVE) return;
    await page.route('**/firestore.googleapis.com/**', route => route.abort());
    await page.route('**/firebaseio.com/**', route => route.abort());
    await page.route('**/google-analytics.com/**', route => route.abort());
    await page.route('**/analytics.google.com/**', route => route.abort());
    await page.route('**/sentry.io/**', route => route.abort());
}

async function navigateToV10(page: Page): Promise<void> {
    await setE2EHandshake(page);
    await setupRouteBlocking(page);
    await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 15000, state: 'visible' });
    await expect(page.locator('[data-testid="v10-docudent-page"]')).toBeVisible({ timeout: 10000 });
}

async function selectTreatment(page: Page, packId: string): Promise<void> {
    const dropdown = page.locator('[data-testid="v10-treatment-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 10000 });
    await dropdown.click();
    const option = page.locator(`[data-testid="v10-treatment-option-${packId}"]`);
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
}

async function selectInsurance(page: Page, type: 'GKV' | 'PKV' | 'MKV'): Promise<void> {
    const ins = page.locator('[data-testid="v10-insurance-select"]');
    await expect(ins).toBeVisible({ timeout: 10000 });

    if (type === 'MKV') {
        await ins.locator('button:has-text("GKV")').click();
        const mkvToggle = page.locator('[data-testid="v10-mkv-toggle"]');
        if (await mkvToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
            await mkvToggle.click();
        } else {
            await ins.locator('button:has-text("+MKV")').click().catch(() => { });
        }
    } else {
        await ins.locator(`button:has-text("${type}")`).click();
    }
}

async function selectTextLength(page: Page, label: 'Kurz' | 'Mittel' | 'Lang'): Promise<void> {
    const selector = page.locator('[data-testid="v10-textlength-select"]');
    await expect(selector).toBeVisible({ timeout: 10000 });
    await selector.locator(`button:has-text("${label}")`).click();
}

async function runPipeline(page: Page, dictation: string): Promise<'output' | 'questions'> {
    await page.fill('[data-testid="v10-dictation-input"]', dictation);
    await page.click('[data-testid="v10-run-button"]');

    await page.waitForSelector(
        '[data-testid="v10-questions-panel"]:visible, [data-testid="v10-output-panel"]:visible, button:has-text("Zum Output")',
        { timeout: 20000 }
    );

    if (await page.locator('[data-testid="v10-questions-panel"]').isVisible()) return 'questions';

    if (await page.locator('[data-testid="v10-output-panel"]').isVisible().catch(() => false)) {
        return 'output';
    }

    const toOutput = page.locator('button:has-text("Zum Output")').first();
    if (await toOutput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await toOutput.click();
        await expect(page.locator('[data-testid="v10-output-panel"]')).toBeVisible({ timeout: 20000 });
    }
    return 'output';
}

async function getBillingCodes(page: Page): Promise<string[]> {
    const billingToggle = page.locator('[data-testid="billing-toggle"]');
    const billingList = page.locator('[data-testid="billing-list"]');

    if (await billingToggle.isVisible({ timeout: 1500 }).catch(() => false)) {
        if (!await billingList.isVisible({ timeout: 300 }).catch(() => false)) {
            await billingToggle.click();
        }
    }

    const text = (await billingList.isVisible({ timeout: 800 }).catch(() => false))
        ? await billingList.innerText()
        : await getBodyText(page);

    const matches = text.match(/(?:BEMA|GOZ)[_-]?\S+/g) ?? [];
    return Array.from(new Set(matches.map(m => m.replace(/[),]/g, ''))));
}

async function getBodyText(page: Page): Promise<string> {
    return (await page.locator('body').innerText()) || '';
}

async function autoAnswerQuestionsFlowV2(page: Page): Promise<void> {
    const rows = page.locator('[data-testid^="question-row-"]');
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const rowId = await row.getAttribute('data-testid');
        const questionId = rowId?.replace('question-row-', '') ?? '';

        const textareas = row.locator('textarea');
        if (await textareas.count() > 0) {
            const value = questionId.includes('APICAL_SIZE')
                ? 'MB: 30, ML: 30, D: 30'
                : 'MB: 19, ML: 18, D: 20';
            await textareas.first().fill(value);
            continue;
        }

        const numberInput = row.locator('input[type="number"]');
        if (await numberInput.count() > 0) {
            await numberInput.first().fill('30');
            continue;
        }

        const textInput = row.locator('input[type="text"]');
        if (await textInput.count() > 0) {
            await textInput.first().fill('30');
            continue;
        }

        const buttons = row.locator('button');
        if (await buttons.count() > 0) {
            await buttons.first().click();
        }
    }

    const completeButton = page.locator('[data-testid="complete-button"]');
    if (await completeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await completeButton.click();
    } else {
        const fallback = page.locator('[data-testid="v10-submit-answers"], button:has-text("Weiter")').first();
        if (await fallback.isVisible({ timeout: 1000 }).catch(() => false)) {
            await fallback.click();
        }
    }
}

async function autoAnswerQuestionsUntilOutput(page: Page, maxRounds = 4): Promise<void> {
    for (let round = 0; round < maxRounds; round++) {
        const hasQuestions = await page.locator('[data-testid="v10-questions-panel"]').isVisible({ timeout: 1000 }).catch(() => false);
        if (!hasQuestions) break;
        await autoAnswerQuestionsFlowV2(page);
        await page.waitForTimeout(400);
    }

    await page.waitForSelector(
        '[data-testid="v10-output-panel"]:visible, button:has-text("Zum Output")',
        { timeout: 20000 }
    );
}

async function assertTextSnippets(
    page: Page,
    scenario: EndoScenario,
    options: { phase: 'output' | 'questions' }
): Promise<void> {
    const { mustIncludeTextSnippets, mustNotIncludeTextSnippets } = scenario.expected;
    if ((!mustIncludeTextSnippets || mustIncludeTextSnippets.length === 0) && (!mustNotIncludeTextSnippets || mustNotIncludeTextSnippets.length === 0)) {
        return;
    }

    const text = options.phase === 'questions'
        ? await page.locator('[data-testid="v10-questions-panel"]').innerText()
        : await page.locator('[data-testid="v10-output-panel"]').innerText();

    for (const snippet of mustIncludeTextSnippets ?? []) {
        expect(text, `Expected to include snippet: ${snippet}`).toContain(snippet);
    }
    for (const snippet of mustNotIncludeTextSnippets ?? []) {
        expect(text, `Forbidden snippet: ${snippet}`).not.toContain(snippet);
    }
}

async function ensureOutputVisible(page: Page): Promise<void> {
    const toOutput = page.locator('button:has-text("Zum Output")').first();
    if (await toOutput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await toOutput.click();
    }
    await Promise.race([
        page.locator('[data-testid="section-behandlung"]').waitFor({ state: 'visible', timeout: 20000 }),
        page.locator('[data-testid="billing-toggle"]').waitFor({ state: 'visible', timeout: 20000 }),
    ]);
}

async function assertOutputSections(page: Page): Promise<void> {
    await expect(page.locator('[data-testid="section-behandlung"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="section-leistungen"]')).toBeVisible({ timeout: 5000 });
}

async function assertHasBilling(page: Page, codes: string[]): Promise<void> {
    const noBillingMessage = page.locator('[data-testid="no-billing-message"]');
    if (await noBillingMessage.isVisible({ timeout: 500 }).catch(() => false)) {
        throw new Error('Output shows no billing message but billing is expected.');
    }
    expect(codes.length, `Expected billing codes, got none.`).toBeGreaterThan(0);
}

function assertBillingRefs(codes: string[], scenario: EndoScenario): void {
    const { mustIncludeAnyBillingRefs, mustNotIncludeBillingRefs } = scenario.expected;

    if (mustIncludeAnyBillingRefs && mustIncludeAnyBillingRefs.length > 0) {
        const ok = mustIncludeAnyBillingRefs.some(ref =>
            codes.some(c => c === ref || c.includes(ref))
        );
        expect(ok, `Expected any of ${mustIncludeAnyBillingRefs.join(', ')}, got: ${codes.join(', ')}`).toBe(true);
    }

    for (const forbidden of mustNotIncludeBillingRefs ?? []) {
        const found = codes.some(c => c === forbidden || c.includes(forbidden));
        expect(found, `Forbidden billing ref "${forbidden}" found in: ${codes.join(', ')}`).toBe(false);
    }
}

test.describe('V10 Endo-16 Suite', () => {
    for (const scenario of ENDO_SCENARIOS) {
        test(`[${scenario.id}] ${scenario.title}`, async ({ page }) => {
            const result: EndoScenarioResult = {
                id: scenario.id,
                title: scenario.title,
                status: 'pass',
                billingRefs: [],
                errors: [],
            };

            try {
                await navigateToV10(page);
                await selectTreatment(page, 'endo');
                await selectInsurance(page, scenario.insuranceType);
                await selectTextLength(page, 'Mittel');

                const phase = await runPipeline(page, scenario.dictation);
                result.phase = phase;
                expect(phase).toBe(scenario.expected.phase);

                if (phase === 'output') {
                    await ensureOutputVisible(page);
                }
                await assertTextSnippets(page, scenario, { phase });

                if (phase === 'questions' && scenario.expected.autoComplete) {
                    await autoAnswerQuestionsUntilOutput(page);
                    await ensureOutputVisible(page);
                }

                if (phase === 'output' || scenario.expected.autoComplete) {
                    await ensureOutputVisible(page);
                    await assertOutputSections(page);
                    const codes = await getBillingCodes(page);
                    result.billingRefs = codes;
                    await assertHasBilling(page, codes);
                    assertBillingRefs(codes, scenario);
                }
            } catch (error) {
                result.status = 'fail';
                result.errors.push(String(error));
                throw error;
            } finally {
                results.push(result);
            }
        });
    }
});

test.afterAll(async () => {
    const outDir = path.resolve(process.cwd(), 'docs/system-atlas/artifacts/_latest/v10-endo-16');
    fs.mkdirSync(outDir, { recursive: true });

    const report = {
        runId: new Date().toISOString(),
        total: results.length,
        pass: results.filter(r => r.status === 'pass').length,
        fail: results.filter(r => r.status === 'fail').length,
        cases: results,
    };

    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

    const summaryLines = [
        '# V10 Endo-16 E2E Report',
        '',
        `**Run ID:** ${report.runId}`,
        `**Total:** ${report.total} | **Pass:** ${report.pass} | **Fail:** ${report.fail}`,
        '',
        '## Results',
        '',
        '| ID | Title | Phase | BillingRefs | Status |',
        '|----|-------|-------|-------------|--------|',
    ];

    for (const r of results) {
        const codes = (r.billingRefs || []).slice(0, 4).join(', ') + ((r.billingRefs?.length || 0) > 4 ? '...' : '');
        summaryLines.push(`| ${r.id} | ${r.title} | ${r.phase ?? '-'} | ${codes} | ${r.status} |`);
    }

    const failed = results.filter(r => r.status === 'fail');
    if (failed.length > 0) {
        summaryLines.push('', '## Failures', '');
        for (const r of failed) {
            summaryLines.push(`### Case ${r.id}: ${r.title}`);
            for (const e of r.errors) {
                summaryLines.push(`- ${e}`);
            }
            summaryLines.push('');
        }
    }

    fs.writeFileSync(path.join(outDir, 'summary.md'), summaryLines.join('\n'));
});
