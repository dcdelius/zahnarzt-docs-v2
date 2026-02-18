import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { createV10Session } from '../../src/docudent/v10/uiController/createV10Session';
import { resolveScenarioAnswer, type ScenarioQuestion } from './scenarioAnswerDefaults';

const DISABLE_FIRESTORE_KB = process.argv.includes('--disable-firestore-kb');
if (DISABLE_FIRESTORE_KB) {
    process.env.VITE_KB_FIRESTORE = 'false';
    process.env.VITE_KB_FIRESTORE_TREATMENTS = '';
}

type ScenarioFile = {
    meta?: { description?: string; version?: string };
    cases: Array<{
        id: string;
        title: string;
        treatmentId?: string;
        insuranceType: 'GKV' | 'PKV' | 'MKV';
        dictation: string;
        expect?: {
            phase?: 'output' | 'questions' | 'error';
            mustIncludePrefixes?: string[];
            mustNotIncludePrefixes?: string[];
        };
    }>;
};

type EvidenceFinding = {
    severity: 'critical' | 'warning';
    ruleId: string;
    questionId: string;
    message: string;
};

type ExtractionRuntimeMeta = {
    extractionMethod: 'llm' | 'regex' | 'stub' | 'unknown';
    extractionLlmError: string;
};

type CaseReport = {
    id: string;
    title: string;
    treatmentId: string;
    insuranceType: string;
    dictation: string;
    questionsAsked: Array<{ instanceId: string; questionId: string; ruleId: string; text: string }>;
    answered: Array<{
        questionId: string;
        normalizedKey: string;
        answer: string;
        inputType: 'free_text' | 'option';
    }>;
    finalText: string;
    billingRefs: string[];
    extraction: ExtractionRuntimeMeta;
    findings: EvidenceFinding[];
};

const INPUT_FILE_DEFAULT = 'scripts/v10/scenarios.v10.realworld.fliessend20.json';
const OUTPUT_ROOT = 'docs/system-atlas/artifacts/_latest/v10-documentation-fidelity-audit';

function extractRuntimeMeta(traceLines: string[] | undefined): ExtractionRuntimeMeta {
    const fallback: ExtractionRuntimeMeta = {
        extractionMethod: 'unknown',
        extractionLlmError: 'unknown',
    };
    if (!Array.isArray(traceLines) || traceLines.length === 0) {
        return fallback;
    }
    const detailLine = traceLines.find(line => line.startsWith('extract_detail:'));
    if (!detailLine) return fallback;

    const methodMatch = detailLine.match(/method=([^;]+)/);
    const llmErrorMatch = detailLine.match(/llmError=([^;]+)/);
    const methodRaw = String(methodMatch?.[1] ?? '').trim().toLowerCase();
    const extractionMethod: ExtractionRuntimeMeta['extractionMethod'] =
        methodRaw === 'llm' || methodRaw === 'regex' || methodRaw === 'stub'
            ? methodRaw
            : 'unknown';
    const extractionLlmError = String(llmErrorMatch?.[1] ?? 'unknown').trim() || 'unknown';

    return { extractionMethod, extractionLlmError };
}

const normalizeQuestionKey = (raw: string): string => {
    let key = raw.replace(/::tooth:\d+$/, '');
    if (key.includes('::')) key = key.split('::').pop() ?? key;
    const prefix = key.match(/^(medical|forensic|rule|mkv|upsell)_(.+)$/);
    return (prefix ? prefix[2] : key).toLowerCase();
};

const normalizeForMatch = (value: string): string => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/\s+/g, ' ')
        .trim();
};

const hasAnyToken = (haystack: string, tokens: string[]): boolean => {
    return tokens.some(token => haystack.includes(normalizeForMatch(token)));
};

const GENERIC_FREE_TEXT_SKIP_KEY_FRAGMENTS = [
    'working_lengths',
    'ueberkappung',
    'mkv_betrag',
    'mkv_amount',
    'roentgen_befund',
    'upt_intervall',
    'upt_interval',
    'untersuchung_befunde',
    'wl_method',
    'wf_technique',
    'irrigation',
    'medication',
];

const GENERIC_FREE_TEXT_STOPWORDS = new Set([
    'der', 'die', 'das', 'und', 'oder', 'mit', 'ohne', 'nach', 'vor', 'bei', 'von', 'fuer', 'für',
    'eine', 'einer', 'eines', 'einem', 'einen', 'dem', 'den', 'des', 'ist', 'sind', 'war', 'wurde',
    'wurden', 'wird', 'werden', 'im', 'in', 'am', 'an', 'auf', 'zu', 'als', 'auch', 'noch', 'nur',
    'patient', 'patientin', 'patienten', 'dokumentiert', 'dokumentation', 'befund', 'behandlung',
    'heute', 'gestern', 'morgen', 'kontrolle',
]);

const GENERIC_FREE_TEXT_TRIVIAL_ANSWERS = new Set([
    '', 'ok', 'ja', 'nein', 'none', 'n/a', 'na', 'unbekannt', 'unknown', 'dokumentiert',
]);

function evaluateGenericFreeTextCoverage(
    fullText: string,
    questionId: string,
    normalizedKey: string,
    answer: string,
    inputType: 'free_text' | 'option'
): EvidenceFinding[] {
    if (inputType !== 'free_text') return [];
    if (GENERIC_FREE_TEXT_SKIP_KEY_FRAGMENTS.some(token => normalizedKey.includes(token))) return [];

    const answerNormalized = normalizeForMatch(answer);
    if (GENERIC_FREE_TEXT_TRIVIAL_ANSWERS.has(answerNormalized)) return [];

    const answerTokens = Array.from(
        new Set(
            answerNormalized
                .split(/[^a-z0-9]+/g)
                .map(part => part.trim())
                .filter(part => part.length >= 5)
                .filter(part => !GENERIC_FREE_TEXT_STOPWORDS.has(part))
                .filter(part => !/^\d+$/.test(part))
        )
    );

    if (answerTokens.length === 0) return [];

    const fullTextNormalized = normalizeForMatch(fullText);
    const covered = answerTokens.filter(token => fullTextNormalized.includes(token));
    if (covered.length > 0) return [];

    const forensicCriticalKey = [
        'indikation',
        'anlass',
        'befunde',
        'befund',
        'intervall',
    ].some(token => normalizedKey.includes(token));

    return [
        {
            severity: forensicCriticalKey ? 'critical' : 'warning',
            ruleId: 'generic_free_text_answer_evidence',
            questionId,
            message: `Freitext-Antwort ohne erkennbare Evidenz im Finaltext (key=${normalizedKey}, tokens=${answerTokens.slice(0, 3).join(', ')}).`,
        },
    ];
}

function evaluateAnswerCoverage(
    fullText: string,
    questionId: string,
    normalizedKey: string,
    answer: string,
    treatmentId: string,
    inputType: 'free_text' | 'option'
): EvidenceFinding[] {
    const findings: EvidenceFinding[] = [];
    const fullTextNormalized = normalizeForMatch(fullText);
    const ans = normalizeForMatch(answer);

    if (normalizedKey.includes('working_lengths')) {
        if (!(fullTextNormalized.includes('arbeitsl') && fullTextNormalized.includes('dokument'))) {
            findings.push({
                severity: 'critical',
                ruleId: 'endo_working_lengths_phrase',
                questionId,
                message: 'Arbeitslängen wurden beantwortet, aber keine klare Dokumentationszeile im Finaltext gefunden.',
            });
        }
        const canalTokens = Array.from(ans.matchAll(/([a-z]{1,3})\s*[:=]\s*(\d{1,2})/gi));
        for (const token of canalTokens) {
            const canal = token[1]?.toLowerCase();
            const length = token[2];
            if (!canal || !length) continue;
            const tokenPresent = new RegExp(`\\b${canal}\\b[^\\n\\d]{0,10}\\b${length}\\b`, 'i')
                .test(fullTextNormalized);
            if (!tokenPresent) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'endo_working_lengths_value',
                    questionId,
                    message: `Arbeitslängenwert fehlt im Finaltext: ${canal}:${length}`,
                });
            }
        }
    }

    if (normalizedKey.includes('ueberkappung') && !ans.includes('nein') && !ans.includes('keine')) {
        if (!fullTextNormalized.includes('ueberkapp')) {
            findings.push({
                severity: 'critical',
                ruleId: 'fuellung_capping_visible',
                questionId,
                message: 'Überkappung wurde bejaht, aber nicht nachvollziehbar im Finaltext dokumentiert.',
            });
        }
    }

    if (normalizedKey.includes('mkv_betrag') || normalizedKey.includes('mkv_amount')) {
        const number = ans.match(/\d+(?:[.,]\d+)?/);
        if (number && !fullTextNormalized.includes(number[0].replace(',', '.').split('.')[0])) {
            findings.push({
                severity: 'warning',
                ruleId: 'mkv_amount_visible',
                questionId,
                message: `Mehrkostenbetrag beantwortet (${number[0]}), aber im Text nicht klar auffindbar.`,
            });
        }
    }

    if (normalizedKey.includes('roentgen_befund')) {
        const token = ans
            .split(/\s+/)
            .map(part => part.trim())
            .find(part => part.length >= 6);
        if (token && !fullTextNormalized.includes(token)) {
            findings.push({
                severity: 'warning',
                ruleId: 'roentgen_befund_specificity',
                questionId,
                message: 'Röntgenbefund-Antwort wirkt im Finaltext zu generisch (konkreter Befundtoken fehlt).',
            });
        }
    }

    if (normalizedKey.includes('upt_intervall') || normalizedKey.includes('upt_interval')) {
        const intervalToken = ans.replace(/_/g, ' ').trim();
        const hasRecallPhrase = fullTextNormalized.includes('recall') || fullTextNormalized.includes('intervall');
        if (!hasRecallPhrase) {
            findings.push({
                severity: 'critical',
                ruleId: 'upt_interval_missing',
                questionId,
                message: 'UPT-Intervall beantwortet, aber keine Recall/Intervall-Dokumentation im Finaltext gefunden.',
            });
        } else if (intervalToken.length > 0 && !fullTextNormalized.includes(intervalToken)) {
            findings.push({
                severity: 'critical',
                ruleId: 'upt_interval_missing',
                questionId,
                message: `UPT-Intervall beantwortet (${intervalToken}), aber im Finaltext nicht konkret belegt.`,
            });
        }
    }

    if (normalizedKey.includes('untersuchung_befunde')) {
        const token = ans
            .split(/\s+/)
            .map(part => part.trim())
            .find(part => part.length >= 6);
        if (token && !fullTextNormalized.includes(token)) {
            findings.push({
                severity: 'critical',
                ruleId: 'untersuchung_findings_missing',
                questionId,
                message: 'Untersuchungsbefund beantwortet, aber im Finaltext nicht konkret belegt.',
            });
        }
    }

    if (normalizedKey.includes('wl_method')) {
        if (ans.includes('elektr') || ans.includes('electronic') || ans.includes('apex')) {
            if (!hasAnyToken(fullTextNormalized, ['elektr', 'apex'])) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'endo_wl_method_missing',
                    questionId,
                    message: 'Arbeitslängenmethode (elektronisch) beantwortet, aber nicht im Finaltext belegt.',
                });
            }
        }
        if (ans.includes('roentgen') || ans.includes('rontgen') || ans.includes('xray')) {
            if (!hasAnyToken(fullTextNormalized, ['roentgen', 'rontgen', 'messaufnahme', 'xray'])) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'endo_wl_method_missing',
                    questionId,
                    message: 'Arbeitslängenmethode (röntgenologisch) beantwortet, aber nicht im Finaltext belegt.',
                });
            }
        }
    }

    if (normalizedKey.includes('wf_technique')) {
        if (ans.includes('warm')) {
            if (!hasAnyToken(fullTextNormalized, ['warm', 'vertikal', 'thermoplast', 'kondensation'])) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'endo_wf_technique_missing',
                    questionId,
                    message: 'WF-Technik "warm" beantwortet, aber nicht im Finaltext belegt.',
                });
            }
        } else if (ans.includes('einzel') || ans.includes('single') || ans.includes('cone')) {
            if (!hasAnyToken(fullTextNormalized, ['einzel', 'single', 'cone'])) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'endo_wf_technique_missing',
                    questionId,
                    message: 'WF-Technik "Einzelstift/Single Cone" beantwortet, aber nicht im Finaltext belegt.',
                });
            }
        } else if (ans.includes('kalt') || ans.includes('lateral')) {
            if (!hasAnyToken(fullTextNormalized, ['kalt', 'lateral'])) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'endo_wf_technique_missing',
                    questionId,
                    message: 'WF-Technik "kalt/lateral" beantwortet, aber nicht im Finaltext belegt.',
                });
            }
        }
    }

    if (normalizedKey.includes('irrigation')) {
        if (ans.includes('naocl') || ans.includes('hypochlorit')) {
            if (!hasAnyToken(fullTextNormalized, ['naocl', 'hypochlorit'])) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'endo_irrigation_missing',
                    questionId,
                    message: 'Spüllösung NaOCl beantwortet, aber im Finaltext nicht belegt.',
                });
            }
        }
        if (ans.includes('edta')) {
            if (!hasAnyToken(fullTextNormalized, ['edta'])) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'endo_irrigation_missing',
                    questionId,
                    message: 'Spüllösung EDTA beantwortet, aber im Finaltext nicht belegt.',
                });
            }
        }
        if (ans.includes('chx') || ans.includes('chlorhex')) {
            if (!hasAnyToken(fullTextNormalized, ['chx', 'chlorhex'])) {
                findings.push({
                    severity: 'warning',
                    ruleId: 'endo_irrigation_missing',
                    questionId,
                    message: 'Spüllösung CHX beantwortet, aber im Finaltext nicht belegt.',
                });
            }
        }
    }

    if (normalizedKey.includes('medication') && !ans.includes('keine') && !ans.includes('nein')) {
        if (ans.includes('ledermix') && !fullTextNormalized.includes('ledermix')) {
            findings.push({
                severity: 'critical',
                ruleId: 'endo_medication_missing',
                questionId,
                message: 'Medikamentöse Einlage (Ledermix) beantwortet, aber im Finaltext nicht belegt.',
            });
        }
        if ((ans.includes('ca(oh)2') || ans.includes('calcium') || ans.includes('kalzium'))
            && !hasAnyToken(fullTextNormalized, ['ca(oh)2', 'calcium', 'kalzium'])) {
            findings.push({
                severity: 'critical',
                ruleId: 'endo_medication_missing',
                questionId,
                message: 'Medikamentöse Einlage (Ca(OH)2) beantwortet, aber im Finaltext nicht belegt.',
            });
        }
    }

    if (treatmentId === 'endo' && normalizedKey.includes('canal_count')) {
        const count = Number(ans.match(/\d+/)?.[0]);
        if (Number.isFinite(count) && count > 0) {
            const countMentioned = new RegExp(`\\b${count}\\b\\s*(kanal|kanael|kanaele|wurzelkanal)`, 'i')
                .test(fullTextNormalized);
            if (!countMentioned) {
                findings.push({
                    severity: 'warning',
                    ruleId: 'endo_canal_count_missing',
                    questionId,
                    message: `Kanalanzahl (${count}) beantwortet, aber im Finaltext nicht explizit belegt.`,
                });
            }
        }
    }

    findings.push(
        ...evaluateGenericFreeTextCoverage(fullText, questionId, normalizedKey, answer, inputType)
    );

    return findings;
}

async function runCase(
    scenario: ScenarioFile['cases'][number],
    options: { requireLlmExtraction: boolean }
): Promise<CaseReport> {
    const session = createV10Session();
    const treatmentId = scenario.treatmentId ?? 'fuellung';
    let state = await session.start(scenario.dictation, {
        treatmentId,
        insuranceType: scenario.insuranceType,
        textLength: 'mittel',
    });

    const answered: CaseReport['answered'] = [];
    const questionsAsked: CaseReport['questionsAsked'] = [];
    let loops = 0;
    while (state.phase === 'questions' && loops < 15) {
        loops += 1;
        let answeredAny = false;
        for (const [instanceId, questions] of Object.entries(state.questions)) {
            for (const q of questions as ScenarioQuestion[]) {
                questionsAsked.push({
                    instanceId,
                    questionId: q.id,
                    ruleId: q.ruleId ?? q.id,
                    text: q.question ?? '',
                });
                const answer = resolveScenarioAnswer(q, {
                    dictation: scenario.dictation,
                    insuranceType: scenario.insuranceType,
                    instanceFacts:
                        state.instances.find(instance => instance.instanceId === instanceId)?.facts ?? {},
                }) ?? 'dokumentiert';
                answered.push({
                    questionId: `${instanceId}::${q.id}`,
                    normalizedKey: normalizeQuestionKey(q.ruleId ?? q.id),
                    answer: String(answer),
                    inputType: (!q.options || q.options.length === 0) ? 'free_text' : 'option',
                });
                state = await session.answer(instanceId, q.id, String(answer));
                answeredAny = true;
                if (state.phase !== 'questions') break;
            }
            if (state.phase !== 'questions') break;
        }
        if (!answeredAny) break;
    }

    if (state.phase !== 'output') {
        return {
            id: scenario.id,
            title: scenario.title,
            treatmentId,
            insuranceType: scenario.insuranceType,
            dictation: scenario.dictation,
            questionsAsked,
            answered,
            finalText: '',
            billingRefs: [],
            extraction: { extractionMethod: 'unknown', extractionLlmError: 'unknown' },
            findings: [
                {
                    severity: 'critical',
                    ruleId: 'no_output',
                    questionId: 'pipeline',
                    message: `Pipeline ended in phase '${state.phase}' instead of output`,
                },
            ],
        };
    }

    const finalText = state.output.fullText ?? '';
    const findings: EvidenceFinding[] = [];
    const extraction = extractRuntimeMeta(state.output.debug?.v10TraceLines);
    const expectedPhase = scenario.expect?.phase;
    if (expectedPhase && expectedPhase !== 'output') {
        findings.push({
            severity: 'critical',
            ruleId: 'unexpected_phase_expectation',
            questionId: 'pipeline',
            message: `Scenario expects phase '${expectedPhase}', but fidelity runner currently received output.`,
        });
    }

    for (const record of answered) {
        findings.push(
            ...evaluateAnswerCoverage(
                finalText,
                record.questionId,
                record.normalizedKey,
                record.answer,
                treatmentId,
                record.inputType
            )
        );
    }
    const billingRefs = Array.isArray(state.output.billingRefs) ? state.output.billingRefs.map(String) : [];
    if (options.requireLlmExtraction && extraction.extractionMethod !== 'llm') {
        findings.push({
            severity: 'critical',
            ruleId: 'extraction_not_llm',
            questionId: 'extraction',
            message: `LLM extraction required, but runtime method was '${extraction.extractionMethod}' (llmError=${extraction.extractionLlmError}).`,
        });
    }
    if (scenario.expect?.mustIncludePrefixes && scenario.expect.mustIncludePrefixes.length > 0) {
        for (const prefix of scenario.expect.mustIncludePrefixes) {
            if (!billingRefs.some(code => code.startsWith(prefix))) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'billing_prefix_missing',
                    questionId: 'billing',
                    message: `Expected billing prefix '${prefix}' not found in billing refs.`,
                });
            }
        }
    }
    if (scenario.expect?.mustNotIncludePrefixes && scenario.expect.mustNotIncludePrefixes.length > 0) {
        for (const prefix of scenario.expect.mustNotIncludePrefixes) {
            if (billingRefs.some(code => code.startsWith(prefix))) {
                findings.push({
                    severity: 'critical',
                    ruleId: 'billing_prefix_forbidden',
                    questionId: 'billing',
                    message: `Forbidden billing prefix '${prefix}' found in billing refs.`,
                });
            }
        }
    }
    const finalTextNormalized = normalizeForMatch(finalText);
    if (/(befundzahn|aufklaerungder|behandlungsablaufzunaechst|leistungenhinweise|hinweiseabrechnung)/i.test(finalTextNormalized)) {
        findings.push({
            severity: 'critical',
            ruleId: 'output_header_concatenation',
            questionId: 'render',
            message: 'Finaltext enthält zusammengeklebte Überschriften/Abschnitte (forensisch riskant).',
        });
    }
    const headerMatches = finalText.match(/^\[[^\]]+\]/gm) ?? [];
    if (headerMatches.length >= 2 && !finalText.includes('\n\n')) {
        findings.push({
            severity: 'warning',
            ruleId: 'output_missing_section_spacing',
            questionId: 'render',
            message: 'Mehrere Abschnitte ohne Doppel-Absatztrennung erkannt; Lesbarkeit prüfen.',
        });
    }

    return {
        id: scenario.id,
        title: scenario.title,
        treatmentId,
        insuranceType: scenario.insuranceType,
        dictation: scenario.dictation,
        questionsAsked,
        answered,
        finalText,
        billingRefs,
        extraction,
        findings,
    };
}

function parseArgs(): {
    file: string;
    strictWarnings: boolean;
    verbose: boolean;
    requireLlmExtraction: boolean;
    disableFirestoreKb: boolean;
} {
    const args = process.argv.slice(2);
    const fileIndex = args.findIndex(arg => arg === '--file');
    const strictWarnings = args.includes('--strict-warnings');
    const verbose = args.includes('--verbose');
    const requireLlmExtraction = args.includes('--require-llm-extraction');
    const disableFirestoreKb = args.includes('--disable-firestore-kb');
    if (fileIndex >= 0 && args[fileIndex + 1]) {
        return { file: args[fileIndex + 1], strictWarnings, verbose, requireLlmExtraction, disableFirestoreKb };
    }
    return { file: INPUT_FILE_DEFAULT, strictWarnings, verbose, requireLlmExtraction, disableFirestoreKb };
}

async function main(): Promise<void> {
    const { file, strictWarnings, verbose, requireLlmExtraction, disableFirestoreKb } = parseArgs();
    const absFile = path.resolve(file);
    const raw = fs.readFileSync(absFile, 'utf-8');
    const parsed = JSON.parse(raw) as ScenarioFile;
    const suiteName = path.basename(file, path.extname(file));
    const outputDir = path.resolve(OUTPUT_ROOT, suiteName);
    fs.mkdirSync(outputDir, { recursive: true });

    const originalLog = console.log;
    const originalDebug = console.debug;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    if (!verbose) {
        // Keep audit output focused: noisy probe logs from pipeline internals are suppressed by default.
        console.log = () => {};
        console.debug = () => {};
        console.info = () => {};
        console.warn = () => {};
    }

    const caseReports: CaseReport[] = [];
    try {
        for (const scenario of parsed.cases) {
            caseReports.push(await runCase(scenario, { requireLlmExtraction }));
        }
    } finally {
        console.log = originalLog;
        console.debug = originalDebug;
        console.info = originalInfo;
        console.warn = originalWarn;
    }

    const criticalCount = caseReports.reduce(
        (sum, item) => sum + item.findings.filter(f => f.severity === 'critical').length,
        0
    );
    const warningCount = caseReports.reduce(
        (sum, item) => sum + item.findings.filter(f => f.severity === 'warning').length,
        0
    );

    const report = {
        runAt: new Date().toISOString(),
        file: absFile,
        cases: caseReports.length,
        criticalCount,
        warningCount,
        extractionSummary: {
            llm: caseReports.filter(item => item.extraction.extractionMethod === 'llm').length,
            regex: caseReports.filter(item => item.extraction.extractionMethod === 'regex').length,
            stub: caseReports.filter(item => item.extraction.extractionMethod === 'stub').length,
            unknown: caseReports.filter(item => item.extraction.extractionMethod === 'unknown').length,
        },
        caseReports,
    };

    fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf-8');

    const lines: string[] = [];
    lines.push('# V10 Documentation Fidelity Audit');
    lines.push('');
    lines.push(`- File: ${absFile}`);
    lines.push(`- Cases: ${caseReports.length}`);
    lines.push(`- Critical findings: ${criticalCount}`);
    lines.push(`- Warnings: ${warningCount}`);
    lines.push(`- Extraction runtime: LLM=${report.extractionSummary.llm}, regex=${report.extractionSummary.regex}, stub=${report.extractionSummary.stub}, unknown=${report.extractionSummary.unknown}`);
    lines.push(`- Require LLM extraction: ${requireLlmExtraction ? 'yes' : 'no'}`);
    lines.push(`- Firestore KB disabled: ${disableFirestoreKb ? 'yes' : 'no'}`);
    lines.push('');
    for (const item of caseReports) {
        lines.push(`## ${item.id} — ${item.title}`);
        lines.push(`- Treatment/Insurance: ${item.treatmentId} / ${item.insuranceType}`);
        lines.push(`- Extraction: ${item.extraction.extractionMethod} (llmError=${item.extraction.extractionLlmError})`);
        lines.push(`- Billing refs: ${item.billingRefs.length > 0 ? item.billingRefs.join(', ') : '(none)'}`);
        lines.push(`- Answered askbacks: ${item.answered.length}`);
        lines.push(`- Questions asked: ${item.questionsAsked.length}`);
        if (item.findings.length === 0) {
            lines.push('- Findings: none');
        } else {
            for (const finding of item.findings) {
                lines.push(`- [${finding.severity}] ${finding.ruleId}: ${finding.message}`);
            }
        }
        lines.push('- Dictation:');
        lines.push('```text');
        lines.push(item.dictation);
        lines.push('```');
        if (item.questionsAsked.length > 0) {
            lines.push('- Askbacks + Antworten:');
            for (const qa of item.questionsAsked) {
                const answer = item.answered.find(entry => entry.questionId === `${qa.instanceId}::${qa.questionId}`)?.answer ?? '(keine Antwort)';
                lines.push(`  - [${qa.instanceId}] ${qa.questionId} (${qa.ruleId})`);
                lines.push(`    - Frage: ${qa.text}`);
                lines.push(`    - Antwort: ${answer}`);
            }
        }
        lines.push('- Finaltext:');
        lines.push('```text');
        lines.push(item.finalText || '(leer)');
        lines.push('```');
        lines.push('');
    }
    fs.writeFileSync(path.join(outputDir, 'summary.md'), `${lines.join('\n')}\n`, 'utf-8');

    console.log(`Wrote ${path.join(outputDir, 'report.json')}`);
    console.log(`Wrote ${path.join(outputDir, 'summary.md')}`);
    if (criticalCount > 0 || (strictWarnings && warningCount > 0)) {
        process.exitCode = 1;
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
