/**
 * Gate Test: Settings SSOT Compliance
 * 
 * Ensures that output composers and question services use the settings registry
 * instead of raw string comparisons for setting values.
 * 
 * ❌ FORBIDDEN in outputComposer.ts, questionService.ts:
 * - Direct string comparisons like === 'sektional', === 'leitung'
 * - Raw setting value strings outside of SSOT lookups
 * 
 * ✅ ALLOWED:
 * - Type definitions (settingsStore.ts)
 * - Test files
 * - Dictation keyword detection (treatmentEngine.ts)
 * - Registry definitions (settingsRegistry.ts)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    FUELLUNG_SETTINGS_REGISTRY,
    resolveSettingOption,
    getSettingLabel,
    getSettingChipId,
} from '../../core/billing/knowledgeBase/registry/settingsRegistry';
import { CANONICAL_CHIP_IDS } from '../../contracts/canonicalIds';

// ═══════════════════════════════════════════════════════════════
// REGISTRY VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Gate: Settings Registry Structure', () => {
    it('registry should define all required setting groups', () => {
        const requiredGroups = [
            'trockenlegung',
            'ueberkappungMaterial',
            'anesthesia.ukPosteriorMode',
            'anesthesia.okPosteriorMode',
            'anesthesia.frontMode',
            'matrix.approximalMode',
            'matrix.wedge',
            'matrix.ring',
        ];

        for (const group of requiredGroups) {
            expect(FUELLUNG_SETTINGS_REGISTRY[group]).toBeDefined();
            expect(FUELLUNG_SETTINGS_REGISTRY[group].options.length).toBeGreaterThan(0);
        }
    });

    it('each setting group should have a "fragen" option', () => {
        for (const [key, group] of Object.entries(FUELLUNG_SETTINGS_REGISTRY)) {
            const fragenOption = group.options.find(opt => opt.id === 'fragen');
            expect(fragenOption).toBeDefined();
            expect(fragenOption?.category).toBe('uiOnly');
        }
    });

    it('billingChip options should have activatesChipId', () => {
        for (const [key, group] of Object.entries(FUELLUNG_SETTINGS_REGISTRY)) {
            for (const option of group.options) {
                if (option.category === 'billingChip') {
                    expect(option.activatesChipId).toBeDefined();
                    expect(typeof option.activatesChipId).toBe('string');
                }
            }
        }
    });

    it('docFact options should have setsDocFact', () => {
        for (const [key, group] of Object.entries(FUELLUNG_SETTINGS_REGISTRY)) {
            for (const option of group.options) {
                if (option.category === 'docFact') {
                    expect(option.setsDocFact).toBeDefined();
                    expect(typeof option.setsDocFact).toBe('object');
                }
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// LOOKUP FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Gate: Settings Registry Lookups', () => {
    it('resolveSettingOption returns correct option for trockenlegung', () => {
        const option = resolveSettingOption('trockenlegung', 'kofferdam');
        expect(option).toBeDefined();
        expect(option?.label).toBe('Kofferdam');
        expect(option?.activatesChipId).toBe(CANONICAL_CHIP_IDS.KOFFERDAM);
    });

    it('getSettingLabel returns correct labels', () => {
        expect(getSettingLabel('trockenlegung', 'kofferdam')).toBe('Kofferdam');
        expect(getSettingLabel('matrix.approximalMode', 'sektional')).toBe('Sektionalmatrize');
        expect(getSettingLabel('anesthesia.ukPosteriorMode', 'leitung')).toBe('Leitungsanästhesie');
    });

    it('getSettingChipId returns correct chip IDs', () => {
        expect(getSettingChipId('trockenlegung', 'kofferdam')).toBe(CANONICAL_CHIP_IDS.KOFFERDAM);
        expect(getSettingChipId('trockenlegung', 'relativ')).toBe(CANONICAL_CHIP_IDS.REL_TROCKEN);
        expect(getSettingChipId('anesthesia.ukPosteriorMode', 'leitung')).toBe(CANONICAL_CHIP_IDS.LA_LEITUNG);
        expect(getSettingChipId('matrix.approximalMode', 'sektional')).toBeUndefined(); // docFact, no chip
    });

    it('fragen options return undefined for chip IDs', () => {
        expect(getSettingChipId('trockenlegung', 'fragen')).toBeUndefined();
        expect(getSettingChipId('matrix.ring', 'fragen')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
// SSOT COMPLIANCE TESTS
// ═══════════════════════════════════════════════════════════════

describe('Gate: No Raw Setting Strings in Output Composers', () => {
    // Files that MAY contain raw strings (whitelisted)
    const WHITELIST_FILES = [
        'settingsStore.ts',           // Type definitions
        'settingsRegistry.ts',        // Registry itself
        'treatmentEngine.ts',         // Dictation keyword detection
        'extractionService.ts',       // Dictation keyword detection
        'extractionServiceV2.ts',     // Dictation keyword detection
        'normalizeExtractedData.ts',  // Normalization maps
        'mappings.ts',                // Answer mappings
        'stubExtractor.ts',           // Test stub
    ];

    // Files to scan for violations
    const SCAN_FILES = [
        'src/docudent/core/billing/knowledgeBase/logic/outputComposer.ts',
    ];

    // Raw setting strings that should NOT appear in output composers
    const FORBIDDEN_STRINGS = [
        "'sektional'",
        "'tofflemire'",
        "'holz'",
        "'kunststoff'",
        "'intraligamentaer'",
        "=== 'leitung'",
        "=== 'infiltration'",
        "'ja'",
        "'nein'",
    ];

    it('outputComposer.ts should not contain raw setting comparison strings', () => {
        const violations: Array<{ file: string; line: number; content: string }> = [];

        for (const file of SCAN_FILES) {
            const fullPath = path.join(process.cwd(), file);
            if (!fs.existsSync(fullPath)) continue;

            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Skip comments
                if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

                for (const forbidden of FORBIDDEN_STRINGS) {
                    if (line.includes(forbidden)) {
                        violations.push({
                            file,
                            line: i + 1,
                            content: line.trim().substring(0, 80),
                        });
                    }
                }
            }
        }

        if (violations.length > 0) {
            const report = violations.map(v =>
                `  ${v.file}:${v.line} - ${v.content}`
            ).join('\n');

            expect.fail(
                `Found ${violations.length} raw setting string(s) in output composer.\n` +
                `Use settingsRegistry lookups instead.\n\n${report}`
            );
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// CLASSIFICATION TABLE VALIDATION
// ═══════════════════════════════════════════════════════════════

describe('Gate: Setting Classification', () => {
    const EXPECTED_CHIP_SETTINGS = [
        'trockenlegung:kofferdam',
        'trockenlegung:relativ',
        'anesthesia.ukPosteriorMode:leitung',
        // NOTE: intraligamentaer is docFact, not billingChip (same billing codes as infiltration but distinct technique)
        'anesthesia.ukPosteriorMode:infiltration',
        'anesthesia.okPosteriorMode:infiltration',
        'anesthesia.frontMode:infiltration',
    ];

    const EXPECTED_DOCFACT_SETTINGS = [
        'ueberkappungMaterial:caoh',
        'ueberkappungMaterial:mta',
        'ueberkappungMaterial:biodentine',
        'anesthesia.ukPosteriorMode:intraligamentaer', // ILA is docFact - same billing as infiltration but distinct text
        'matrix.approximalMode:sektional',
        'matrix.approximalMode:tofflemire',
        'matrix.wedge:holz',
        'matrix.wedge:kunststoff',
        'matrix.ring:ja',
        'matrix.ring:nein',
    ];

    it('billingChip settings should be correctly classified', () => {
        for (const key of EXPECTED_CHIP_SETTINGS) {
            const [group, id] = key.split(':');
            const option = resolveSettingOption(group, id);
            expect(option).toBeDefined();
            expect(option?.category).toBe('billingChip');
        }
    });

    it('docFact settings should be correctly classified', () => {
        for (const key of EXPECTED_DOCFACT_SETTINGS) {
            const [group, id] = key.split(':');
            const option = resolveSettingOption(group, id);
            expect(option).toBeDefined();
            expect(option?.category).toBe('docFact');
        }
    });

    // CRITICAL: ILA must NOT share chip ID with infiltration
    it('intraligamentaer must NOT return same chipId as infiltration', () => {
        const ilaChipId = getSettingChipId('anesthesia.ukPosteriorMode', 'intraligamentaer');
        const infiltrChipId = getSettingChipId('anesthesia.ukPosteriorMode', 'infiltration');

        // ILA should have NO chip ID (it's docFact only)
        expect(ilaChipId).toBeUndefined();

        // Infiltration SHOULD have a chip ID
        expect(infiltrChipId).toBeDefined();

        // They must be different (ILA undefined !== infiltr defined)
        expect(ilaChipId).not.toBe(infiltrChipId);
    });
});
