import fs from 'node:fs';
import { test, expect, Page } from '@playwright/test';
import type { UiSelectorTreatmentId } from '../src/docudent/contracts/treatments.manifest';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const IS_LOCAL_TARGET = /localhost|127\.0\.0\.1/i.test(BASE_URL);
const FORCE_REAL_AUTH = process.env.DOCUDENT_E2E_FORCE_REAL_AUTH === '1';
const USE_LOCAL_AUTH_BYPASS = IS_LOCAL_TARGET && !FORCE_REAL_AUTH;

type ScenarioTreatmentId = UiSelectorTreatmentId;

type Scenario = {
    id: string;
    title: string;
    treatmentId: ScenarioTreatmentId;
    dictation: string;
    insuranceMode: 'GKV' | 'GKV+MKV' | 'PKV';
    expectedKeywords: string[];
    expectedCodeSystem: 'BEMA' | 'GOZ' | 'BOTH';
    expectedInstances?: number;
    expectsConfirmation?: boolean;
    confirmationOverrides?: string[];
    allowHostedFallback?: boolean;
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
        expectedKeywords: ['kofferdam', 'naocl'],
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
        expectedInstances: 2,
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
    {
        id: 'S11',
        title: 'GKV Extraktion + Füllung (Multi-Treatment)',
        treatmentId: 'extraction',
        dictation: 'Extraktion Zahn 28 nach Luxation mit Infiltrationsanästhesie; danach Füllung Zahn 16 okklusal mit Komposit unter Kofferdam, Okklusion kontrolliert.',
        insuranceMode: 'GKV',
        expectedKeywords: ['extraktion', 'zahn 16', 'zahn 28'],
        expectedCodeSystem: 'BEMA',
        expectedInstances: 2,
        allowHostedFallback: true,
    },
    {
        id: 'S12',
        title: 'PKV Kronenpräparation',
        treatmentId: 'crown_prep',
        dictation: 'Zahn 16 für Krone beschliffen, supragingival präpariert, Präzisionsabformung durchgeführt und Provisorium eingesetzt.',
        insuranceMode: 'PKV',
        expectedKeywords: ['zahn 16', 'präparation'],
        expectedCodeSystem: 'GOZ',
    },
    {
        id: 'S13',
        title: 'GKV Füllung nur Kasse',
        treatmentId: 'fuellung',
        dictation: 'Zahn 27 okklusal kariös, reine Kassenversorgung ohne Mehrkosten, Infiltration und danach Bisskontrolle.',
        insuranceMode: 'GKV',
        expectedKeywords: ['zahn 27'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S14',
        title: 'GKV+MKV Füllung Mehrschicht',
        treatmentId: 'fuellung',
        dictation: 'An Zahn 36 MOD adhäsive Kompositversorgung in Mehrschichttechnik, Aufklärung und Mehrkostenvereinbarung unterschrieben, danach Finieren und Polieren.',
        insuranceMode: 'GKV+MKV',
        expectedKeywords: ['zahn 36', 'mehrkosten'],
        expectedCodeSystem: 'BOTH',
    },
    {
        id: 'S15',
        title: 'PKV Füllung mit Nebendetails',
        treatmentId: 'fuellung',
        dictation: 'Zahn 24 distal-okklusal exkaviert und mit Komposit aufgebaut, Patient berichtete Kälteempfindlichkeit, Kontaktpunkt stabil und Okklusion fein justiert.',
        insuranceMode: 'PKV',
        expectedKeywords: ['zahn 24', 'komposit'],
        expectedCodeSystem: 'GOZ',
    },
    {
        id: 'S16',
        title: 'GKV Endo mit Kofferdam',
        treatmentId: 'endo',
        dictation: 'Endo an 47 unter Kofferdam, Arbeitslänge elektronisch, Spülung mit NaOCl und EDTA, Calciumhydroxid-Einlage und dichter provisorischer Verschluss.',
        insuranceMode: 'GKV',
        expectedKeywords: ['zahn 47', 'kofferdam'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S17',
        title: 'PKV Endo mit Röntgenkontrolle',
        treatmentId: 'endo',
        dictation: 'An Zahn 21 endodontisch eröffnet, Kanäle instrumentiert, Arbeitslängen elektronisch und radiologisch gesichert, warm obturiert und Verlauf kontrolliert.',
        insuranceMode: 'PKV',
        expectedKeywords: ['zahn 21'],
        expectedCodeSystem: 'GOZ',
    },
    {
        id: 'S18',
        title: 'GKV Füllung tiefe Karies mit Überkappung',
        treatmentId: 'fuellung',
        dictation: 'Zahn 15 mesio-okklusal tiefe Karies, keine Pulpaeröffnung, indirekte Überkappung mit Calciumhydroxid und danach Kompositfüllung, Okklusion geprüft.',
        insuranceMode: 'GKV',
        expectedKeywords: ['zahn 15', 'überkappung'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S19',
        title: 'GKV Extraktion ohne Naht',
        treatmentId: 'extraction',
        dictation: 'Zahn 38 nach Leitungsanästhesie atraumatisch entfernt, Blutstillung ohne Naht, Patient über Verhalten nach Extraktion aufgeklärt.',
        insuranceMode: 'GKV',
        expectedKeywords: ['zahn 38'],
        expectedCodeSystem: 'BEMA',
    },
    {
        id: 'S20',
        title: 'PKV schnelle Frontzahn-Füllung',
        treatmentId: 'fuellung',
        dictation: '11 ib Komposit adhäsiv, Kofferdam, finiert und poliert.',
        insuranceMode: 'PKV',
        expectedKeywords: ['zahn 11', 'komposit'],
        expectedCodeSystem: 'GOZ',
    },
];

type AuditEntry = {
    id: string;
    title: string;
    treatmentId: string;
    insuranceMode: string;
    dictation: string;
    askbacks: string[];
    askbackAnswers: Array<{
        questionId: string;
        questionLabel: string;
        answer: string;
        source: 'free_text' | 'option' | 'fallback';
    }>;
    outputFullText: string;
    outputExcerpt: string;
    billingCodes: string[];
    runtime: {
        extractionMethod: string;
        extractionLlmError: string;
        preanalysisSource: string;
        preanalysisFallback: string;
        preanalysisError: string;
        preanalysisDiagnostics: string;
    };
};

const auditEntries: AuditEntry[] = [];

function inferToothFromInputId(inputId: string): string | undefined {
    const scopedMatch = inputId.match(/::tooth:(\d{2})/i);
    if (scopedMatch?.[1]) return scopedMatch[1];
    const inlineMatch = inputId.match(/\btooth[:_-]?(\d{2})\b/i);
    if (inlineMatch?.[1]) return inlineMatch[1];
    return undefined;
}

function inferCanalCountForTooth(tooth: string | undefined): number {
    if (!tooth) return 2;
    const numeric = Number.parseInt(tooth, 10);
    if (!Number.isFinite(numeric)) return 2;
    const quadrant = Math.floor(numeric / 10);
    const position = numeric % 10;
    if (position >= 1 && position <= 3) return 1;
    if (position === 4 || position === 5) return quadrant <= 2 ? 2 : 1;
    return 3;
}

function buildWorkingLengthPayload(canalCount: number): string {
    const entries: Record<string, number> = {};
    for (let i = 1; i <= canalCount; i += 1) {
        entries[`K${i}`] = 20 - i;
    }
    return JSON.stringify(entries);
}

function resolveFreeTextAuditAnswer(inputId: string): string {
    const key = inputId.toLowerCase();
    const tooth = inferToothFromInputId(inputId);
    const canalCount = inferCanalCountForTooth(tooth);
    if (key.includes('betrag') || key.includes('amount')) return '150';
    if (key.includes('working') || key.includes('length')) return buildWorkingLengthPayload(canalCount);
    if (key.includes('canal_count') || key.includes('kanalzahl')) return String(canalCount);
    if (key.includes('medication') || key.includes('medik')) return 'Ca(OH)2';
    if (key.includes('surface') || key.includes('flaeche') || key.includes('fläche')) return 'o';
    if (key.includes('roentgen_befund') || key.includes('roentgenbefund')) return 'Apikale Auffaelligkeit regio 36';
    if (key.includes('roentgen_indikation') || key.includes('indikation')) return 'Diagnostik und Therapieplanung';
    if (key.includes('roentgen_typ') || key.includes('roentgentyp')) return 'OPG';
    if (key.includes('befund')) return 'Klinischer Befund dokumentiert';
    if (key.includes('anlass')) return 'Kontrolluntersuchung';
    if (key.includes('intervall') || key.includes('interval')) return '6 Monate';
    return 'ja';
}

async function setupPage(page: Page): Promise<void> {
    await page.addInitScript((useBypassAuth: boolean) => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = useBypassAuth;
        window.localStorage.setItem('v10_debug', 'true');
    }, USE_LOCAL_AUTH_BYPASS);
    if (USE_LOCAL_AUTH_BYPASS) {
        await page.route('**/firestore.googleapis.com/**', route => route.abort());
        await page.route('**/firebaseio.com/**', route => route.abort());
    }
    const dictationSelector = '[data-testid="v10-dictation-input"]';
    const loginSelector = 'button:has-text("Einloggen")';

    const isDictationVisible = async (timeout = 2000): Promise<boolean> => {
        return page.locator(dictationSelector).first().isVisible({ timeout }).catch(() => false);
    };

    const tryLoginIfNeeded = async (): Promise<void> => {
        const emailInput = page.locator('input[type="email"], input[placeholder*="E-Mail" i]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        const loginButton = page.locator(loginSelector).first();
        const loginVisible = await loginButton.isVisible({ timeout: 3500 }).catch(() => false);
        if (!loginVisible) return;

        const email = process.env.E2E_LOGIN_EMAIL;
        const password = process.env.E2E_LOGIN_PASSWORD;
        if (!email || !password) {
            throw new Error('Hosted Login erkannt, aber Credentials fehlen. Setze E2E_LOGIN_EMAIL und E2E_LOGIN_PASSWORD.');
        }

        await emailInput.fill(email);
        await passwordInput.fill(password);
        await loginButton.click();
        await Promise.race([
            page.waitForURL('**/home', { timeout: 12000 }),
            page.waitForURL('**/dashboard', { timeout: 12000 }),
            page.waitForURL('**/docudent/v10**', { timeout: 12000 }),
            page.locator('text=Login fehlgeschlagen').first().waitFor({ state: 'visible', timeout: 12000 }),
        ]).catch(() => {});
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        const authError = page.locator('text=Login fehlgeschlagen').first();
        if (await authError.isVisible({ timeout: 1500 }).catch(() => false)) {
            throw new Error('Hosted Login fehlgeschlagen: E2E Credentials wurden abgelehnt.');
        }
    };

    const clickFirstVisible = async (selectors: string[]): Promise<boolean> => {
        for (const selector of selectors) {
            const locator = page.locator(selector).first();
            const visible = await locator.isVisible({ timeout: 1200 }).catch(() => false);
            if (!visible) continue;
            await locator.click({ force: true });
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            return true;
        }
        return false;
    };

    await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    if (await isDictationVisible(3000)) return;

    for (let attempt = 0; attempt < 6; attempt += 1) {
        await tryLoginIfNeeded();
        if (await isDictationVisible(3000)) return;

        const clicked = await clickFirstVisible([
            'a[href="/docudent/v10"]',
            'a[href*="/docudent/v10"]',
            'a:has-text("V10")',
            'button:has-text("V10")',
            'button:has-text("Starten")',
            'a:has-text("Starten")',
            'button:has-text("Dokumentieren")',
            'a:has-text("Dokumentieren")',
        ]);

        if (!clicked) {
            await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
        }

        // Hosted can take longer until auth redirect settles.
        await page.waitForTimeout(900);
        if (await isDictationVisible(3000)) return;
    }

    await page.waitForSelector(dictationSelector, { timeout: 30000 });
}

async function assertHostedLlmPath(page: Page, scenario: Scenario): Promise<void> {
    if (USE_LOCAL_AUTH_BYPASS) return;
    const scenarioId = scenario.id;
    const runtimeMeta = page.locator('[data-testid="v10-llm-runtime-meta"]');
    await expect(runtimeMeta, `${scenarioId}: runtime meta missing`).toHaveCount(1, { timeout: 10000 });

    const allowHostedFallback = scenario.allowHostedFallback === true
        && process.env.DOCUDENT_AUDIT_ALLOW_HOSTED_FALLBACK === '1';
    if (allowHostedFallback) {
        const preanalysisSource = await runtimeMeta.getAttribute('data-preanalysis-source');
        if (preanalysisSource === 'fallback') {
            await expect(runtimeMeta, `${scenarioId}: fallback marker missing`).toHaveAttribute('data-preanalysis-fallback', 'true');
            await expect(page.locator('[data-testid="v10-llm-fallback-banner"]'), `${scenarioId}: fallback banner should be visible`).toBeVisible();
            return;
        }
    }

    await expect(runtimeMeta, `${scenarioId}: preanalysis is not llm`).toHaveAttribute('data-preanalysis-source', 'llm');
    await expect(runtimeMeta, `${scenarioId}: preanalysis fallback active`).toHaveAttribute('data-preanalysis-fallback', 'false');
    await expect(runtimeMeta, `${scenarioId}: extraction is not llm`).toHaveAttribute('data-extraction-method', 'llm');
    await expect(runtimeMeta, `${scenarioId}: extraction llm error present`).toHaveAttribute('data-extraction-llm-error', 'none');
    await expect(page.locator('[data-testid="v10-llm-fallback-banner"]'), `${scenarioId}: fallback banner visible on hosted`).toBeHidden();
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
    const hasLifecycle = (await lifecycle.count()) > 0;
    let previousSeq = hasLifecycle
        ? Number((await lifecycle.first().getAttribute('data-run-seq')) || '0')
        : 0;
    const hasResultSurfaceVisible = async (): Promise<boolean> => {
        const checks = [
            page.locator('[data-testid="v10-intent-confirmation-panel"]').first(),
            page.locator('[data-testid="v10-questions-panel"]').first(),
            page.locator('[data-testid="v10-output-panel"]').first(),
            page.locator('[data-testid="v10-multi-output-panel"]').first(),
            page.locator('text=Details klären').first(),
            page.locator('text=Behandlungsdokumentation').first(),
        ];
        for (const locator of checks) {
            if (await locator.isVisible().catch(() => false)) return true;
        }
        return false;
    };
    const hadVisibleSurfaceBefore = await hasResultSurfaceVisible();
    if (hadVisibleSurfaceBefore) return;

    const hasProgressed = async (): Promise<boolean> => {
        if (hasLifecycle) {
            const nextSeq = Number((await lifecycle.first().getAttribute('data-run-seq')) || '0');
            if (nextSeq > previousSeq) {
                previousSeq = nextSeq;
                return true;
            }
        }
        const hasPreanalysis = await page.locator('[data-testid="v10-preanalysis-panel"]').first().isVisible().catch(() => false);
        const hasPreanalysisLabel = await page.locator('text=Voranalyse...').first().isVisible().catch(() => false);
        const hasVisibleResult = await hasResultSurfaceVisible();
        if (!hasPreanalysis && !hasPreanalysisLabel && !hasVisibleResult) return false;
        return !hadVisibleSurfaceBefore || hasVisibleResult;
    };

    const dictationInput = page.locator('[data-testid="v10-dictation-input"]');
    await dictationInput.focus();
    await page.keyboard.press('Control+Enter');
    for (let waitTry = 0; waitTry < 3; waitTry += 1) {
        if (await hasProgressed()) return;
        await page.waitForTimeout(700);
    }
    if (await hasProgressed()) return;

    for (let attempt = 0; attempt < 3; attempt++) {
        await runButton.click({ force: true, timeout: 2500 }).catch(() => {});
        if (await hasProgressed()) return;
        await page.evaluate(() => {
            const button = document.querySelector('[data-testid="v10-run-button"]') as HTMLButtonElement | null;
            button?.click();
        });
        if (await hasProgressed()) return;
    }
    throw new Error('Run wurde nicht ausgelöst (kein sichtbarer State-Wechsel).');
}

async function answerQuestionsUntilOutput(page: Page): Promise<AuditEntry['askbackAnswers']> {
    const answerLog: AuditEntry['askbackAnswers'] = [];
    for (let i = 0; i < 40; i++) {
        const toOutput = page.locator('button:has-text("Zum Output")');
        if (await toOutput.isVisible().catch(() => false)) {
            await toOutput.click();
            await page.waitForTimeout(300);
            return answerLog;
        }

        const outputText = page.locator('[data-testid="v10-output-text"]');
        if (await outputText.isVisible().catch(() => false)) return answerLog;
        const multiOutput = page.locator('[data-testid="v10-multi-output-panel"]');
        if (await multiOutput.isVisible().catch(() => false)) return answerLog;
        if (await page.getByText('Behandlungsdokumentation').first().isVisible().catch(() => false)) return answerLog;

        // Multi-lane askbacks: switch to a lane with unresolved required answers.
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
                await page.waitForTimeout(200);
                break;
            }
        }

        // Fill free-text askbacks via stable per-question input testids.
        const textInputs = page.locator('[data-testid^="input-"]');
        const inputCount = await textInputs.count();
        for (let t = 0; t < inputCount; t++) {
            const input = textInputs.nth(t);
            if (!(await input.isVisible().catch(() => false))) continue;
            const currentValue = await input.inputValue().catch(() => '');
            if (currentValue && currentValue.trim().length > 0) continue;
            const testId = (await input.getAttribute('data-testid')) || '';
            const inputId = testId.replace('input-', '');
            const value = resolveFreeTextAuditAnswer(inputId);
            const questionRow = input.locator('xpath=ancestor::*[@data-testid and starts-with(@data-testid, "question-row-")][1]');
            const questionLabel = ((await questionRow.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
            await input.fill(value);
            answerLog.push({
                questionId: inputId || 'unknown',
                questionLabel: questionLabel || inputId || 'Freitextfrage',
                answer: value,
                source: 'free_text',
            });
            await page.waitForTimeout(150);
        }

        const completeBtn = page.locator('[data-testid="complete-button"]');
        if (await completeBtn.isVisible().catch(() => false)) {
            const isDisabled = await completeBtn.isDisabled().catch(() => true);
            if (!isDisabled) {
                await completeBtn.click({ force: true });
                await page.evaluate(() => {
                    const button = document.querySelector('[data-testid="complete-button"]') as HTMLButtonElement | null;
                    button?.click();
                });
                await page.waitForTimeout(450);
                continue;
            }
        }
        const completeBtnFallback = page.locator('button:has-text("Fertigstellen"):not([disabled])').last();
        if (await completeBtnFallback.isVisible().catch(() => false)) {
            await completeBtnFallback.click({ force: true });
            await page.waitForTimeout(450);
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
            const pickedLabel = (((await picked.textContent()) ?? '') || '').replace(/\s+/g, ' ').trim().slice(0, 180);
            const rowTestId = (await row.getAttribute('data-testid').catch(() => null)) || '';
            const questionId = rowTestId.replace('question-row-', '') || 'unknown';
            const questionLabel = ((await row.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
            await picked.click();
            answerLog.push({
                questionId,
                questionLabel: questionLabel || questionId,
                answer: pickedLabel || 'selected',
                source: 'option',
            });
            answered = true;
            await page.waitForTimeout(250);
            break;
        }
        if (answered) continue;

        // Hosted fallback: click first visible askback choice button inside main panel.
        const hostedChoice = page
            .locator('main button:not([disabled])')
            .filter({ hasNotText: /optional|mehr|weiter|zum output|fertigstellen|einstellungen|gkv|\+mkv|pkv|kurz|mittel|lang|füllung|endo|krone/i })
            .first();
        if (await hostedChoice.isVisible().catch(() => false)) {
            const choiceLabel = (((await hostedChoice.textContent()) ?? '') || '').replace(/\s+/g, ' ').trim().slice(0, 180);
            await hostedChoice.click();
            answerLog.push({
                questionId: 'unknown',
                questionLabel: 'Hosted fallback choice',
                answer: choiceLabel || 'selected',
                source: 'fallback',
            });
            await page.waitForTimeout(250);
            continue;
        }

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
    const hasV10Output = await page.locator('[data-testid="v10-output-text"]').isVisible({ timeout: 12000 }).catch(() => false);
    if (!hasV10Output) {
        await expect(page.getByText('Behandlungsdokumentation')).toBeVisible({ timeout: 12000 });
        return;
    }
    await expect(page.getByText('Behandlungsdokumentation')).toBeVisible({ timeout: 6000 });
}

async function handleIntentConfirmationIfVisible(page: Page, scenario: Scenario): Promise<boolean> {
    const confirmationPanel = page.locator('[data-testid="v10-intent-confirmation-panel"]');
    if (await confirmationPanel.isVisible().catch(() => false)) {
        const clickAllOptionsForTreatment = async (treatmentId: string) => {
            const options = confirmationPanel.locator(`[data-testid$="-${treatmentId}"]`);
            const optionCount = await options.count();
            for (let i = 0; i < optionCount; i += 1) {
                const option = options.nth(i);
                if (!(await option.isVisible().catch(() => false))) continue;
                await option.click({ force: true });
            }
            if (optionCount > 0) {
                await page.waitForTimeout(120);
            }
        };

        for (const treatmentId of scenario.confirmationOverrides ?? []) {
            const options = confirmationPanel.locator(`[data-testid$="-${treatmentId}"]`);
            const optionCount = await options.count();
            expect(optionCount, `Intent-Option ${treatmentId} fehlt`).toBeGreaterThan(0);
            await clickAllOptionsForTreatment(treatmentId);
        }
        const confirmButton = page.locator('[data-testid="v10-intent-confirm-button"]');
        await expect(confirmButton).toBeVisible({ timeout: 5000 });

        const laneIds = async (): Promise<string[]> => {
            const lanes = confirmationPanel.locator('[data-testid^="v10-intent-lane-"]');
            const laneCount = await lanes.count();
            const ids: string[] = [];
            for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
                const lane = lanes.nth(laneIndex);
                const laneId = (await lane.getAttribute('data-testid')) || '';
                const laneParts = laneId.split('v10-intent-lane-');
                if (laneParts.length !== 2 || !laneParts[1]) continue;
                ids.push(laneParts[1]);
            }
            return ids;
        };

        const tryResolveUnselectedLanes = async () => {
            const ids = await laneIds();
            const preferredOrder = Array.from(new Set([
                scenario.treatmentId,
                'fuellung',
                'endo',
                'extraction',
                'crown_prep',
            ]));

            for (const intentId of ids) {
                const selectedOption = confirmationPanel.locator(`[data-testid^="v10-intent-option-${intentId}-"][aria-pressed="true"]`);
                if (await selectedOption.count() > 0) continue;

                let clicked = false;
                for (const treatmentId of preferredOrder) {
                    const option = confirmationPanel.locator(`[data-testid="v10-intent-option-${intentId}-${treatmentId}"]`).first();
                    if (await option.count() > 0) {
                        await option.scrollIntoViewIfNeeded().catch(() => {});
                        await option.click({ force: true });
                        clicked = true;
                        await page.waitForTimeout(80);
                        break;
                    }
                }

                if (!clicked) {
                    const firstOption = confirmationPanel.locator(`[data-testid^="v10-intent-option-${intentId}-"]`).first();
                    if (await firstOption.count() > 0) {
                        await firstOption.scrollIntoViewIfNeeded().catch(() => {});
                        await firstOption.click({ force: true });
                        await page.waitForTimeout(80);
                    }
                }
            }
        };

        if (await confirmButton.isDisabled().catch(() => false)) {
            await clickAllOptionsForTreatment(scenario.treatmentId);
        }
        for (let pass = 0; pass < 3; pass += 1) {
            if (!await confirmButton.isDisabled().catch(() => false)) break;
            await tryResolveUnselectedLanes();
            await page.waitForTimeout(150);
        }

        if (await confirmButton.isDisabled().catch(() => false)) {
            await page.evaluate(() => {
                const laneNodes = Array.from(document.querySelectorAll('[data-testid^="v10-intent-lane-"]'));
                for (const lane of laneNodes) {
                    const laneTestId = lane.getAttribute('data-testid') ?? '';
                    const laneId = laneTestId.replace('v10-intent-lane-', '');
                    if (!laneId) continue;
                    const selected = document.querySelector(`[data-testid^="v10-intent-option-${laneId}-"][aria-pressed="true"]`);
                    if (selected) continue;
                    const first = document.querySelector(`[data-testid^="v10-intent-option-${laneId}-"]`) as HTMLButtonElement | null;
                    first?.click();
                }
            });
            await page.waitForTimeout(180);
        }

        await expect(confirmButton).toBeEnabled({ timeout: 5000 });
        await confirmButton.click();
        return true;
    }
    return false;
}

async function waitForResultSurface(page: Page, timeoutMs = 40000): Promise<void> {
    const started = Date.now();
    let retriedRun = false;
    const lifecycle = page.locator('[data-testid="v10-run-lifecycle"]');
    const hasLifecycle = (await lifecycle.count()) > 0;
    const initialSeq = hasLifecycle
        ? Number((await lifecycle.first().getAttribute('data-run-seq')) || '0')
        : 0;
    while (Date.now() - started < timeoutMs) {
        const phase = hasLifecycle
            ? ((await lifecycle.first().getAttribute('data-phase').catch(() => 'idle')) || 'idle')
            : 'idle';
        const currentSeq = hasLifecycle
            ? Number((await lifecycle.first().getAttribute('data-run-seq').catch(() => '0')) || '0')
            : 0;
        const hasPreanalysis = await page.locator('[data-testid="v10-preanalysis-panel"]').isVisible().catch(() => false);
        const hasIntentConfirmation = await page.locator('[data-testid="v10-intent-confirmation-panel"]').isVisible().catch(() => false);
        const hasQuestions = await page.locator('[data-testid="v10-questions-panel"]').isVisible().catch(() => false);
        const hasOutput = await page.locator('[data-testid="v10-output-panel"]').isVisible().catch(() => false);
        const hasMultiOutput = await page.locator('[data-testid="v10-multi-output-panel"]').isVisible().catch(() => false);
        const hasError = await page.locator('[data-testid="v10-error-panel"]').isVisible().catch(() => false);
        const hasUnsupported = await page.locator('[data-testid="v10-unsupported-panel"]').isVisible().catch(() => false);
        const hasQuestionsFallback = await page.locator('text=Details klären').first().isVisible().catch(() => false);
        const hasOutputFallback = await page.locator('text=Behandlungsdokumentation').first().isVisible().catch(() => false);
        if (
            hasIntentConfirmation
            || hasQuestions
            || hasOutput
            || hasMultiOutput
            || hasError
            || hasUnsupported
            || hasQuestionsFallback
            || hasOutputFallback
        ) {
            return;
        }
        if (!retriedRun && hasLifecycle && currentSeq > initialSeq && phase === 'idle' && Date.now() - started > 3000) {
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

async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
    const metrics = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        return {
            htmlClientWidth: html.clientWidth,
            htmlScrollWidth: html.scrollWidth,
            bodyClientWidth: body?.clientWidth ?? 0,
            bodyScrollWidth: body?.scrollWidth ?? 0,
        };
    });
    const htmlOverflow = metrics.htmlScrollWidth - metrics.htmlClientWidth;
    const bodyOverflow = metrics.bodyScrollWidth - metrics.bodyClientWidth;
    expect(
        Math.max(htmlOverflow, bodyOverflow),
        `${label}: horizontales Overflow erkannt (${JSON.stringify(metrics)})`
    ).toBeLessThanOrEqual(1);
}

async function extractBillingSignals(page: Page): Promise<{ codes: string[]; bemaCount: number; gozCount: number }> {
    const codePattern = /(BEMA_[0-9Ä]+[A-Z]?|GOZ_[0-9]{4})/gi;
    const multiPanel = page.locator('[data-testid="v10-multi-output-panel"]');
    if (await multiPanel.isVisible().catch(() => false)) {
        const codeTags = page.locator('[data-testid^="billing-code-"]');
        const count = await codeTags.count();
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = (await codeTags.nth(i).textContent()) || '';
            const matches = text.match(codePattern) || [];
            for (const code of matches) {
                codes.push(code.toUpperCase());
            }
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
    const rawMatches = billingText.match(codePattern) || [];
    const codes = Array.from(new Set(rawMatches.map(v => v.toUpperCase())));
    const countMatch = billingText.match(/BEMA\s*(\d+)\s*·\s*GOZ\s*(\d+)/i);
    const fallbackText = countMatch ? billingText : (await page.locator('body').innerText().catch(() => ''));
    const fallbackCountMatch = fallbackText.match(/BEMA\s*(\d+)\s*[·|/]\s*GOZ\s*(\d+)/i);
    const bemaCount = countMatch ? Number(countMatch[1]) : (fallbackCountMatch ? Number(fallbackCountMatch[1]) : 0);
    const gozCount = countMatch ? Number(countMatch[2]) : (fallbackCountMatch ? Number(fallbackCountMatch[2]) : 0);
    return { codes, bemaCount, gozCount };
}

async function extractAskbackLabels(page: Page): Promise<string[]> {
    const labels = new Set<string>();
    const questionRows = page.locator('[data-testid^="question-row-"]');
    const rowCount = await questionRows.count().catch(() => 0);
    for (let i = 0; i < rowCount; i++) {
        const txt = ((await questionRows.nth(i).textContent().catch(() => '')) ?? '').trim();
        if (!txt) continue;
        labels.add(txt.replace(/\s+/g, ' ').slice(0, 200));
    }
    if (labels.size > 0) return Array.from(labels);

    const requiredCard = page.locator('[data-testid="v10-questions-panel"]').first();
    const raw = ((await requiredCard.textContent().catch(() => '')) ?? '').trim();
    if (!raw) return [];
    for (const line of raw.split('\n')) {
        const norm = line.trim();
        if (!norm) continue;
        if (/erforderlich|optional|details klären|pflicht|quelle/i.test(norm)) continue;
        labels.add(norm.replace(/\s+/g, ' ').slice(0, 200));
        if (labels.size >= 10) break;
    }
    return Array.from(labels);
}

async function extractOutputTextForAudit(page: Page): Promise<string> {
    const sectionNodes = page.locator('[data-testid^="section-"]');
    const sectionCount = await sectionNodes.count().catch(() => 0);
    if (sectionCount > 0) {
        const parts: string[] = [];
        for (let i = 0; i < sectionCount; i++) {
            const section = sectionNodes.nth(i);
            const title = ((await section.locator('div').first().textContent().catch(() => '')) ?? '').trim();
            const body = ((await section.locator('div').nth(1).textContent().catch(() => '')) ?? '').trim();
            if (!title && !body) continue;
            parts.push(`[${title}]`);
            if (body) {
                parts.push(body);
            }
        }
        if (parts.length > 0) {
            return parts.join('\n\n');
        }
    }

    return (
        (await page.locator('[data-testid="output-fulltext"]').textContent().catch(() => null))
        || (await page.locator('[data-testid="v10-output-text"]').textContent().catch(() => null))
        || (await page.locator('[data-testid="multi-output-paper"]').textContent().catch(() => null))
        || (await page.locator('main').first().textContent().catch(() => null))
        || ''
    );
}

async function extractMultiInstanceBillingCoverage(page: Page): Promise<{
    runCards: number;
    uniqueInstanceIds: number;
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

    const codeTags = page.locator('[data-testid^="billing-code-"]');
    const codeTagCount = await codeTags.count().catch(() => 0);
    const billedInstanceIds = new Set<string>();
    for (let i = 0; i < codeTagCount; i++) {
        const raw = ((await codeTags.nth(i).textContent().catch(() => '')) ?? '').trim();
        if (!raw) continue;
        const instanceMatch = raw.match(/·\s*([a-z0-9_-]+)/i);
        if (instanceMatch?.[1]) billedInstanceIds.add(instanceMatch[1]);
    }

    const coveredRunCards = runCardIds.filter(id => id.length > 0 && billedInstanceIds.has(id)).length;
    return {
        runCards,
        uniqueInstanceIds: billedInstanceIds.size,
        coveredRunCards,
    };
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

    test.afterAll(async () => {
        const preanalysisLlmCount = auditEntries.filter(entry => entry.runtime.preanalysisSource === 'llm').length;
        const preanalysisFallbackCount = auditEntries.filter(entry => entry.runtime.preanalysisFallback === 'true').length;
        const preanalysisLoginRequiredCount = auditEntries.filter(
            entry => entry.runtime.preanalysisDiagnostics.toLowerCase().includes('login required')
        ).length;
        const extractionLlmCount = auditEntries.filter(entry => entry.runtime.extractionMethod === 'llm').length;
        const extractionStubCount = auditEntries.filter(entry => entry.runtime.extractionMethod === 'stub').length;
        const extractionRegexCount = auditEntries.filter(entry => entry.runtime.extractionMethod === 'regex').length;
        const extractionUnknownCount = auditEntries.filter(entry => entry.runtime.extractionMethod === 'unknown').length;
        const lines: string[] = [];
        lines.push('# Hosted V10 Audit 20 Cases');
        lines.push('');
        lines.push(`- Date: ${new Date().toISOString()}`);
        lines.push(`- Base URL: ${BASE_URL}`);
        lines.push(`- Auth Mode: localBypass=${String(USE_LOCAL_AUTH_BYPASS)}, forceRealAuth=${String(FORCE_REAL_AUTH)}`);
        lines.push(`- Cases: ${auditEntries.length}`);
        lines.push(`- Summary: extraction.llm=${extractionLlmCount}/${auditEntries.length}, preanalysis.llm=${preanalysisLlmCount}/${auditEntries.length}, preanalysis.fallback=${preanalysisFallbackCount}/${auditEntries.length}, preanalysis.loginRequired=${preanalysisLoginRequiredCount}/${auditEntries.length}`);
        lines.push('');
        for (const entry of auditEntries) {
            lines.push(`## ${entry.id} — ${entry.title}`);
            lines.push(`- Treatment/Insurance: ${entry.treatmentId} / ${entry.insuranceMode}`);
            lines.push(
                `- Runtime: extraction=${entry.runtime.extractionMethod} (${entry.runtime.extractionLlmError}), preanalysis=${entry.runtime.preanalysisSource}, fallback=${entry.runtime.preanalysisFallback}`
            );
            if (entry.runtime.preanalysisError !== 'none') {
                lines.push(`- Preanalysis error: ${entry.runtime.preanalysisError}`);
            }
            if (entry.runtime.preanalysisDiagnostics !== 'none') {
                lines.push(`- Preanalysis diagnostics: ${entry.runtime.preanalysisDiagnostics}`);
            }
            lines.push(`- Askbacks (erkannt): ${entry.askbacks.length > 0 ? entry.askbacks.join(' | ') : 'none'}`);
            lines.push(`- Askbacks (beantwortet): ${entry.askbackAnswers.length}`);
            for (const qa of entry.askbackAnswers) {
                lines.push(`- QA [${qa.source}] ${qa.questionId}: ${qa.questionLabel} => ${qa.answer}`);
            }
            lines.push(`- Billing: ${entry.billingCodes.join(', ') || 'none'}`);
            lines.push(`- Output excerpt: ${entry.outputExcerpt}`);
            lines.push('- Output fulltext:');
            lines.push('```text');
            lines.push(entry.outputFullText || '(leer)');
            lines.push('```');
            lines.push('');
        }

        const isFullSuite = auditEntries.length === SCENARIOS.length;
        const timestampTag = new Date().toISOString().replace(/[:.]/g, '-');
        const markdownPath = isFullSuite
            ? 'docs/system-atlas/procedure/hosted-audit-20-2026-02-16.md'
            : `docs/system-atlas/procedure/hosted-audit-20-partial-${timestampTag}.md`;
        const markdownLatestPath = 'docs/system-atlas/procedure/hosted-audit-20-latest.md';
        fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`, 'utf8');
        fs.writeFileSync(markdownLatestPath, `${lines.join('\n')}\n`, 'utf8');

        const reportDir = 'docs/system-atlas/artifacts/_latest/v10-hosted-audit-20';
        fs.mkdirSync(reportDir, { recursive: true });
        const reportPayload = {
            runAt: new Date().toISOString(),
            baseUrl: BASE_URL,
            isFullSuite,
            authMode: {
                localBypass: USE_LOCAL_AUTH_BYPASS,
                forceRealAuth: FORCE_REAL_AUTH,
            },
            summary: {
                cases: auditEntries.length,
                extraction: {
                    llm: extractionLlmCount,
                    stub: extractionStubCount,
                    regex: extractionRegexCount,
                    unknown: extractionUnknownCount,
                },
                preanalysis: {
                    llm: preanalysisLlmCount,
                    fallback: preanalysisFallbackCount,
                    loginRequired: preanalysisLoginRequiredCount,
                },
            },
            cases: auditEntries,
        };
        const json = `${JSON.stringify(reportPayload, null, 2)}\n`;
        const reportPath = isFullSuite
            ? `${reportDir}/report.json`
            : `${reportDir}/report.partial.${timestampTag}.json`;
        fs.writeFileSync(reportPath, json, 'utf8');
        fs.writeFileSync(`${reportDir}/report.latest.json`, json, 'utf8');

        const strictPreanalysis = process.env.DOCUDENT_AUDIT_STRICT_PREANALYSIS_LLM === '1'
            || (!USE_LOCAL_AUTH_BYPASS && process.env.DOCUDENT_AUDIT_ALLOW_HOSTED_FALLBACK !== '1');
        if (strictPreanalysis && preanalysisLlmCount !== auditEntries.length) {
            throw new Error(
                `Strict preanalysis mode failed: preanalysis.llm=${preanalysisLlmCount}/${auditEntries.length}, fallback=${preanalysisFallbackCount}/${auditEntries.length}`
            );
        }
    });

    for (const scenario of SCENARIOS) {
        test(`${scenario.id} - ${scenario.title}`, async ({ page }) => {
            await setupPage(page);
            await selectTreatment(page, scenario.treatmentId);
            await selectInsuranceMode(page, scenario.insuranceMode);
            await page.fill('[data-testid="v10-dictation-input"]', scenario.dictation);
            await triggerRun(page);

            await waitForResultSurface(page);
            const confirmationShown = await handleIntentConfirmationIfVisible(page, scenario);
            const enforceConfirmation = scenario.expectsConfirmation && IS_LOCAL_TARGET;
            if (enforceConfirmation) {
                expect(confirmationShown).toBe(true);
            }
            const askbacks = await extractAskbackLabels(page);
            await expectNoHorizontalOverflow(page, `${scenario.id} questions`);

            const askbackAnswers = await answerQuestionsUntilOutput(page);
            await openRealOutputView(page);
            await assertHostedLlmPath(page, scenario);
            await expectNoHorizontalOverflow(page, `${scenario.id} output`);

            const outputTextRaw = await extractOutputTextForAudit(page);
            const outputTextNormalized = outputTextRaw.toLowerCase();
            const billing = await extractBillingSignals(page);
            const runtimeMeta = page.locator('[data-testid="v10-llm-runtime-meta"]').first();
            const runtime = {
                extractionMethod: (await runtimeMeta.getAttribute('data-extraction-method').catch(() => 'unknown')) || 'unknown',
                extractionLlmError: (await runtimeMeta.getAttribute('data-extraction-llm-error').catch(() => 'unknown')) || 'unknown',
                preanalysisSource: (await runtimeMeta.getAttribute('data-preanalysis-source').catch(() => 'unknown')) || 'unknown',
                preanalysisFallback: (await runtimeMeta.getAttribute('data-preanalysis-fallback').catch(() => 'unknown')) || 'unknown',
                preanalysisError: (await runtimeMeta.getAttribute('data-preanalysis-error').catch(() => null)) || 'none',
                preanalysisDiagnostics: (await runtimeMeta.getAttribute('data-preanalysis-diagnostics').catch(() => null)) || 'none',
            };

            auditEntries.push({
                id: scenario.id,
                title: scenario.title,
                treatmentId: scenario.treatmentId,
                insuranceMode: scenario.insuranceMode,
                dictation: scenario.dictation,
                askbacks,
                askbackAnswers,
                outputFullText: outputTextRaw,
                outputExcerpt: outputTextRaw.replace(/\s+/g, ' ').trim().slice(0, 320),
                billingCodes: billing.codes,
                runtime,
            });

            expect(outputTextRaw.length).toBeGreaterThan(80);
            for (const keyword of scenario.expectedKeywords) {
                expect(outputTextNormalized).toContain(keyword.toLowerCase());
            }
            expect(matchesExpectedSystem(billing, scenario.expectedCodeSystem)).toBe(true);

            if ((scenario.expectedInstances ?? 1) > 1) {
                const coverage = await extractMultiInstanceBillingCoverage(page);
                const bestEvidence = Math.max(
                    coverage.coveredRunCards,
                    coverage.uniqueInstanceIds,
                    coverage.runCards
                );
                expect(
                    bestEvidence,
                    `${scenario.id}: instance-bound billing coverage too low (${JSON.stringify(coverage)})`
                ).toBeGreaterThanOrEqual(scenario.expectedInstances ?? 1);
            }
        });
    }
});
