/**
 * V10 Praxis-16 E2E Test Suite
 * 
 * Runs 16 real-world Praxis dictation scenarios through the V10 frontend.
 * Verifies medical logic, billing channelization, askbacks, and combinability.
 * 
 * AUTH: Uses VITE_E2E_BYPASS_AUTH=1 (no Firebase login)
 * 
 * Run: npm run e2e:v10:praxis16
 */

import { test, expect, Page } from '@playwright/test';
import { PRAXIS_16_SCENARIOS, Praxis16Scenario, Channelization } from './scenarios/praxis16.scenarios';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const LIVE = process.env.DOCUDENT_E2E_LIVE === '1';

// ═══════════════════════════════════════════════════════════════
// RESULT COLLECTION
// ═══════════════════════════════════════════════════════════════

interface ScenarioResult {
    id: string;
    title: string;
    status: 'pass' | 'fail' | 'skip';
    expected: Praxis16Scenario['expected'];
    actual: {
        phase: 'output' | 'questions';
        hasBema: boolean;
        hasGoz: boolean;
        bemaCount: number;
        gozCount: number;
        totalCodes: number;
        askbacksShown: string[];
        combinabilityVerdict: string;
        negationsViolated: string[];
        multiplicityEvidence?: {
            runCards: number;
            uniqueInstanceIds: number;
            uniqueTeeth: number;
            coveredRunCards: number;
        };
    };
    errors: string[];
    diagnostics: string[];
}

const results: ScenarioResult[] = [];

// ═══════════════════════════════════════════════════════════════
// SETUP HELPERS
// ═══════════════════════════════════════════════════════════════

async function setE2EHandshake(page: Page): Promise<void> {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
}

async function setupRouteBlocking(page: Page): Promise<void> {
    if (!LIVE) {
        await page.route('**/firestore.googleapis.com/**', route => route.abort());
        await page.route('**/firebaseio.com/**', route => route.abort());
    }
    await page.route('**/google-analytics.com/**', route => route.abort());
    await page.route('**/analytics.google.com/**', route => route.abort());
    await page.route('**/sentry.io/**', route => route.abort());
}

async function navigateToV10(page: Page): Promise<void> {
    await setE2EHandshake(page);
    await setupRouteBlocking(page);
    await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 15000, state: 'visible' });
}

// ═══════════════════════════════════════════════════════════════
// ACTION HELPERS
// ═══════════════════════════════════════════════════════════════

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

async function selectTreatment(page: Page, packId: string): Promise<void> {
    const dropdown = page.locator('[data-testid="v10-treatment-dropdown"]');
    await expect(dropdown).toBeVisible({ timeout: 10000 });
    await dropdown.click();
    const option = page.locator(`[data-testid="v10-treatment-option-${packId}"]`);
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
}

async function selectTextLength(page: Page, label: 'Kurz' | 'Mittel' | 'Lang'): Promise<void> {
    const selector = page.locator('[data-testid="v10-textlength-select"]');
    await expect(selector).toBeVisible({ timeout: 10000 });
    await selector.locator(`button:has-text("${label}")`).click();
}

async function handleIntentConfirmationIfVisible(page: Page): Promise<void> {
    const confirmationPanel = page.locator('[data-testid="v10-intent-confirmation-panel"]');
    if (!await confirmationPanel.isVisible({ timeout: 1200 }).catch(() => false)) return;

    const lanes = confirmationPanel.locator('[data-testid^="v10-intent-lane-"]');
    const laneCount = await lanes.count();
    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
        const lane = lanes.nth(laneIndex);
        const laneId = (await lane.getAttribute('data-testid')) || '';
        const laneParts = laneId.split('v10-intent-lane-');
        if (laneParts.length !== 2 || !laneParts[1]) continue;
        const intentId = laneParts[1];
        const firstOption = confirmationPanel.locator(`[data-testid^="v10-intent-option-${intentId}-"]`).first();
        if (await firstOption.isVisible().catch(() => false)) {
            await firstOption.click({ force: true });
            await page.waitForTimeout(80);
        }
    }

    const confirmButton = page.locator('[data-testid="v10-intent-confirm-button"]');
    if (await confirmButton.isVisible({ timeout: 1200 }).catch(() => false)) {
        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();
    }
}

async function runPipeline(page: Page, dictation: string): Promise<'output' | 'questions'> {
    await page.fill('[data-testid="v10-dictation-input"]', dictation);
    await page.click('[data-testid="v10-run-button"]');

    const result = page.locator(
        '[data-testid="v10-intent-confirmation-panel"], [data-testid="v10-questions-panel"], [data-testid="v10-output-panel"], [data-testid="v10-multi-output-panel"]'
    );
    await expect(result.first()).toBeVisible({ timeout: 20000 });

    await handleIntentConfirmationIfVisible(page);
    await page.waitForTimeout(250);

    if (await page.locator('[data-testid="v10-questions-panel"]').isVisible().catch(() => false)) {
        return 'questions';
    }
    return 'output';
}

function buildTextAnswer(questionId: string): string {
    const normalized = questionId.toLowerCase();
    if (normalized.includes('surface') || normalized.includes('flaeche') || normalized.includes('flächen')) {
        return 'm,o';
    }
    if (
        normalized.includes('mehrkosten')
        || normalized.includes('patient_share')
        || normalized.includes('patientshare')
        || normalized.includes('euro')
        || normalized.includes('eur')
    ) {
        return '120';
    }
    if (normalized.includes('mkv') && normalized.includes('justification')) {
        return 'Mehrschichttechnik adhaesiv';
    }
    if (normalized.includes('material')) {
        return 'Komposit';
    }
    if (normalized.includes('betrag') || normalized.includes('amount')) {
        return '120';
    }
    return 'Standard';
}

async function answerVisibleQuestionRows(page: Page): Promise<void> {
    const rows = await page.locator('[data-testid^="question-row-"]').all();

    for (const row of rows) {
        const rowId = await row.getAttribute('data-testid', { timeout: 400 }).catch(() => null);
        if (!rowId) continue;
        const questionId = rowId?.replace('question-row-', '') ?? '';

        const textareas = row.locator('textarea');
        if (await textareas.count() > 0) {
            const value = questionId.includes('APICAL_SIZE')
                ? 'MB: 30, ML: 30, D: 30'
                : buildTextAnswer(questionId);
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
            await textInput.first().fill(buildTextAnswer(questionId));
            continue;
        }

        const buttons = row.locator('button');
        if (await buttons.count() > 0) {
            await buttons.first().click();
        }
    }
}

async function autoAnswerQuestionsFlowV2(page: Page): Promise<void> {
    await answerVisibleQuestionRows(page);

    const completeButton = page.locator('[data-testid="complete-button"]');
    if (await completeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        const isDisabled = await completeButton.isDisabled().catch(() => true);
        if (!isDisabled) {
            await completeButton.click();
        }
    } else {
        const fallback = page.locator('[data-testid="v10-submit-answers"], button:has-text("Weiter")').first();
        if (await fallback.isVisible({ timeout: 1000 }).catch(() => false)) {
            await fallback.click();
        }
    }
}

async function getPendingRequiredCount(page: Page): Promise<number | null> {
    const progressLabel = page.locator('[data-testid="complete-button"]').locator('xpath=ancestor::div[contains(@style,"position: sticky")]').locator('span');
    const count = await progressLabel.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
        const text = (await progressLabel.nth(i).textContent().catch(() => null)) ?? '';
        const match = text.match(/Offen\s+(\d+)/i);
        if (match) return Number(match[1]);
        if (/Bereit/i.test(text)) return 0;
    }
    return null;
}

async function answerPerLaneUntilSatisfied(page: Page): Promise<void> {
    const laneBoard = page.locator('[data-testid="v10-askback-lane-board"]');
    if (!await laneBoard.isVisible({ timeout: 300 }).catch(() => false)) return;

    const laneButtons = laneBoard.locator('button[data-testid^="v10-askback-lane-"]');
    const laneCount = await laneButtons.count();
    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
        const laneButton = laneButtons.nth(laneIndex);
        const laneId = (await laneButton.getAttribute('data-testid').catch(() => '')) ?? '';
        if (!laneId || laneId === 'v10-askback-lane-all') continue;

        await laneButton.click({ force: true });
        await page.waitForTimeout(140);
        for (let attempt = 0; attempt < 3; attempt += 1) {
            await answerVisibleQuestionRows(page);
            await page.waitForTimeout(120);

            const laneText = (await laneButton.innerText().catch(() => '')) ?? '';
            const laneMatch = laneText.match(/Pflicht\s+(\d+)\/(\d+)/i);
            if (laneMatch) {
                const answered = Number(laneMatch[1]);
                const total = Number(laneMatch[2]);
                if (answered >= total) break;
            }
        }
    }

    const allLane = page.locator('[data-testid="v10-askback-lane-all"]');
    if (await allLane.isVisible({ timeout: 300 }).catch(() => false)) {
        await allLane.click({ force: true });
    }
}

async function collectQuestionPanelDiagnostics(page: Page): Promise<string> {
    const laneBoard = page.locator('[data-testid="v10-askback-lane-board"]');
    const laneInfo: string[] = [];
    if (await laneBoard.isVisible({ timeout: 300 }).catch(() => false)) {
        const laneButtons = laneBoard.locator('button[data-testid^="v10-askback-lane-"]');
        const laneCount = await laneButtons.count();
        for (let i = 0; i < laneCount; i++) {
            const text = ((await laneButtons.nth(i).innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
            if (text.length > 0) laneInfo.push(text);
        }
    }
    const visibleRows = await collectAskbackIds(page);
    const pending = await getPendingRequiredCount(page);
    return `pendingRequired=${pending ?? 'unknown'}; lanes=[${laneInfo.join(' || ') || 'none'}]; visibleAskbacks=[${visibleRows.join(', ') || 'none'}]`;
}

async function autoAnswerMultiQuestionsPanel(page: Page): Promise<void> {
    const panel = page.locator('[data-testid="v10-multi-questions-panel"]');
    if (!await panel.isVisible({ timeout: 500 }).catch(() => false)) {
        return;
    }

    const instanceCards = panel.locator('[data-testid^="v10-instance-card-"]');
    const instanceCount = await instanceCards.count();

    for (let i = 0; i < instanceCount; i++) {
        const card = instanceCards.nth(i);
        const rows = card.locator('[data-testid^="v10-question-"]');
        const rowCount = await rows.count();

        for (let r = 0; r < rowCount; r++) {
            const row = rows.nth(r);

            const select = row.locator('select');
            if (await select.count() > 0) {
                const options = select.locator('option');
                const optionCount = await options.count();
                let selected = false;
                for (let o = 0; o < optionCount; o++) {
                    const value = await options.nth(o).getAttribute('value');
                    if (value) {
                        await select.selectOption(value);
                        selected = true;
                        break;
                    }
                }
                if (!selected && optionCount > 1) {
                    await select.selectOption({ index: 1 });
                }
                continue;
            }

            const boolYes = row.locator('button:has-text("Ja")');
            if (await boolYes.isVisible({ timeout: 200 }).catch(() => false)) {
                await boolYes.first().click();
                continue;
            }

            const textInput = row.locator('input[type="text"]');
            if (await textInput.count() > 0) {
                await textInput.first().fill('Standard');
                continue;
            }
        }

        const submit = card.locator('[data-testid^="v10-submit-answers-instance-"]');
        if (await submit.isVisible({ timeout: 500 }).catch(() => false)) {
            await submit.click();
        }
    }

    const submitAll = page.locator('[data-testid="v10-submit-all-answers"]');
    if (await submitAll.isVisible({ timeout: 500 }).catch(() => false)) {
        await submitAll.click();
    }
}

async function autoAnswerQuestionsUntilOutput(page: Page, maxRounds = 6): Promise<void> {
    for (let round = 0; round < maxRounds; round++) {
        const hasQuestions = await page.locator('[data-testid="v10-questions-panel"]').isVisible({ timeout: 1000 }).catch(() => false);
        if (!hasQuestions) break;
        await answerPerLaneUntilSatisfied(page);
        await autoAnswerMultiQuestionsPanel(page);
        await autoAnswerQuestionsFlowV2(page);
        await page.waitForTimeout(400);
        if (await isOutputVisible(page)) break;
    }

    await page.waitForTimeout(500);
}

async function isOutputVisible(page: Page): Promise<boolean> {
    const selectors = [
        '[data-testid="v10-output-panel"]',
        '[data-testid="v10-multi-output-panel"]',
        '[data-testid="multi-output-paper"]',
        '[data-testid="section-behandlung"]',
        '[data-testid="billing-toggle"]',
    ];
    for (const selector of selectors) {
        if (await page.locator(selector).isVisible({ timeout: 200 }).catch(() => false)) {
            return true;
        }
    }
    return false;
}

async function ensureOutputVisible(page: Page): Promise<void> {
    const toOutput = page.locator('button:has-text("Zum Output")').first();
    if (await toOutput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await toOutput.click();
    }
    await Promise.race([
        page.locator('[data-testid="v10-multi-output-panel"]').waitFor({ state: 'visible', timeout: 20000 }),
        page.locator('[data-testid="multi-output-paper"]').waitFor({ state: 'visible', timeout: 20000 }),
        page.locator('[data-testid="v10-output-panel"]').waitFor({ state: 'visible', timeout: 20000 }),
        page.locator('[data-testid="section-behandlung"]').waitFor({ state: 'visible', timeout: 20000 }),
        page.locator('[data-testid="billing-toggle"]').waitFor({ state: 'visible', timeout: 20000 }),
    ]);
}

async function collectAskbackIds(page: Page): Promise<string[]> {
    const ids = new Set<string>();
    const toCanonicalAskbackId = (raw: string): string => {
        const cleaned = raw
            .replace(/^question-row-/, '')
            .replace(/^v10-question-/, '')
            .replace(/-instance-.+$/, '');
        const parts = cleaned.split('::').map(p => p.trim()).filter(Boolean);
        const canonicalPart = parts.find(part => {
            const lowered = part.toLowerCase();
            if (!/^[a-z0-9_]+$/i.test(part)) return false;
            if (/^seg\d+$/i.test(lowered)) return false;
            if (/^(tooth|zahn)\d+$/i.test(lowered)) return false;
            if (lowered === 'dictation' || lowered === 'settings' || lowered === 'manual') return false;
            return true;
        });
        return (canonicalPart ?? parts[0] ?? cleaned).split('::')[0];
    };
    const collectVisibleRows = async () => {
        const rows = page.locator('[data-testid^="question-row-"]');
        const rowCount = await rows.count();
        for (let i = 0; i < rowCount; i++) {
            const id = await rows.nth(i).getAttribute('data-testid');
            if (id) {
                ids.add(toCanonicalAskbackId(id));
            }
        }
    };

    await page.waitForSelector('[data-testid^="question-row-"], [data-testid^="v10-question-"]', { timeout: 2000 }).catch(() => {});
    await collectVisibleRows();

    const laneBoard = page.locator('[data-testid="v10-askback-lane-board"]');
    if (await laneBoard.isVisible({ timeout: 300 }).catch(() => false)) {
        const laneButtons = laneBoard.locator('button[data-testid^="v10-askback-lane-"]');
        const laneCount = await laneButtons.count();
        for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
            await laneButtons.nth(laneIndex).click({ force: true });
            await page.waitForTimeout(80);
            await collectVisibleRows();
        }
        const allLane = page.locator('[data-testid="v10-askback-lane-all"]');
        if (await allLane.isVisible({ timeout: 300 }).catch(() => false)) {
            await allLane.click({ force: true });
        }
    }

    const multiRows = page.locator('[data-testid^="v10-question-"]');
    const multiCount = await multiRows.count();
    for (let i = 0; i < multiCount; i++) {
        const id = await multiRows.nth(i).getAttribute('data-testid');
        if (!id) continue;
        ids.add(toCanonicalAskbackId(id));
    }

    return Array.from(ids);
}

async function getBillingCodes(page: Page): Promise<string[]> {
    const multiOutputPanel = page.locator('[data-testid="v10-multi-output-panel"]');
    if (await multiOutputPanel.isVisible({ timeout: 600 }).catch(() => false)) {
        const codeTags = page.locator('[data-testid^="billing-code-"]');
        const count = await codeTags.count();
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = (await codeTags.nth(i).textContent()) || '';
            const match = text.match(/(BEMA_[0-9A-ZÄ]+|GOZ_[0-9A-Z]+)/i);
            if (match) codes.push(match[1].toUpperCase());
        }
        return Array.from(new Set(codes));
    }

    const billingToggle = page.locator('[data-testid="billing-toggle"]');
    const billingList = page.locator('[data-testid="billing-list"]');

    if (await billingToggle.isVisible({ timeout: 1500 }).catch(() => false)) {
        if (!await billingList.isVisible({ timeout: 300 }).catch(() => false)) {
            await billingToggle.click();
        }
    }

    const text = (await billingList.isVisible({ timeout: 800 }).catch(() => false))
        ? await billingList.innerText()
        : await page.locator('[data-testid="v10-output-panel"]').innerText();

    const matches = text.match(/(?:BEMA|GOZ)[_-]?\S+/g) ?? [];
    const codes = Array.from(new Set(matches.map(m => m.replace(/[),]/g, ''))));

    if (codes.length === 0) {
        const countMatch = text.match(/BEMA\s*(\d+)\s*[·|/]\s*GOZ\s*(\d+)/i);
        const bemaCount = countMatch ? Number(countMatch[1]) : 0;
        const gozCount = countMatch ? Number(countMatch[2]) : 0;
        for (let i = 0; i < bemaCount; i++) codes.push(`BEMA_COUNT_${i + 1}`);
        for (let i = 0; i < gozCount; i++) codes.push(`GOZ_COUNT_${i + 1}`);
    }

    return codes;
}

async function collectMultiplicityEvidence(page: Page): Promise<{
    runCards: number;
    uniqueInstanceIds: number;
    uniqueTeeth: number;
    coveredRunCards: number;
}> {
    const runCardsLocator = page.locator('[data-testid^="run-card-"]');
    const runCards = await runCardsLocator.count().catch(() => 0);
    const runCardIds: string[] = [];
    for (let i = 0; i < runCards; i++) {
        const raw = (await runCardsLocator.nth(i).getAttribute('data-testid').catch(() => '')) ?? '';
        if (!raw) continue;
        runCardIds.push(raw.replace('run-card-', '').trim());
    }
    const billingTags = page.locator('[data-testid^="billing-code-"]');
    const billingTagCount = await billingTags.count().catch(() => 0);
    const instanceIds = new Set<string>();
    const teeth = new Set<string>();

    for (let i = 0; i < billingTagCount; i++) {
        const raw = ((await billingTags.nth(i).textContent().catch(() => '')) ?? '').trim();
        if (!raw) continue;
        const instanceMatch = raw.match(/·\s*([a-z0-9_-]+)/i);
        if (instanceMatch?.[1]) instanceIds.add(instanceMatch[1]);
        const toothMatch = raw.match(/\(([^)]+)\)/);
        if (toothMatch?.[1] && toothMatch[1].toUpperCase() !== 'NA') teeth.add(toothMatch[1]);
    }

    const coveredRunCards = runCardIds.filter(id => id.length > 0 && instanceIds.has(id)).length;

    return {
        runCards,
        uniqueInstanceIds: instanceIds.size,
        uniqueTeeth: teeth.size,
        coveredRunCards,
    };
}

async function assertOutputSections(page: Page): Promise<void> {
    const hasSection = await page.locator('[data-testid="section-behandlung"]').isVisible({ timeout: 1000 }).catch(() => false);
    const hasOutputText = await page.locator('[data-testid="v10-output-text"]').isVisible({ timeout: 1000 }).catch(() => false);
    const hasMultiPaper = await page.locator('[data-testid="multi-output-paper"]').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasSection || hasOutputText || hasMultiPaper).toBe(true);
}

async function assertHasBilling(page: Page, codes: string[]): Promise<void> {
    const noBillingMessage = page.locator('[data-testid="no-billing-message"]');
    if (await noBillingMessage.isVisible({ timeout: 500 }).catch(() => false) && codes.length === 0) {
        throw new Error('Output shows no billing message but billing is expected.');
    }
    expect(codes.length, `Expected billing codes, got none.`).toBeGreaterThan(0);
}

async function getCombinabilityVerdict(page: Page): Promise<string> {
    // Check for combinability banner
    const blockBanner = page.locator('[data-testid="combinability-banner-block"]');
    if (await blockBanner.isVisible({ timeout: 500 }).catch(() => false)) {
        return 'block';
    }

    const warnBanner = page.locator('[data-testid="combinability-banner-warn"]');
    if (await warnBanner.isVisible({ timeout: 500 }).catch(() => false)) {
        return 'warn';
    }

    const multiOutputPanel = page.locator('[data-testid="v10-multi-output-panel"]');
    if (await multiOutputPanel.isVisible({ timeout: 500 }).catch(() => false)) {
        const text = (await multiOutputPanel.innerText()).toUpperCase();
        if (text.includes('KOMBI-PRUEFUNG') || text.includes('KOMBI-PRÜFUNG')) {
            if (text.includes('BLOCK')) return 'block';
            if (text.includes('WARN')) return 'warn';
        }
    }

    return 'ok';
}

function assertChannelization(
    hasBema: boolean,
    hasGoz: boolean,
    expected: Channelization,
    addon: boolean
): { pass: boolean; error?: string } {
    switch (expected) {
        case 'BEMA_ONLY':
            if (!hasBema) return { pass: false, error: 'Expected BEMA codes but none found' };
            if (hasGoz) return { pass: false, error: 'Expected BEMA_ONLY but found GOZ codes' };
            return { pass: true };
        case 'GOZ_ONLY':
            if (!hasGoz) return { pass: false, error: 'Expected GOZ codes but none found' };
            if (hasBema) return { pass: false, error: 'Expected GOZ_ONLY but found BEMA codes' };
            return { pass: true };
        case 'BOTH':
            if (!hasBema) return { pass: false, error: 'Expected BEMA+GOZ but no BEMA found' };
            if (addon && !hasGoz) return { pass: false, error: 'Expected GOZ addon but none found' };
            return { pass: true };
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════

test.describe('V10 Praxis-16 Suite', () => {
    test.describe.configure({ retries: 0 });
    for (const scenario of PRAXIS_16_SCENARIOS) {
        test(`[${scenario.id}] ${scenario.title}`, async ({ page }) => {
            const result: ScenarioResult = {
                id: scenario.id,
                title: scenario.title,
                status: 'pass',
                expected: scenario.expected,
                actual: {
                    phase: 'output',
                    hasBema: false,
                    hasGoz: false,
                    bemaCount: 0,
                    gozCount: 0,
                    totalCodes: 0,
                    askbacksShown: [],
                    combinabilityVerdict: 'ok',
                    negationsViolated: [],
                },
                errors: [],
                diagnostics: [],
            };

            try {
                await navigateToV10(page);
                await selectTreatment(page, 'fuellung');
                await selectInsurance(page, scenario.insuranceType);
                await selectTextLength(page, 'Mittel');

                const phase = await runPipeline(page, scenario.dictation);
                result.actual.phase = phase;

                // Phase assertion
                if (scenario.expected.phase !== 'either') {
                    if (phase !== scenario.expected.phase) {
                        const toleratedAutoResolved = scenario.expected.phase === 'questions' && phase === 'output';
                        if (!toleratedAutoResolved) {
                            result.errors.push(`Phase mismatch: expected ${scenario.expected.phase}, got ${phase}`);
                        }
                    }
                }

                // If questions phase, answer and proceed (multi-round safe)
                if (phase === 'questions') {
                    result.actual.askbacksShown = await collectAskbackIds(page);

                    await autoAnswerQuestionsUntilOutput(page);
                    const outputVisible = await isOutputVisible(page);
                    const toOutputVisible = await page.locator('button:has-text("Zum Output")')
                        .isVisible({ timeout: 500 })
                        .catch(() => false);
                    if (outputVisible || toOutputVisible) {
                        await ensureOutputVisible(page);
                        result.actual.phase = 'output';
                    } else {
                        result.actual.phase = 'questions';
                        result.diagnostics.push(`Question panel remained open after auto-answer: ${await collectQuestionPanelDiagnostics(page)}`);
                    }
                } else {
                    await ensureOutputVisible(page);
                    result.actual.phase = 'output';
                }

                if (result.actual.phase === 'questions' && scenario.expected.askbacks?.length) {
                    const askbackMode = scenario.expected.askbackMode ?? 'strict';
                    const missingAskbacks: string[] = [];
                    for (const expectedAsk of scenario.expected.askbacks) {
                        if (!result.actual.askbacksShown.includes(expectedAsk)) {
                            missingAskbacks.push(expectedAsk);
                        }
                    }
                    if (missingAskbacks.length > 0) {
                        if (askbackMode === 'diagnostic') {
                            const message = `Askback note (non-blocking): missing expected IDs ${missingAskbacks.join(', ')}; observed=${result.actual.askbacksShown.join(', ') || 'none'}`;
                            result.diagnostics.push(message);
                            console.log(`[${scenario.id}] ${message}`);
                        } else {
                            for (const missingAskback of missingAskbacks) {
                                result.errors.push(`Askback missing: ${missingAskback}; observed=${result.actual.askbacksShown.join(', ') || 'none'}`);
                            }
                        }
                    }
                } else if (scenario.expected.askbacks?.length && (scenario.expected.askbackMode ?? 'strict') === 'diagnostic') {
                    result.diagnostics.push('Askback diagnostics skipped (run ended in output).');
                }

                // Only assert billing/output if output is visible
                if (result.actual.phase === 'output') {
                    const codes = await getBillingCodes(page);
                    await assertOutputSections(page);
                    await assertHasBilling(page, codes);
                    result.actual.totalCodes = codes.length;
                    result.actual.hasBema = codes.some(c => c.includes('BEMA'));
                    result.actual.hasGoz = codes.some(c => c.includes('GOZ'));
                    result.actual.bemaCount = codes.filter(c => c.includes('BEMA')).length;
                    result.actual.gozCount = codes.filter(c => c.includes('GOZ')).length;
                }

                // Channelization assertion (only if output)
                if (result.actual.phase === 'output') {
                    const channelResult = assertChannelization(
                        result.actual.hasBema,
                        result.actual.hasGoz,
                        scenario.expected.channelization,
                        scenario.expected.addon
                    );
                    if (!channelResult.pass && channelResult.error) {
                        result.errors.push(channelResult.error);
                    }
                }

                // MKV addon assertion (only if output)
                if (scenario.insuranceType === 'MKV' && result.actual.phase === 'output') {
                    if (scenario.expected.addon && !result.actual.hasGoz) {
                        result.errors.push('MKV addon expected but no GOZ codes found');
                    }
                    if (!scenario.expected.addon && result.actual.hasGoz) {
                        result.errors.push('MKV nurKasse but GOZ codes found');
                    }
                }

                // Multiplicity assertion (only if output)
                if (result.actual.phase === 'output' && scenario.expected.multiplicity && scenario.expected.instances > 1) {
                    const evidence = await collectMultiplicityEvidence(page);
                    result.actual.multiplicityEvidence = evidence;

                    const bestEvidence = Math.max(
                        evidence.coveredRunCards,
                        evidence.uniqueInstanceIds,
                        evidence.uniqueTeeth,
                        evidence.runCards
                    );

                    if (bestEvidence < scenario.expected.instances) {
                        result.errors.push(
                            `Multiplicity mismatch: expected >=${scenario.expected.instances} instances, got coveredRunCards=${evidence.coveredRunCards}, runCards=${evidence.runCards}, uniqueInstanceIds=${evidence.uniqueInstanceIds}, uniqueTeeth=${evidence.uniqueTeeth}`
                        );
                    }
                }

                // Negation check (only if output)
                if (result.actual.phase === 'output' && scenario.expected.negations) {
                    const codes = await getBillingCodes(page);
                    for (const neg of scenario.expected.negations) {
                        const hasNegatedItem = codes.some(c => c.toLowerCase().includes(neg.toLowerCase()));
                        if (hasNegatedItem) {
                            result.actual.negationsViolated.push(neg);
                            result.errors.push(`Negation violated: found ${neg} in billing despite "ohne ${neg}"`);
                        }
                    }
                }

                // Combinability
                result.actual.combinabilityVerdict = await getCombinabilityVerdict(page);
                if (result.actual.phase === 'output' && scenario.expected.combinability !== 'unknown') {
                    if (result.actual.combinabilityVerdict !== scenario.expected.combinability) {
                        result.errors.push(`Combinability mismatch: expected ${scenario.expected.combinability}, got ${result.actual.combinabilityVerdict}`);
                    }
                } else if (result.actual.phase !== 'output' && scenario.expected.combinability !== 'unknown') {
                    result.diagnostics.push(`Combinability assertion skipped in phase=${result.actual.phase}.`);
                }

                // Set final status
                if (result.errors.length > 0) {
                    result.status = 'fail';
                }

                console.log(`[${scenario.id}] ${result.status.toUpperCase()} - Phase: ${result.actual.phase}, Codes: BEMA=${result.actual.bemaCount} GOZ=${result.actual.gozCount}, Combi: ${result.actual.combinabilityVerdict}`);
                if (result.diagnostics.length > 0) {
                    console.log(`[${scenario.id}] Diagnostics: ${result.diagnostics.join(' | ')}`);
                }

            } catch (error) {
                result.status = 'fail';
                result.errors.push(`Exception: ${error}`);
                console.error(`[${scenario.id}] FAIL - ${error}`);
            }

            results.push(result);

            // Soft assertion: only fail on critical errors, record others
            if (result.status === 'fail' && result.errors.some(e => !e.includes('Multiplicity'))) {
                // Allow test to continue but log
                console.log(`[${scenario.id}] Errors: ${result.errors.join('; ')}`);
            }
        });
    }
});

// Report generation happens in afterAll
test.afterAll(async () => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('PRAXIS-16 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const diagnosticsTotal = results.reduce((sum, r) => sum + r.diagnostics.length, 0);

    console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
    console.log(`Diagnostics: ${diagnosticsTotal}`);

    for (const r of results) {
        const icon = r.status === 'pass' ? '✅' : '❌';
        console.log(`${icon} [${r.id}] ${r.title}`);
        if (r.errors.length > 0) {
            for (const e of r.errors) {
                console.log(`   ⚠️  ${e}`);
            }
        }
        if (r.diagnostics.length > 0) {
            for (const d of r.diagnostics) {
                console.log(`   INFO  ${d}`);
            }
        }
    }

    console.log('═══════════════════════════════════════════════════════════════\n');

    // Hard fail: this suite is a praxis-readiness contract and must be red when scenarios fail.
    if (failed > 0) {
        throw new Error(`Praxis-16 suite failed: ${failed}/${results.length} scenarios are failing.`);
    }
});
