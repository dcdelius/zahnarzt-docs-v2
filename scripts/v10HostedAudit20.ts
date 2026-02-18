import { chromium, type Page } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://zahnarzt-app.web.app';
const IS_LOCAL_TARGET = /localhost|127\.0\.0\.1/i.test(BASE_URL);
const EMAIL = process.env.E2E_LOGIN_EMAIL || '';
const PASSWORD = process.env.E2E_LOGIN_PASSWORD || '';

if (!IS_LOCAL_TARGET && (!EMAIL || !PASSWORD)) {
  console.error('Missing E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD');
  process.exit(1);
}

type Treatment = 'fuellung' | 'endo' | 'crown_prep' | 'extraction';
type Insurance = 'GKV' | 'GKV+MKV' | 'PKV';

type Scenario = {
  id: string;
  title: string;
  treatmentId: Treatment;
  insuranceMode: Insurance;
  dictation: string;
  expectTerms?: string[];
};

const SCENARIOS: Scenario[] = [
  { id: 'A01', title: 'GKV Füllung MOD profunda', treatmentId: 'fuellung', insuranceMode: 'GKV', dictation: 'Zahn 26 MOD, caries profunda, Leitungsanästhesie, Kofferdam, Kompositversorgung, Okklusion und Kontaktpunkt kontrolliert.' },
  { id: 'A02', title: 'GKV+MKV Füllung ästhetischer Wunsch', treatmentId: 'fuellung', insuranceMode: 'GKV+MKV', dictation: 'An 16 OD adhäsive Kompositfüllung im Seitenzahnbereich, Patient wollte ästhetisch hochwertige Versorgung und hat Mehrkostenvereinbarung unterschrieben.' },
  { id: 'A03', title: 'PKV Füllung MODB langes Diktat', treatmentId: 'fuellung', insuranceMode: 'PKV', dictation: 'Heute bei Zahn 45 eine alte insuffiziente MODB-Füllung entfernt, Karies exkaviert, in Adhäsivtechnik mit Komposit in Schichten aufgebaut, Kontaktpunkt sowie Okklusion mehrfach kontrolliert und nachpoliert.' },
  { id: 'A04', title: 'GKV Endo Basis', treatmentId: 'endo', insuranceMode: 'GKV', dictation: 'Endodontische Behandlung Zahn 46, Trepanation, Kanäle aufbereitet, Spülung mit NaOCl und EDTA, medikamentöse Einlage mit Calciumhydroxid, provisorischer Verschluss.' },
  { id: 'A05', title: 'PKV Endo warm vertikal', treatmentId: 'endo', insuranceMode: 'PKV', dictation: 'An 11 wurde endodontisch eröffnet, Arbeitslängen elektronisch und radiologisch bestimmt, warm vertikal obturiert mit Sealer, Kofferdam war die ganze Zeit gelegt.' },
  { id: 'A06', title: 'GKV Multitooth Füllung', treatmentId: 'fuellung', insuranceMode: 'GKV', dictation: 'Heute zwei Füllungen: Zahn 36 OD und Zahn 14 okklusal, jeweils Karies entfernt, Komposit gelegt, Biss und Approximalkontakt kontrolliert, abschließend poliert.' },
  { id: 'A07', title: 'PKV Frontzahn Füllung', treatmentId: 'fuellung', insuranceMode: 'PKV', dictation: 'Defekte Frontzahnfüllung an 11 inzisal-labial erneuert, adhäsiv aufgebaut, Form und Ästhetik angepasst, Finieren und Polieren durchgeführt.' },
  { id: 'A08', title: 'GKV Endo Revision akut', treatmentId: 'endo', insuranceMode: 'GKV', dictation: 'Akute Beschwerden an 36, Trepanation und Drainage, Arbeitslängen mit Apexlokator, Spülprotokoll NaOCl/EDTA, Einlage und dichter provisorischer Verschluss.' },
  { id: 'A09', title: 'PKV Kronenpräparation', treatmentId: 'crown_prep', insuranceMode: 'PKV', dictation: 'Zahn 16 für Krone präpariert, Abformung vorgenommen und Provisorium eingesetzt, Okklusion kontrolliert.' },
  { id: 'A10', title: 'GKV Extraktion mit Naht', treatmentId: 'extraction', insuranceMode: 'GKV', dictation: 'Zahn 28 wegen Fraktur extrahiert nach Infiltrationsanästhesie, Alveole kürettiert, Wundversorgung und Naht durchgeführt, postoperative Hinweise gegeben.' },
  { id: 'A11', title: 'GKV Füllung nur Kasse', treatmentId: 'fuellung', insuranceMode: 'GKV', dictation: 'Zahn 27 okklusale Karies, einfache Kassenfüllung ohne Mehrkosten, Infiltration, anschließend Kontrolle der Okklusion.' },
  { id: 'A12', title: 'GKV+MKV Füllung Mehrschicht', treatmentId: 'fuellung', insuranceMode: 'GKV+MKV', dictation: 'Bei 36 MOD wurde nach Aufklärung eine adhäsive Kompositfüllung in Mehrschichttechnik gelegt, Mehrkostenbetrag wurde besprochen und akzeptiert.' },
  { id: 'A13', title: 'PKV Füllung mit Nebendetails', treatmentId: 'fuellung', insuranceMode: 'PKV', dictation: 'Zahn 24 distal-okklusal versorgt, Patient hatte vorher Kälteempfindlichkeit, nach Exkavation und Kompositaufbau Kontaktpunkt stabil, Biss fein justiert, Patient soll bei Persistenz wiederkommen.' },
  { id: 'A14', title: 'GKV Endo mit Kofferdam explizit', treatmentId: 'endo', insuranceMode: 'GKV', dictation: 'Endo 47 unter Kofferdam, Arbeitslänge elektronisch, Spülung mit NaOCl und EDTA, medikamentöse Einlage CaOH2, provisorisch dicht verschlossen.' },
  { id: 'A15', title: 'PKV Endo mit Unsicherheit', treatmentId: 'endo', insuranceMode: 'PKV', dictation: 'An Zahn 21 endodontisch eröffnet, Kanäle instrumentiert, Längenmessung gemacht, gespült und am Ende warm obturiert; Verlauf radiologisch kontrolliert.' },
  { id: 'A16', title: 'GKV Füllung tiefe Karies + Cp', treatmentId: 'fuellung', insuranceMode: 'GKV', dictation: 'Zahn 15 mesio-okklusal tiefe Karies, keine Pulpaeröffnung, indirekte Überkappung mit CaOH2, danach Kompositfüllung, Okklusion kontrolliert.' },
  { id: 'A17', title: 'PKV Kronenpräp ausführlich', treatmentId: 'crown_prep', insuranceMode: 'PKV', dictation: 'Krone an 26 geplant: alte Füllung entfernt, Stumpf aufgebaut, Zahn beschliffen, Präzisionsabformung, provisorische Krone eingesetzt und Passung kontrolliert.' },
  { id: 'A18', title: 'GKV Extraktion ohne Naht', treatmentId: 'extraction', insuranceMode: 'GKV', dictation: 'Zahn 38 entfernt, Leitungsanästhesie, atraumatische Luxation und Extraktion, Blutstillung ohne Naht, Nachsorgehinweise besprochen.' },
  { id: 'A19', title: 'GKV+MKV Füllung Prosa', treatmentId: 'fuellung', insuranceMode: 'GKV+MKV', dictation: 'Heute an Zahn 46 distal-okklusal versorgt, der Patient wollte ein zahnfarbenes Material, wir haben über Mehrkosten und Alternativen gesprochen, dann adhäsiv mit Komposit versorgt und sauber ausgearbeitet.' },
  { id: 'A20', title: 'PKV Füllung kurzer schneller Stil', treatmentId: 'fuellung', insuranceMode: 'PKV', dictation: '11 ib Komposit adhäsiv, Kofferdam, finiert/poliert.' },
];

type ScenarioResult = {
  id: string;
  title: string;
  treatmentId: Treatment;
  insuranceMode: Insurance;
  dictation: string;
  askbacks: string[];
  answersGiven: string[];
  outputText: string;
  billingCodes: string[];
  runtime: {
    extractionMethod: string;
    extractionLlmError: string;
    preanalysisSource: string;
    preanalysisFallback: string;
  };
  findings: string[];
};

async function setupPage(page: Page): Promise<void> {
  if (IS_LOCAL_TARGET) {
    await page.addInitScript((useBypassAuth: boolean) => {
      (window as any).__DOCUDENT_E2E_BYPASS_AUTH = useBypassAuth;
      window.localStorage.setItem('v10_debug', 'true');
    }, true);
  }
  await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });

  const dictationVisible = async () => page.locator('[data-testid="v10-dictation-input"]').isVisible({ timeout: 1500 }).catch(() => false);
  if (await dictationVisible()) return;

  const loginBtn = page.locator('button:has-text("Einloggen")').first();
  if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    if ((!EMAIL || !PASSWORD) && !IS_LOCAL_TARGET) {
      throw new Error('Login erkannt, aber keine E2E Credentials gesetzt.');
    }
    if (!EMAIL || !PASSWORD) {
      // Local bypass run: skip credential login attempts.
      return;
    }
    await page.locator('input[type="email"], input[placeholder*="E-Mail" i]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await loginBtn.click();
    await page.waitForLoadState('domcontentloaded');
  }

  for (let i = 0; i < 8; i++) {
    if (await dictationVisible()) return;
    const nav = [
      'a[href="/docudent/v10"]',
      'a:has-text("V10")',
      'button:has-text("V10")',
      'button:has-text("Starten")',
      'a:has-text("Starten")',
      'button:has-text("Dokumentieren")',
      'a:has-text("Dokumentieren")',
    ];
    let clicked = false;
    for (const sel of nav) {
      const n = page.locator(sel).first();
      if (await n.isVisible().catch(() => false)) {
        await n.click({ force: true });
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);
  }

  await page.waitForSelector('[data-testid="v10-dictation-input"]', { timeout: 30000 });
}

async function resetCase(page: Page): Promise<void> {
  const newCase = page.locator('button:has-text("Neuer Fall")').first();
  if (await newCase.isVisible().catch(() => false)) {
    await newCase.click({ force: true });
    await page.waitForTimeout(400);
  } else {
    await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
  }
}

async function selectTreatment(page: Page, treatmentId: Treatment) {
  await page.locator('[data-testid="v10-treatment-dropdown"]').click();
  await page.locator(`[data-testid="v10-treatment-option-${treatmentId}"]`).click();
}

async function selectInsurance(page: Page, mode: Insurance) {
  const wrap = page.locator('[data-testid="v10-insurance-select"]');
  if (mode === 'GKV') await wrap.locator('button:has-text("GKV")').click();
  if (mode === 'GKV+MKV') await wrap.locator('button:has-text("+MKV")').click();
  if (mode === 'PKV') await wrap.locator('button:has-text("PKV")').click();
}

async function waitForResultSurface(page: Page): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 60000) {
    const visible = await Promise.all([
      page.locator('[data-testid="v10-intent-confirmation-panel"]').isVisible().catch(() => false),
      page.locator('[data-testid="v10-questions-panel"]').isVisible().catch(() => false),
      page.locator('[data-testid="v10-output-panel"]').isVisible().catch(() => false),
      page.locator('[data-testid="v10-multi-output-panel"]').isVisible().catch(() => false),
      page.locator('text=Details klären').first().isVisible().catch(() => false),
      page.locator('text=Behandlungsdokumentation').first().isVisible().catch(() => false),
    ]);
    if (visible.some(Boolean)) return;
    await page.waitForTimeout(250);
  }
  throw new Error('Timeout: result surface not visible');
}

async function handleIntentConfirmation(page: Page): Promise<void> {
  const panel = page.locator('[data-testid="v10-intent-confirmation-panel"]');
  if (!await panel.isVisible().catch(() => false)) return;

  const laneIds = await panel.locator('[data-testid^="v10-intent-lane-"]').all();
  for (const lane of laneIds) {
    const laneId = (await lane.getAttribute('data-testid'))?.replace('v10-intent-lane-', '') || '';
    if (!laneId) continue;
    const selected = panel.locator(`[data-testid^="v10-intent-option-${laneId}-"][aria-pressed="true"]`);
    if (await selected.count() > 0) continue;
    const first = panel.locator(`[data-testid^="v10-intent-option-${laneId}-"]`).first();
    if (await first.count() > 0) await first.click({ force: true });
  }

  const confirm = page.locator('[data-testid="v10-intent-confirm-button"]');
  await confirm.waitFor({ state: 'visible', timeout: 8000 });
  if (await confirm.isDisabled().catch(() => false)) {
    await page.evaluate(() => {
      for (const lane of Array.from(document.querySelectorAll('[data-testid^="v10-intent-lane-"]'))) {
        const laneId = (lane.getAttribute('data-testid') || '').replace('v10-intent-lane-', '');
        if (!laneId) continue;
        const selected = document.querySelector(`[data-testid^="v10-intent-option-${laneId}-"][aria-pressed="true"]`);
        if (!selected) {
          const first = document.querySelector(`[data-testid^="v10-intent-option-${laneId}-"]`) as HTMLButtonElement | null;
          first?.click();
        }
      }
    });
  }
  await confirm.click({ force: true });
}

async function snapshotAskbacks(page: Page): Promise<string[]> {
  const labels: string[] = [];
  const rows = page.locator('[data-testid^="question-row-"]');
  const count = await rows.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const txt = ((await rows.nth(i).textContent().catch(() => '')) || '').trim();
    if (txt) labels.push(txt.replace(/\s+/g, ' '));
  }
  if (labels.length > 0) return labels;

  const requiredCard = page.locator('[data-testid="required-questions"], [data-testid="v10-questions-panel"]');
  const fallbackText = ((await requiredCard.first().textContent().catch(() => '')) || '').trim();
  if (fallbackText) {
    return fallbackText.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 12);
  }
  return labels;
}

async function answerQuestionsUntilOutput(page: Page): Promise<string[]> {
  const answersGiven: string[] = [];
  for (let i = 0; i < 50; i++) {
    if (await page.locator('[data-testid="v10-output-text"]').isVisible().catch(() => false)) return answersGiven;
    if (await page.locator('[data-testid="v10-multi-output-panel"]').isVisible().catch(() => false)) return answersGiven;
    if (await page.getByText('Behandlungsdokumentation').first().isVisible().catch(() => false)) return answersGiven;

    const toOutput = page.locator('button:has-text("Zum Output")').first();
    if (await toOutput.isVisible().catch(() => false)) {
      await toOutput.click({ force: true });
      answersGiven.push('Navigated via "Zum Output"');
      await page.waitForTimeout(250);
      continue;
    }

    const inputs = page.locator('[data-testid^="input-"]');
    const inputCount = await inputs.count();
    for (let j = 0; j < inputCount; j++) {
      const input = inputs.nth(j);
      if (!await input.isVisible().catch(() => false)) continue;
      const current = await input.inputValue().catch(() => '');
      if (current.trim().length > 0) continue;
      const id = (await input.getAttribute('data-testid')) || '';
      let value = 'ja';
      if (id.includes('betrag')) value = '120';
      if (id.toLowerCase().includes('working') || id.toLowerCase().includes('length') || id.toLowerCase().includes('canal')) value = '{"MB":19,"DB":18}';
      if (id.toLowerCase().includes('surface')) value = 'mod';
      await input.fill(value);
      answersGiven.push(`Filled ${id}=${value}`);
    }

    const areas = page.locator('textarea');
    const areaCount = await areas.count();
    for (let j = 0; j < areaCount; j++) {
      const area = areas.nth(j);
      if (!await area.isVisible().catch(() => false)) continue;
      const current = await area.inputValue().catch(() => '');
      if (current.trim().length > 0) continue;
      const ctx = ((await area.locator('xpath=ancestor::*[@data-testid][1]').textContent().catch(() => '')) || '').toLowerCase();
      let value = 'ja';
      if (ctx.includes('betrag')) value = '120';
      if (ctx.includes('flächen') || ctx.includes('flaechen') || ctx.includes('surface')) value = 'mod';
      if (ctx.includes('arbeitsl') || ctx.includes('canal') || ctx.includes('kanal')) value = '{"MB":19,"DB":18}';
      await area.fill(value);
      answersGiven.push(`Filled textarea(${ctx.slice(0, 32) || 'generic'})=${value}`);
    }

    const complete = page.locator('[data-testid="complete-button"]').first();
    if (await complete.isVisible().catch(() => false) && !await complete.isDisabled().catch(() => true)) {
      await complete.click({ force: true });
      answersGiven.push('Clicked complete-button');
      await page.waitForTimeout(350);
      continue;
    }

    const row = page.locator('[data-testid^="question-row-"]').first();
    if (await row.isVisible().catch(() => false)) {
      const yes = row.locator('button:has-text("Ja")').first();
      if (await yes.isVisible().catch(() => false)) {
        await yes.click({ force: true });
        answersGiven.push('Selected option "Ja"');
        await page.waitForTimeout(180);
        continue;
      }
      const opt = row.locator('button[aria-pressed="false"]').first();
      if (await opt.isVisible().catch(() => false)) {
        const label = ((await opt.textContent().catch(() => '')) || '').trim();
        await opt.click({ force: true });
        answersGiven.push(`Selected option "${label || 'first'}"`);
        await page.waitForTimeout(180);
        continue;
      }
    }

    const anyBtn = page
      .locator('main button:not([disabled])')
      .filter({ hasNotText: /einstellungen|gkv|\+mkv|pkv|kurz|mittel|lang|zum output|neuer fall|dokumentieren|aufnahme/i })
      .first();
    if (await anyBtn.isVisible().catch(() => false)) {
      const label = ((await anyBtn.textContent().catch(() => '')) || '').trim();
      await anyBtn.click({ force: true });
      answersGiven.push(`Clicked fallback button "${label || 'unknown'}"`);
      await page.waitForTimeout(180);
      continue;
    }

    await page.waitForTimeout(200);
  }
  throw new Error('Questions loop timeout');
}

async function openOutput(page: Page): Promise<void> {
  if (await page.locator('[data-testid="v10-multi-output-panel"]').isVisible().catch(() => false)) return;
  const toOutput = page.locator('button:has-text("Zum Output")').first();
  if (await toOutput.isVisible().catch(() => false)) await toOutput.click({ force: true });
  await page.waitForTimeout(300);
}

async function collectBillingCodes(page: Page): Promise<string[]> {
  const codes = new Set<string>();
  const tags = page.locator('[data-testid^="billing-code-"]');
  const count = await tags.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const txt = (await tags.nth(i).textContent().catch(() => '')) || '';
    const matches = txt.match(/(BEMA_[0-9A-ZÄ]+|GOZ_[0-9A-Z]+)/gi) || [];
    matches.forEach(m => codes.add(m.toUpperCase()));
  }

  if (codes.size === 0) {
    const toggle = page.locator('[data-testid="billing-toggle"]').first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click({ force: true });
      await page.waitForTimeout(180);
    }
    const card = (await page.locator('[data-testid="billing-card"]').textContent().catch(() => '')) || '';
    const matches = card.match(/(BEMA_[0-9A-ZÄ]+|GOZ_[0-9A-Z]+)/gi) || [];
    matches.forEach(m => codes.add(m.toUpperCase()));
  }

  return Array.from(codes);
}

function evaluateFindings(r: Omit<ScenarioResult, 'findings'>): string[] {
  const findings: string[] = [];
  const output = r.outputText.toLowerCase();
  const hasBema = r.billingCodes.some(c => c.startsWith('BEMA_'));
  const hasGoz = r.billingCodes.some(c => c.startsWith('GOZ_'));

  if (r.runtime.extractionMethod !== 'llm' || r.runtime.extractionLlmError !== 'none') {
    findings.push('LLM extraction path unstable');
  }
  if (r.runtime.preanalysisSource !== 'llm') {
    findings.push(`Preanalysis not llm (${r.runtime.preanalysisSource})`);
  }
  if (r.insuranceMode === 'GKV' && hasGoz) {
    findings.push('GKV case contains GOZ codes unexpectedly');
  }
  if (r.insuranceMode === 'PKV' && !hasGoz) {
    findings.push('PKV case missing GOZ coverage');
  }
  if (r.insuranceMode === 'GKV' && (output.includes('mehrkosten') || output.includes('zuzahlung'))) {
    findings.push('GKV output leaks MKV narrative');
  }
  if (r.dictation.toLowerCase().includes('modb')) {
    if (r.billingCodes.includes('GOZ_2060')) {
      findings.push('MODB dictation collapsed to GOZ_2060 (likely surface under-detection)');
    }
  }
  if (r.treatmentId === 'endo' && output.includes('zahn 11') && output.includes('kanalaufbereitung 2')) {
    findings.push('Potential anterior canal-count plausibility mismatch');
  }
  if (r.outputText.length < 120) {
    findings.push('Output text too short for forensic expectation');
  }
  return findings;
}

function toMarkdown(results: ScenarioResult[]): string {
  const now = new Date().toISOString();
  const totalFindings = results.reduce((n, r) => n + r.findings.length, 0);
  const llmOk = results.filter(r => r.runtime.extractionMethod === 'llm' && r.runtime.extractionLlmError === 'none').length;
  const preOk = results.filter(r => r.runtime.preanalysisSource === 'llm').length;

  let md = `# Hosted V10 Audit (20 Real Dictations)\n\n`;
  md += `- Generated: ${now}\n`;
  md += `- Target: ${BASE_URL}\n`;
  md += `- Cases: ${results.length}\n`;
  md += `- LLM extraction OK: ${llmOk}/${results.length}\n`;
  md += `- LLM preanalysis OK: ${preOk}/${results.length}\n`;
  md += `- Total findings: ${totalFindings}\n\n`;

  const grouped = new Map<string, number>();
  for (const r of results) {
    for (const f of r.findings) grouped.set(f, (grouped.get(f) || 0) + 1);
  }

  md += `## Aggregated Findings\n`;
  if (grouped.size === 0) {
    md += `- none\n\n`;
  } else {
    for (const [k, v] of [...grouped.entries()].sort((a,b)=>b[1]-a[1])) {
      md += `- ${k}: ${v}x\n`;
    }
    md += `\n`;
  }

  for (const r of results) {
    md += `## ${r.id} — ${r.title}\n`;
    md += `- Treatment/Insurance: ${r.treatmentId} / ${r.insuranceMode}\n`;
    md += `- Runtime: extraction=${r.runtime.extractionMethod} (${r.runtime.extractionLlmError}), preanalysis=${r.runtime.preanalysisSource}, fallback=${r.runtime.preanalysisFallback}\n`;
    md += `- Askbacks: ${r.askbacks.length > 0 ? r.askbacks.join(' | ') : 'none'}\n`;
    md += `- Answers: ${r.answersGiven.length > 0 ? r.answersGiven.slice(0, 8).join(' | ') : 'none'}\n`;
    md += `- Billing: ${r.billingCodes.join(', ') || 'none'}\n`;
    md += `- Findings: ${r.findings.length > 0 ? r.findings.join(' ; ') : 'none'}\n`;
    md += `- Output excerpt: ${r.outputText.replace(/\s+/g, ' ').slice(0, 260)}\n\n`;
  }

  return md;
}

async function runScenario(page: Page, s: Scenario): Promise<ScenarioResult> {
  await resetCase(page);
  await setupPage(page);
  await selectTreatment(page, s.treatmentId);
  await selectInsurance(page, s.insuranceMode);
  await page.fill('[data-testid="v10-dictation-input"]', s.dictation);

  const run = page.locator('[data-testid="v10-run-button"]').first();
  await run.click({ force: true });
  await waitForResultSurface(page);
  await handleIntentConfirmation(page);

  const askbacks = await snapshotAskbacks(page);
  const answersGiven = await answerQuestionsUntilOutput(page);
  await openOutput(page);

  const outputText = ((await page.locator('[data-testid="v10-output-text"]').textContent().catch(() => null))
    || (await page.locator('[data-testid="multi-output-paper"]').textContent().catch(() => null))
    || (await page.locator('main').first().textContent().catch(() => null))
    || '').trim();

  const runtimeMeta = page.locator('[data-testid="v10-llm-runtime-meta"]').first();
  const runtime = {
    extractionMethod: (await runtimeMeta.getAttribute('data-extraction-method').catch(() => 'unknown')) || 'unknown',
    extractionLlmError: (await runtimeMeta.getAttribute('data-extraction-llm-error').catch(() => 'unknown')) || 'unknown',
    preanalysisSource: (await runtimeMeta.getAttribute('data-preanalysis-source').catch(() => 'unknown')) || 'unknown',
    preanalysisFallback: (await runtimeMeta.getAttribute('data-preanalysis-fallback').catch(() => 'unknown')) || 'unknown',
  };

  const billingCodes = await collectBillingCodes(page);

  const base = {
    id: s.id,
    title: s.title,
    treatmentId: s.treatmentId,
    insuranceMode: s.insuranceMode,
    dictation: s.dictation,
    askbacks,
    answersGiven,
    outputText,
    billingCodes,
    runtime,
  };

  return {
    ...base,
    findings: evaluateFindings(base),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  if (IS_LOCAL_TARGET) {
    await context.addInitScript(() => {
      (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
      window.localStorage.setItem('v10_debug', 'true');
    });
    await context.route('**/firestore.googleapis.com/**', route => route.abort());
    await context.route('**/firebaseio.com/**', route => route.abort());
  }
  const page = await context.newPage();

  const results: ScenarioResult[] = [];
  try {
    await setupPage(page);
    for (const s of SCENARIOS) {
      console.log(`Running ${s.id} ${s.title}`);
      try {
        const res = await runScenario(page, s);
        results.push(res);
        console.log(JSON.stringify({ id: s.id, findings: res.findings, billing: res.billingCodes, pre: res.runtime.preanalysisSource, llm: res.runtime.extractionMethod }));
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        results.push({
          id: s.id,
          title: s.title,
          treatmentId: s.treatmentId,
          insuranceMode: s.insuranceMode,
          dictation: s.dictation,
          askbacks: [],
          answersGiven: [],
          outputText: `ERROR: ${err}`,
          billingCodes: [],
          runtime: { extractionMethod: 'unknown', extractionLlmError: 'unknown', preanalysisSource: 'unknown', preanalysisFallback: 'unknown' },
          findings: [`Scenario execution failed: ${err}`],
        });
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const md = toMarkdown(results);
  const outDir = '/Users/david/dokumaster-ui/docs/system-atlas/artifacts/_latest/v10-hosted-audit-20';
  fs.mkdirSync(outDir, { recursive: true });
  const outMdPath = `${outDir}/summary.md`;
  const outJsonPath = `${outDir}/report.json`;
  fs.writeFileSync(outMdPath, md, 'utf8');
  fs.writeFileSync(
    outJsonPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, results }, null, 2),
    'utf8'
  );

  const total = results.reduce((n, r) => n + r.findings.length, 0);
  console.log(`Wrote report: ${outMdPath}`);
  console.log(`Wrote JSON: ${outJsonPath}`);
  console.log(`Findings total: ${total}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
