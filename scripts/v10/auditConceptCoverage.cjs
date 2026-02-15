const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const MEDICAL_KB_PATH = path.join(ROOT, 'src/docudent/medical_kb/medical_kb.v1.json');
const TREATMENTS_DIR = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/treatments');
const QUESTIONS_DIR = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/questions');
const MAPPINGS_DIR = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/mappings');
const OUTPUT_PATH = path.join(
    ROOT,
    'docs/system-atlas/artifacts/audit/Audit.Concepts.md'
);

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listJsonFiles(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath)
        .filter(name => name.endsWith('.json'))
        .map(name => path.join(dirPath, name));
}

function listTreatmentDirs() {
    return fs.readdirSync(TREATMENTS_DIR)
        .filter(name => fs.statSync(path.join(TREATMENTS_DIR, name)).isDirectory());
}

function normalizeChipEffectEntry(entry) {
    if (!entry || typeof entry !== 'string') return null;
    const cleaned = entry.replace(/^\+/, '').trim();
    if (!cleaned) return null;
    if (cleaned.startsWith('WARN:')) return null;
    if (cleaned.startsWith('ERROR:')) return null;
    return cleaned;
}

function uniq(array) {
    return Array.from(new Set(array));
}

function formatList(items) {
    if (!items || items.length === 0) return '—';
    return items.join(', ');
}

function formatTable(rows, headers) {
    const lines = [];
    lines.push(`| ${headers.join(' | ')} |`);
    lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
    for (const row of rows) {
        lines.push(`| ${row.join(' | ')} |`);
    }
    return lines.join('\n');
}

function main() {
    const medicalKb = readJson(MEDICAL_KB_PATH);

    const conceptCases = [];
    const emittedChipsFromConcepts = [];
    const askbacksFromConcepts = [];
    const conceptCaseWithoutChips = [];

    for (const concept of medicalKb.concepts ?? []) {
        if (Array.isArray(concept.cases) && concept.cases.length > 0) {
            for (const conceptCase of concept.cases) {
                const effects = conceptCase.effects ?? {};
                const emitChips = effects.emitChips ?? [];
                const requiredAskbacks = effects.requiredAskbacks ?? [];
                const optionalAskbacks = effects.optionalAskbacks ?? [];

                conceptCases.push({
                    conceptId: concept.id,
                    caseId: conceptCase.id,
                    emitChips,
                    requiredAskbacks,
                    optionalAskbacks,
                });

                emittedChipsFromConcepts.push(...emitChips);
                askbacksFromConcepts.push(...requiredAskbacks, ...optionalAskbacks);

                if (emitChips.length === 0) {
                    conceptCaseWithoutChips.push(`${concept.id}:${conceptCase.id}`);
                }
            }
        } else if (concept.effects) {
            const effects = concept.effects ?? {};
            const emitChips = effects.emitChips ?? [];
            const requiredAskbacks = effects.requiredAskbacks ?? [];
            const optionalAskbacks = effects.optionalAskbacks ?? [];

            conceptCases.push({
                conceptId: concept.id,
                caseId: '—',
                emitChips,
                requiredAskbacks,
                optionalAskbacks,
            });

            emittedChipsFromConcepts.push(...emitChips);
            askbacksFromConcepts.push(...requiredAskbacks, ...optionalAskbacks);

            if (emitChips.length === 0) {
                conceptCaseWithoutChips.push(concept.id);
            }
        } else {
            conceptCaseWithoutChips.push(concept.id);
        }
    }

    const ruleEmitChips = [];
    const askbacksFromRules = [];
    for (const rule of medicalKb.rules ?? []) {
        for (const action of rule.then ?? []) {
            if (action.type === 'emit_chip' && action.target) {
                ruleEmitChips.push({ chipId: action.target, ruleId: rule.id });
            }
            if (action.type === 'require_askback' && action.target) {
                askbacksFromRules.push({ askbackId: action.target, ruleId: rule.id });
            }
        }
    }

    const askbacksNew = medicalKb.askbacks ?? [];
    const askbacksLegacy = medicalKb.endoAskbacks ?? [];

    const askbackChipEffects = [];
    for (const askback of askbacksNew) {
        const effects = askback.chipEffect ?? {};
        for (const [optionKey, entries] of Object.entries(effects)) {
            for (const entry of entries ?? []) {
                const chipId = normalizeChipEffectEntry(entry);
                if (chipId) {
                    askbackChipEffects.push({
                        askbackId: askback.id,
                        optionKey,
                        chipId,
                        source: 'askbacks',
                    });
                }
            }
        }
    }
    for (const askback of askbacksLegacy) {
        const effects = askback.chipEffect ?? {};
        for (const [optionKey, entries] of Object.entries(effects)) {
            for (const entry of entries ?? []) {
                const chipId = normalizeChipEffectEntry(entry);
                if (chipId) {
                    askbackChipEffects.push({
                        askbackId: askback.id,
                        optionKey,
                        chipId,
                        source: 'endoAskbacks',
                    });
                }
            }
        }
    }

    const questionBankChipActivations = [];
    const questionBankFiles = [
        ...listJsonFiles(QUESTIONS_DIR),
    ];
    for (const treatmentDir of listTreatmentDirs()) {
        const bankPath = path.join(TREATMENTS_DIR, treatmentDir, 'question_bank.json');
        if (fs.existsSync(bankPath)) questionBankFiles.push(bankPath);
    }

    for (const bankPath of questionBankFiles) {
        const bank = readJson(bankPath);
        const questions = bank.questions ?? [];
        for (const question of questions) {
            for (const option of question.options ?? []) {
                if (option.chipActivation) {
                    questionBankChipActivations.push({
                        file: path.relative(ROOT, bankPath),
                        questionKey: question.key ?? 'unknown',
                        optionId: option.id ?? option.label ?? 'unknown',
                        chipId: option.chipActivation,
                    });
                }
            }
        }
    }

    const alwaysOnChipIds = [];
    const answerMapFiles = [];
    for (const treatmentDir of listTreatmentDirs()) {
        const mapPath = path.join(TREATMENTS_DIR, treatmentDir, 'answer_map.json');
        if (fs.existsSync(mapPath)) answerMapFiles.push(mapPath);
    }
    if (fs.existsSync(MAPPINGS_DIR)) {
        for (const file of fs.readdirSync(MAPPINGS_DIR)) {
            if (file.endsWith('_answer_map.json')) {
                answerMapFiles.push(path.join(MAPPINGS_DIR, file));
            }
        }
    }

    for (const mapPath of answerMapFiles) {
        const map = readJson(mapPath);
        const defaults = map.defaults ?? {};
        const chips = defaults.alwaysOnChipIds ?? [];
        for (const chipId of chips) {
            alwaysOnChipIds.push({
                file: path.relative(ROOT, mapPath),
                chipId,
            });
        }
    }

    const unifiedChips = [];
    const unifiedChipIds = new Set();
    for (const treatmentDir of listTreatmentDirs()) {
        const unifiedPath = path.join(TREATMENTS_DIR, treatmentDir, 'unified.json');
        if (!fs.existsSync(unifiedPath)) continue;
        const unified = readJson(unifiedPath);
        for (const chip of unified.chips ?? []) {
            unifiedChips.push({
                treatmentId: treatmentDir,
                id: chip.id,
                billingRef: chip.billingRef ?? null,
                textSnippets: chip.textSnippets ?? null,
                phase: chip.phase ?? null,
                category: chip.category ?? null,
                defaultActive: chip.defaultActive ?? false,
                hinweis: chip.hinweis ?? null,
            });
            unifiedChipIds.add(chip.id);
        }
    }

    const medicalKbChips = medicalKb.chips ?? [];
    const kbChipIds = new Set(medicalKbChips.map(c => c.kbChipId));

    const emittedChipSources = new Map();
    function addChipSource(chipId, source) {
        if (!emittedChipSources.has(chipId)) emittedChipSources.set(chipId, []);
        emittedChipSources.get(chipId).push(source);
    }

    for (const chipId of emittedChipsFromConcepts) {
        addChipSource(chipId, 'concept');
    }
    for (const entry of ruleEmitChips) {
        addChipSource(entry.chipId, `rule:${entry.ruleId}`);
    }
    for (const entry of askbackChipEffects) {
        addChipSource(entry.chipId, `askback:${entry.askbackId}.${entry.optionKey}`);
    }
    for (const entry of questionBankChipActivations) {
        addChipSource(entry.chipId, `question:${entry.questionKey}`);
    }
    for (const entry of alwaysOnChipIds) {
        addChipSource(entry.chipId, `alwaysOn:${entry.file}`);
    }

    const emittedChipIds = Array.from(emittedChipSources.keys());

    const missingMedicalKbChipDefs = emittedChipIds.filter(id => !kbChipIds.has(id));

    const missingUnifiedChips = medicalKbChips.filter(chip => {
        const targetId = chip.kbChipId;
        if (chip.treatmentId) {
            return !unifiedChips.some(u => u.id === targetId && u.treatmentId === chip.treatmentId);
        }
        return !unifiedChipIds.has(targetId);
    });

    const chipsWithoutConceptEmitter = unifiedChips.filter(chip => {
        const hasConcept = emittedChipsFromConcepts.includes(chip.id);
        const hasRule = ruleEmitChips.some(entry => entry.chipId === chip.id);
        return !hasConcept && !hasRule;
    });

    const askbacksDefined = askbacksNew.map(a => a.id);
    const askbacksLegacyDefined = askbacksLegacy.map(a => a.id);
    const askbacksReferenced = uniq([
        ...askbacksFromConcepts,
        ...askbacksFromRules.map(a => a.askbackId),
    ]);
    const askbacksUnused = askbacksDefined.filter(id => !askbacksReferenced.includes(id));

    const unifiedChipsMissingText = unifiedChips.filter(chip => {
        const snippets = chip.textSnippets;
        if (!snippets) return true;
        const values = Object.values(snippets);
        return values.every(value => !value || String(value).trim().length === 0);
    });

    const unifiedChipsMissingBilling = unifiedChips.filter(chip => chip.billingRef === null);

    const defaultActiveChips = unifiedChips.filter(chip => chip.defaultActive === true);

    const summary = [
        `- Concepts: ${medicalKb.concepts?.length ?? 0}`,
        `- Concept cases: ${conceptCases.length}`,
        `- Concept-emitted chips: ${uniq(emittedChipsFromConcepts).length}`,
        `- Rule-emitted chips (legacy): ${ruleEmitChips.length}`,
        `- Askbacks (new): ${askbacksNew.length}`,
        `- Askbacks (legacy endoAskbacks): ${askbacksLegacy.length}`,
        `- Askbacks with chipEffect: ${askbackChipEffects.length}`,
        `- Question bank chipActivation: ${questionBankChipActivations.length}`,
        `- AlwaysOn chipIds (answer_map): ${alwaysOnChipIds.length}`,
        `- Medical KB chip definitions: ${medicalKbChips.length}`,
        `- Unified chips: ${unifiedChips.length}`,
    ];

    const gapRows = [];
    for (const chipId of missingMedicalKbChipDefs) {
        const sources = emittedChipSources.get(chipId) ?? [];
        gapRows.push([chipId, sources.join(', ')]);
    }

    const conceptRows = conceptCases.map(entry => [
        entry.conceptId,
        entry.caseId,
        formatList(entry.emitChips),
        formatList(entry.requiredAskbacks),
        formatList(entry.optionalAskbacks),
    ]);

    const askbackChipEffectRows = askbackChipEffects.map(entry => [
        entry.askbackId,
        entry.optionKey,
        entry.chipId,
        entry.source,
    ]);

    const questionBankRows = questionBankChipActivations.map(entry => [
        entry.questionKey,
        entry.optionId,
        entry.chipId,
        entry.file,
    ]);

    const alwaysOnRows = alwaysOnChipIds.map(entry => [
        entry.chipId,
        entry.file,
    ]);

    const unifiedMissingConceptRows = chipsWithoutConceptEmitter.map(entry => [
        entry.treatmentId,
        entry.id,
        entry.phase ?? '—',
        entry.category ?? '—',
    ]);

    const missingUnifiedRows = missingUnifiedChips.map(entry => [
        entry.id,
        entry.kbChipId,
        entry.treatmentId ?? 'any',
    ]);

    const unusedAskbackRows = askbacksUnused.map(id => [id]);
    const unusedLegacyAskbackRows = askbacksLegacyDefined
        .filter(id => !askbacksReferenced.includes(id))
        .map(id => [id]);

    const ruleEmitRows = ruleEmitChips.map(entry => [
        entry.ruleId,
        entry.chipId,
    ]);

    const defaultActiveRows = defaultActiveChips.map(entry => [
        entry.treatmentId,
        entry.id,
        entry.phase ?? '—',
    ]);

    const missingTextRows = unifiedChipsMissingText.map(entry => [
        entry.treatmentId,
        entry.id,
        entry.phase ?? '—',
    ]);

    const missingBillingRows = unifiedChipsMissingBilling.map(entry => [
        entry.treatmentId,
        entry.id,
        entry.phase ?? '—',
        entry.category ?? '—',
    ]);

    const lines = [];
    lines.push(`# Audit.Concepts (V10)`);
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString().slice(0, 10)}`);
    lines.push(`**Sources:**`);
    lines.push(`- ${path.relative(ROOT, MEDICAL_KB_PATH)}`);
    lines.push(`- ${path.relative(ROOT, TREATMENTS_DIR)}/*/unified.json`);
    lines.push(`- ${path.relative(ROOT, QUESTIONS_DIR)}/*.json`);
    lines.push(`- ${path.relative(ROOT, TREATMENTS_DIR)}/*/question_bank.json`);
    lines.push(`- ${path.relative(ROOT, TREATMENTS_DIR)}/*/answer_map.json`);
    lines.push(`- ${path.relative(ROOT, MAPPINGS_DIR)}/*_answer_map.json`);
    lines.push('');
    lines.push('## Summary');
    lines.push(...summary);
    lines.push('');

    lines.push('## Gaps: Emitted chip IDs missing Medical KB chip definitions');
    if (gapRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(gapRows, ['chipId', 'sources']));
    }
    lines.push('');

    lines.push('## Gaps: Medical KB chips missing in unified.json');
    if (missingUnifiedRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(missingUnifiedRows, ['kbChipId', 'chipId', 'treatmentScope']));
    }
    lines.push('');

    lines.push('## Gaps: Unified chips without concept/rule emitters');
    if (unifiedMissingConceptRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(unifiedMissingConceptRows, ['treatment', 'chipId', 'phase', 'category']));
    }
    lines.push('');

    lines.push('## Concepts Inventory (concept cases)');
    if (conceptRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(conceptRows, ['conceptId', 'caseId', 'emitChips', 'requiredAskbacks', 'optionalAskbacks']));
    }
    lines.push('');

    lines.push('## Concept cases without emitChips');
    if (conceptCaseWithoutChips.length === 0) {
        lines.push('- None');
    } else {
        for (const entry of conceptCaseWithoutChips) {
            lines.push(`- ${entry}`);
        }
    }
    lines.push('');

    lines.push('## Legacy emitters: medical_kb.rules (emit_chip)');
    if (ruleEmitRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(ruleEmitRows, ['ruleId', 'chipId']));
    }
    lines.push('');

    lines.push('## Askbacks with chipEffect (non-concept chip activation)');
    if (askbackChipEffectRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(askbackChipEffectRows, ['askbackId', 'option', 'chipId', 'source']));
    }
    lines.push('');

    lines.push('## Question bank chipActivation (non-concept chip activation)');
    if (questionBankRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(questionBankRows, ['questionKey', 'option', 'chipId', 'file']));
    }
    lines.push('');

    lines.push('## alwaysOnChipIds (answer_map defaults)');
    if (alwaysOnRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(alwaysOnRows, ['chipId', 'source']));
    }
    lines.push('');

    lines.push('## Askbacks defined but never emitted');
    if (unusedAskbackRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(unusedAskbackRows, ['askbackId']));
    }
    lines.push('');

    lines.push('## Legacy endoAskbacks defined but never emitted');
    if (unusedLegacyAskbackRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(unusedLegacyAskbackRows, ['askbackId']));
    }
    lines.push('');

    lines.push('## Unified chips missing textSnippets');
    if (missingTextRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(missingTextRows, ['treatment', 'chipId', 'phase']));
    }
    lines.push('');

    lines.push('## Unified chips missing billingRef');
    if (missingBillingRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(missingBillingRows, ['treatment', 'chipId', 'phase', 'category']));
    }
    lines.push('');

    lines.push('## Unified chips with defaultActive=true');
    if (defaultActiveRows.length === 0) {
        lines.push('- None');
    } else {
        lines.push(formatTable(defaultActiveRows, ['treatment', 'chipId', 'phase']));
    }
    lines.push('');

    fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf8');
    console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
