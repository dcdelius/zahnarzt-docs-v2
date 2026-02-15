/**
 * Gate: Festzuschuss SSOT Guard
 * 
 * This test ensures Festzuschuss amounts used at runtime come ONLY from:
 *   core/billing/knowledgeBase/logic/festzuschussMapper.ts
 * 
 * ...and NOT from any orphan JSON catalog (e.g. kataloge/festzuschuesse.json)
 * or legacy billingDatabase.
 * 
 * Categories:
 *   A) Runtime uses mapper — verify API returns expected 2025 value
 *   B) Orphan JSON is NOT imported by runtime — static source scan
 *   C) Optional: Orphan JSON marked as NOT USED if it exists
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Expected 2025 values from FESTZUSCHUSS_BETRAEGE in festzuschussMapper.ts
// Source: AOK, KZBV, Spitta-Verlag (Stand: Januar 2025)
const EXPECTED_FZ_VALUES = {
    'FZ_1.1': {
        ohneBonus: 229.25,      // 60% Regelversorgung
        mit5jBonus: 267.46,     // 70%
        mit10jBonus: 286.57,    // 75%
        haertefall: 382.09,     // 100%
    },
    'FZ_2.1': {
        ohneBonus: 513.90,
        mit5jBonus: 599.55,
        mit10jBonus: 642.38,
        haertefall: 856.50,
    },
};

describe('GATE: Festzuschuss SSOT Guard', () => {
    // ═══════════════════════════════════════════════════════════════
    // A) RUNTIME USES MAPPER
    // ═══════════════════════════════════════════════════════════════

    describe('A) Runtime uses festzuschussMapper', () => {
        it('berechneFestzuschuss should be importable from logic/index.ts', async () => {
            const module = await import('../../core/billing/knowledgeBase/logic/index');

            expect(module.berechneFestzuschuss).toBeDefined();
            expect(typeof module.berechneFestzuschuss).toBe('function');
        });

        it('FZ_1.1 ohne Bonus should return 229.25 (2025 value)', async () => {
            const { berechneFestzuschuss } = await import(
                '../../core/billing/knowledgeBase/logic/index'
            );

            const result = berechneFestzuschuss(['FZ_1.1'], 'ohne');

            expect(result.gesamtbetrag).toBe(EXPECTED_FZ_VALUES['FZ_1.1'].ohneBonus);
            expect(result.einzelbetraege).toHaveLength(1);
            expect(result.einzelbetraege[0].befund).toBe('FZ_1.1');
            expect(result.einzelbetraege[0].betrag).toBe(229.25);
        });

        it('FZ_1.1 mit 5-Jahres-Bonus should return 267.46 (70%)', async () => {
            const { berechneFestzuschuss } = await import(
                '../../core/billing/knowledgeBase/logic/index'
            );

            const result = berechneFestzuschuss(['FZ_1.1'], '5_jahre');

            expect(result.gesamtbetrag).toBe(EXPECTED_FZ_VALUES['FZ_1.1'].mit5jBonus);
            expect(result.bonusStatus).toBe('5_jahre');
        });

        it('FZ_1.1 mit 10-Jahres-Bonus should return 286.57 (75%)', async () => {
            const { berechneFestzuschuss } = await import(
                '../../core/billing/knowledgeBase/logic/index'
            );

            const result = berechneFestzuschuss(['FZ_1.1'], '10_jahre');

            expect(result.gesamtbetrag).toBe(EXPECTED_FZ_VALUES['FZ_1.1'].mit10jBonus);
        });

        it('FZ_1.1 Härtefall should return 382.09 (100%)', async () => {
            const { berechneFestzuschuss } = await import(
                '../../core/billing/knowledgeBase/logic/index'
            );

            const result = berechneFestzuschuss(['FZ_1.1'], 'haertefall');

            expect(result.gesamtbetrag).toBe(EXPECTED_FZ_VALUES['FZ_1.1'].haertefall);
        });

        it('Multiple befunde (FZ_1.1 + FZ_2.1) should sum correctly', async () => {
            const { berechneFestzuschuss } = await import(
                '../../core/billing/knowledgeBase/logic/index'
            );

            const result = berechneFestzuschuss(['FZ_1.1', 'FZ_2.1'], 'ohne');

            const expectedSum = 229.25 + 513.90; // = 743.15
            expect(result.gesamtbetrag).toBeCloseTo(expectedSum, 2);
            expect(result.einzelbetraege).toHaveLength(2);
        });

        it('BonusStatus type should be exported', async () => {
            const module = await import('../../core/billing/knowledgeBase/logic/index');

            // Type-only exports can't be checked at runtime, but we check the function accepts the type
            expect(module.berechneFestzuschuss(['FZ_1.1'], 'ohne')).toBeDefined();
            expect(module.berechneFestzuschuss(['FZ_1.1'], '5_jahre')).toBeDefined();
            expect(module.berechneFestzuschuss(['FZ_1.1'], '10_jahre')).toBeDefined();
            expect(module.berechneFestzuschuss(['FZ_1.1'], 'haertefall')).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // B) ORPHAN JSON IS NOT IMPORTED BY RUNTIME
    // ═══════════════════════════════════════════════════════════════

    describe('B) Orphan JSON is NOT imported by runtime', () => {
        const ORPHAN_PATTERNS = [
            'festzuschuesse.json',
            '/festzuschuesse',
            'festzuschüsse.json',  // Alternate casing with umlaut
            '/festzuschüsse',
        ];

        // Runtime modules that MUST NOT reference the orphan JSON
        const RUNTIME_FILES: Array<{ relative: string; description: string }> = [
            {
                relative: 'core/billing/knowledgeBase/logic/festzuschussMapper.ts',
                description: 'SSOT mapper (should NOT import JSON)',
            },
            {
                relative: 'core/billing/knowledgeBase/logic/index.ts',
                description: 'Logic exports',
            },
            {
                relative: 'core/billing/knowledgeBase/logic/billingRegistry.ts',
                description: 'Billing registry',
            },
            {
                relative: 'v6/services/outputService.ts',
                description: 'V6 output service',
            },
            {
                relative: 'v7/multitreatment/orchestrator.ts',
                description: 'V7 orchestrator',
            },
            {
                relative: 'core/billing/knowledgeBase/logic/gleichartigCalculator.ts',
                description: 'Gleichartig calculator (FZ consumer)',
            },
            {
                relative: 'core/billing/knowledgeBase/logic/mkvTemplateGenerator.ts',
                description: 'MKV generator (FZ consumer)',
            },
            {
                relative: 'core/billing/knowledgeBase/logic/hkpGenerator.ts',
                description: 'HKP generator (FZ consumer)',
            },
        ];

        for (const { relative, description } of RUNTIME_FILES) {
            it(`${description} should NOT reference orphan JSON`, () => {
                const docudentRoot = path.resolve(__dirname, '../..');
                const filePath = path.join(docudentRoot, relative);

                if (!fs.existsSync(filePath)) {
                    // Skip if file doesn't exist (not a failure)
                    console.warn(`Skipping non-existent file: ${relative}`);
                    return;
                }

                const content = fs.readFileSync(filePath, 'utf-8');

                for (const pattern of ORPHAN_PATTERNS) {
                    const hasOrphanReference = content.includes(pattern);
                    expect(
                        hasOrphanReference,
                        `${relative} should NOT contain '${pattern}'`
                    ).toBe(false);
                }
            });
        }

        it('No runtime module should import festzuschuesse.json', () => {
            const docudentRoot = path.resolve(__dirname, '../..');
            const logicDir = path.join(docudentRoot, 'core/billing/knowledgeBase/logic');

            if (!fs.existsSync(logicDir)) {
                throw new Error(`Logic directory not found: ${logicDir}`);
            }

            const files = fs.readdirSync(logicDir).filter(f => f.endsWith('.ts'));

            for (const file of files) {
                const content = fs.readFileSync(path.join(logicDir, file), 'utf-8');

                // Check for any import of festzuschuesse.json
                const importPattern = /import\s+.*from\s+['"].*festzuschuesse\.json['"]/;
                const hasJsonImport = importPattern.test(content);

                expect(
                    hasJsonImport,
                    `${file} should NOT import festzuschuesse.json`
                ).toBe(false);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // C) OPTIONAL: ORPHAN JSON EXISTS BUT IS MARKED
    // ═══════════════════════════════════════════════════════════════

    describe('C) Orphan JSON marked as NOT USED (if exists)', () => {
        it('kataloge/festzuschuesse.json should have _meta.status = "ORPHAN" if it exists', () => {
            const docudentRoot = path.resolve(__dirname, '../..');
            const orphanPath = path.join(
                docudentRoot,
                'core/billing/knowledgeBase/kataloge/festzuschuesse.json'
            );

            if (!fs.existsSync(orphanPath)) {
                // File doesn't exist — this is acceptable, skip the test
                console.log('festzuschuesse.json does not exist, skipping marker check');
                return;
            }

            const content = fs.readFileSync(orphanPath, 'utf-8');
            const data = JSON.parse(content);

            // If the file exists, it SHOULD have a _meta field indicating it's not used
            // This is a soft requirement — we warn but don't fail
            // (Category B already proves it's not imported, which is the critical guard)
            if (data._meta && data._meta.status) {
                expect(data._meta.status).toMatch(/orphan|deprecated|not.?used/i);
            } else {
                // File exists but no _meta.status — this is a warning, not a failure
                // The important thing is Category B proves it's not imported
                console.warn(
                    'WARN: festzuschuesse.json exists but has no _meta.status field. ' +
                    'Consider adding _meta.status = "ORPHAN" to clarify it is not used.'
                );
            }
        });

        it('SSOT festzuschussMapper.ts should contain FESTZUSCHUSS_BETRAEGE constant', () => {
            const docudentRoot = path.resolve(__dirname, '../..');
            const ssotPath = path.join(
                docudentRoot,
                'core/billing/knowledgeBase/logic/festzuschussMapper.ts'
            );

            expect(fs.existsSync(ssotPath)).toBe(true);

            const content = fs.readFileSync(ssotPath, 'utf-8');

            // The source of truth must contain the hardcoded constant
            expect(content).toContain('FESTZUSCHUSS_BETRAEGE');
            expect(content).toContain("'FZ_1.1'");
            expect(content).toContain('ohneBonus');
            expect(content).toContain('mit5jBonus');
            expect(content).toContain('mit10jBonus');
            expect(content).toContain('haertefall');
        });

        it('SSOT should have 2025 header comment', () => {
            const docudentRoot = path.resolve(__dirname, '../..');
            const ssotPath = path.join(
                docudentRoot,
                'core/billing/knowledgeBase/logic/festzuschussMapper.ts'
            );

            const content = fs.readFileSync(ssotPath, 'utf-8');

            // Header should indicate 2025 values
            expect(content).toMatch(/2025|Stand.*2025|Januar 2025/i);
        });
    });
});
