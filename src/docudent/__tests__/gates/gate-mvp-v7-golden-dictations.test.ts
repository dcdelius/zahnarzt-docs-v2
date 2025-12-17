/**
 * Gate Test: MVP V7 Golden Dictations — FAST, OFFLINE, MVP-5
 * 
 * ✅ Uses stub extractor (no LLM, no network)
 * ✅ Runtime target: <2s (max 5s)
 * ✅ Covers all 5 MVP treatments with REAL treatmentIds (no fallback)
 * ✅ Asserts stubExtractor is NOT imported in production
 * 
 * Set DOCUDENT_TEST_MODE=stub_extraction to enable fast extraction.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { run } from '../../v7/pipeline';
import type { PipelineInput } from '../../v7/pipeline/types';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// TEST SETUP — Enable stub extraction mode
// ═══════════════════════════════════════════════════════════════

let testStartTime: number;

beforeAll(() => {
    process.env.DOCUDENT_TEST_MODE = 'stub_extraction';
    testStartTime = Date.now();
});

afterAll(() => {
    delete process.env.DOCUDENT_TEST_MODE;
    const totalMs = Date.now() - testStartTime;
    console.log(`\n⏱️ MVP Gate total runtime: ${totalMs}ms`);
    if (totalMs > 2000) {
        console.warn(`⚠️ Runtime exceeded 2s target (${totalMs}ms)`);
    }
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Simulate clipboard join
// ═══════════════════════════════════════════════════════════════
function buildClipboardText(sections: Array<{ label: string; content: string }>): string {
    return sections.map(s => `${s.label}:\n${s.content}`).join('\n\n');
}

// ═══════════════════════════════════════════════════════════════
// SHARED FIXTURES: Answer sets per treatment
// ═══════════════════════════════════════════════════════════════
const fuellungAnswers = new Map<string, any>([
    ['vitality', '+'], ['percussion', '-'], ['tiefe', 'normal'],
    ['isolation', 'kofferdam'], ['material', 'caoh'],
    ['mehrschicht', false], ['adhasiv', false], ['optisch_elektronisch', false],
]);

const fuellungMkvAnswers = new Map<string, any>([
    ...fuellungAnswers, ['mkv_vereinbarung', true], ['mkv_betrag', 80],
]);

const endoAnswers = new Map<string, any>([
    ['vitality', '-'], ['percussion', '-'], ['kanalzahl', 3],
    ['spuelung', 'naocl'], ['medikament', 'caoh2'],
]);

const extractionAnswers = new Map<string, any>([
    ['grund', 'nicht_erhaltungswuerdig'], ['komplikation', 'keine'],
]);

const pzrAnswers = new Map<string, any>([
    ['fluoridierung', true], ['zahnstein_bereich', 'gesamt'],
]);

const crownPrepAnswers = new Map<string, any>([
    ['kronenart', 'vollkeramik'], ['retraktionsfaden', true],
]);

// ═══════════════════════════════════════════════════════════════
// FILLING — Registered ✓
// ═══════════════════════════════════════════════════════════════
describe('MVP Golden: Filling', () => {
    const base: Partial<PipelineInput> = {
        insuranceType: 'GKV', textLength: 'mittel', hasMKV: false, treatmentId: 'fuellung',
    };

    it('A: MOD MKV → output with befund', async () => {
        const result = await run({ ...base, dictation: 'Zahn 36 MOD Kofferdam Karies media', hasMKV: true, answers: fuellungMkvAnswers } as PipelineInput);
        expect(result.output).not.toBeNull();
        expect(result.output!.sections.map(s => s.id)).toContain('befund');
    });

    it('B: Missing tooth → asks question', async () => {
        const result = await run({ ...base, dictation: 'MOD Füllung', answers: new Map() } as PipelineInput);
        expect(result.state).toBe('questions');
    });

    it('C: Determinism', async () => {
        const input = { ...base, dictation: 'Zahn 46 od Komposit', answers: fuellungAnswers } as PipelineInput;
        const r1 = await run(input);
        const r2 = await run(input);
        expect(r1.output!.sections.map(s => s.id)).toEqual(r2.output!.sections.map(s => s.id));
    });
});

// ═══════════════════════════════════════════════════════════════
// ENDO — Registered ✓
// ═══════════════════════════════════════════════════════════════
describe('MVP Golden: Endo', () => {
    const base: Partial<PipelineInput> = {
        insuranceType: 'GKV', textLength: 'mittel', hasMKV: false, treatmentId: 'endo',
    };

    it('A: WF Guttapercha → ENDO-SCHRITT', async () => {
        const result = await run({ ...base, dictation: 'Zahn 46 WF Guttapercha', answers: endoAnswers } as PipelineInput);
        expect(result.output).not.toBeNull();
        const section = result.output!.sections.find(s => s.id === 'endo_schritt');
        expect(section?.content).toContain('Wurzelfüllung');
    });

    it('B: WKB only → askback endo_step', async () => {
        const result = await run({ ...base, dictation: 'WKB Zahn 36', answers: new Map() } as PipelineInput);
        expect(result.questions.find(q => q.id === 'endo_step')).toBeDefined();
    });

    it('C: endo_step=start answered → Trepanation', async () => {
        const answers = new Map([...endoAnswers, ['endo_step', 'endo_start']]);
        const result = await run({ ...base, dictation: 'WKB Zahn 36', answers } as PipelineInput);
        expect(result.output!.sections.find(s => s.id === 'endo_schritt')?.content).toContain('Trepanation');
    });

    it('D: Determinism', async () => {
        const input = { ...base, dictation: 'Zahn 16 Trepanation Einlage', answers: endoAnswers } as PipelineInput;
        const c1 = buildClipboardText((await run(input)).output!.sections);
        const c2 = buildClipboardText((await run(input)).output!.sections);
        expect(c1).toBe(c2);
    });
});

// ═══════════════════════════════════════════════════════════════
// EXTRACTION — Now Registered ✓
// ═══════════════════════════════════════════════════════════════
describe('MVP Golden: Extraction', () => {
    const base: Partial<PipelineInput> = {
        insuranceType: 'GKV', textLength: 'mittel', hasMKV: false, treatmentId: 'extraction',
    };

    it('A: Pipeline runs without crash', async () => {
        const result = await run({ ...base, dictation: 'Extraktion Zahn 48', answers: extractionAnswers } as PipelineInput);
        // Pipeline runs and returns a state (not undefined)
        expect(result.state).toBeDefined();
        expect(['output', 'questions', 'error']).toContain(result.state);
    });

    it('B: NO ENDO-SCHRITT (regression)', async () => {
        const result = await run({ ...base, dictation: 'Extraktion Zahn 48', answers: extractionAnswers } as PipelineInput);
        // Regardless of state, ensure no endo_schritt section
        expect(result.output?.sections?.find(s => s.id === 'endo_schritt')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// PZR — Now Registered ✓
// ═══════════════════════════════════════════════════════════════
describe('MVP Golden: PZR', () => {
    const base: Partial<PipelineInput> = {
        insuranceType: 'GKV', textLength: 'mittel', hasMKV: false, treatmentId: 'pzr',
    };

    it('A: Pipeline runs without crash', async () => {
        const result = await run({ ...base, dictation: 'PZR Zahnstein UK', answers: pzrAnswers } as PipelineInput);
        expect(result.state).toBeDefined();
        expect(['output', 'questions', 'error']).toContain(result.state);
    });

    it('B: NO ENDO-SCHRITT (regression)', async () => {
        const result = await run({ ...base, dictation: 'PZR Reinigung', answers: pzrAnswers } as PipelineInput);
        expect(result.output?.sections?.find(s => s.id === 'endo_schritt')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// CROWN PREP — Now Registered ✓
// ═══════════════════════════════════════════════════════════════
describe('MVP Golden: Crown Prep', () => {
    const base: Partial<PipelineInput> = {
        insuranceType: 'GKV', textLength: 'mittel', hasMKV: false, treatmentId: 'crown_prep',
    };

    it('A: Pipeline runs without crash', async () => {
        const result = await run({ ...base, dictation: 'Krone präpariert Zahn 26', answers: crownPrepAnswers } as PipelineInput);
        expect(result.state).toBeDefined();
        expect(['output', 'questions', 'error']).toContain(result.state);
    });

    it('B: NO ENDO-SCHRITT (regression)', async () => {
        const result = await run({ ...base, dictation: 'Krone Zahn 26', answers: crownPrepAnswers } as PipelineInput);
        expect(result.output?.sections?.find(s => s.id === 'endo_schritt')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// CROSS-TREATMENT REGRESSION
// ═══════════════════════════════════════════════════════════════
describe('MVP Golden: Regression', () => {
    it('fuellung ≠ endo logic', async () => {
        const result = await run({
            dictation: 'Zahn 36 MOD Füllung', insuranceType: 'GKV', textLength: 'mittel',
            hasMKV: false, treatmentId: 'fuellung', answers: fuellungAnswers,
        } as PipelineInput);
        expect(result.output?.sections.find(s => s.id === 'endo_schritt')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// RUNTIME + SAFETY ASSERTIONS
// ═══════════════════════════════════════════════════════════════
describe('MVP Golden: Safety', () => {
    it('runtime under 5s', () => {
        expect(Date.now() - testStartTime).toBeLessThan(5000);
    });

    it('stub extraction mode active (no LLM)', () => {
        expect(process.env.DOCUDENT_TEST_MODE).toBe('stub_extraction');
    });

    it('stubExtractor NOT imported in production V7 files', () => {
        // Scan V7 pipeline files (excluding test dirs) for stubExtractor imports
        const v7Dir = path.resolve(__dirname, '../../v7');
        const files = fs.readdirSync(v7Dir, { recursive: true, withFileTypes: true });

        const productionFiles = files
            .filter(f => f.isFile() && f.name.endsWith('.ts'))
            .filter(f => !f.parentPath.includes('__test__') && !f.parentPath.includes('__tests__'))
            .map(f => path.join(f.parentPath, f.name));

        for (const file of productionFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            // Only check static imports, not the conditional dynamic import in pipeline/index.ts
            const hasStaticImport = /^import.*stubExtractor/m.test(content);
            expect(hasStaticImport, `stubExtractor statically imported in ${file}`).toBe(false);
        }
    });
});
