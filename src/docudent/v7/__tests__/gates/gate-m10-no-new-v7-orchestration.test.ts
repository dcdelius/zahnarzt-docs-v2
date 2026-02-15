/**
 * Gate M10-B: No New V7 Orchestration
 *
 * Ensures orchestration logic is ONLY in V10, not V7.
 * V7 pipeline should be a thin wrapper calling runV10.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate M10-B: No New V7 Orchestration', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: V10 is the orchestration home
    // ═══════════════════════════════════════════════════════════════

    describe('V10 orchestration files exist', () => {
        it('runV10.ts exists', () => {
            const runV10Path = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10.ts'
            );
            expect(fs.existsSync(runV10Path)).toBe(true);
        });

        it('V10 types.ts exists', () => {
            const typesPath = path.join(
                process.cwd(),
                'src/docudent/v10/types.ts'
            );
            expect(fs.existsSync(typesPath)).toBe(true);
        });

        it('V10 index.ts exports runV10', () => {
            const indexPath = path.join(
                process.cwd(),
                'src/docudent/v10/index.ts'
            );
            const content = fs.readFileSync(indexPath, 'utf-8');
            expect(content).toContain('runV10');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: V10 uses M6-M9 modules
    // ═══════════════════════════════════════════════════════════════

    describe('V10 uses M6-M9 modules', () => {
        it('runV10 imports extractionToFacts (M7)', () => {
            const runV10Path = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10.ts'
            );
            const content = fs.readFileSync(runV10Path, 'utf-8');
            expect(content).toContain('extractionToFacts');
        });

        it('runV10 imports applyMedicalKb (M6)', () => {
            const runV10Path = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10.ts'
            );
            const content = fs.readFileSync(runV10Path, 'utf-8');
            expect(content).toContain('applyMedicalKb');
        });

        it('runV10 imports compileAskbacksToQuestions (M8)', () => {
            const runV10Path = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10.ts'
            );
            const content = fs.readFileSync(runV10Path, 'utf-8');
            expect(content).toContain('compileAskbacksToQuestions');
        });

        it('runV10 imports renderFromKbChips (M9)', () => {
            const runV10Path = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10.ts'
            );
            const content = fs.readFileSync(runV10Path, 'utf-8');
            expect(content).toContain('renderFromKbChips');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: V10 does NOT import from V7 pipeline (no circular)
    // ═══════════════════════════════════════════════════════════════

    describe('No circular V10→V7 pipeline imports', () => {
        it('runV10 does not import v7/pipeline/index', () => {
            const runV10Path = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10.ts'
            );
            const content = fs.readFileSync(runV10Path, 'utf-8');
            expect(content).not.toContain("from '../../v7/pipeline/index'");
            expect(content).not.toContain("from '../../v7/pipeline'");
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Medical engine NOT duplicated
    // ═══════════════════════════════════════════════════════════════

    describe('No duplicate engine logic', () => {
        it('V10 does not have its own applyMedicalKb', () => {
            const v10PipelinePath = path.join(
                process.cwd(),
                'src/docudent/v10/pipeline/runV10.ts'
            );
            const content = fs.readFileSync(v10PipelinePath, 'utf-8');

            // Should import, not define
            const hasImport = content.includes("import { applyMedicalKb");
            const hasOwnDef = content.includes('function applyMedicalKb(');

            expect(hasImport).toBe(true);
            expect(hasOwnDef).toBe(false);
        });
    });
});
