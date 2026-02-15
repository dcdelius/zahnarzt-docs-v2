/**
 * Gate: V10 must not rely on legacy chip emission paths.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const V10_ROOT = path.join(__dirname, '../../v10');

const FORBIDDEN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: 'chipResolver', pattern: /chipResolver/i },
    { label: 'alwaysOnChipIds', pattern: /alwaysOnChipIds/ },
    { label: 'defaultActive', pattern: /defaultActive/ },
    { label: 'chipActivation', pattern: /chipActivation/ },
    { label: 'chipEffect', pattern: /chipEffect/ },
];

function scanFile(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const violations: string[] = [];
    for (const entry of FORBIDDEN_PATTERNS) {
        if (entry.pattern.test(content)) {
            violations.push(`${path.basename(filePath)}: ${entry.label}`);
        }
    }
    return violations;
}

function listTsFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (full.includes(`${path.sep}__tests__${path.sep}`) || full.includes(`${path.sep}__e2e__${path.sep}`)) {
                continue;
            }
            out.push(...listTsFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            if (full.includes(`${path.sep}__tests__${path.sep}`) || full.includes(`${path.sep}__e2e__${path.sep}`)) {
                continue;
            }
            out.push(full);
        }
    }
    return out;
}

describe('gate-v10-no-legacy-emitters', () => {
    it('no V10 files reference legacy chip emitters', () => {
        const files = listTsFiles(V10_ROOT);
        const violations: string[] = [];
        for (const file of files) {
            violations.push(...scanFile(file));
        }
        if (violations.length > 0) {
            console.error('Legacy emitter references detected:', violations);
        }
        expect(violations).toEqual([]);
    });
});
