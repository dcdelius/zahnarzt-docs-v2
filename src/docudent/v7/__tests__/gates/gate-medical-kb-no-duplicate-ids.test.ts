/**
 * Gate Test: Medical KB No Duplicate Rule IDs
 *
 * Verifies that all rule IDs in medical_kb.v1.json are unique.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface Rule {
    id: string;
    name: string;
}

interface MedicalKB {
    rules: Rule[];
    askbacks: Array<{ id: string }>;
    chips: Array<{ id: string }>;
    defaults: Array<{ id: string }>;
    concepts: Array<{ id: string }>;
}

describe('Gate: Medical KB No Duplicate Rule IDs', () => {
    let kb: MedicalKB;

    beforeAll(() => {
        const kbPath = path.join(
            process.cwd(),
            'src/docudent/medical_kb/medical_kb.v1.json'
        );
        kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 1: No duplicate rule IDs
    // ═══════════════════════════════════════════════════════════════
    it('all rule IDs must be unique', () => {
        const ids = kb.rules.map(r => r.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

        if (duplicates.length > 0) {
            throw new Error(`Duplicate rule IDs: ${[...new Set(duplicates)].join(', ')}`);
        }

        expect(duplicates.length).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: No duplicate askback IDs
    // ═══════════════════════════════════════════════════════════════
    it('all askback IDs must be unique', () => {
        const ids = kb.askbacks.map(a => a.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

        expect(duplicates.length).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: No duplicate chip IDs
    // ═══════════════════════════════════════════════════════════════
    it('all chip IDs must be unique', () => {
        const ids = kb.chips.map(c => c.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

        expect(duplicates.length).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: No duplicate concept IDs
    // ═══════════════════════════════════════════════════════════════
    it('all concept IDs must be unique', () => {
        const ids = kb.concepts.map(c => c.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

        expect(duplicates.length).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 5: IDs follow naming convention
    // ═══════════════════════════════════════════════════════════════
    it('rule IDs should follow kebab-case convention', () => {
        const validPattern = /^[a-z][a-z0-9-]*$/;

        for (const rule of kb.rules) {
            if (!validPattern.test(rule.id)) {
                throw new Error(`Rule ID '${rule.id}' does not follow kebab-case convention`);
            }
        }
    });
});
