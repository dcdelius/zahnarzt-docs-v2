/**
 * Gate: MVP Docs
 * 
 * Ensures MVP documentation exists and contains required content:
 * - 5 treatments
 * - Endo steps (trepanation, med/prep, obturation)
 * - ZMV finalization statement
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_DIR = path.resolve(__dirname, '../../../../docs/project');

// ═══════════════════════════════════════════════════════════════
// A) MVP.MD EXISTS
// ═══════════════════════════════════════════════════════════════

describe('GATE: MVP Docs', () => {
    describe('A) MVP.md Exists', () => {
        it('MVP.md exists and is non-empty', () => {
            const mvpPath = path.join(PROJECT_DIR, 'MVP.md');
            expect(fs.existsSync(mvpPath)).toBe(true);
            const content = fs.readFileSync(mvpPath, 'utf-8');
            expect(content.length).toBeGreaterThan(500);
        });

        it('WORKFLOW_REALITY.md exists and is non-empty', () => {
            const workflowPath = path.join(PROJECT_DIR, 'WORKFLOW_REALITY.md');
            expect(fs.existsSync(workflowPath)).toBe(true);
            const content = fs.readFileSync(workflowPath, 'utf-8');
            expect(content.length).toBeGreaterThan(200);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // B) 5 TREATMENTS DOCUMENTED
    // ═══════════════════════════════════════════════════════════

    describe('B) 5 Treatments', () => {
        let mvpContent: string;

        beforeAll(() => {
            mvpContent = fs.readFileSync(path.join(PROJECT_DIR, 'MVP.md'), 'utf-8');
        });

        it('mentions "5 MVP Treatments" or "5 treatments"', () => {
            expect(mvpContent).toMatch(/5\s*(MVP\s*)?[Tt]reatments?/);
        });

        it('documents Filling (Füllung)', () => {
            expect(mvpContent).toMatch(/Filling|Füllung/);
        });

        it('documents Endo (WKB)', () => {
            expect(mvpContent).toMatch(/Endo|WKB|Wurzelkanalbehandlung/);
        });

        it('documents Extraction', () => {
            expect(mvpContent).toMatch(/Extraction|Extraktion/);
        });

        it('documents PZR', () => {
            expect(mvpContent).toContain('PZR');
        });

        it('documents Crown Prep (Krone)', () => {
            expect(mvpContent).toMatch(/Crown|Krone/);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // C) ENDO STEPS
    // ═══════════════════════════════════════════════════════════

    describe('C) Endo Steps', () => {
        let mvpContent: string;

        beforeAll(() => {
            mvpContent = fs.readFileSync(path.join(PROJECT_DIR, 'MVP.md'), 'utf-8');
        });

        it('documents Endo steps: trepanation, med/prep, obturation', () => {
            expect(mvpContent.toLowerCase()).toContain('trepanation');
            expect(mvpContent.toLowerCase()).toMatch(/med.*prep|aufbereitung/);
            expect(mvpContent.toLowerCase()).toContain('obturation');
        });

        it('mentions 3-step or explicit step model', () => {
            expect(mvpContent).toMatch(/3[- ]step|three step|Step.*Step.*Step/is);
        });
    });

    // ═══════════════════════════════════════════════════════════
    // D) ZMV FINALIZATION
    // ═══════════════════════════════════════════════════════════

    describe('D) ZMV Finalization Statement', () => {
        let mvpContent: string;

        beforeAll(() => {
            mvpContent = fs.readFileSync(path.join(PROJECT_DIR, 'MVP.md'), 'utf-8');
        });

        it('mentions "ZMV finalizes billing"', () => {
            expect(mvpContent).toMatch(/ZMV.*finaliz|ZMV.*Abrechnung|ZMV.*billing/i);
        });

        it('mentions "suggestions" not final', () => {
            expect(mvpContent.toLowerCase()).toContain('suggestion');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // E) WORKFLOW REALITY
    // ═══════════════════════════════════════════════════════════

    describe('E) Workflow Reality', () => {
        let workflowContent: string;

        beforeAll(() => {
            workflowContent = fs.readFileSync(path.join(PROJECT_DIR, 'WORKFLOW_REALITY.md'), 'utf-8');
        });

        it('distinguishes chairside from planning', () => {
            expect(workflowContent).toMatch(/[Cc]hairside/);
            expect(workflowContent).toMatch(/[Pp]lanning|HKP/);
        });

        it('documents Case concept', () => {
            expect(workflowContent).toMatch(/[Cc]ase.*concept|multiple appointment/i);
        });
    });
});
