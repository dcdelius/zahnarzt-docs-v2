/**
 * Gate Test: Medical Engine Source Refs Validation
 *
 * Verifies that every rule fired by the engine has valid source references
 * that can be traced back to sources.v1.yaml.
 */

import { describe, it, expect } from 'vitest';
import { applyMedicalKb } from '../../medical';
import { medicalKb, getRuleById } from '../../../medical_kb';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface SourceAnchor {
    anchorId: string;
    locator: string;
    excerpt: string;
    tags: string[];
}

interface Source {
    id: string;
    anchors: SourceAnchor[];
}

interface SourcesManifest {
    sources: Source[];
}

describe('Gate M6: Medical Engine Source Refs Valid', () => {
    // Load sources.v1.yaml
    const sourcesPath = path.join(process.cwd(), 'docs/medical/sources/sources.v1.yaml');
    let sourcesManifest: SourcesManifest;

    try {
        const sourcesContent = fs.readFileSync(sourcesPath, 'utf-8');
        sourcesManifest = yaml.parse(sourcesContent) as SourcesManifest;
    } catch (error) {
        throw new Error(`Failed to load sources.v1.yaml: ${error}`);
    }

    // Build a set of valid source::anchor combinations
    const validRefs = new Set<string>();
    for (const source of sourcesManifest.sources) {
        for (const anchor of source.anchors) {
            validRefs.add(`${source.id}::${anchor.anchorId}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST: All fired rules have valid sourceRefs
    // ═══════════════════════════════════════════════════════════════

    describe('Fired rules have valid sourceRefs', () => {
        it('profunda capping=yes fires rules with valid sourceRefs', () => {
            const result = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'yes', material: 'MTA' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
            });

            expect(result.trace.firedRules.length).toBeGreaterThan(0);

            for (const ruleId of result.trace.firedRules) {
                const rule = getRuleById(ruleId);
                expect(rule).toBeDefined();

                // Medical rules must have sourceRefs
                if (rule!.tags.includes('medical')) {
                    expect(rule!.sourceRefs.length).toBeGreaterThan(0);

                    for (const ref of rule!.sourceRefs) {
                        const refKey = `${ref.sourceId}::${ref.anchorId}`;
                        expect(validRefs.has(refKey)).toBe(true);
                    }
                }
            }
        });

        it('profunda capping=no fires rules with valid sourceRefs', () => {
            const result = applyMedicalKb({
                facts: {
                    treatmentId: 'fuellung',
                    cariesDepth: 'profunda',
                    capping: { performed: 'no' },
                    counseling: { pulpitisRisk: 'unknown' },
                },
                treatmentId: 'fuellung',
            });

            for (const ruleId of result.trace.firedRules) {
                const rule = getRuleById(ruleId);
                if (rule?.tags.includes('medical')) {
                    for (const ref of rule.sourceRefs) {
                        const refKey = `${ref.sourceId}::${ref.anchorId}`;
                        expect(validRefs.has(refKey)).toBe(true);
                    }
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Chip emission rules have billing sourceRefs
    // ═══════════════════════════════════════════════════════════════

    describe('Chip emission rules have billing sourceRefs', () => {
        it('cp chip rule references BEMA and GOZ sources', () => {
            const rule = getRuleById('rule-ueberkappung-yes-emits-cp');
            expect(rule).toBeDefined();

            const sourceIds = rule!.sourceRefs.map(r => r.sourceId);
            expect(sourceIds).toContain('bema-katalog-2025');
            expect(sourceIds).toContain('goz-kommentar-bundeszahnaerztekammer');
        });

        it('cp_not_required chip rule references clinical guideline', () => {
            const rule = getRuleById('rule-ueberkappung-no-emits-cp-not-required');
            expect(rule).toBeDefined();

            const sourceIds = rule!.sourceRefs.map(r => r.sourceId);
            expect(sourceIds).toContain('dgzmk-2024-konservierende');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: All medical askback definitions have sourceRefs
    // ═══════════════════════════════════════════════════════════════

    describe('Askback definitions have sourceRefs', () => {
        for (const askback of medicalKb.askbacks) {
            it(`askback ${askback.id} has valid sourceRefs`, () => {
                expect(askback.sourceRefs.length).toBeGreaterThan(0);

                for (const ref of askback.sourceRefs) {
                    const refKey = `${ref.sourceId}::${ref.anchorId}`;
                    expect(validRefs.has(refKey)).toBe(true);
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: New bleeding/sensitivity rules have valid sourceRefs
    // ═══════════════════════════════════════════════════════════════

    describe('Extended KB rules have valid sourceRefs', () => {
        it('bleeding/hemostasis rule has valid sourceRef', () => {
            const rule = getRuleById('rule-bleeding-requires-hemostasis-askback');
            expect(rule).toBeDefined();
            expect(rule!.sourceRefs.length).toBeGreaterThan(0);

            for (const ref of rule!.sourceRefs) {
                const refKey = `${ref.sourceId}::${ref.anchorId}`;
                expect(validRefs.has(refKey)).toBe(true);
            }
        });

        it('sensitivity/followup rule has valid sourceRef', () => {
            const rule = getRuleById('rule-sensitivity-reported-requires-followup-askback');
            expect(rule).toBeDefined();
            expect(rule!.sourceRefs.length).toBeGreaterThan(0);

            for (const ref of rule!.sourceRefs) {
                const refKey = `${ref.sourceId}::${ref.anchorId}`;
                expect(validRefs.has(refKey)).toBe(true);
            }
        });
    });
});
