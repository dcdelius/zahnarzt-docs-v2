import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

type Scenario = {
    id: string;
    title: string;
    treatmentId: 'fuellung' | 'endo';
    dictation: string;
    insuranceMode: 'GKV' | 'GKV+MKV' | 'PKV';
    expectedKeywords: string[];
    expectedCodeSystem: 'BEMA' | 'GOZ' | 'BOTH';
};

const SCENARIOS: Scenario[] = [
    {
        id: 'S1',
        title: 'GKV Füllung MOD',
        treatmentId: 'fuellung',
        dictation: 'Bei der 36 war MOD kariös, ich habe nach Leitungsanästhesie unter Kofferdam mit Komposit aufgebaut, Okklusion eingeschliffen und sauber poliert, Patientin beschwerdefrei beim Aufbeißen.',
        insuranceMode: 'GKV',
        expectedKeywords: ['zahn 36', 'komposit', 'okklusion'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S2',
        title: 'GKV+MKV Füllung mit Mehrkosten',
        treatmentId: 'fuellung',
        dictation: 'An 16 OD Kompositversorgung im Seitenzahnbereich, Kofferdam lag, wir haben den Patienten zur Mehrkostenvereinbarung aufgeklärt und unterschrieben, ästhetischer Wunsch war explizit genannt.',
        insuranceMode: 'GKV+MKV',
        expectedKeywords: ['zahn 16', 'mehrkosten', 'kofferdam'],
        expectedCodeSystem: 'BOTH',
    },
    {
        id: 'S3',
        title: 'PKV Füllung',
        treatmentId: 'fuellung',
        dictation: 'Bei 45 MODB direkte Kompositfüllung in Mehrschichttechnik, vorher Infiltration, trocken gelegt mit Kofferdam, Kontaktpunkt und Okklusion zum Schluss kontrolliert.',
        insuranceMode: 'PKV',
        expectedKeywords: ['zahn 45', 'komposit', 'kontaktpunkt'],
        expectedCodeSystem: 'GOZ',
    },
    {
        id: 'S4',
        title: 'GKV Endo mit Einlage',
        treatmentId: 'endo',
        dictation: 'Endo an 46, Trepanation gemacht, Arbeitslänge elektronisch mit Röntgen gegengeprüft, gespült mit NaOCl und EDTA, dann medikamentöse Einlage mit Calciumhydroxid und provisorisch verschlossen, alles unter Kofferdam.',
        insuranceMode: 'GKV',
        expectedKeywords: ['zahn 46', 'kofferdam'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S5',
        title: 'PKV Endo warm',
        treatmentId: 'endo',
        dictation: '11 endodontisch eröffnet, elektronisch die Länge genommen, rotierend aufbereitet, warm-vertikal obturiert mit Sealer, Kofferdam war durchgehend angelegt, postoperativ keine Beschwerden.',
        insuranceMode: 'PKV',
        expectedKeywords: ['zahn 11'],
        expectedCodeSystem: 'GOZ',
    },
    {
        id: 'S6',
        title: 'Multitooth GKV',
        treatmentId: 'fuellung',
        dictation: 'Heute zwei Stellen: 36 OD mit Komposit unter Kofferdam und 14 okklusal ebenfalls versorgt, danach Bisskontrolle durchgeführt und beide Füllungen nachpoliert, Patient soll bei Sensibilität wiederkommen.',
        insuranceMode: 'GKV',
        expectedKeywords: ['36', '14', 'okklusion'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S7',
        title: 'GKV Füllung mit tiefer Karies',
        treatmentId: 'fuellung',
        dictation: 'Zahn 26 mesio-okklusal tiefe Karies, nach Aufklärung unter Kofferdam versorgt, Komposit eingebracht und Okklusion kontrolliert, Patient über mögliche Sensibilität informiert.',
        insuranceMode: 'GKV',
        expectedKeywords: ['zahn 26', 'kofferdam', 'überkappung'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S8',
        title: 'PKV Füllung Frontzahn',
        treatmentId: 'fuellung',
        dictation: 'An 11 inzisal-labial defekte Füllung ersetzt, adhäsiv mit Komposit geschichtet, Form und Ästhetik angepasst, Schlusskontrolle mit Artikulationspapier.',
        insuranceMode: 'PKV',
        expectedKeywords: ['zahn 11', 'komposit'],
        expectedCodeSystem: 'GOZ',
    },
    {
        id: 'S9',
        title: 'GKV Endo Revision akut',
        treatmentId: 'endo',
        dictation: 'Akute Symptomatik an 36, Trepanation und Drainage, Arbeitslänge mit Apexlokator bestimmt, Spülprotokoll NaOCl und EDTA, medikamentöse Einlage eingebracht und dicht provisorisch verschlossen.',
        insuranceMode: 'GKV',
        expectedKeywords: ['zahn 36', 'naocl'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S10',
        title: 'PKV Endo mit Dokumentation',
        treatmentId: 'endo',
        dictation: 'Endodontische Behandlung an 21, Kofferdam gelegt, Kanäle aufbereitet, Arbeitslänge elektronisch und radiologisch gesichert, Obturation und postoperativer Hinweis zur Verlaufskontrolle dokumentiert.',
        insuranceMode: 'PKV',
        expectedKeywords: ['zahn 21', 'kofferdam'],
        expectedCodeSystem: 'GOZ',
    },
];

async function setupPage(page: Page): Promise<void> {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
    await page.route('**/firestore.googleapis.com/**', route => route.abort());
    await page.route('**/firebaseio.com/**', route => route.abort());
    await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 15000 });
}

async function selectInsuranceMode(page: Page, insuranceMode: Scenario['insuranceMode']) {
    const selector = page.locator('[data-testid="v10-insurance-select"]');
    if (insuranceMode === 'GKV') await selector.locator('button:has-text("GKV")').click();
    if (insuranceMode === 'GKV+MKV') await selector.locator('button:has-text("+MKV")').click();
    if (insuranceMode === 'PKV') await selector.locator('button:has-text("PKV")').click();
}

async function selectTreatment(page: Page, treatmentId: Scenario['treatmentId']) {
    const dropdown = page.locator('[data-testid="v10-treatment-dropdown"]');
    await dropdown.click();
    await page.locator(`[data-testid="v10-treatment-option-${treatmentId}"]`).click();
}

async function triggerRun(page: Page): Promise<void> {
    const runButton = page.locator('[data-testid="v10-run-button"]');
    await expect(runButton).toBeVisible({ timeout: 10000 });
    const lifecycle = page.locator('[data-testid="v10-run-lifecycle"]');
    let previousSeq = Number((await lifecycle.getAttribute('data-run-seq')) || '0');

    const hasProgressed = async (): Promise<boolean> => {
        const nextSeq = Number((await lifecycle.getAttribute('data-run-seq')) || '0');
        if (nextSeq > previousSeq) {
            previousSeq = nextSeq;
            return true;
        }
        const visibleSurface = await Promise.race([
            page.locator('[data-testid="v10-preanalysis-panel"]').isVisible().catch(() => false),
            page.locator('text=Voranalyse...').isVisible().catch(() => false),
            page.locator('[data-testid="v10-intent-confirmation-panel"]').isVisible().catch(() => false),
            page.locator('[data-testid="v10-questions-panel"]').isVisible().catch(() => false),
            page.locator('[data-testid="v10-output-panel"]').isVisible().catch(() => false),
            page.locator('[data-testid="v10-multi-output-panel"]').isVisible().catch(() => false),
            new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1200)),
        ]);
        return visibleSurface;
    };

    const dictationInput = page.locator('[data-testid="v10-dictation-input"]');
    await dictationInput.focus();
    await page.keyboard.press('Control+Enter');
    if (await hasProgressed()) return;

    for (let attempt = 0; attempt < 3; attempt++) {
        await runButton.click({ force: true });
        if (await hasProgressed()) return;
        await page.evaluate(() => {
            const button = document.querySelector('[data-testid="v10-run-button"]') as HTMLButtonElement | null;
            button?.click();
        });
        if (await hasProgressed()) return;
    }
    throw new Error('Run wurde nicht ausgelöst (kein sichtbarer State-Wechsel).');
}

async function answerQuestionsUntilOutput(page: Page): Promise<void> {
    for (let i = 0; i < 40; i++) {
        const toOutput = page.locator('button:has-text("Zum Output")');
        if (await toOutput.isVisible().catch(() => false)) {
            await toOutput.click();
            await page.waitForTimeout(300);
            return;
        }

        const outputText = page.locator('[data-testid="v10-output-text"]');
        if (await outputText.isVisible().catch(() => false)) return;
        const multiOutput = page.locator('[data-testid="v10-multi-output-panel"]');
        if (await multiOutput.isVisible().catch(() => false)) return;

        // Fill free-text askbacks first (input + textarea).
        const textInputs = page.locator('[data-testid^="input-"]');
        const inputCount = await textInputs.count();
        for (let t = 0; t < inputCount; t++) {
            const input = textInputs.nth(t);
            if (!(await input.isVisible().catch(() => false))) continue;
            const currentValue = await input.inputValue().catch(() => '');
            if (currentValue && currentValue.trim().length > 0) continue;
            const testId = (await input.getAttribute('data-testid')) || '';
            const inputId = testId.replace('input-', '');
            let value = 'ja';
            if (inputId.includes('betrag')) value = '150';
            if (inputId.includes('working') || inputId.includes('length')) value = '{"K1":19,"K2":18,"K3":20}';
            if (inputId.includes('surface')) value = 'o';
            await input.fill(value);
            await page.waitForTimeout(150);
        }
        const textareas = page.locator('textarea');
        const textareaCount = await textareas.count();
        for (let t = 0; t < textareaCount; t++) {
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
            if (contextText.includes('arbeitsl') || contextText.includes('canal') || contextText.includes('kanal')) value = '{"K1":19,"K2":18,"K3":20}';
            await area.fill(value);
            await page.waitForTimeout(150);
        }

        const completeBtn = page.locator('button:has-text("Fertigstellen"):not([disabled])');
        if (await completeBtn.isVisible().catch(() => false)) {
            await completeBtn.click();
            await page.waitForTimeout(350);
            continue;
        }

        const questionRows = page.locator('[data-testid^="question-row-"]');
        const rowCount = await questionRows.count();
        let answered = false;
        for (let r = 0; r < rowCount; r++) {
            const row = questionRows.nth(r);
            const activeCount = await row.locator('button[aria-pressed="true"]').count();
            if (activeCount > 0) continue;

            const options = row.locator('button[aria-pressed="false"]');
            const optionCount = await options.count();
            if (optionCount === 0) continue;

            let picked = options.first();
            for (let o = 0; o < optionCount; o++) {
                const candidate = options.nth(o);
                const label = ((await candidate.textContent()) || '').toLowerCase();
                if (label.includes('ja') || label.includes('elektr') || label.includes('naocl') || label.includes('warm')) {
                    picked = candidate;
                    break;
                }
            }
            await picked.click();
            answered = true;
            await page.waitForTimeout(250);
            break;
        }
        if (answered) continue;

        const nextBtn = page.locator('button:has-text("Weiter"):not([disabled])');
        if (await nextBtn.isVisible().catch(() => false)) {
            await nextBtn.click();
            await page.waitForTimeout(250);
            continue;
        }

        await page.waitForTimeout(250);
    }
    throw new Error('Output nicht erreicht (Questions Loop Timeout).');
}

async function openRealOutputView(page: Page): Promise<void> {
    const multiOutput = page.locator('[data-testid="v10-multi-output-panel"]');
    if (await multiOutput.isVisible().catch(() => false)) {
        await expect(page.locator('[data-testid="multi-output-paper"]')).toBeVisible({ timeout: 8000 });
        return;
    }
    const toOutput = page.locator('button:has-text("Zum Output")');
    if (await toOutput.isVisible().catch(() => false)) {
        await toOutput.click();
    }
    await page.waitForSelector('[data-testid="v10-output-text"]', { timeout: 12000 });
    await expect(page.getByText('Behandlungsdokumentation')).toBeVisible({ timeout: 6000 });
}

async function handleIntentConfirmationIfVisible(page: Page): Promise<void> {
    const confirmationPanel = page.locator('[data-testid="v10-intent-confirmation-panel"]');
    if (await confirmationPanel.isVisible().catch(() => false)) {
        const confirmButton = page.locator('[data-testid="v10-intent-confirm-button"]');
        await expect(confirmButton).toBeVisible({ timeout: 5000 });
        await confirmButton.click();
    }
}

async function waitForResultSurface(page: Page, timeoutMs = 40000): Promise<void> {
    const started = Date.now();
    let retriedRun = false;
    const lifecycle = page.locator('[data-testid="v10-run-lifecycle"]');
    const initialSeq = Number((await lifecycle.getAttribute('data-run-seq')) || '0');
    while (Date.now() - started < timeoutMs) {
        const phase = (await lifecycle.getAttribute('data-phase').catch(() => 'idle')) || 'idle';
        const currentSeq = Number((await lifecycle.getAttribute('data-run-seq').catch(() => '0')) || '0');
        const hasPreanalysis = await page.locator('[data-testid="v10-preanalysis-panel"]').isVisible().catch(() => false);
        const hasIntentConfirmation = await page.locator('[data-testid="v10-intent-confirmation-panel"]').isVisible().catch(() => false);
        const hasQuestions = await page.locator('[data-testid="v10-questions-panel"]').isVisible().catch(() => false);
        const hasOutput = await page.locator('[data-testid="v10-output-panel"]').isVisible().catch(() => false);
        const hasMultiOutput = await page.locator('[data-testid="v10-multi-output-panel"]').isVisible().catch(() => false);
        const hasError = await page.locator('[data-testid="v10-error-panel"]').isVisible().catch(() => false);
        const hasUnsupported = await page.locator('[data-testid="v10-unsupported-panel"]').isVisible().catch(() => false);
        if (hasIntentConfirmation || hasQuestions || hasOutput || hasMultiOutput || hasError || hasUnsupported) {
            return;
        }
        if (!retriedRun && currentSeq > initialSeq && phase === 'idle' && Date.now() - started > 3000) {
            const retryBtn = page.locator('[data-testid="v10-run-button"]:not([disabled])');
            if (await retryBtn.isVisible().catch(() => false)) {
                await retryBtn.click();
                retriedRun = true;
                await page.waitForTimeout(350);
                continue;
            }
        }
        if (!retriedRun && Date.now() - started > 8000) {
            const retryBtn = page.locator('[data-testid="v10-run-button"]:not([disabled])');
            if (!hasPreanalysis && await retryBtn.isVisible().catch(() => false)) {
                await retryBtn.click();
                retriedRun = true;
            }
        }
        await page.waitForTimeout(250);
    }
    throw new Error('Kein Ergebnis-Panel innerhalb des Zeitlimits sichtbar.');
}

async function extractBillingSignals(page: Page): Promise<{ codes: string[]; bemaCount: number; gozCount: number }> {
    const multiPanel = page.locator('[data-testid="v10-multi-output-panel"]');
    if (await multiPanel.isVisible().catch(() => false)) {
        const codeTags = page.locator('[data-testid^="billing-code-"]');
        const count = await codeTags.count();
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = (await codeTags.nth(i).textContent()) || '';
            const match = text.match(/(BEMA_[0-9A-ZÄ]+|GOZ_[0-9A-Z]+)/i);
            if (match) codes.push(match[1].toUpperCase());
        }
        const uniq = Array.from(new Set(codes));
        const bemaCount = uniq.filter(code => code.startsWith('BEMA_')).length;
        const gozCount = uniq.filter(code => code.startsWith('GOZ_')).length;
        return { codes: uniq, bemaCount, gozCount };
    }

    const toggle = page.locator('[data-testid="billing-toggle"]');
    if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(250);
    }
    const billingText = await page.locator('[data-testid="billing-card"]').textContent().catch(() => '');
    const rawMatches = billingText.match(/(BEMA_[0-9A-ZÄ]+|GOZ_[0-9A-Z]+)/gi) || [];
    const codes = Array.from(new Set(rawMatches.map(v => v.toUpperCase())));
    const countMatch = billingText.match(/BEMA\s*(\d+)\s*·\s*GOZ\s*(\d+)/i);
    const bemaCount = countMatch ? Number(countMatch[1]) : 0;
    const gozCount = countMatch ? Number(countMatch[2]) : 0;
    return { codes, bemaCount, gozCount };
}

function matchesExpectedSystem(
    billing: { codes: string[]; bemaCount: number; gozCount: number },
    expected: Scenario['expectedCodeSystem']
): boolean {
    const hasBema = billing.codes.some(code => code.startsWith('BEMA_')) || billing.bemaCount > 0;
    const hasGoz = billing.codes.some(code => code.startsWith('GOZ_')) || billing.gozCount > 0;
    if (expected === 'BEMA') return hasBema;
    if (expected === 'GOZ') return hasGoz;
    return hasBema && hasGoz;
}

test.describe('V10 Realistischer Praxis-Test', () => {
    test.setTimeout(240000);

    for (const scenario of SCENARIOS) {
        test(`${scenario.id} - ${scenario.title}`, async ({ page }) => {
            await setupPage(page);
            await selectTreatment(page, scenario.treatmentId);
            await selectInsuranceMode(page, scenario.insuranceMode);
            await page.fill('[data-testid="v10-dictation-input"]', scenario.dictation);
            await triggerRun(page);

            await waitForResultSurface(page);
            await handleIntentConfirmationIfVisible(page);

            await answerQuestionsUntilOutput(page);
            await openRealOutputView(page);

            const outputText = (
                (await page.locator('[data-testid="v10-output-text"]').textContent().catch(() => null))
                || (await page.locator('[data-testid="multi-output-paper"]').textContent().catch(() => null))
                || ''
            ).toLowerCase();
            const billing = await extractBillingSignals(page);

            expect(outputText.length).toBeGreaterThan(80);
            for (const keyword of scenario.expectedKeywords) {
                expect(outputText).toContain(keyword.toLowerCase());
            }
            expect(matchesExpectedSystem(billing, scenario.expectedCodeSystem)).toBe(true);
        });
    }
});
