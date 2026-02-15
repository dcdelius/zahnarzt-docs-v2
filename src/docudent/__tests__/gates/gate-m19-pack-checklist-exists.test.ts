/**
 * Gate Test: M19 Pack Checklist Exists
 *
 * Verifies the treatment pack checklist documentation exists
 * and contains required sections.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CHECKLIST_PATH = path.join(
    process.cwd(),
    'docs/v10/treatment-pack-checklist.md'
);

describe('gate-m19-pack-checklist-exists', () => {
    // ═══════════════════════════════════════════════════════════════
    // FILE EXISTS
    // ═══════════════════════════════════════════════════════════════

    test('checklist file exists', () => {
        expect(fs.existsSync(CHECKLIST_PATH)).toBe(true);
    });

    test('checklist is not empty', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        expect(content.length).toBeGreaterThan(1000);
    });

    // ═══════════════════════════════════════════════════════════════
    // REQUIRED SECTIONS
    // ═══════════════════════════════════════════════════════════════

    const requiredSections = [
        'Treatment KB',
        'Medical KB',
        'Golden Clinical Scenarios',
        'Combinability Goldens',
        'Pack Wiring',
        'Gates',
        'Definition of Done',
    ];

    for (const section of requiredSections) {
        test(`contains section: ${section}`, () => {
            const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
            expect(content).toContain(section);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // KEY CONTENT
    // ═══════════════════════════════════════════════════════════════

    test('contains unified.json reference', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        expect(content).toContain('unified.json');
    });

    test('contains billingRef reference', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        expect(content).toContain('billingRef');
    });

    test('contains minimum scenario count guidance', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        // Should mention 7-10 scenarios
        expect(content).toMatch(/7[\s\-–]+10|minimum.*7/i);
    });

    test('contains PASS/BLOCK combinability guidance', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        expect(content).toContain('PASS');
        expect(content).toContain('BLOCK');
    });

    test('contains registry.ts reference', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        expect(content).toContain('registry.ts');
    });

    test('contains generator usage', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        expect(content).toContain('newTreatmentPack');
    });

    // ═══════════════════════════════════════════════════════════════
    // STRUCTURE
    // ═══════════════════════════════════════════════════════════════

    test('has proper markdown headings', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        const h2Count = (content.match(/^## /gm) || []).length;
        expect(h2Count).toBeGreaterThanOrEqual(5);
    });

    test('has checkbox items', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        const checkboxCount = (content.match(/- \[ \]/g) || []).length;
        expect(checkboxCount).toBeGreaterThanOrEqual(10);
    });

    test('has code examples', () => {
        const content = fs.readFileSync(CHECKLIST_PATH, 'utf-8');
        const codeBlockCount = (content.match(/```/g) || []).length;
        expect(codeBlockCount).toBeGreaterThanOrEqual(4); // At least 2 code blocks (open + close)
    });
});
