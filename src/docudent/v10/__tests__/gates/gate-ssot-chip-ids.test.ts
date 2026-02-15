import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

type MedicalKb = {
    rules?: Array<{
        id: string;
        then?: Array<{ type: string; target?: string }>;
    }>;
    askbacks?: Array<{
        id: string;
        chipEffect?: Record<string, string[]>;
    }>;
};

type QuestionBank = {
    questions?: Array<{
        key: string;
        options?: Array<{ chipActivation?: string }>;
    }>;
};

function loadJson<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function collectUnifiedChipIds(): Set<string> {
    const baseDir = path.resolve(process.cwd(), 'src/docudent/core/billing/knowledgeBase/treatments');
    const treatmentDirs = fs.readdirSync(baseDir);
    const chipIds = new Set<string>();

    for (const dir of treatmentDirs) {
        const unifiedPath = path.join(baseDir, dir, 'unified.json');
        if (!fs.existsSync(unifiedPath)) continue;
        const unified = loadJson<{ chips?: Array<{ id: string }> }>(unifiedPath);
        for (const chip of unified.chips ?? []) {
            chipIds.add(chip.id);
        }
    }

    return chipIds;
}

function collectMedicalKbChipRefs(medicalKb: MedicalKb): Array<{ id: string; source: string }> {
    const refs: Array<{ id: string; source: string }> = [];

    for (const rule of medicalKb.rules ?? []) {
        for (const action of rule.then ?? []) {
            if (action.type === 'emit_chip' && action.target) {
                refs.push({ id: action.target, source: `rule:${rule.id}` });
            }
        }
    }

    for (const askback of medicalKb.askbacks ?? []) {
        const effects = askback.chipEffect ?? {};
        for (const entries of Object.values(effects)) {
            for (const raw of entries) {
                const cleaned = raw.replace(/^\+/, '');
                if (!cleaned || cleaned.startsWith('WARN:')) continue;
                refs.push({ id: cleaned, source: `askback:${askback.id}` });
            }
        }
    }

    return refs;
}

function collectQuestionBankChipRefs(filePath: string): Array<{ id: string; source: string }> {
    const bank = loadJson<QuestionBank>(filePath);
    const refs: Array<{ id: string; source: string }> = [];

    for (const question of bank.questions ?? []) {
        for (const option of question.options ?? []) {
            if (option.chipActivation) {
                refs.push({ id: option.chipActivation, source: `question:${question.key}` });
            }
        }
    }

    return refs;
}

describe('Gate: SSOT chip IDs', () => {
    it('all emitted chips exist in unified.json', () => {
        const chipIds = collectUnifiedChipIds();
        const medicalKbPath = path.resolve(process.cwd(), 'src/docudent/medical_kb/medical_kb.v1.json');
        const medicalKb = loadJson<MedicalKb>(medicalKbPath);

        const refs = collectMedicalKbChipRefs(medicalKb);
        const missing = refs.filter(ref => !chipIds.has(ref.id));

        expect(missing).toEqual([]);
    });

    it('all question chipActivation targets exist in unified.json', () => {
        const chipIds = collectUnifiedChipIds();
        const refs: Array<{ id: string; source: string }> = [];

        const questionsDir = path.resolve(process.cwd(), 'src/docudent/core/billing/knowledgeBase/questions');
        for (const file of fs.readdirSync(questionsDir)) {
            if (!file.endsWith('.json')) continue;
            refs.push(...collectQuestionBankChipRefs(path.join(questionsDir, file)));
        }

        const treatmentsDir = path.resolve(process.cwd(), 'src/docudent/core/billing/knowledgeBase/treatments');
        for (const dir of fs.readdirSync(treatmentsDir)) {
            const bankPath = path.join(treatmentsDir, dir, 'question_bank.json');
            if (!fs.existsSync(bankPath)) continue;
            refs.push(...collectQuestionBankChipRefs(bankPath));
        }

        const missing = refs.filter(ref => !chipIds.has(ref.id));
        expect(missing).toEqual([]);
    });
});
