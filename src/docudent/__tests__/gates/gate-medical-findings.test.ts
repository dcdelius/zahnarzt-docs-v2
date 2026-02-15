/**
 * Gate Test: Medical Findings
 *
 * Asserts that all medical findings are emitted under the correct ctx conditions.
 * These are deterministic checks that warn/block on clinical contradictions.
 *
 * Tests:
 * 1. fuellung.deep_but_no_capping (warning) - tiefe=tief && cappingPresent!==true
 * 2. fuellung.tiefe_ohne_isolation (warning) - tiefe=tief && kofferdam=null
 * 3. endo.complete_without_canals (error) - endoStep=complete && canalCount=null
 * 4. endo.start_ohne_diagnostik (warning) - endoStep=start && vitality=null && percussion=null
 *
 * INVARIANTS:
 * - No patient data
 * - Deterministic (no randomness, no time-dependency)
 * - Pure function tests
 */

import { describe, it, expect } from 'vitest';
import { processMedical } from '../../core/medical/medicalEngine';
import type { ExtractedDataV2 } from '../../contracts/extraction';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPER: Create extracted data with overrides
// ═══════════════════════════════════════════════════════════════════════════════

function createTestExtraction(overrides: {
    tooth?: string | null;
    surfaces?: string[] | null;
    mentioned?: Partial<{
        tiefe: { value: string | null };
        kofferdam: { value: boolean | null };
        capping: { value: { present: boolean } | null };
        vitality: { value: string | null };
        percussion: { value: string | null };
        endo_step: { value: string | null };
        kanalzahl: { value: number | null };
        obturation: { value: string | null };
        spuelung: { value: string | null };
        medikament: { value: string | null };
        material: { value: string | null };
        anesthesia: { value: string | null };
    }>;
}): ExtractedDataV2 {
    return {
        tooth: { value: overrides.tooth ?? null, confidence: 1, evidence: 'test' },
        surfaces: { value: overrides.surfaces ?? null, confidence: 1, evidence: 'test' },
        costs: { value: null, confidence: 0, evidence: '' },
        mentioned: {
            anesthesia: { value: overrides.mentioned?.anesthesia?.value ?? null, confidence: 1, evidence: 'test' },
            kofferdam: { value: overrides.mentioned?.kofferdam?.value ?? null, confidence: 1, evidence: 'test' },
            tiefe: { value: overrides.mentioned?.tiefe?.value ?? null, confidence: 1, evidence: 'test' },
            vitality: { value: overrides.mentioned?.vitality?.value ?? null, confidence: 1, evidence: 'test' },
            percussion: { value: overrides.mentioned?.percussion?.value ?? null, confidence: 1, evidence: 'test' },
            capping: { value: overrides.mentioned?.capping?.value ?? null, confidence: 1, evidence: 'test' },
            material: { value: overrides.mentioned?.material?.value ?? null, confidence: 1, evidence: 'test' },
            // Endo-specific fields (may not exist in base type but needed for endo ctx)
            endo_step: { value: overrides.mentioned?.endo_step?.value ?? null, confidence: 1, evidence: 'test' },
            kanalzahl: { value: overrides.mentioned?.kanalzahl?.value ?? null, confidence: 1, evidence: 'test' },
            obturation: { value: overrides.mentioned?.obturation?.value ?? null, confidence: 1, evidence: 'test' },
            spuelung: { value: overrides.mentioned?.spuelung?.value ?? null, confidence: 1, evidence: 'test' },
            medikament: { value: overrides.mentioned?.medikament?.value ?? null, confidence: 1, evidence: 'test' },
        } as ExtractedDataV2['mentioned'],
        keywordFlags: {
            saidDeepCavity: false,
            saidSuperficial: false,
            saidFracture: false,
            saidCaries: false,
        },
        raw: { dictation: 'test', normalized: 'test' }
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUELLUNG FINDINGS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Medical Findings - Fuellung', () => {

    it('should emit fuellung.deep_but_no_capping warning when tiefe=tief and cappingPresent=false', () => {
        const extracted = createTestExtraction({
            tooth: '36',
            surfaces: ['mo'],
            mentioned: {
                tiefe: { value: 'tief' },
                capping: { value: { present: false } },
                vitality: { value: 'positive' },
                percussion: { value: 'negative' },
            }
        });

        const result = processMedical('fuellung', extracted);

        const finding = result.findings.find(f => f.id === 'fuellung.deep_but_no_capping');
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe('warning');
    });

    it('should emit fuellung.deep_but_no_capping warning when tiefe=tief and capping=null', () => {
        const extracted = createTestExtraction({
            tooth: '36',
            surfaces: ['mod'],
            mentioned: {
                tiefe: { value: 'tief' },
                capping: { value: null },  // null also triggers warning
                vitality: { value: 'positive' },
                percussion: { value: 'negative' },
            }
        });

        const result = processMedical('fuellung', extracted);

        const finding = result.findings.find(f => f.id === 'fuellung.deep_but_no_capping');
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe('warning');
    });

    it('should NOT emit fuellung.deep_but_no_capping when tiefe=tief and capping=true', () => {
        const extracted = createTestExtraction({
            tooth: '36',
            surfaces: ['mod'],
            mentioned: {
                tiefe: { value: 'tief' },
                capping: { value: { present: true } },  // capping present -> no warning
                vitality: { value: 'positive' },
                percussion: { value: 'negative' },
            }
        });

        const result = processMedical('fuellung', extracted);

        const finding = result.findings.find(f => f.id === 'fuellung.deep_but_no_capping');
        expect(finding).toBeUndefined();
    });

    it('should emit fuellung.tiefe_ohne_isolation warning when tiefe=tief and kofferdam=null', () => {
        const extracted = createTestExtraction({
            tooth: '36',
            surfaces: ['mo'],
            mentioned: {
                tiefe: { value: 'tief' },
                kofferdam: { value: null },  // no isolation documentation
                vitality: { value: 'positive' },
                percussion: { value: 'negative' },
            }
        });

        const result = processMedical('fuellung', extracted);

        const finding = result.findings.find(f => f.id === 'fuellung.tiefe_ohne_isolation');
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe('warning');
    });

    it('should NOT emit fuellung.tiefe_ohne_isolation when tiefe=tief and kofferdam=true', () => {
        const extracted = createTestExtraction({
            tooth: '36',
            surfaces: ['mo'],
            mentioned: {
                tiefe: { value: 'tief' },
                kofferdam: { value: true },  // isolation documented
                vitality: { value: 'positive' },
                percussion: { value: 'negative' },
            }
        });

        const result = processMedical('fuellung', extracted);

        const finding = result.findings.find(f => f.id === 'fuellung.tiefe_ohne_isolation');
        expect(finding).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENDO FINDINGS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Medical Findings - Endo', () => {

    it('should emit endo.complete_without_canals error when endoStep=complete and canalCount=null', () => {
        const extracted = createTestExtraction({
            tooth: '46',
            mentioned: {
                endo_step: { value: 'complete' },
                kanalzahl: { value: null },  // missing canal count for complete endo
                obturation: { value: 'thermoplastisch' },
            }
        });

        const result = processMedical('endo', extracted);

        const finding = result.findings.find(f => f.id === 'endo.complete_without_canals');
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe('error');
    });

    it('should NOT emit endo.complete_without_canals when endoStep=complete and canalCount is present', () => {
        const extracted = createTestExtraction({
            tooth: '46',
            mentioned: {
                endo_step: { value: 'complete' },
                kanalzahl: { value: 3 },  // canal count present
                obturation: { value: 'thermoplastisch' },
            }
        });

        const result = processMedical('endo', extracted);

        const finding = result.findings.find(f => f.id === 'endo.complete_without_canals');
        expect(finding).toBeUndefined();
    });

    it('should emit endo.start_ohne_diagnostik warning when endoStep=start and vitality=null and percussion=null', () => {
        const extracted = createTestExtraction({
            tooth: '46',
            mentioned: {
                endo_step: { value: 'start' },
                vitality: { value: null },    // no vitality test
                percussion: { value: null },  // no percussion test
            }
        });

        const result = processMedical('endo', extracted);

        const finding = result.findings.find(f => f.id === 'endo.start_ohne_diagnostik');
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe('warning');
    });

    it('should NOT emit endo.start_ohne_diagnostik when endoStep=start and vitality is present', () => {
        const extracted = createTestExtraction({
            tooth: '46',
            mentioned: {
                endo_step: { value: 'start' },
                vitality: { value: 'negative' },  // vitality test documented
                percussion: { value: null },
            }
        });

        const result = processMedical('endo', extracted);

        const finding = result.findings.find(f => f.id === 'endo.start_ohne_diagnostik');
        expect(finding).toBeUndefined();
    });

    it('should NOT emit endo.start_ohne_diagnostik when endoStep=start and percussion is present', () => {
        const extracted = createTestExtraction({
            tooth: '46',
            mentioned: {
                endo_step: { value: 'start' },
                vitality: { value: null },
                percussion: { value: 'positive' },  // percussion test documented
            }
        });

        const result = processMedical('endo', extracted);

        const finding = result.findings.find(f => f.id === 'endo.start_ohne_diagnostik');
        expect(finding).toBeUndefined();
    });

    it('should NOT emit endo.start_ohne_diagnostik when endoStep is not start', () => {
        const extracted = createTestExtraction({
            tooth: '46',
            mentioned: {
                endo_step: { value: 'complete' },  // not start
                vitality: { value: null },
                percussion: { value: null },
            }
        });

        const result = processMedical('endo', extracted);

        const finding = result.findings.find(f => f.id === 'endo.start_ohne_diagnostik');
        expect(finding).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-TREATMENT ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('GATE: Medical Findings - Treatment Isolation', () => {

    it('should NOT emit fuellung findings for endo treatment', () => {
        const extracted = createTestExtraction({
            tooth: '46',
            mentioned: {
                tiefe: { value: 'tief' },
                kofferdam: { value: null },
                endo_step: { value: 'start' },
            }
        });

        const result = processMedical('endo', extracted);

        const fuellungFindings = result.findings.filter(f => f.id.startsWith('fuellung.'));
        expect(fuellungFindings.length).toBe(0);
    });

    it('should NOT emit endo findings for fuellung treatment', () => {
        const extracted = createTestExtraction({
            tooth: '36',
            surfaces: ['mo'],
            mentioned: {
                endo_step: { value: 'complete' },
                kanalzahl: { value: null },
                vitality: { value: 'positive' },
                percussion: { value: 'negative' },
            }
        });

        const result = processMedical('fuellung', extracted);

        const endoFindings = result.findings.filter(f => f.id.startsWith('endo.'));
        expect(endoFindings.length).toBe(0);
    });

    it('should have all finding IDs properly namespaced', () => {
        const extracted = createTestExtraction({
            tooth: '36',
            surfaces: ['mo'],
            mentioned: {
                tiefe: { value: 'tief' },
                kofferdam: { value: null },
            }
        });

        const result = processMedical('fuellung', extracted);

        for (const finding of result.findings) {
            expect(finding.id.startsWith('fuellung.')).toBe(true);
        }
    });
});
