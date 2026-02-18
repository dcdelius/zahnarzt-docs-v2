import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import { createV10Session } from '../../src/docudent/v10/uiController/createV10Session';
import { runV10Bundle } from '../../src/docudent/v10/pipeline/runV10Bundle';
import { detectTreatmentIntents } from '../../src/docudent/v10/preanalysis/detectTreatmentIntents';
import { buildSegmentsFromIntents } from '../../src/docudent/v10/preanalysis/buildSegmentsFromIntents';

type Scenario = {
  id: string;
  label: string;
  dictation: string;
  insuranceType?: 'GKV' | 'PKV' | 'MKV';
  treatmentId?: string;
  materialDefaults?: Record<string, unknown>;
  expectedPhase?: 'output' | 'questions';
  expectedTreatments?: string[];
  expectedBillingCodes?: string[];
  /** Some treatments/scenarios may legitimately emit no billing codes (e.g., non-billable documentation-only). */
  expectBillingCodes?: boolean;
};

type ScenarioSuiteFile = {
  _meta?: {
    description?: string;
    version?: string;
    created?: string;
  };
  cases?: Scenario[];
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
    detectedTreatments: string[];
    extractionMethod: 'llm' | 'regex' | 'stub' | 'unknown';
    extractionLlmError: string;
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

const REQUIRE_LLM_PATH = process.env.DOCUDENT_REQUIRE_LLM_PATH !== '0';

const readEnv = (name: string): string | null => {
  const raw = process.env[name];
  if (!raw) return null;
  const trimmed = raw.replace(/^['"]|['"]$/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

const ensureServerOpenAiKey = (): void => {
  const openAiKey = readEnv('OPENAI_API_KEY');
  if (openAiKey) return;
  const viteKey = readEnv('VITE_OPENAI_API_KEY');
  if (!viteKey) return;
  process.env.OPENAI_API_KEY = viteKey;
  // eslint-disable-next-line no-console
  console.warn('[v10-real-dictation-check] OPENAI_API_KEY fehlte; nutze VITE_OPENAI_API_KEY als Laufzeit-Fallback fuer diesen Script-Run.');
};

const parseExtractionMeta = (
  traceLines: unknown
): { extractionMethod: 'llm' | 'regex' | 'stub' | 'unknown'; extractionLlmError: string } => {
  const lines = Array.isArray(traceLines) ? traceLines : [];
  let detailValue: string | null = null;
  for (const line of lines) {
    if (typeof line === 'string' && line.startsWith('extract_detail:')) {
      detailValue = line.slice('extract_detail:'.length);
      break;
    }
    if (
      line
      && typeof line === 'object'
      && (line as Record<string, unknown>).key === 'extract_detail'
      && typeof (line as Record<string, unknown>).value === 'string'
    ) {
      detailValue = (line as Record<string, string>).value;
      break;
    }
  }
  if (!detailValue) {
    return { extractionMethod: 'unknown', extractionLlmError: 'unknown' };
  }
  const fields = detailValue
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const [key, value] = item.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});

  const methodRaw = (fields.method ?? '').toLowerCase();
  const extractionMethod: 'llm' | 'regex' | 'stub' | 'unknown' =
    methodRaw === 'llm' || methodRaw === 'regex' || methodRaw === 'stub'
      ? methodRaw
      : 'unknown';

  return {
    extractionMethod,
    extractionLlmError: fields.llmError ?? 'unknown',
  };
};

const defaultScenarios: Scenario[] = [
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
    expectedPhase: 'questions',
    expectBillingCodes: false,
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
    expectedBillingCodes: ['GOZ_2360'],
  },
  {
    id: 'pkv-endo-warm-vertikal',
    label: 'PKV Endo mit warm vertikaler WF + Röntgenkontrolle',
    dictation:
      'PKV. Zahn 36 Endo. Trepanation, Arbeitslängenmessung, Aufbereitung rotierend, Spülung NaOCl/EDTA, warm vertikale Wurzelfüllung, Röntgenkontrolle, provisorischer Verschluss.',
    insuranceType: 'PKV',
    treatmentId: 'endo',
    expectedBillingCodes: ['GOZ_2440'],
  },
  {
    id: 'gkv-extraction-naht',
    label: 'GKV Extraktion mit Naht/Wundversorgung',
    dictation:
      'GKV. Zahn 18 Extraktion. Wundversorgung, Naht gelegt. Postoperativer Hinweis.',
    insuranceType: 'GKV',
    treatmentId: 'extraction',
    expectedBillingCodes: ['BEMA_41a'],
  },
  {
    id: 'gkv-pzr-fluor',
    label: 'GKV PZR mit Zahnstein + Fluoridierung',
    dictation:
      'GKV. PZR durchgeführt, Zahnstein entfernt, Politur und abschließende Fluoridierung.',
    insuranceType: 'GKV',
    treatmentId: 'pzr',
    expectedBillingCodes: ['BEMA_107'],
  },
  {
    id: 'pkv-crown-prep-provi',
    label: 'PKV Kronenpräparation mit Abformung + Provisorium',
    dictation:
      'PKV. Zahn 11 Kronenpräparation, Abformung, Provisorium eingesetzt.',
    insuranceType: 'PKV',
    treatmentId: 'crown_prep',
    expectedBillingCodes: ['GOZ_2210'],
  },
  {
    id: 'pkv-ueberkappung-direkt',
    label: 'PKV direkte Überkappung',
    dictation:
      'PKV. Direkte Ueberkappung mit MTA bei Pulpaeroeffnung an Zahn 36.',
    insuranceType: 'PKV',
    treatmentId: 'ueberkappung',
    expectedBillingCodes: ['GOZ_2340'],
  },
  {
    id: 'pkv-fissurenversiegelung',
    label: 'PKV Fissurenversiegelung',
    dictation:
      'PKV. Fissurenversiegelung an Zahn 16 zur Kariesprophylaxe mit Kunststoff durchgefuehrt.',
    insuranceType: 'PKV',
    treatmentId: 'fissurenversiegelung',
    expectedBillingCodes: ['GOZ_2000'],
  },
  {
    id: 'gkv-parodontologie-ait',
    label: 'GKV Parodontologie AIT',
    dictation:
      'GKV. Geschlossene antiinfektioese Parodontaltherapie an 36 und 37 durchgefuehrt.',
    insuranceType: 'GKV',
    treatmentId: 'parodontologie',
    expectedBillingCodes: ['BEMA_AIT'],
  },
  {
    id: 'gkv-upt-grad-b',
    label: 'GKV UPT Grad B',
    dictation:
      'GKV. UPT Grad B an Zahn 36 mit Recallintervall 6 Monate durchgefuehrt.',
    insuranceType: 'GKV',
    treatmentId: 'upt',
    expectedBillingCodes: ['BEMA_UPTb'],
  },
  {
    id: 'pkv-wsr-osteotomie',
    label: 'PKV WSR Osteotomie',
    dictation:
      'PKV. Wurzelspitzenresektion an Zahn 36 durch Osteotomie im Molarenbereich durchgefuehrt.',
    insuranceType: 'PKV',
    treatmentId: 'wsr',
    expectedBillingCodes: ['GOZ_3120'],
  },
  {
    id: 'gkv-trauma-schienung',
    label: 'GKV Trauma mit semipermanenter Schienung',
    dictation:
      'GKV. Zahntrauma an Zahn 11 nach Luxation, semipermanente Schienung angelegt und Verlaufskontrolle geplant.',
    insuranceType: 'GKV',
    treatmentId: 'trauma',
    expectedBillingCodes: ['BEMA_100'],
  },
  {
    id: 'pkv-implant-insertion',
    label: 'PKV Implantatinsertion',
    dictation:
      'PKV. Implantatinsertion regio 36 durchgefuehrt, postoperative Nachsorge und Kontrolltermin dokumentiert.',
    insuranceType: 'PKV',
    treatmentId: 'implant',
    expectedBillingCodes: ['GOZ_9000'],
  },
  {
    id: 'pkv-krone-definitiv',
    label: 'PKV Krone definitiv',
    dictation:
      'PKV. Vollkrone an Zahn 16 definitiv eingegliedert und okklusal kontrolliert.',
    insuranceType: 'PKV',
    treatmentId: 'krone',
    expectedBillingCodes: ['GOZ_5180'],
  },
  {
    id: 'pkv-teilkrone-definitiv',
    label: 'PKV Teilkrone definitiv',
    dictation:
      'PKV. Teilkronenversorgung an Zahn 16, Teilkrone definitiv eingegliedert.',
    insuranceType: 'PKV',
    treatmentId: 'teilkrone',
    expectedBillingCodes: ['GOZ_2220'],
  },
  {
    id: 'pkv-bruecke-definitiv',
    label: 'PKV Brücke definitiv',
    dictation:
      'PKV. Definitive Bruecke regio 36 eingegliedert und Okklusionskontrolle dokumentiert.',
    insuranceType: 'PKV',
    treatmentId: 'bruecke',
    expectedBillingCodes: ['GOZ_5070'],
  },
  {
    id: 'pkv-teilprothese-modellguss',
    label: 'PKV Teilprothese Modellguss',
    dictation:
      'PKV. Modellgussprothese im Unterkiefer eingesetzt und Druckstellenkontrolle dokumentiert.',
    insuranceType: 'PKV',
    treatmentId: 'teilprothese',
    expectedBillingCodes: ['GOZ_5210'],
  },
  {
    id: 'pkv-totalprothese-konventionell',
    label: 'PKV Totalprothese konventionell',
    dictation:
      'PKV. Konventionelle Totalprothese im Oberkiefer eingegliedert und Druckstellenkontrolle dokumentiert.',
    insuranceType: 'PKV',
    treatmentId: 'totalprothese',
    expectedBillingCodes: ['GOZ_5220'],
  },
  {
    id: 'gkv-schiene-okklusion',
    label: 'GKV Okklusionsschiene',
    dictation:
      'GKV. Okklusionsschiene eingegliedert.',
    insuranceType: 'GKV',
    treatmentId: 'schiene',
    expectedBillingCodes: ['BEMA_K1'],
  },
  {
    id: 'pkv-untersuchung-eingehend',
    label: 'PKV eingehende Untersuchung',
    dictation:
      'PKV. Eingehende Kontrolluntersuchung, Befunde unauffaellig, derzeit kein Therapiebedarf.',
    insuranceType: 'PKV',
    treatmentId: 'untersuchung',
    expectedBillingCodes: ['GOZ_0010'],
  },
  {
    id: 'pkv-roentgen-opg',
    label: 'PKV OPG',
    dictation:
      'PKV. OPG zur Therapieplanung praeoperativ angefertigt, apikale Auffaelligkeit regio 36 dokumentiert.',
    insuranceType: 'PKV',
    treatmentId: 'roentgen',
    expectedBillingCodes: ['GOZ_5004'],
  },
  {
    id: 'gkv-multi-extraktion-fuellung',
    label: 'GKV Multi-Treatment Extraktion plus Fuellung',
    dictation:
      'GKV. Extraktion Zahn 28 nach Luxation mit Infiltrationsanaesthesie; danach Fuellung Zahn 16 okklusal mit Komposit unter Kofferdam, Okklusion kontrolliert.',
    insuranceType: 'GKV',
    expectedTreatments: ['extraction', 'fuellung'],
    expectedBillingCodes: ['BEMA_41a', 'BEMA_13'],
  },
];

const parseArgs = (): { file?: string } => {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--file');
  if (idx === -1) return {};
  const value = args[idx + 1];
  return value ? { file: value } : {};
};

const resolveSuitePath = (raw: string): string => (
  path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw)
);

const loadScenariosFromFile = (suitePath: string): Scenario[] => {
  const parsed = JSON.parse(fs.readFileSync(suitePath, 'utf-8')) as ScenarioSuiteFile | Scenario[];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.cases)) return parsed.cases;
  return [];
};

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

  const pickOptionByKeyword = (keywords: string[]): string | null => {
    if (!q.options || q.options.length === 0) return null;
    for (const option of q.options) {
      const value = String(option.value ?? '').toLowerCase();
      const label = String(option.label ?? '').toLowerCase();
      for (const keyword of keywords) {
        if (value.includes(keyword) || label.includes(keyword)) {
          return option.value;
        }
      }
    }
    return null;
  };

  const detectCanalCount = (): string => {
    const toothMatch = normalizedDictation.match(/\bzahn\s+([1-8][1-8])\b/);
    const tooth = toothMatch?.[1] ?? '';
    if (/^(1[1-3]|2[1-3]|3[1-3]|4[1-3])$/.test(tooth)) return '1';
    if (/^(1[45]|2[45]|3[45]|4[45])$/.test(tooth)) return '2';
    return '3';
  };

  const defaultFreeTextAnswer = (): string => {
    if (key.includes('befund') || text.includes('befund')) return 'unauffaellig';
    if (key.includes('indikation') || text.includes('indikation')) return 'therapieplanung';
    if (key.includes('zeitpunkt') || text.includes('zeitpunkt')) return 'praeoperativ';
    if (key.includes('empfehl') || text.includes('empfehl')) return 'kontrolle in 6 monaten';
    if (key.includes('begruendung') || text.includes('begruendung')) return 'medizinisch indiziert';
    if (key.includes('anlass') || text.includes('anlass')) return 'kontrolluntersuchung';
    return 'dokumentiert';
  };

  if (key.includes('insurance') || text.includes('versicherung')) {
    if (normalizedDictation.includes('pkv')) return { questionId: q.id, answerId: 'PKV' };
    if (normalizedDictation.includes('mkv')) return { questionId: q.id, answerId: 'MKV' };
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
  if (key.includes('fissuren') && (key.includes('indikation') || text.includes('prophyl'))) {
    const option = pickOptionByKeyword(['prophylaxe', 'karies']);
    return { questionId: q.id, answerId: option ?? 'kariesprophylaxe' };
  }
  if (key.includes('fissuren') && key.includes('material')) {
    const option = pickOptionByKeyword(['kunststoff', 'komposit']);
    return { questionId: q.id, answerId: option ?? 'kunststoff' };
  }
  if (key.includes('parodontologie') && key.includes('phase')) {
    const option = pickOptionByKeyword(['ait', 'befund', 'upt']);
    return { questionId: q.id, answerId: option ?? 'ait' };
  }
  if (key.includes('upt') && key.includes('grad')) {
    const option = pickOptionByKeyword(['b', 'a', 'c']);
    return { questionId: q.id, answerId: option ?? 'b' };
  }
  if (key.includes('upt') && (key.includes('intervall') || text.includes('recall'))) {
    const option = pickOptionByKeyword(['6', '3', '12']);
    return { questionId: q.id, answerId: option ?? '6_monate' };
  }
  if (key.includes('wsr') && key.includes('zugang')) {
    const option = pickOptionByKeyword(['osteotomie', 'trepaniert']);
    return { questionId: q.id, answerId: option ?? 'osteotomie' };
  }
  if (key.includes('wsr') && key.includes('lokalisation')) {
    const option = pickOptionByKeyword(['molar', 'praemolar', 'front']);
    return { questionId: q.id, answerId: option ?? 'molar' };
  }
  if (key.includes('trauma') && (key.includes('schien') || text.includes('schien'))) {
    const option = pickOptionByKeyword(['semipermanent', 'rigid', 'flex']);
    return { questionId: q.id, answerId: option ?? 'semipermanent' };
  }
  if (key.includes('implant') && key.includes('phase')) {
    const option = pickOptionByKeyword(['insertion', 'freilegung']);
    return { questionId: q.id, answerId: option ?? 'insertion' };
  }
  if (key.includes('krone') && key.includes('eingliederung')) {
    const option = pickOptionByKeyword(['definitiv', 'provisor']);
    return { questionId: q.id, answerId: option ?? 'definitiv' };
  }
  if (key.includes('krone') && key.includes('art')) {
    const option = pickOptionByKeyword(['vollkrone', 'teilkrone']);
    return { questionId: q.id, answerId: option ?? 'vollkrone' };
  }
  if (key.includes('teilkrone') && key.includes('eingliederung')) {
    const option = pickOptionByKeyword(['definitiv', 'provisor']);
    return { questionId: q.id, answerId: option ?? 'definitiv' };
  }
  if (key.includes('teilkrone') && key.includes('art')) {
    const option = pickOptionByKeyword(['teilkrone']);
    return { questionId: q.id, answerId: option ?? 'teilkrone' };
  }
  if (key.includes('bruecke') && key.includes('eingliederung')) {
    const option = pickOptionByKeyword(['definitiv', 'provisor']);
    return { questionId: q.id, answerId: option ?? 'definitiv' };
  }
  if (key.includes('bruecke') && key.includes('art')) {
    const option = pickOptionByKeyword(['definitiv', 'provisor']);
    return { questionId: q.id, answerId: option ?? 'definitiv' };
  }
  if (key.includes('teilprothese') && key.includes('typ')) {
    const option = pickOptionByKeyword(['modellguss', 'interim']);
    return { questionId: q.id, answerId: option ?? 'modellguss' };
  }
  if (key.includes('totalprothese') && key.includes('typ')) {
    const option = pickOptionByKeyword(['konventionell', 'immediat']);
    return { questionId: q.id, answerId: option ?? 'konventionell' };
  }
  if (key.includes('schiene') && (key.includes('typ') || text.includes('schienentyp'))) {
    const option = pickOptionByKeyword(['okklusion', 'protrusion']);
    return { questionId: q.id, answerId: option ?? 'okklusionsschiene' };
  }
  if (key.includes('roentgen') && key.includes('typ')) {
    const option = pickOptionByKeyword(['opg', 'einzel', 'intraoral']);
    return { questionId: q.id, answerId: option ?? 'opg' };
  }
  if (key.includes('roentgen') && key.includes('indikation')) {
    const option = pickOptionByKeyword(['planung', 'diagnostik']);
    return { questionId: q.id, answerId: option ?? 'planung' };
  }
  if (key.includes('roentgen') && key.includes('zeitpunkt')) {
    const option = pickOptionByKeyword(['praeoperativ', 'postoperativ', 'intraoperativ']);
    return { questionId: q.id, answerId: option ?? 'praeoperativ' };
  }
  if (key.includes('roentgen') && key.includes('befund')) {
    const option = pickOptionByKeyword(['unauffaellig', 'auffaellig']);
    return { questionId: q.id, answerId: option ?? 'unauffaellig' };
  }
  if (key.includes('working_length_method') || text.includes('arbeitslängen bestimmt')) {
    const option = pickOptionByKeyword(['apex', 'eal', 'elektr', 'rontgen', 'roentgen']);
    return { questionId: q.id, answerId: option ?? 'Apexlokator (EAL)' };
  }
  if (key.includes('working_length') || key.includes('workinglength') || text.includes('arbeitslängen')) {
    return { questionId: q.id, answerId: JSON.stringify({ MB: 21, DB: 21 }) };
  }
  if (key.includes('endo_canal_count') || text.includes('kanalanzahl')) {
    const option = pickOptionByKeyword(['1', '2', '3', '4']);
    return { questionId: q.id, answerId: option ?? detectCanalCount() };
  }
  if (key.includes('medical_wf_technique') || key.includes('wf_technique')) {
    const option = pickOptionByKeyword(['rot', 'maschin', 'hand']);
    if (option) return { questionId: q.id, answerId: option };
    return { questionId: q.id, answerId: 'rotierend' };
  }
  if (key.includes('medical_wl_method') || key.includes('wl_method')) {
    const option = pickOptionByKeyword(['apex', 'eal', 'elektr', 'rontgen', 'roentgen']);
    return { questionId: q.id, answerId: option ?? 'Apexlokator (EAL)' };
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
    const option = pickOptionByKeyword(['mesial', 'okklusal', 'distal', 'm', 'o', 'd', 'b', 'l', 'i']);
    return { questionId: q.id, answerId: option ?? 'm' };
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
  if (!q.options || q.options.length === 0) {
    return { questionId: q.id, answerId: defaultFreeTextAnswer() };
  }
  return null;
};

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

const inferTreatmentIdFromInstanceId = (instanceId: string): string => {
  if (typeof instanceId !== 'string') return '';
  const match = instanceId.match(/^([a-z_]+)/i);
  return match?.[1] ?? '';
};

const runScenario = async (scenario: Scenario): Promise<ScenarioResult> => {
  const useBundleAutodetect =
    !scenario.treatmentId
    && Array.isArray(scenario.expectedTreatments)
    && scenario.expectedTreatments.length > 1;

  const session: any = useBundleAutodetect
    ? (() => {
      let prepared = false;
      let segments: ReturnType<typeof buildSegmentsFromIntents> = [];
      const bundleAnswers = new Map<string, unknown>();
      let insuranceType: 'GKV' | 'PKV' | 'MKV' = scenario.insuranceType ?? 'GKV';

      const runBundle = async () => {
        if (!prepared) {
          const preanalysis = await detectTreatmentIntents(scenario.dictation);
          segments = buildSegmentsFromIntents({
            bundle: preanalysis.bundle,
            insuranceType,
            textLength: 'mittel',
          });
          prepared = true;
        }

        const bundleResult = await runV10Bundle({
          dictation: scenario.dictation,
          segments,
          globalAnswers: bundleAnswers,
        });

        if (bundleResult.state === 'questions') {
          const groupedQuestions = (bundleResult.questions ?? []).reduce<Record<string, Array<{
            id: string;
            question: string;
            options?: Array<{ value: string; label: string }>;
          }>>>((acc, q) => {
            const instanceId = q.instanceId ?? 'global';
            const options = (q.options ?? []).map((opt) => ({
              value: String(opt.dataValue ?? opt.id),
              label: String(opt.label ?? opt.id),
            }));
            const list = acc[instanceId] ?? [];
            list.push({
              id: q.id,
              question: q.question,
              options,
            });
            acc[instanceId] = list;
            return acc;
          }, {});

          return {
            phase: 'questions',
            questions: groupedQuestions,
            instances: Object.keys(groupedQuestions).map((instanceId) => ({
              instanceId,
              chips: new Set<string>(),
            })),
          };
        }

        if (bundleResult.state === 'output' && bundleResult.output) {
          const billingRefs = (bundleResult.output.billingCodes ?? []).map((code) => code.code);
          const perInstance: Record<string, { text: string; billingRefs: string[] }> = {};
          const bundleDetectedTreatments = Array.from(
            new Set((bundleResult.output.segments ?? []).map((segment) => String(segment.treatmentId)))
          ).sort();
          const debugInstances: Array<{
            instanceId: string;
            tooth?: string;
            chips: string[];
          }> = [];

          for (const segment of bundleResult.output.segments ?? []) {
            const segmentBilling = segment.billingCodes ?? [];
            for (const instance of segment.instanceOutputs ?? []) {
              const instanceBillingRefs = segmentBilling
                .filter((code) => code.instanceId === instance.instanceId)
                .map((code) => code.code);
              perInstance[instance.instanceId] = {
                text: instance.text ?? '',
                billingRefs: instanceBillingRefs,
              };
              debugInstances.push({
                instanceId: instance.instanceId,
                tooth: instance.tooth,
                chips: instance.chips ?? [],
              });
            }
          }

          return {
            phase: 'output',
            output: {
              fullText: bundleResult.output.fullText ?? '',
              billingRefs,
              perInstance,
              debug: {
                instances: debugInstances,
                v10TraceLines: bundleResult.meta?.traceLines,
                detectedTreatments: bundleDetectedTreatments,
              },
            },
            instances: debugInstances.map((instance) => ({
              instanceId: instance.instanceId,
              chips: new Set(instance.chips ?? []),
            })),
          };
        }

        return {
          phase: 'error',
          error: bundleResult.error ?? 'bundle_error',
          instances: [],
        };
      };

      return {
        start: async (_dictation: string, opts?: { insuranceType?: 'GKV' | 'PKV' | 'MKV' }) => {
          insuranceType = opts?.insuranceType ?? insuranceType;
          return runBundle();
        },
        answer: async (_instanceId: string, questionId: string, value: string) => {
          bundleAnswers.set(questionId, value);
          return runBundle();
        },
      };
    })()
    : createV10Session();
  const expectedPhase = scenario.expectedPhase ?? 'output';

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
        const answeredQuestionId = `${instanceId}::${q.id}`;
        if (answeredQuestionIds.has(answeredQuestionId)) {
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
          answeredQuestionIds.add(answeredQuestionId);
          answeredAny = true;
          // eslint-disable-next-line no-await-in-loop
          result = await session.answer(instanceId, answer.questionId, String(answer.answerId));
        } else {
          if (expectedPhase === 'output') {
            issues.push(`No auto-answer for question ${q.id}`);
          }
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
  const debugDetectedTreatments = Array.isArray((output?.debug as any)?.detectedTreatments)
    ? (output?.debug as any).detectedTreatments.filter((item: unknown): item is string => typeof item === 'string')
    : [];
  const extractionMeta = parseExtractionMeta(output?.debug?.v10TraceLines);
  const detectedTreatments = Array.from(
    new Set(
      [
        ...debugDetectedTreatments,
        ...debugInstances
          .map((inst) => inferTreatmentIdFromInstanceId(inst.instanceId))
          .filter(Boolean),
      ]
    )
  ).sort();
  const chips = debugInstances.length > 0
    ? debugInstances.flatMap((inst) => inst.chips ?? [])
    : result.instances?.flatMap((inst) => Array.from(inst.chips ?? [])) ?? [];

  if (result.phase !== expectedPhase) {
    issues.push(`Scenario ended in phase "${result.phase}" (expected "${expectedPhase}")`);
  }
  if (expectedPhase === 'output') {
    const expectedTreatments = (
      scenario.expectedTreatments
      ?? (scenario.treatmentId ? [scenario.treatmentId] : (scenario.id.includes('fuellung') ? ['fuellung'] : undefined))
    )?.map((item) => item.toLowerCase());
    if (expectedTreatments && expectedTreatments.length > 0) {
      const missingTreatments = expectedTreatments.filter((item) => !detectedTreatments.includes(item));
      if (missingTreatments.length > 0) {
        issues.push(`Missing expected treatments: ${missingTreatments.join(', ')}`);
      }
      const unexpectedTreatments = detectedTreatments.filter((item) => !expectedTreatments.includes(item));
      if (unexpectedTreatments.length > 0) {
        issues.push(`Unexpected detected treatments: ${unexpectedTreatments.join(', ')}`);
      }
    }

    if (!copyText.trim()) {
      issues.push('Empty copyText output');
    }
    const expectBilling = scenario.expectBillingCodes ?? true;
    if (expectBilling && billingCodes.length === 0) {
      issues.push('No billing codes emitted');
    }
    if (scenario.expectedBillingCodes && scenario.expectedBillingCodes.length > 0) {
      for (const expectedCode of scenario.expectedBillingCodes) {
        if (!billingCodes.includes(expectedCode)) {
          issues.push(`Missing expected billing code: ${expectedCode}`);
        }
      }
    }
    if (chips.length === 0) {
      issues.push('No chips emitted');
    }
    if (REQUIRE_LLM_PATH) {
      if (extractionMeta.extractionMethod !== 'llm') {
        issues.push(`LLM path required, but extraction method is "${extractionMeta.extractionMethod}"`);
      }
      if (extractionMeta.extractionLlmError !== 'none') {
        issues.push(`LLM path required, but extraction llmError is "${extractionMeta.extractionLlmError}"`);
      }
    }
  } else {
    const openQuestions = Object.values(result.questions ?? {}).flat().length;
    if (openQuestions === 0) {
      issues.push('Expected unresolved askbacks, but questions are empty');
    }
  }

  // ────────────────────────────────────────────────────────────
  // Architecture invariants (SSOT / no hidden paths)
  // ────────────────────────────────────────────────────────────
  const enforceEmitterInvariants = debugInstances.some((inst) => {
    const emitters = (inst as any).chipEmitters as Record<string, string> | undefined;
    return Boolean(emitters && Object.keys(emitters).length > 0);
  });

  for (const inst of debugInstances) {
    const emitters = (inst as any).chipEmitters as Record<string, string> | undefined;
    const chipList = (inst.chips ?? []) as string[];
    if (enforceEmitterInvariants) {
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
      detectedTreatments,
      extractionMethod: extractionMeta.extractionMethod,
      extractionLlmError: extractionMeta.extractionLlmError,
      debugInstances,
    },
    issues,
  };
};

const main = async () => {
  const { file } = parseArgs();
  const scenarios = file
    ? loadScenariosFromFile(resolveSuitePath(file))
    : defaultScenarios;
  const suiteName = file
    ? path.basename(file).replace(/\.json$/i, '')
    : 'default';
  const outputDir = file
    ? path.join(OUTPUT_DIR, suiteName)
    : OUTPUT_DIR;

  ensureServerOpenAiKey();
  if (REQUIRE_LLM_PATH && !readEnv('OPENAI_API_KEY')) {
    throw new Error('LLM path required but OPENAI_API_KEY is missing. Set OPENAI_API_KEY (or VITE_OPENAI_API_KEY for local fallback mapping).');
  }
  ensureDir(outputDir);

  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    // eslint-disable-next-line no-await-in-loop
    const result = await runScenario(scenario);
    results.push(result);
  }

  const reportPath = path.join(outputDir, 'report.json');
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

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summaryLines.join('\n'), 'utf-8');
  const issueCount = results.reduce((sum, entry) => sum + entry.issues.length, 0);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${reportPath} (issues: ${issueCount})`);
  if (issueCount > 0) {
    process.exit(1);
  }
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
