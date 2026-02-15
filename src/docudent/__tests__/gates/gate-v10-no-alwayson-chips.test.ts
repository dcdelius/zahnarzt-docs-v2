/**
 * Gate: No alwaysOnChipIds for V10
 *
 * Ensures legacy "alwaysOn" chip emission is disabled for V10.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const TREATMENTS_DIR = join(__dirname, '../../core/billing/knowledgeBase/treatments');
const MAPPINGS_DIR = join(__dirname, '../../core/billing/knowledgeBase/mappings');

function collectAnswerMaps(): Array<{ id: string; path: string }> {
    const entries: Array<{ id: string; path: string }> = [];

    if (existsSync(TREATMENTS_DIR)) {
        for (const dir of readdirSync(TREATMENTS_DIR)) {
            const filePath = join(TREATMENTS_DIR, dir, 'answer_map.json');
            if (existsSync(filePath)) {
                entries.push({ id: dir, path: filePath });
            }
        }
    }

    if (existsSync(MAPPINGS_DIR)) {
        for (const file of readdirSync(MAPPINGS_DIR)) {
            if (!file.endsWith('_answer_map.json')) continue;
            entries.push({ id: file.replace('_answer_map.json', ''), path: join(MAPPINGS_DIR, file) });
        }
    }

    return entries;
}

describe('gate-v10-no-alwayson-chips', () => {
    it('all answer_map defaults.alwaysOnChipIds are empty', () => {
        const maps = collectAnswerMaps();
        const violations: string[] = [];

        for (const entry of maps) {
            const raw = readFileSync(entry.path, 'utf-8');
            const json = JSON.parse(raw);
            const list = json?.defaults?.alwaysOnChipIds ?? [];
            if (Array.isArray(list) && list.length > 0) {
                violations.push(`${entry.id}: ${list.join(', ')}`);
            }
        }

        if (violations.length > 0) {
            console.error('alwaysOnChipIds must be empty for V10:', violations);
        }
        expect(violations).toEqual([]);
    });
});
