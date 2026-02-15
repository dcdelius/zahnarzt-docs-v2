import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

type QuestionBank = {
    questions?: Array<{
        key: string;
        options?: Array<{ chipActivation?: string }>;
    }>;
};

function collectQuestionBankFiles(): string[] {
    const root = path.resolve(process.cwd(), 'src/docudent/core/billing/knowledgeBase');
    const files: string[] = [];
    const questionsDir = path.join(root, 'questions');
    if (fs.existsSync(questionsDir)) {
        for (const file of fs.readdirSync(questionsDir)) {
            if (file.endsWith('.json')) files.push(path.join(questionsDir, file));
        }
    }
    const treatmentsDir = path.join(root, 'treatments');
    for (const dir of fs.readdirSync(treatmentsDir)) {
        const bankPath = path.join(treatmentsDir, dir, 'question_bank.json');
        if (fs.existsSync(bankPath)) files.push(bankPath);
    }
    return files;
}

describe('Gate: V10 QuestionBank has no chipActivation', () => {
    it('question options never activate chips', () => {
        const violations: Array<{ file: string; question: string }> = [];
        for (const file of collectQuestionBankFiles()) {
            const data = JSON.parse(fs.readFileSync(file, 'utf8')) as QuestionBank;
            for (const question of data.questions ?? []) {
                for (const option of question.options ?? []) {
                    if (option.chipActivation) {
                        violations.push({ file, question: question.key });
                    }
                }
            }
        }
        expect(violations).toEqual([]);
    });
});
