/**
 * Gate 5: Import Path Regression Prevention
 * 
 * This test ensures critical shared modules are importable
 * from within docudent. If this test fails, import paths
 * are broken for shared data modules.
 * 
 * This prevents regressions like wrong relative path counts.
 */
import { describe, it, expect } from 'vitest';

describe('GATE5: Import Path Validation', () => {
    describe('Critical Shared Modules', () => {
        it('src/data/masterTemplate should be importable', async () => {
            // Import from docudent/__tests__ → 3 levels up to src/data/
            const module = await import('../../../data/masterTemplate');

            expect(module).toBeDefined();
            expect(module.MASTER_TEMPLATE_V3).toBeDefined();
            expect(module.MASTER_TEMPLATE_V3.id).toBe('master_fill_v3');
            expect(module.MASTER_TEMPLATE_V3.fields).toBeDefined();
            expect(Array.isArray(module.MASTER_TEMPLATE_V3.fields)).toBe(true);
            expect(module.MASTER_TEMPLATE_V3.fields.length).toBeGreaterThan(0);
        });

        it('fuellung_unified.json should be importable', async () => {
            // Core billing SSOT
            const module = await import('../../core/billing/knowledgeBase/behandlungen/fuellung_unified.json');

            expect(module).toBeDefined();
            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.chips).toBeDefined();
        });

        it('fuellung_answer_map.json should be importable', async () => {
            // Answer mapping SSOT
            const module = await import('../../core/billing/knowledgeBase/mappings/fuellung_answer_map.json');

            expect(module).toBeDefined();
            expect(module.default).toBeDefined();
            expect(module.default.defaults).toBeDefined();
        });

        it('fuellung_finding_map.json should be importable', async () => {
            // Finding mapping (for warnings)
            const module = await import('../../core/billing/knowledgeBase/mappings/fuellung_finding_map.json');

            expect(module).toBeDefined();
            expect(module.default).toBeDefined();
            expect(module.default.fields).toBeDefined();
        });

        it('kataloge/goa.json (GOÄ) should be importable with GOÄ_ keys', async () => {
            // GOÄ catalog for PKV billing
            const module = await import('../../core/billing/knowledgeBase/kataloge/goa.json');

            expect(module).toBeDefined();
            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default._meta.name).toContain('GO');

            // Should have at least one GOÄ_ key
            const keys = Object.keys(module.default);
            const goaeKeys = keys.filter(k => k.startsWith('GOÄ_'));
            expect(goaeKeys.length).toBeGreaterThan(0);

            // Verify a known code exists
            expect(module.default['GOÄ_1']).toBeDefined();
            expect(module.default['GOÄ_1'].bezeichnung).toBeDefined();
        });
    });

    describe('Core Services', () => {
        it('outputService should be importable', async () => {
            const module = await import('../../v6/services/outputService');

            expect(module).toBeDefined();
            expect(module.generateFinalOutput).toBeDefined();
            expect(typeof module.generateFinalOutput).toBe('function');
        });

        it('treatmentEngine should be importable', async () => {
            const module = await import('../../core/billing/knowledgeBase/logic/treatmentEngine');

            expect(module).toBeDefined();
            expect(module.processChipsToBilling).toBeDefined();
            expect(module.getTreatmentChips).toBeDefined();
        });

        it('answerIdTranslator should be importable', async () => {
            const module = await import('../../core/billing/knowledgeBase/logic/answerIdTranslator');

            expect(module).toBeDefined();
            expect(module.translateAnswers).toBeDefined();
            expect(typeof module.translateAnswers).toBe('function');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // NEW SSOT PATHS — treatments/{treatmentId}/*.json
    // These are the canonical locations for all treatment configs
    // ═══════════════════════════════════════════════════════════════

    describe('SSOT Paths: treatments/fuellung/', () => {
        it('unified.json should be importable with _meta and chips', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/fuellung/unified.json');

            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default._meta.id).toBe('fuellung');
            expect(module.default.chips).toBeDefined();
            expect(Array.isArray(module.default.chips)).toBe(true);
        });

        it('answer_map.json should be importable with map array', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/fuellung/answer_map.json');

            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.map).toBeDefined();
            expect(Array.isArray(module.default.map)).toBe(true);
        });

        it('question_bank.json should be importable with questions array', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/fuellung/question_bank.json');

            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.questions).toBeDefined();
            expect(Array.isArray(module.default.questions)).toBe(true);
        });

        it('template.json should be importable with sections', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/fuellung/template.json');

            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.sections).toBeDefined();
        });

        it('finding_map.json should be importable with fields', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/fuellung/finding_map.json');

            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.fields).toBeDefined();
        });
    });

    describe('SSOT Paths: treatments/endo/', () => {
        it('unified.json should be importable with _meta and chips', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/endo/unified.json');

            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default._meta.id).toBe('endo');
            expect(module.default.chips).toBeDefined();
            expect(Array.isArray(module.default.chips)).toBe(true);
        });

        it('answer_map.json should be importable with map array', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/endo/answer_map.json');

            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.map).toBeDefined();
            expect(Array.isArray(module.default.map)).toBe(true);
        });

        it('question_bank.json should be importable with questions array', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/endo/question_bank.json');

            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.questions).toBeDefined();
            expect(Array.isArray(module.default.questions)).toBe(true);
        });

        // NOTE: template.json and finding_map.json now exist for endo as stubs
        it('template.json should be importable', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/endo/template.json');
            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.sections).toBeDefined();
        });

        it('finding_map.json should be importable', async () => {
            const module = await import('../../core/billing/knowledgeBase/treatments/endo/finding_map.json');
            expect(module.default).toBeDefined();
            expect(module.default._meta).toBeDefined();
            expect(module.default.fields).toBeDefined();
        });
    });

    describe('Registry Loaders', () => {
        it('registry module should export all loaders', async () => {
            const module = await import('../../core/billing/knowledgeBase/registry');

            expect(module.loadUnifiedConfig).toBeDefined();
            expect(module.loadAnswerMapConfig).toBeDefined();
            expect(module.loadQuestionBankConfig).toBeDefined();
            expect(module.loadTemplateConfig).toBeDefined();
            expect(module.loadFindingMapConfig).toBeDefined();
            expect(module.isKnownTreatment).toBeDefined();
            expect(module.assertKnownTreatment).toBeDefined();
        });

        it('loadUnifiedConfig should load fuellung config', async () => {
            const { loadUnifiedConfig } = await import('../../core/billing/knowledgeBase/registry');

            const config = loadUnifiedConfig('fuellung');
            expect(config._meta.id).toBe('fuellung');
            expect(config.chips).toBeDefined();
        });

        it('loadUnifiedConfig should load endo config', async () => {
            const { loadUnifiedConfig } = await import('../../core/billing/knowledgeBase/registry');

            const config = loadUnifiedConfig('endo');
            expect(config._meta.id).toBe('endo');
            expect(config.chips).toBeDefined();
        });
    });

    describe('QuestionBank SSOT', () => {
        it('getQuestionDef should return fuellung question (ueberkappung_material)', async () => {
            const { getQuestionDef } = await import('../../core/billing/knowledgeBase/questions/questionBank');

            const question = getQuestionDef('fuellung', 'ueberkappung_material');
            expect(question).toBeDefined();
            expect(question.key).toBe('ueberkappung_material');
            expect(question.category).toBe('forensic');
        });

        it('getQuestionDef should return endo question (kanalzahl)', async () => {
            const { getQuestionDef } = await import('../../core/billing/knowledgeBase/questions/questionBank');

            const question = getQuestionDef('endo', 'kanalzahl');
            expect(question).toBeDefined();
            expect(question.key).toBe('kanalzahl');
        });

        it('getQuestionDef should throw for unknown treatment', async () => {
            const { getQuestionDef } = await import('../../core/billing/knowledgeBase/questions/questionBank');

            expect(() => getQuestionDef('unknown_xyz', 'material'))
                .toThrow(/Unknown treatment.*unknown_xyz/i);
        });

        it('getQuestionDef should throw for unknown questionId', async () => {
            const { getQuestionDef } = await import('../../core/billing/knowledgeBase/questions/questionBank');

            // 'material' exists in fuellung but not in endo
            expect(() => getQuestionDef('endo', 'material'))
                .toThrow(/Unknown questionId.*material.*endo/i);
        });

        it('hasQuestion should return true for existing question', async () => {
            const { hasQuestion } = await import('../../core/billing/knowledgeBase/questions/questionBank');

            expect(hasQuestion('fuellung', 'vitality')).toBe(true);
            expect(hasQuestion('endo', 'kanalzahl')).toBe(true);
        });

        it('hasQuestion should return false for non-existing question', async () => {
            const { hasQuestion } = await import('../../core/billing/knowledgeBase/questions/questionBank');

            expect(hasQuestion('fuellung', 'kanalzahl')).toBe(false);
            expect(hasQuestion('endo', 'material')).toBe(false);
        });
    });

    describe('AnswerIdTranslator SSOT', () => {
        it('translateAnswers should translate fuellung tiefe=tief to cavity_depth=deep', async () => {
            const { translateAnswers } = await import('../../core/billing/knowledgeBase/logic/answerIdTranslator');

            const answers = new Map<string, unknown>([['tiefe', 'tief']]);
            const result = translateAnswers('fuellung', answers);

            // tiefe maps to cavity_depth questionKey, tief normalizes to deep via optionAliases
            // (chip lookup 'deep' → 'cp' is chipResolver's job)
            expect(result.get('cavity_depth')).toBe('deep');
        });

        it('translateAnswers should keep endo kanalzahl unchanged (pass-through)', async () => {
            const { translateAnswers } = await import('../../core/billing/knowledgeBase/logic/answerIdTranslator');

            const answers = new Map<string, unknown>([['kanalzahl', '3']]);
            const result = translateAnswers('endo', answers);

            // kanalzahl is not mapped, so it passes through
            expect(result.get('kanalzahl')).toBe('3');
        });

        it('translateAnswers should throw for unknown treatment', async () => {
            const { translateAnswers } = await import('../../core/billing/knowledgeBase/logic/answerIdTranslator');

            const answers = new Map<string, unknown>([['vitality', 'pos']]);
            expect(() => translateAnswers('unknown_xyz', answers))
                .toThrow(/Unknown treatment.*unknown_xyz/i);
        });

        it('translateQuestionId should return canonical key for matched pattern', async () => {
            const { translateQuestionId } = await import('../../core/billing/knowledgeBase/logic/answerIdTranslator');

            // 'forensic_vitality' is in questionIdPatterns for 'vitality' questionKey
            expect(translateQuestionId('fuellung', 'forensic_vitality')).toBe('vitality');
            expect(translateQuestionId('fuellung', 'isolation')).toBe('kofferdam');
        });

        it('translateOptionId should normalize via optionAliases', async () => {
            const { translateOptionId } = await import('../../core/billing/knowledgeBase/logic/answerIdTranslator');

            // kofferdam question: semantic 'relativ' → normalized 'no' via optionAliases
            // 'yes' is already normalized, no change
            expect(translateOptionId('fuellung', 'kofferdam', 'relativ')).toBe('no');
            expect(translateOptionId('fuellung', 'kofferdam', 'kofferdam')).toBe('yes');
            expect(translateOptionId('fuellung', 'kofferdam', 'yes')).toBe('yes'); // pass-through
        });
    });

    describe('ChipResolver SSOT', () => {
        it('resolveActiveChipIds should activate kofferdam chip for fuellung', async () => {
            const { resolveActiveChipIds } = await import('../../core/billing/knowledgeBase/logic/chipResolver');

            const extracted = { tooth: '36', surfaces: ['m', 'o'], mentioned: {} };
            const answers = new Map<string, string>([['isolation', 'kofferdam']]);

            const chips = resolveActiveChipIds('fuellung', extracted, answers, {
                hasMKV: false,
                insuranceType: 'GKV'
            });

            expect(chips).toContain('kofferdam');
            expect(chips).not.toContain('rel_trocken');
        });

        it('resolveActiveChipIds should activate kanalaufbereitung_3 for endo kanalzahl=3', async () => {
            const { resolveActiveChipIds } = await import('../../core/billing/knowledgeBase/logic/chipResolver');

            const extracted = { tooth: '36', mentioned: {} };
            const answers = new Map<string, string>([['kanalzahl', '3']]);

            const chips = resolveActiveChipIds('endo', extracted, answers, {
                hasMKV: false,
                insuranceType: 'GKV'
            });

            expect(chips).toContain('kanalaufbereitung_3');
        });

        it('resolveActiveChipIds should throw for unknown treatment', async () => {
            const { resolveActiveChipIds } = await import('../../core/billing/knowledgeBase/logic/chipResolver');

            const extracted = { tooth: '36', mentioned: {} };
            const answers = new Map<string, string>();

            expect(() => resolveActiveChipIds('unknown_xyz', extracted, answers, {
                hasMKV: false,
                insuranceType: 'GKV'
            })).toThrow(/Unknown treatment.*unknown_xyz/i);
        });

        it('chipResolver should load via registry (no legacy imports)', async () => {
            // This test verifies chipResolver uses registry by checking it works
            // for both treatments without any legacy path setup
            const { resolveActiveChipIds } = await import('../../core/billing/knowledgeBase/logic/chipResolver');
            // Fuellung: default chips should include exkavation
            const fuellungChips = resolveActiveChipIds('fuellung', {}, new Map(), {
                hasMKV: false,
                insuranceType: 'GKV'
            });
            expect(fuellungChips).toContain('exkavation');
            expect(fuellungChips).toContain('komposit_basic');

            // Endo: default chips should include spuelung_naocl
            const endoChips = resolveActiveChipIds('endo', {}, new Map(), {
                hasMKV: false,
                insuranceType: 'GKV'
            });
            expect(endoChips).toContain('spuelung_naocl');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // LEGACY IMPORT ENFORCEMENT
    // These tests ensure SSOT modules do NOT import from legacy paths
    // ═══════════════════════════════════════════════════════════════

    describe('Legacy Import Enforcement', () => {
        const LEGACY_PATTERNS = [
            '/behandlungen/',
            '/mappings/',
            // Note: /questions/ is allowed because questionBank.ts lives there
            // but uses registry internally. /templates/ is allowed for core/templates/catalog
        ];

        // These files are SSOT-migrated and MUST NOT import from legacy paths
        const SSOT_FILES = [
            'treatmentEngine.ts',
            'chipResolver.ts',
            'answerIdTranslator.ts',
            'outputComposer.ts',
        ];

        it('SSOT logic modules should not import from /behandlungen/', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const logicDir = path.resolve(__dirname, '../../core/billing/knowledgeBase/logic');

            for (const filename of SSOT_FILES) {
                const filePath = path.join(logicDir, filename);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');

                    for (const pattern of LEGACY_PATTERNS) {
                        const hasLegacyImport = content.includes(pattern);
                        expect(hasLegacyImport).toBe(false);
                    }
                }
            }
        });

        it('registry loaders should not import from legacy paths', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const loaderPath = path.resolve(__dirname, '../../core/billing/knowledgeBase/registry/loaders.ts');
            const content = fs.readFileSync(loaderPath, 'utf-8');

            for (const pattern of LEGACY_PATTERNS) {
                const hasLegacyImport = content.includes(pattern);
                expect(hasLegacyImport).toBe(false);
            }
        });

        it('v6 services should not import from /behandlungen/', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const servicesDir = path.resolve(__dirname, '../../v6/services');
            const V6_SERVICES = ['outputService.ts', 'questionService.ts', 'questionServiceV2.ts'];

            for (const filename of V6_SERVICES) {
                const filePath = path.join(servicesDir, filename);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');

                    // These files should NOT import from /behandlungen/
                    const hasBehandlungenImport = content.includes('/behandlungen/');
                    expect(hasBehandlungenImport).toBe(false);
                }
            }
        });

        it('treatments folder should be the ONLY source of JSON configs', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const treatmentsDir = path.resolve(__dirname, '../../core/billing/knowledgeBase/treatments');

            // Fuellung should have all 5 files
            const fuellungFiles = ['unified.json', 'answer_map.json', 'question_bank.json', 'template.json', 'finding_map.json'];
            for (const file of fuellungFiles) {
                const filePath = path.join(treatmentsDir, 'fuellung', file);
                expect(fs.existsSync(filePath)).toBe(true);
            }

            // Endo should have all 5 files
            for (const file of fuellungFiles) {
                const filePath = path.join(treatmentsDir, 'endo', file);
                expect(fs.existsSync(filePath)).toBe(true);
            }
        });
    });
});
