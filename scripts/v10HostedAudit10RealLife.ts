import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import type { UiSelectorTreatmentId } from '../src/docudent/contracts/treatments.manifest';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://zahnarzt-app.web.app';
const IS_LOCAL_TARGET = /localhost|127\.0\.0\.1/i.test(BASE_URL);
const EMAIL = process.env.E2E_LOGIN_EMAIL || '';
const PASSWORD = process.env.E2E_LOGIN_PASSWORD || '';

if (!IS_LOCAL_TARGET && (!EMAIL || !PASSWORD)) {
  console.error('Missing E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD for hosted run');
  process.exit(1);
}

type Insurance = 'GKV' | 'GKV+MKV' | 'PKV';

type Scenario = {
  id: string;
  title: string;
  treatmentId: UiSelectorTreatmentId;
  insuranceMode: Insurance;
  dictation: string;
};

type IntentOption = {
  testId: string;
  label: string;
  selected: boolean;
};

type IntentLane = {
  laneId: string;
  options: IntentOption[];
};

type AskbackAnswer = {
  questionId: string;
  questionLabel: string;
  answer: string;
  source: 'free_text' | 'option' | 'fallback';
};

type RuntimeMeta = {
  extractionMethod: string;
  extractionLlmError: string;
  preanalysisSource: string;
  preanalysisFallback: string;
  preanalysisError: string;
  preanalysisDiagnostics: string;
};

type ScenarioResult = {
  id: string;
  title: string;
  treatmentId: UiSelectorTreatmentId;
  insuranceMode: Insurance;
  dictation: string;
  llmDecomposition: {
    confirmationShown: boolean;
    lanes: IntentLane[];
  };
  askbacks: string[];
  askbackAnswers: AskbackAnswer[];
  outputFullText: string;
  billingCodes: string[];
  runtime: RuntimeMeta;
  findings: string[];
};

const SCENARIOS: Scenario[] = [
  {
    id: 'R1',
    title: 'Komplexer Füllung+Endo+Röntgen Verlauf',
    treatmentId: 'fuellung',
    insuranceMode: 'GKV+MKV',
    dictation:
      'Heute zunächst an Zahn 24 eine tiefe mesio-okklusale Karies exkaviert, unter Kofferdam nach selektiver Kariesentfernung eine indirekte Überkappung mit MTA gelegt und anschließend adhäsiv in Mehrschichttechnik mit Komposit versorgt; Okklusion und Approximalkontakt wurden mehrfach kontrolliert und fein nachpoliert. Zusätzlich klagte die Patientin über persistierende Klopfempfindlichkeit an Zahn 27 nach Trepanation letzte Woche, daher wurde der Zahn erneut eröffnet, die Kanäle mit NaOCl und EDTA gespült, Ledermix eingelegt und provisorisch dicht verschlossen. Zur Therapieplanung und Verlaufskontrolle wurde ein OPG angefertigt.'
  },
  {
    id: 'R2',
    title: 'Endo-Revisionssitzung mit Begleitbefund',
    treatmentId: 'endo',
    insuranceMode: 'PKV',
    dictation:
      'Patient berichtet, dass Zahn 36 seit der letzten Sitzung noch druckempfindlich ist. Heute Revisionssitzung: Zugang wieder eröffnet, Arbeitslängen mit Apexlokator bestimmt und radiologisch gegengeprüft, maschinelle Aufbereitung bis Arbeitslänge, Spülprotokoll mit NaOCl und EDTA, anschließend medikamentöse Einlage mit Calciumhydroxid und dichter provisorischer Verschluss unter Kofferdam. Zusätzlich wurde an Zahn 35 eine kleine Zahnhalsfüllung im zervikalen Bereich adhäsiv mit Flow-Komposit gelegt und poliert.'
  },
  {
    id: 'R3',
    title: 'Extraktion mit Wundmanagement und Prothesenhinweis',
    treatmentId: 'extraction',
    insuranceMode: 'GKV',
    dictation:
      'Zahn 28 war frakturiert und nicht erhaltungswürdig, nach Infiltrationsanästhesie atraumatische Luxation und Extraktion durchgeführt. Alveole kürettiert, Blutstillung mit Kompresse erreicht, Wundränder adaptiert und mit Einzelknopfnaht versorgt. Patient erhielt ausführliche postoperative Verhaltenshinweise inklusive Kühlung, Schmerzmedikation und Warnzeichen. Zusätzlich wurde dokumentiert, dass die vorhandene Interimsprothese nach Abheilung kontrolliert und bei Bedarf unterfüttert werden soll.'
  },
  {
    id: 'R4',
    title: 'Kronenpräparation mit Endo-Vorgeschichte',
    treatmentId: 'crown_prep',
    insuranceMode: 'PKV',
    dictation:
      'Bei Zahn 16 liegt nach abgeschlossener endodontischer Vorbehandlung eine große Defektversorgung vor. Heute Stumpfaufbau kontrolliert, Zahn zirkulär präpariert, Retraktionsfaden gelegt, digitale Abformung durchgeführt und ein Langzeitprovisorium angepasst. Okklusion statisch und dynamisch geprüft, Kontaktpunkte kontrolliert. Patient berichtet, dass seit der Vorbehandlung keine spontane Schmerzsymptomatik mehr besteht, aber gelegentliche Kälteempfindlichkeit im Nachbarbereich auftritt.'
  },
  {
    id: 'R5',
    title: 'PZR mit UPT-Kontext und Risikoaufklärung',
    treatmentId: 'pzr',
    insuranceMode: 'GKV',
    dictation:
      'Im Rahmen der unterstützenden Nachsorge wurde heute eine professionelle Zahnreinigung durchgeführt: supra- und subgingivale Beläge entfernt, Pulverstrahl an verfärbten Approximalräumen eingesetzt, anschließend Politur und Fluoridierung durchgeführt. Die Patientin wurde erneut zur häuslichen Interdentalpflege instruiert, da im Seitenzahnbereich weiterhin Plaqueretention besteht. Dokumentiert ist außerdem, dass wegen parodontaler Vorgeschichte ein engmaschiges Recallintervall empfohlen wurde.'
  },
  {
    id: 'R6',
    title: 'Parodontologie AIT-Sitzung',
    treatmentId: 'parodontologie',
    insuranceMode: 'GKV',
    dictation:
      'Heute antiinfektiöse Phase der Parodontitistherapie: nach Lokalanästhesie subgingivales Debridement in den Sextanten mit Taschen über 4 mm, biofilmorientiertes Vorgehen mit Hand- und Ultraschallinstrumenten. Es bestanden Blutungen auf Sondieren in mehreren Arealen, die Taschentiefen und Befunde wurden nachvollziehbar dokumentiert. Abschließend erfolgte Motivation zur verbesserten häuslichen Mundhygiene und Aufklärung über die Notwendigkeit der weiteren UPT-Termine.'
  },
  {
    id: 'R7',
    title: 'Eingehende Untersuchung mit systemischen Angaben',
    treatmentId: 'untersuchung',
    insuranceMode: 'PKV',
    dictation:
      'Eingehende Kontrolluntersuchung durchgeführt. Anlass war die Routinekontrolle vor geplanter Auslandsreise der Patientin. Klinisch zeigten sich derzeit keine akuten pathologischen Befunde mit unmittelbarem Interventionsbedarf. Die Patientin gab an, dass seit dem letzten Termin eine neue antihypertensive Medikation eingestellt wurde und sie weiterhin gelegentlich temperaturempfindlich auf kalte Getränke im linken Unterkiefer reagiert. Es wurde besprochen, dass bei Zunahme der Symptomatik kurzfristig ein Kontrolltermin erfolgen soll.'
  },
  {
    id: 'R8',
    title: 'Röntgen zur Diagnostik und Verlaufskontrolle',
    treatmentId: 'roentgen',
    insuranceMode: 'PKV',
    dictation:
      'Zur präoperativen Diagnostik und Therapieplanung wurde heute ein OPG angefertigt. Anlass waren persistierende Beschwerden regio 36 sowie die Abklärung der periapikalen Situation nach vorangegangener endodontischer Behandlung. Im Röntgenbild zeigte sich eine apikale Auffälligkeit an 36, der Befund wurde dokumentiert und mit der Patientin besprochen. Es wurde empfohlen, je nach klinischem Verlauf eine zeitnahe Re-Evaluation inklusive Verlaufskontrolle durchzuführen.'
  },
  {
    id: 'R9',
    title: 'Implantat-Freilegung mit Nachsorge',
    treatmentId: 'implant',
    insuranceMode: 'PKV',
    dictation:
      'Regio 46 heute zweite chirurgische Phase: Implantat freigelegt, Weichgewebe geformt und Gingivaformer eingesetzt. Die periimplantären Verhältnisse waren klinisch reizlos, keine akute Entzündungszeichen. Patient wurde über schonendes Kauen, Mundhygiene im Operationsgebiet und Kontrollintervalle aufgeklärt. Zusätzlich wurde dokumentiert, dass die prothetische Weiterbehandlung nach komplikationsloser Weichgewebsheilung geplant ist.'
  },
  {
    id: 'R10',
    title: 'Traumafall mit Schienung und Zusatzversorgung',
    treatmentId: 'trauma',
    insuranceMode: 'GKV',
    dictation:
      'Patient stellte sich nach Sportunfall mit Frontzahntrauma vor. Klinisch zeigte sich eine Lockerung an 11 und 21 ohne vollständige Dislokation. Nach Reposition wurde eine flexible Schienung angelegt und die Okklusion kontrolliert. Begleitend wurde an Zahn 12 eine kleine Schmelz-Dentin-Fraktur adhäsiv versiegelt, um weitere Sensibilität zu vermeiden. Patient erhielt Hinweise zu weicher Kost, Mundhygiene, Warnzeichen und engmaschiger Verlaufskontrolle.'
  }
];

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
  if (key.includes('betrag') || key.includes('amount')) return '180';
  if (key.includes('working') || key.includes('length')) return buildWorkingLengthPayload(canalCount);
  if (key.includes('canal_count') || key.includes('kanalzahl')) return String(canalCount);
  if (key.includes('medication') || key.includes('medik')) return 'Ca(OH)2';
  if (key.includes('surface') || key.includes('flaeche') || key.includes('fläche')) return 'mod';
  if (key.includes('roentgen_befund') || key.includes('roentgenbefund')) return 'Apikale Auffaelligkeit regio 36';
  if (key.includes('roentgen_indikation') || key.includes('indikation')) return 'Diagnostik und Therapieplanung';
  if (key.includes('roentgen_typ') || key.includes('roentgentyp')) return 'OPG';
  if (key.includes('roentgen_zeitpunkt') || key.includes('zeitpunkt')) return 'praeoperativ';
  if (key.includes('befund')) return 'Klinischer Befund dokumentiert';
  if (key.includes('anlass')) return 'Kontrolluntersuchung';
  if (key.includes('beurteilung')) return 'ohne_therapiebedarf';
  if (key.includes('intervall') || key.includes('interval')) return '6 Monate';
  if (key.includes('phase') && key.includes('paro')) return 'ait';
  if (key.includes('upt_grad')) return 'b';
  if (key.includes('upt_intervall')) return '6 Monate';
  if (key.includes('lokalisation')) return 'regio 36';
  if (key.includes('zugang')) return 'vestibulaer';
  if (key.includes('art') && key.includes('trauma')) return 'Luxation';
  return 'ja';
}

async function setupPage(page: Page): Promise<void> {
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

    if (!EMAIL || !PASSWORD) {
      throw new Error('Hosted Login erkannt, aber Credentials fehlen.');
    }

    await emailInput.fill(EMAIL);
    await passwordInput.fill(PASSWORD);
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
      throw new Error('Hosted Login fehlgeschlagen: Credentials wurden abgelehnt.');
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

    await page.waitForTimeout(900);
    if (await isDictationVisible(3000)) return;
  }

  await page.waitForSelector(dictationSelector, { timeout: 30000 });
}

async function resetCase(page: Page): Promise<void> {
  const newCaseBtn = page.locator('button:has-text("Neuer Fall")').first();
  if (await newCaseBtn.isVisible().catch(() => false)) {
    await newCaseBtn.click({ force: true });
    await page.waitForTimeout(300);
  }
}

async function selectInsuranceMode(page: Page, insuranceMode: Insurance) {
  const selector = page.locator('[data-testid="v10-insurance-select"]');
  if (insuranceMode === 'GKV') await selector.locator('button:has-text("GKV")').click();
  if (insuranceMode === 'GKV+MKV') await selector.locator('button:has-text("+MKV")').click();
  if (insuranceMode === 'PKV') await selector.locator('button:has-text("PKV")').click();
}

async function selectTreatment(page: Page, treatmentId: UiSelectorTreatmentId) {
  const dropdown = page.locator('[data-testid="v10-treatment-dropdown"]');
  await dropdown.click();
  await page.locator(`[data-testid="v10-treatment-option-${treatmentId}"]`).click();
}

async function triggerRun(page: Page): Promise<void> {
  const runButton = page.locator('[data-testid="v10-run-button"]');
  await runButton.waitFor({ state: 'visible', timeout: 10000 });

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

  const hasProgressed = async (): Promise<boolean> => {
    if (hasLifecycle) {
      const nextSeq = Number((await lifecycle.first().getAttribute('data-run-seq')) || '0');
      if (nextSeq > previousSeq) {
        previousSeq = nextSeq;
        return true;
      }
    }
    const hasPreanalysis = await page.locator('[data-testid="v10-preanalysis-panel"]').first().isVisible().catch(() => false);
    const hasVisibleResult = await hasResultSurfaceVisible();
    if (!hasPreanalysis && !hasVisibleResult) return false;
    return true;
  };

  await runButton.click({ force: true });
  for (let waitTry = 0; waitTry < 6; waitTry += 1) {
    if (await hasProgressed()) return;
    await page.waitForTimeout(500);
  }

  const dictationInput = page.locator('[data-testid="v10-dictation-input"]');
  await dictationInput.focus();
  await page.keyboard.press('Control+Enter');
  for (let waitTry = 0; waitTry < 4; waitTry += 1) {
    if (await hasProgressed()) return;
    await page.waitForTimeout(500);
  }

  throw new Error('Run wurde nicht ausgelöst (kein sichtbarer State-Wechsel).');
}

async function waitForResultSurface(page: Page, timeoutMs = 45000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const hasIntentConfirmation = await page.locator('[data-testid="v10-intent-confirmation-panel"]').isVisible().catch(() => false);
    const hasQuestions = await page.locator('[data-testid="v10-questions-panel"]').isVisible().catch(() => false);
    const hasOutput = await page.locator('[data-testid="v10-output-panel"]').isVisible().catch(() => false);
    const hasMultiOutput = await page.locator('[data-testid="v10-multi-output-panel"]').isVisible().catch(() => false);
    const hasQuestionsFallback = await page.locator('text=Details klären').first().isVisible().catch(() => false);
    const hasOutputFallback = await page.locator('text=Behandlungsdokumentation').first().isVisible().catch(() => false);
    if (hasIntentConfirmation || hasQuestions || hasOutput || hasMultiOutput || hasQuestionsFallback || hasOutputFallback) {
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error('Result surface not visible (timeout).');
}

async function collectIntentLanes(page: Page): Promise<IntentLane[]> {
  const panel = page.locator('[data-testid="v10-intent-confirmation-panel"]');
  if (!await panel.isVisible().catch(() => false)) return [];

  const lanesLocator = panel.locator('[data-testid^="v10-intent-lane-"]');
  const laneCount = await lanesLocator.count();
  const lanes: IntentLane[] = [];

  for (let i = 0; i < laneCount; i += 1) {
    const laneNode = lanesLocator.nth(i);
    const laneTestId = (await laneNode.getAttribute('data-testid')) || '';
    const laneId = laneTestId.replace('v10-intent-lane-', '').trim();
    if (!laneId) continue;

    const optionNodes = panel.locator(`[data-testid^="v10-intent-option-${laneId}-"]`);
    const optionCount = await optionNodes.count();
    const options: IntentOption[] = [];

    for (let j = 0; j < optionCount; j += 1) {
      const option = optionNodes.nth(j);
      const testId = (await option.getAttribute('data-testid')) || '';
      const label = (((await option.textContent().catch(() => '')) ?? '') || '').replace(/\s+/g, ' ').trim();
      const selected = ((await option.getAttribute('aria-pressed').catch(() => 'false')) || 'false') === 'true';
      options.push({ testId, label, selected });
    }

    lanes.push({ laneId, options });
  }

  return lanes;
}

async function handleIntentConfirmationIfVisible(page: Page, scenario: Scenario): Promise<{ shown: boolean; lanes: IntentLane[] }> {
  const confirmationPanel = page.locator('[data-testid="v10-intent-confirmation-panel"]');
  if (!await confirmationPanel.isVisible().catch(() => false)) {
    return { shown: false, lanes: [] };
  }

  const lanes = confirmationPanel.locator('[data-testid^="v10-intent-lane-"]');
  const laneCount = await lanes.count();
  const preferredOrder = Array.from(new Set([
    scenario.treatmentId,
    'fuellung',
    'endo',
    'extraction',
    'crown_prep',
    'roentgen',
    'untersuchung',
    'pzr',
    'parodontologie',
    'implant',
    'trauma'
  ]));

  for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
    const lane = lanes.nth(laneIndex);
    const laneTestId = (await lane.getAttribute('data-testid')) || '';
    const laneId = laneTestId.replace('v10-intent-lane-', '');
    if (!laneId) continue;

    const selectedOption = confirmationPanel.locator(`[data-testid^="v10-intent-option-${laneId}-"][aria-pressed="true"]`);
    if (await selectedOption.count() > 0) continue;

    let clicked = false;
    for (const treatmentId of preferredOrder) {
      const option = confirmationPanel.locator(`[data-testid="v10-intent-option-${laneId}-${treatmentId}"]`).first();
      if (await option.count() > 0) {
        await option.click({ force: true });
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      const firstOption = confirmationPanel.locator(`[data-testid^="v10-intent-option-${laneId}-"]`).first();
      if (await firstOption.count() > 0) {
        await firstOption.click({ force: true });
      }
    }
  }

  const laneSnapshot = await collectIntentLanes(page);

  const confirmButton = page.locator('[data-testid="v10-intent-confirm-button"]');
  await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(120);
  if (await confirmButton.isDisabled().catch(() => false)) {
    await page.evaluate(() => {
      const laneNodes = Array.from(document.querySelectorAll('[data-testid^="v10-intent-lane-"]'));
      for (const laneNode of laneNodes) {
        const laneTestId = laneNode.getAttribute('data-testid') ?? '';
        const laneId = laneTestId.replace('v10-intent-lane-', '');
        if (!laneId) continue;
        const selected = document.querySelector(`[data-testid^="v10-intent-option-${laneId}-"][aria-pressed="true"]`);
        if (!selected) {
          const first = document.querySelector(`[data-testid^="v10-intent-option-${laneId}-"]`) as HTMLButtonElement | null;
          first?.click();
        }
      }
    });
  }
  await confirmButton.click({ force: true });
  return { shown: true, lanes: laneSnapshot };
}

async function extractAskbackLabels(page: Page): Promise<string[]> {
  const labels: string[] = [];
  const rows = page.locator('[data-testid^="question-row-"]');
  const rowCount = await rows.count().catch(() => 0);
  for (let i = 0; i < rowCount; i += 1) {
    const rowText = (((await rows.nth(i).textContent().catch(() => '')) ?? '') || '').replace(/\s+/g, ' ').trim();
    if (rowText.length > 0) labels.push(rowText.slice(0, 220));
  }
  return labels;
}

async function answerQuestionsUntilOutput(page: Page): Promise<AskbackAnswer[]> {
  const answerLog: AskbackAnswer[] = [];
  for (let i = 0; i < 40; i += 1) {
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

    const laneButtons = page.locator('[data-testid^="v10-askback-lane-"]');
    const laneCount = await laneButtons.count();
    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
      const lane = laneButtons.nth(laneIndex);
      const testId = (await lane.getAttribute('data-testid')) || '';
      if (testId === 'v10-askback-lane-all') continue;
      const laneText = (((await lane.textContent()) || '') || '').toLowerCase();
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

    const textInputs = page.locator('[data-testid^="input-"]');
    const inputCount = await textInputs.count();
    for (let t = 0; t < inputCount; t += 1) {
      const input = textInputs.nth(t);
      if (!(await input.isVisible().catch(() => false))) continue;
      const currentValue = await input.inputValue().catch(() => '');
      if (currentValue && currentValue.trim().length > 0) continue;
      const testId = (await input.getAttribute('data-testid')) || '';
      const inputId = testId.replace('input-', '');
      const value = resolveFreeTextAuditAnswer(inputId);
      const questionRow = input.locator('xpath=ancestor::*[@data-testid and starts-with(@data-testid, "question-row-")][1]');
      const questionLabel = ((((await questionRow.textContent().catch(() => '')) ?? '') || '')).replace(/\s+/g, ' ').trim().slice(0, 220);
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
        const label = ((((await candidate.textContent()) ?? '') || '')).toLowerCase();
        if (label.includes('ja') || label.includes('elektr') || label.includes('naocl') || label.includes('warm') || label.includes('ait') || label.includes('opg')) {
          picked = candidate;
          break;
        }
      }

      const pickedLabel = ((((await picked.textContent()) ?? '') || '')).replace(/\s+/g, ' ').trim().slice(0, 180);
      const rowTestId = (await row.getAttribute('data-testid').catch(() => null)) || '';
      const questionId = rowTestId.replace('question-row-', '') || 'unknown';
      const questionLabel = ((((await row.textContent().catch(() => '')) ?? '') || '')).replace(/\s+/g, ' ').trim().slice(0, 220);
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

    const hostedChoice = page
      .locator('main button:not([disabled])')
      .filter({ hasNotText: /optional|mehr|weiter|zum output|fertigstellen|einstellungen|gkv|\+mkv|pkv|kurz|mittel|lang|füllung|endo|krone/i })
      .first();
    if (await hostedChoice.isVisible().catch(() => false)) {
      const choiceLabel = ((((await hostedChoice.textContent()) ?? '') || '')).replace(/\s+/g, ' ').trim().slice(0, 180);
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
    await page.locator('[data-testid="multi-output-paper"]').waitFor({ state: 'visible', timeout: 8000 });
    return;
  }
  const toOutput = page.locator('button:has-text("Zum Output")');
  if (await toOutput.isVisible().catch(() => false)) {
    await toOutput.click();
  }
  await page.waitForTimeout(300);
}

async function extractOutputTextForAudit(page: Page): Promise<string> {
  const outputText = page.locator('[data-testid="v10-output-text"]');
  if (await outputText.isVisible().catch(() => false)) {
    const text = await outputText.textContent();
    return (text || '').trim();
  }

  const multiPaper = page.locator('[data-testid="multi-output-paper"]');
  if (await multiPaper.isVisible().catch(() => false)) {
    const text = await multiPaper.textContent();
    return (text || '').trim();
  }

  const fallback = page.locator('main');
  const text = await fallback.first().textContent().catch(() => '');
  return (text || '').trim();
}

async function extractBillingSignals(page: Page): Promise<string[]> {
  const codes = new Set<string>();

  const tagNodes = page.locator('[data-testid^="billing-code-"]');
  const tagCount = await tagNodes.count().catch(() => 0);
  for (let i = 0; i < tagCount; i += 1) {
    const text = (await tagNodes.nth(i).textContent().catch(() => '')) || '';
    const matches = text.match(/(BEMA_[0-9A-ZÄ]+|GOZ_[0-9A-Z]+)/gi) || [];
    for (const match of matches) codes.add(match.toUpperCase());
  }

  if (codes.size === 0) {
    const billingCard = page.locator('[data-testid="billing-card"]');
    if (await billingCard.isVisible().catch(() => false)) {
      const cardText = (await billingCard.textContent().catch(() => '')) || '';
      const matches = cardText.match(/(BEMA_[0-9A-ZÄ]+|GOZ_[0-9A-Z]+)/gi) || [];
      for (const match of matches) codes.add(match.toUpperCase());
    }
  }

  return Array.from(codes).sort();
}

function evaluateFindings(result: Omit<ScenarioResult, 'findings'>): string[] {
  const findings: string[] = [];
  const text = result.outputFullText.toLowerCase();

  if (result.runtime.extractionMethod !== 'llm' || result.runtime.extractionLlmError !== 'none') {
    findings.push(`LLM extraction nicht sauber (${result.runtime.extractionMethod}/${result.runtime.extractionLlmError})`);
  }
  if (result.runtime.preanalysisSource !== 'llm') {
    findings.push(`Preanalysis nicht llm (${result.runtime.preanalysisSource})`);
  }
  if (result.runtime.preanalysisFallback === 'true') {
    findings.push('Preanalysis fallback aktiv');
  }

  if (result.outputFullText.trim().length < 120) {
    findings.push('Finaltext auffällig kurz für forensische Dokumentation');
  }

  if (result.dictation.toLowerCase().includes('kofferdam') && !text.includes('kofferdam')) {
    findings.push('Kofferdam im Diktat, aber nicht im Output sichtbar');
  }
  if (result.dictation.toLowerCase().includes('naocl') && !text.includes('naocl')) {
    findings.push('NaOCl im Diktat, aber nicht im Output sichtbar');
  }

  const hasBema = result.billingCodes.some(code => code.startsWith('BEMA_'));
  const hasGoz = result.billingCodes.some(code => code.startsWith('GOZ_'));
  if (result.insuranceMode === 'GKV' && hasGoz) {
    findings.push('GKV-Fall enthält GOZ-Codes');
  }
  if (result.insuranceMode === 'PKV' && !hasGoz) {
    findings.push('PKV-Fall ohne GOZ-Codes');
  }

  return findings;
}

function toMarkdown(results: ScenarioResult[]): string {
  const now = new Date().toISOString();
  const totalFindings = results.reduce((sum, item) => sum + item.findings.length, 0);
  const llmExtractionOk = results.filter(item => item.runtime.extractionMethod === 'llm' && item.runtime.extractionLlmError === 'none').length;
  const llmPreanalysisOk = results.filter(item => item.runtime.preanalysisSource === 'llm' && item.runtime.preanalysisFallback === 'false').length;

  const lines: string[] = [];
  lines.push('# Hosted V10 Real-Life Audit (10 Cases)');
  lines.push('');
  lines.push(`- Generated: ${now}`);
  lines.push(`- Target: ${BASE_URL}`);
  lines.push(`- Cases: ${results.length}`);
  lines.push(`- LLM extraction OK: ${llmExtractionOk}/${results.length}`);
  lines.push(`- LLM preanalysis OK: ${llmPreanalysisOk}/${results.length}`);
  lines.push(`- Total findings: ${totalFindings}`);
  lines.push('');

  for (const item of results) {
    lines.push(`## ${item.id} — ${item.title}`);
    lines.push(`- Treatment/Insurance: ${item.treatmentId} / ${item.insuranceMode}`);
    lines.push(`- Runtime: extraction=${item.runtime.extractionMethod} (${item.runtime.extractionLlmError}), preanalysis=${item.runtime.preanalysisSource}, fallback=${item.runtime.preanalysisFallback}`);
    lines.push(`- LLM decomposition: ${item.llmDecomposition.confirmationShown ? `${item.llmDecomposition.lanes.length} intent lane(s)` : 'direct (no confirmation panel)'}`);
    if (item.llmDecomposition.lanes.length > 0) {
      for (const lane of item.llmDecomposition.lanes) {
        const selected = lane.options.find(option => option.selected);
        const optionLabels = lane.options.map(option => option.label || option.testId).join(' | ');
        lines.push(`  - lane ${lane.laneId}: selected=${selected?.label || selected?.testId || 'none'} | options=${optionLabels}`);
      }
    }
    lines.push(`- Askbacks (detected): ${item.askbacks.length > 0 ? item.askbacks.join(' | ') : 'none'}`);
    lines.push(`- Askbacks (answered): ${item.askbackAnswers.length}`);
    for (const qa of item.askbackAnswers) {
      lines.push(`  - QA [${qa.source}] ${qa.questionId}: ${qa.answer}`);
    }
    lines.push(`- Billing: ${item.billingCodes.length > 0 ? item.billingCodes.join(', ') : 'none'}`);
    lines.push(`- Findings: ${item.findings.length > 0 ? item.findings.join(' ; ') : 'none'}`);
    lines.push('- Original dictation:');
    lines.push('```text');
    lines.push(item.dictation);
    lines.push('```');
    lines.push('- Output fulltext:');
    lines.push('```text');
    lines.push(item.outputFullText || '(leer)');
    lines.push('```');
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function runScenario(page: Page, scenario: Scenario): Promise<ScenarioResult> {
  await resetCase(page);
  await setupPage(page);
  await selectTreatment(page, scenario.treatmentId);
  await selectInsuranceMode(page, scenario.insuranceMode);
  await page.fill('[data-testid="v10-dictation-input"]', scenario.dictation);

  await triggerRun(page);
  await waitForResultSurface(page);
  const decomposition = await handleIntentConfirmationIfVisible(page, scenario);
  const askbacks = await extractAskbackLabels(page);
  const askbackAnswers = await answerQuestionsUntilOutput(page);
  await openRealOutputView(page);

  const outputFullText = await extractOutputTextForAudit(page);
  const billingCodes = await extractBillingSignals(page);

  const runtimeMeta = page.locator('[data-testid="v10-llm-runtime-meta"]').first();
  const runtime: RuntimeMeta = {
    extractionMethod: (await runtimeMeta.getAttribute('data-extraction-method').catch(() => 'unknown')) || 'unknown',
    extractionLlmError: (await runtimeMeta.getAttribute('data-extraction-llm-error').catch(() => 'unknown')) || 'unknown',
    preanalysisSource: (await runtimeMeta.getAttribute('data-preanalysis-source').catch(() => 'unknown')) || 'unknown',
    preanalysisFallback: (await runtimeMeta.getAttribute('data-preanalysis-fallback').catch(() => 'unknown')) || 'unknown',
    preanalysisError: (await runtimeMeta.getAttribute('data-preanalysis-error').catch(() => '')) || '',
    preanalysisDiagnostics: (await runtimeMeta.getAttribute('data-preanalysis-diagnostics').catch(() => '')) || '',
  };

  const baseResult: Omit<ScenarioResult, 'findings'> = {
    id: scenario.id,
    title: scenario.title,
    treatmentId: scenario.treatmentId,
    insuranceMode: scenario.insuranceMode,
    dictation: scenario.dictation,
    llmDecomposition: {
      confirmationShown: decomposition.shown,
      lanes: decomposition.lanes,
    },
    askbacks,
    askbackAnswers,
    outputFullText,
    billingCodes,
    runtime,
  };

  return {
    ...baseResult,
    findings: evaluateFindings(baseResult),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  const page = await context.newPage();

  const results: ScenarioResult[] = [];
  try {
    await setupPage(page);
    for (const scenario of SCENARIOS) {
      console.log(`[real-life-10] running ${scenario.id} ${scenario.title}`);
      try {
        const result = await runScenario(page, scenario);
        results.push(result);
        console.log(`[real-life-10] ${scenario.id} runtime=${result.runtime.extractionMethod}/${result.runtime.preanalysisSource} findings=${result.findings.length}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          id: scenario.id,
          title: scenario.title,
          treatmentId: scenario.treatmentId,
          insuranceMode: scenario.insuranceMode,
          dictation: scenario.dictation,
          llmDecomposition: { confirmationShown: false, lanes: [] },
          askbacks: [],
          askbackAnswers: [],
          outputFullText: `ERROR: ${message}`,
          billingCodes: [],
          runtime: {
            extractionMethod: 'unknown',
            extractionLlmError: 'unknown',
            preanalysisSource: 'unknown',
            preanalysisFallback: 'unknown',
            preanalysisError: message,
            preanalysisDiagnostics: '',
          },
          findings: [`Scenario execution failed: ${message}`],
        });
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const reportDir = '/Users/david/dokumaster-ui/docs/system-atlas/artifacts/_latest/v10-hosted-audit-10-real-life';
  fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    runAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    cases: results.length,
    summary: {
      llmExtractionOk: results.filter(item => item.runtime.extractionMethod === 'llm' && item.runtime.extractionLlmError === 'none').length,
      llmPreanalysisOk: results.filter(item => item.runtime.preanalysisSource === 'llm' && item.runtime.preanalysisFallback === 'false').length,
      findingCount: results.reduce((sum, item) => sum + item.findings.length, 0),
    },
    results,
  };

  fs.writeFileSync(path.join(reportDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(reportDir, 'summary.md'), toMarkdown(results), 'utf8');

  console.log(`[real-life-10] wrote ${path.join(reportDir, 'report.json')}`);
  console.log(`[real-life-10] wrote ${path.join(reportDir, 'summary.md')}`);

  const hardLlmFailures = results.filter(
    item => item.runtime.extractionMethod !== 'llm'
      || item.runtime.extractionLlmError !== 'none'
      || item.runtime.preanalysisSource !== 'llm'
      || item.runtime.preanalysisFallback !== 'false'
  );

  if (hardLlmFailures.length > 0) {
    console.error(`[real-life-10] hard llm failures: ${hardLlmFailures.map(item => item.id).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
