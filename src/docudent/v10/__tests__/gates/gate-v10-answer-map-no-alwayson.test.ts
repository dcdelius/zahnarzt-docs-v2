import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

type AnswerMap = {
    defaults?: {
        alwaysOnChipIds?: string[];
    };
};

function collectAnswerMapFiles(): string[] {
    const root = path.resolve(process.cwd(), 'src/docudent/core/billing/knowledgeBase');
    const files: string[] = [];
    const treatmentsDir = path.join(root, 'treatments');
    for (const dir of fs.readdirSync(treatmentsDir)) {
        const mapPath = path.join(treatmentsDir, dir, 'answer_map.json');
        if (fs.existsSync(mapPath)) files.push(mapPath);
    }
    const mappingsDir = path.join(root, 'mappings');
    if (fs.existsSync(mappingsDir)) {
        for (const file of fs.readdirSync(mappingsDir)) {
            if (file.endsWith('_answer_map.json')) {
                files.push(path.join(mappingsDir, file));
            }
        }
    }
    return files;
}

describe('Gate: V10 AnswerMap has no alwaysOnChipIds', () => {
    it('defaults.alwaysOnChipIds must be empty', () => {
        const violations: Array<{ file: string; ids: string[] }> = [];
        for (const file of collectAnswerMapFiles()) {
            const data = JSON.parse(fs.readFileSync(file, 'utf8')) as AnswerMap;
            const ids = data.defaults?.alwaysOnChipIds ?? [];
            if (ids.length > 0) {
                violations.push({ file, ids });
            }
        }
        expect(violations).toEqual([]);
    });
});
