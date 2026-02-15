import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import { createV10Session } from '../../src/docudent/v10/uiController/createV10Session';

type Scenario = {
  id: string;
  label: string;
  dictation: string;
  insuranceType?: 'GKV' | 'PKV' | 'MKV';
  treatmentId?: string;
  materialDefaults?: Record<string, unknown>;
  /** Some treatments/scenarios may legitimately emit no billing codes (e.g., non-billable documentation-only). */
  expectBillingCodes?: boolean;
};

type QuestionAnswer = {
  questionId: string;
  answerId: string | string[] | number | boolean | null;
};

type ScenarioResult = {
  id: string;
  label: string;
  dictation: string;
  questions: Array<{ id: string; key?: string; text?: string }>;
  answers: QuestionAnswer[];
  state: string;
  outputSummary: {
    hasCopyText: boolean;
    copyText: string;
    billingCodes: string[];
    chips: string[];
    debugInstances: Array<{
      instanceId: string;
      tooth?: string;
      cappingPerformed?: string;
      pulpaOpened?: boolean;
      nurKasse?: boolean;
      mkvPresent?: boolean;
      mehrkostenConfirmed?: boolean;
      chips: string[];
    }>;
  };
  issues: string[];
};

const OUTPUT_DIR = path.join(
  process.cwd(),
  'docs/system-atlas/artifacts/_latest/v10-real-dictation-check'
);

const scenarios: Scenario[] = [
  {
    id: 'gkv-fuellung-profunda-la',
    label: 'GKV Füllung profunda mit LA + Kofferdam',
    dictation:
      'GKV. Zahn 26 okklusal, caries profunda. Lokalanästhesie mit Infiltration. Kofferdam angelegt. Adhäsiv, Kompositfüllung mehrschichtig.',
    insuranceType: 'GKV',
  },
  {
    id: 'gkv-fuellung-multizahn-kontext',
    label: 'GKV 2 Zähne + Kontrakt-Satz ohne Zahn',
    dictation:
      'GKV. Zahn 15 okklusal, Kompositfüllung. Zahn 25 okklusal, Kompositfüllung. Mehrkostenvereinbarung wurde besprochen.',
    insuranceType: 'GKV',
  },
  {
    id: 'gkv-fuellung-approximal-matrix',
    label: 'GKV approximal mit Matrix und Keil',
    dictation:
      'GKV. Zahn 14 mesial, alte Füllung entfernt. Mehrschichtige Komposittechnik mit Matrix und Keil, wegen approximaler Defektlage. Politur.',
    insuranceType: 'GKV',
  },
  {
    id: 'gkv-fuellung-seitenzahn-komposit-askback',
    label: 'GKV Seitenzahn Komposit (soll Askback statt Error)',
    dictation:
      'GKV. Zahn 46 okklusal, sehr tiefe Füllung, Komposit. Trockenlegung relativ. Okklusionskontrolle und Politur.',
    insuranceType: 'GKV',
  },
  {
    id: 'gkv-fuellung-anesthesia-unclear',
    label: 'GKV Füllung mit unklarer Anästhesie',
    dictation:
      'Zahn 11 distalinzisal, Kompositfüllung. Anästhesie durchgeführt.',
    insuranceType: 'GKV',
  },
  {
    id: 'gkv-fuellung-ueberkappung',
    label: 'GKV indirekte Überkappung',
    dictation:
      'Zahn 36 okklusal, caries profunda. Indirekte Überkappung mit Kalziumhydroxid, Unterfüllung, Kompositfüllung. Postoperativ etwas empfindlich.',
    insuranceType: 'GKV',
  },
  {
    id: 'gkv-fuellung-tief-exkavation-askback-ueberkappung',
    label: 'GKV sehr tiefe Exkavation (Askback: Überkappung ja/nein)',
    dictation:
      'GKV. Zahn 27 okklusal, sehr tiefe Exkavation pulpanah. Unterfüllung. Kompositfüllung. Keine Pulpaeröffnung.',
    insuranceType: 'GKV',
  },
  {
    id: 'mkv-fuellung-mehrkosten',
    label: 'MKV Füllung mit Mehrkostenbetrag',
    dictation:
      'MKV. Zahn 24 mesial, adhäsive Mehrschichttechnik, Matrixsystem verwendet. Mehrkostenbetrag 120 Euro vereinbart.',
    insuranceType: 'MKV',
  },
  {
    id: 'mkv-fuellung-betrag-toothless',
    label: 'MKV Betrag im Zahn-losen Satz (Scoping globalSegments)',
    dictation:
      'MKV. Zahn 15 okklusal, Kompositfüllung mehrschichtig, Adhäsiv. Mehrkostenbetrag 150 Euro vereinbart. Matrixsystem verwendet.',
    insuranceType: 'MKV',
  },
  {
    id: 'mkv-fuellung-ohne-betrag',
    label: 'MKV Füllung ohne Betrag (Askback)',
    dictation:
      'MKV. Zahn 15 okklusal, Kompositfüllung. Mehrkosten vereinbart, Betrag noch offen.',
    insuranceType: 'MKV',
  },
  {
    id: 'mkv-fuellung-nur-kasse',
    label: 'MKV aber nur Kasse gewählt',
    dictation:
      'MKV. Zahn 46 okklusal, Kompositfüllung. Patient wünscht nur Kasse, keine Mehrkosten.',
    insuranceType: 'MKV',
  },
  {
    id: 'mkv-fuellung-nur-kasse-varianten',
    label: 'MKV Negation Varianten (soll MKV-Text suppressen)',
    dictation:
      'MKV. Zahn 36 okklusal, Kompositfüllung. Keine Mehrkosten. Nur Kasse. Ohne Zuzahlung.',
    insuranceType: 'MKV',
  },
  {
    id: 'mkv-fuellung-seiteninfo',
    label: 'MKV Füllung mit klinischer Zusatzinfo',
    dictation:
      'MKV. Zahn 35 distal, Kompositfüllung. Krone zu hoch, Bisskontrolle geplant. Mehrkosten 150€.',
    insuranceType: 'MKV',
  },
  {
    id: 'pkv-fuellung-simple',
    label: 'PKV einfache Kompositfüllung',
    dictation:
      'PKV. Zahn 16 okklusal, Kompositfüllung, Trockenlegung relativ.',
    insuranceType: 'PKV',
  },
  {
    id: 'pkv-fuellung-la-leitung',
    label: 'PKV Füllung mit Leitungsanästhesie',
    dictation:
      'PKV. Zahn 47 distal, Lokalanästhesie Leitungsanästhesie. Kompositfüllung mehrschichtig, Politur.',
    insuranceType: 'PKV',
  },
  {
    id: 'pkv-fuellung-approximal-matrix-keil',
    label: 'PKV approximal mit Matrix/Keil + Finishing',
    dictation:
      'PKV. Zahn 12 distal, Kompositfüllung approximal mit Matrix und Keil. Okklusionskontrolle, Ausarbeitung und Politur.',
    insuranceType: 'PKV',
  },
  {
    id: 'pkv-endo-basic',
    label: 'PKV Endo Grundablauf',
    dictation:
      'PKV. Zahn 21 endodontische Behandlung. Trepanation, Vitalexstirpation, Längenmessung, Aufbereitung maschinell, Spülung mit NaOCl, medikamentöse Einlage, temporärer Verschluss.',
    insuranceType: 'PKV',
    treatmentId: 'endo',
  },
  {
    id: 'pkv-endo-warm-vertikal',
    label: 'PKV Endo mit warm vertikaler WF + Röntgenkontrolle',
    dictation:
      'PKV. Zahn 36 Endo. Trepanation, Arbeitslängenmessung, Aufbereitung rotierend, Spülung NaOCl/EDTA, warm vertikale Wurzelfüllung, Röntgenkontrolle, provisorischer Verschluss.',
    insuranceType: 'PKV',
    treatmentId: 'endo',
  },
  {
    id: 'gkv-extraction-naht',
    label: 'GKV Extraktion mit Naht/Wundversorgung',
    dictation:
      'GKV. Zahn 18 Extraktion. Wundversorgung, Naht gelegt. Postoperativer Hinweis.',
    insuranceType: 'GKV',
    treatmentId: 'extraction',
  },
  {
    id: 'gkv-pzr-fluor',
    label: 'GKV PZR mit Zahnstein + Fluoridierung',
    dictation:
      'GKV. PZR durchgeführt, Zahnstein entfernt, Politur und abschließende Fluoridierung.',
    insuranceType: 'GKV',
    treatmentId: 'pzr',
  },
  {
    id: 'pkv-crown-prep-provi',
    label: 'PKV Kronenpräparation mit Abformung + Provisorium',
    dictation:
      'PKV. Zahn 11 Kronenpräparation, Abformung, Provisorium eingesetzt.',
    insuranceType: 'PKV',
    treatmentId: 'crown_prep',
  },
];

const pickAnswer = (
  q: { id: string; question?: string; options?: Array<{ value: string; label: string }> },
  dictation: string
): QuestionAnswer | null => {
  const key = (q.id ?? '').toLowerCase();
  const text = (q.question ?? '').toLowerCase();
  const normalizedDictation = dictation
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');

  const detectAmount = (input: string): string | null => {
    const patterns = [
      /(\d+(?:[.,]\d{2})?)\s*€/,              // 120€, 150,50€
      /(\d+(?:[.,]\d{2})?)\s*euro/i,          // 120 Euro
      /mehrkosten[:\s]+(\d+(?:[.,]\d{2})?)/i, // Mehrkosten: 120
      /betrag[:\s]+(\d+(?:[.,]\d{2})?)/i,     // Betrag: 150
    ];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1].replace(',', '.');
    }
    return null;
  };

  if (key.includes('insurance') || text.includes('versicherung')) {
    return { questionId: q.id, answerId: 'GKV' };
  }
  if (key.includes('mkv') && (key.includes('begruendung') || text.includes('begründung'))) {
    return { questionId: q.id, answerId: 'mkv_begruendung' };
  }
  if (key.includes('mkv') && (key.includes('betrag') || text.includes('betrag') || key.includes('amount'))) {
    const amount = detectAmount(dictation);
    if (!amount) {
      return null;
    }
    return { questionId: q.id, answerId: amount };
  }
  if (key.includes('vital') || text.includes('sensibil')) {
    return { questionId: q.id, answerId: 'unknown' };
  }
  if (key.includes('percussion') || text.includes('perkussion')) {
    return { questionId: q.id, answerId: 'unknown' };
  }
  if (key.includes('ueberkappung_material') || text.includes('überkappungsmaterial')) {
    if (normalizedDictation.includes('mta')) {
      return { questionId: q.id, answerId: 'mta' };
    }
    if (normalizedDictation.includes('biodentine')) {
      return { questionId: q.id, answerId: 'biodentine' };
    }
    if (normalizedDictation.includes('calciumhydroxid') || normalizedDictation.includes('ca(oh)') || normalizedDictation.includes('caoh')) {
      return { questionId: q.id, answerId: 'caoh' };
    }
    return null;
  }
  if (key.includes('ueberkappung') || text.includes('überkapp')) {
    if (normalizedDictation.includes('indirekte uberkappung') || normalizedDictation.includes('indirekt uberkapp')) {
      return { questionId: q.id, answerId: 'indirekt' };
    }
    if (normalizedDictation.includes('direkte uberkappung') || normalizedDictation.includes('direkt uberkapp')) {
      return { questionId: q.id, answerId: 'direkt' };
    }
    return { questionId: q.id, answerId: 'no' };
  }
  if (key.includes('diagnose_confirmation') || text.includes('kariestiefe')) {
    return { questionId: q.id, answerId: 'confirmed' };
  }
  if (key.includes('isolation') || text.includes('isolation')) {
    return { questionId: q.id, answerId: 'kofferdam' };
  }
  if (key.includes('working_length_method') || text.includes('arbeitslängen bestimmt')) {
    return { questionId: q.id, answerId: 'Apexlokator (EAL)' };
  }
  if (key.includes('working_length') || key.includes('workinglength') || text.includes('arbeitslängen')) {
    return { questionId: q.id, answerId: JSON.stringify({ MB: 21, DB: 21 }) };
  }
  if (key.includes('anesthesia') || text.includes('anästhesie')) {
    if (text.includes('welche') || text.includes('art')) {
      return { questionId: q.id, answerId: 'local_infiltration' };
    }
    return { questionId: q.id, answerId: true };
  }
  if (key.includes('material') || text.includes('material')) {
    return { questionId: q.id, answerId: 'composite' };
  }
  if (key.includes('surface') || text.includes('fläche')) {
    return { questionId: q.id, answerId: ['mesial'] };
  }
  if (key.includes('endo') || text.includes('endo')) {
    if (key.includes('workinglength') || text.includes('längenmessung')) {
      return { questionId: q.id, answerId: 'apexlocator' };
    }
    if (key.includes('irrigation') || text.includes('spül')) {
      return { questionId: q.id, answerId: ['naocl'] };
    }
    if (key.includes('medication') || text.includes('einlage')) {
      return { questionId: q.id, answerId: 'caoh2' };
    }
  }
  return null;
};

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

const runScenario = async (scenario: Scenario): Promise<ScenarioResult> => {
  const session = createV10Session();

  let result = await session.start(scenario.dictation, {
    settings: scenario.materialDefaults ?? {},
    insuranceType: scenario.insuranceType ?? 'GKV',
    treatmentId: scenario.treatmentId,
  });
  const collectedAnswers: QuestionAnswer[] = [];
  const issues: string[] = [];
  const answeredQuestionIds = new Set<string>();

  let safety = 0;
  while (result.phase === 'questions' && safety < 10) {
    safety += 1;
    const questionBlocks = result.questions ?? {};
    let answeredAny = false;

    for (const [instanceId, questions] of Object.entries(questionBlocks)) {
      for (const q of questions) {
        if (answeredQuestionIds.has(q.id)) {
          continue;
        }
        const qKey = (q.id ?? '').toLowerCase();
        const qText = (q.question ?? '').toLowerCase();
        const isMkvAmountQuestion =
          qKey.includes('mkv') && (qKey.includes('betrag') || qText.includes('betrag') || qKey.includes('amount'));
        const answer =
          pickAnswer({ id: q.id, question: q.question, options: q.options }, scenario.dictation) ??
          (!isMkvAmountQuestion && q.options && q.options.length > 0
            ? { questionId: q.id, answerId: q.options[0].value }
            : null);

        if (answer) {
          collectedAnswers.push(answer);
          answeredQuestionIds.add(q.id);
          answeredAny = true;
          // eslint-disable-next-line no-await-in-loop
          result = await session.answer(instanceId, answer.questionId, String(answer.answerId));
        } else {
          issues.push(`No auto-answer for question ${q.id}`);
        }
      }
    }

    if (!answeredAny) {
      break;
    }
  }

  const output = result.phase === 'output' ? result.output : undefined;
  const copyText = output?.fullText ?? '';
  const billingCodes = output?.billingRefs ?? [];
  const debugInstances = output?.debug?.instances ?? [];
  const chips = debugInstances.length > 0
    ? debugInstances.flatMap((inst) => inst.chips ?? [])
    : result.instances?.flatMap((inst) => Array.from(inst.chips ?? [])) ?? [];

  if (result.phase !== 'output') {
    issues.push(`Scenario ended in phase "${result.phase}"`);
  }
  if (!copyText.trim()) {
    issues.push('Empty copyText output');
  }
  const expectBilling = scenario.expectBillingCodes ?? true;
  if (expectBilling && billingCodes.length === 0) {
    issues.push('No billing codes emitted');
  }
  if (chips.length === 0) {
    issues.push('No chips emitted');
  }

  // ────────────────────────────────────────────────────────────
  // Architecture invariants (SSOT / no hidden paths)
  // ────────────────────────────────────────────────────────────
  for (const inst of debugInstances) {
    const emitters = (inst as any).chipEmitters as Record<string, string> | undefined;
    const chipList = (inst.chips ?? []) as string[];
    if (!emitters || Object.keys(emitters).length === 0) {
      issues.push(`Missing chipEmitters for instance ${inst.instanceId}`);
      continue;
    }
    for (const chipId of chipList) {
      const emitter = emitters[chipId];
      if (!emitter) {
        issues.push(`Missing emitter for chip "${chipId}" (instance ${inst.instanceId})`);
        continue;
      }
      if (emitter !== 'manualOverride' && !emitter.startsWith('node:')) {
        issues.push(`Invalid emitter "${emitter}" for chip "${chipId}" (instance ${inst.instanceId})`);
      }
    }

    // Nur-Kasse must suppress MKV chip and MKV boilerplate.
    const nurKasse = (inst as any).nurKasse === true;
    if (nurKasse) {
      if (chipList.includes('insurance_gkv_mkv')) {
        issues.push(`nurKasse=true but insurance_gkv_mkv chip is active (${inst.instanceId})`);
      }
      const lower = copyText.toLowerCase();
      if (lower.includes('mehrkostenvereinbarung') || lower.includes('zuzahlung')) {
        issues.push(`nurKasse=true but MKV boilerplate still present in text (${inst.instanceId})`);
      }
    }

    // Cp/P consistency (avoid "indirect -> renders as P" drift).
    if (chipList.includes('cp')) {
      const lower = copyText.toLowerCase();
      const mentionsDirect = /\bdirekte\s+überkappung\b/.test(lower) || /\bdirekte\s+ueberkappung\b/.test(lower);
      if (mentionsDirect) {
        issues.push(`cp chip active but text mentions direkte Überkappung (${inst.instanceId})`);
      }
    }
    if (chipList.includes('p')) {
      const lower = copyText.toLowerCase();
      const mentionsIndirect = /\bindirekte\s+überkappung\b/.test(lower) || /\bindirekte\s+ueberkappung\b/.test(lower);
      if (mentionsIndirect) {
        issues.push(`p chip active but text mentions indirekte Überkappung (${inst.instanceId})`);
      }
    }
  }

  return {
    id: scenario.id,
    label: scenario.label,
    dictation: scenario.dictation,
    questions:
      result.phase === 'questions'
        ? Object.values(result.questions ?? {}).flat().map((q) => ({
            id: q.id,
            key: q.id,
            text: q.question,
          }))
        : [],
    answers: collectedAnswers,
    state: result.phase,
    outputSummary: {
      hasCopyText: copyText.trim().length > 0,
      copyText,
      billingCodes,
      chips,
      debugInstances,
    },
    issues,
  };
};

const main = async () => {
  ensureDir(OUTPUT_DIR);

  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    // eslint-disable-next-line no-await-in-loop
    const result = await runScenario(scenario);
    results.push(result);
  }

  const reportPath = path.join(OUTPUT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ results }, null, 2), 'utf-8');

  const summaryLines = [
    '# V10 Real Dictation Check',
    '',
    `Scenarios: ${results.length}`,
    '',
    ...results.map((r) => {
      const status = r.issues.length === 0 ? 'OK' : 'ISSUES';
      return `- ${r.id}: ${status} (${r.issues.length} issues)`;
    }),
    '',
  ];

  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.md'), summaryLines.join('\n'), 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${reportPath}`);
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
