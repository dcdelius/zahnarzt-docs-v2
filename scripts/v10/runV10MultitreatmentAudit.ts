import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import { detectTreatmentIntents } from '../../src/docudent/v10/preanalysis/detectTreatmentIntents';
import { buildSegmentsFromIntents } from '../../src/docudent/v10/preanalysis/buildSegmentsFromIntents';
import { runV10Bundle } from '../../src/docudent/v10/pipeline/runV10Bundle';

type Scenario = {
  id: string;
  label: string;
  dictation: string;
  insuranceType?: 'GKV' | 'PKV' | 'MKV';
  expectedTreatments?: string[];
};

type ScenarioFile = {
  cases: Scenario[];
};

type CaseResult = {
  id: string;
  label: string;
  dictation: string;
  state: 'output' | 'questions' | 'error';
  passes: number;
  questions: Array<{ id: string; text: string }>;
  answers: Record<string, unknown>;
  detectedTreatments: string[];
  billingCodes: string[];
  fullText: string;
  issues: string[];
};

const DEFAULT_FILE = 'scripts/v10/scenarios.v10.multitreatment.core3.json';

const parseArgs = (): { file: string } => {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--file');
  const file = idx >= 0 && args[idx + 1] ? args[idx + 1] : DEFAULT_FILE;
  return { file: path.isAbsolute(file) ? file : path.resolve(process.cwd(), file) };
};

const toPlain = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const autoAnswer = (questionId: string, text: string, options?: Array<{ id: string; label: string; dataValue?: unknown }>): unknown => {
  const key = toPlain(questionId);
  const qText = toPlain(text);
  const first = options?.[0];
  const firstValue = first?.dataValue ?? first?.id;

  if (!options || options.length === 0) {
    if (key.includes('befund') || qText.includes('befund')) return 'klinisch dokumentiert';
    if (key.includes('anlass') || qText.includes('anlass')) return 'behandlungsanlass dokumentiert';
    if (key.includes('indikation') || qText.includes('indikation')) return 'therapieplanung';
    return 'dokumentiert';
  }

  const pickBy = (needle: string): unknown => {
    const found = options.find((o) =>
      toPlain(String(o.id)).includes(needle)
      || toPlain(String(o.label)).includes(needle)
      || toPlain(String(o.dataValue)).includes(needle)
    );
    return found ? (found.dataValue ?? found.id) : undefined;
  };

  if (key.includes('isolation') || key.includes('kofferdam')) return pickBy('koff') ?? firstValue;
  if (key.includes('mkv') && (key.includes('betrag') || key.includes('amount'))) return '150';
  if (key.includes('mkv') && (key.includes('confirm') || key.includes('bestaetigt'))) return pickBy('mehr') ?? firstValue;
  if (key.includes('ueberkappung') && !key.includes('material')) return pickBy('nein') ?? pickBy('no') ?? firstValue;
  if (key.includes('ueberkappung_material')) return pickBy('ca') ?? firstValue;
  if (key.includes('roentgen_typ')) return pickBy('opg') ?? firstValue;
  if (key.includes('roentgen_zeit')) return pickBy('prae') ?? firstValue;
  if (key.includes('roentgen_befund')) return pickBy('unauff') ?? firstValue;

  return firstValue ?? 'unknown';
};

async function runCase(s: Scenario): Promise<CaseResult> {
  const issues: string[] = [];
  const answers: Record<string, unknown> = {};

  const pre = await detectTreatmentIntents(s.dictation);
  const segments = buildSegmentsFromIntents({
    bundle: pre.bundle,
    insuranceType: s.insuranceType ?? 'GKV',
    textLength: 'mittel',
  });

  let passes = 0;
  let lastState: 'output' | 'questions' | 'error' = 'error';
  let lastQuestions: Array<{ id: string; text: string }> = [];
  let detectedTreatments: string[] = [];
  let billingCodes: string[] = [];
  let fullText = '';

  while (passes < 4) {
    passes += 1;
    const result = await runV10Bundle({
      dictation: s.dictation,
      segments,
      globalAnswers: answers,
    });

    lastState = result.state;

    if (result.state === 'error') {
      issues.push(result.error ?? 'bundle_error');
      break;
    }

    if (result.state === 'output' && result.output) {
      detectedTreatments = Array.from(new Set((result.output.segments ?? []).map((x) => String(x.treatmentId)))).sort();
      billingCodes = (result.output.billingCodes ?? []).map((x) => x.code);
      fullText = result.output.fullText ?? '';
      break;
    }

    const questions = result.questions ?? [];
    lastQuestions = questions.map((q) => ({ id: q.id, text: q.question }));
    if (questions.length === 0) break;

    for (const q of questions) {
      if (answers[q.id] !== undefined) continue;
      answers[q.id] = autoAnswer(q.id, q.question, q.options as any);
    }
  }

  if (lastState !== 'output') {
    issues.push(`ended_in_${lastState}`);
  }
  if (!fullText.trim()) {
    issues.push('empty_fulltext');
  }
  if (billingCodes.length === 0 && lastState === 'output') {
    issues.push('no_billing_codes');
  }

  if (s.expectedTreatments && s.expectedTreatments.length > 0 && detectedTreatments.length > 0) {
    const expected = s.expectedTreatments.map((x) => x.toLowerCase());
    const missing = expected.filter((x) => !detectedTreatments.includes(x));
    if (missing.length > 0) issues.push(`missing_treatments:${missing.join(',')}`);
  }

  return {
    id: s.id,
    label: s.label,
    dictation: s.dictation,
    state: lastState,
    passes,
    questions: lastQuestions,
    answers,
    detectedTreatments,
    billingCodes,
    fullText,
    issues,
  };
}

async function main() {
  const { file } = parseArgs();
  const json = JSON.parse(fs.readFileSync(file, 'utf8')) as ScenarioFile;
  const cases = json.cases ?? [];

  const results: CaseResult[] = [];
  for (const s of cases) {
    // eslint-disable-next-line no-await-in-loop
    const r = await runCase(s);
    results.push(r);
  }

  const suiteName = path.basename(file).replace(/\.json$/i, '');
  const outDir = path.join(process.cwd(), 'docs/system-atlas/artifacts/_latest/v10-multitreatment-audit', suiteName);
  fs.mkdirSync(outDir, { recursive: true });

  const reportPath = path.join(outDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ results }, null, 2), 'utf8');

  const summary = [
    '# V10 Multi-Treatment Audit',
    '',
    `Suite: ${suiteName}`,
    `Cases: ${results.length}`,
    `Pass: ${results.filter((r) => r.issues.length === 0).length}`,
    '',
    ...results.map((r) => `- ${r.id}: ${r.issues.length === 0 ? 'OK' : 'ISSUES'} (${r.issues.join('; ') || 'none'})`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'summary.md'), summary, 'utf8');

  const issueCount = results.reduce((n, r) => n + r.issues.length, 0);
  console.log(`Wrote ${reportPath} (issues: ${issueCount})`);
  if (issueCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
