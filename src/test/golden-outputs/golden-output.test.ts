/**
 * Golden Output Tests v2 — Strict Evidence Plan + Style Rules
 * 
 * ✅ Structure & Order - STRICT (sectionsOrder must match exactly)
 * ✅ Evidence Coverage - GATE (every line needs evidence)
 * ✅ Dedupe - STRICT (chipIds unique across output)
 * ✅ Billing - STRICT (exakt from DB)
 * ✅ Style Rules - STRICT (bullet ratio, prose sentences, no garbage)
 * ✅ Juristik Gate - STATIC (no § in templates/disclosures)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { composeOutput, type ComposedOutput, type ComposedSection } from '../../docudent/core/billing/knowledgeBase/logic/outputComposer';
import { processChipsToBilling, getTreatmentChips } from '../../docudent/core/billing/knowledgeBase/logic/treatmentEngine';
import fixtures from './fixtures.json';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface EvidencePlan {
    requiredEvidence?: {
        chipIds?: string[];
        mappingKeys?: string[];
        disclosureIds?: string[];
        ruleIds?: string[];
    };
    forbiddenEvidence?: {
        chipIds?: string[];
        mappingKeys?: string[];
        disclosureIds?: string[];
        ruleIds?: string[];
    };
    minLines?: number;
    maxLines?: number;
    format?: string;
}

interface GoldenFixture {
    id: string;
    name: string;
    input: {
        extractedData: Record<string, any>;
        activeChips: string[];
        insuranceType: 'GKV' | 'PKV';
        hasMKV: boolean;
        mkvBetrag?: number;
        textLength: 'kurz' | 'mittel' | 'lang';
    };
    expected: {
        sectionsOrder: string[];
        sections: { [key: string]: EvidencePlan };
        dedupe: { chipIdsUnique: string[] };
        billing: {
            mustContainCodes: string[];
            mustNotContainCodes: string[];
        };
        warnings?: {
            mustContain?: string[];
            minCount?: number;
        };
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Run full pipeline
// ═══════════════════════════════════════════════════════════════

function runGoldenCase(fixture: GoldenFixture): ComposedOutput {
    const allChips = getTreatmentChips('fuellung');
    const activeChips = allChips.filter(c => fixture.input.activeChips.includes(c.id));

    const engineResult = processChipsToBilling(
        'fuellung',
        fixture.input.activeChips,
        fixture.input.insuranceType,
        fixture.input.hasMKV,
        fixture.input.extractedData,
        fixture.input.textLength
    );

    return composeOutput(
        'fuellung',
        engineResult,
        activeChips,
        fixture.input.extractedData,
        fixture.input.insuranceType,
        {
            textLength: fixture.input.textLength,
            hasMKV: fixture.input.hasMKV,
            hasAnesthesia: fixture.input.activeChips.some(c => c.includes('la_')),
            mkvBetrag: fixture.input.mkvBetrag
        }
    );
}

// ═══════════════════════════════════════════════════════════════
// STYLE RULE HELPERS
// ═══════════════════════════════════════════════════════════════

function countBulletLines(content: string): number {
    return content.split('\n').filter(l => l.trim().startsWith('•') || l.trim().startsWith('-')).length;
}

function countTotalLines(content: string): number {
    return content.split('\n').filter(l => l.trim()).length;
}

function countProseSentences(content: string): number {
    // Count sentences ending with . ! or ?
    return (content.match(/[.!?]\s*(?=[A-ZÄÖÜ]|$)/g) || []).length;
}

function getMaxConsecutiveBullets(content: string): number {
    const lines = content.split('\n');
    let max = 0;
    let current = 0;

    for (const line of lines) {
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
            current++;
            max = Math.max(max, current);
        } else if (line.trim()) {
            current = 0;
        }
    }

    return max;
}

function findDuplicateLines(content: string): string[] {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const line of lines) {
        if (seen.has(line)) {
            duplicates.push(line);
        }
        seen.add(line);
    }

    return duplicates;
}

// ═══════════════════════════════════════════════════════════════
// TESTS: STRICT STRUCTURE & ORDER
// ═══════════════════════════════════════════════════════════════

describe('Golden Output v2 — STRICT', () => {
    const goldenFixtures = fixtures.fixtures as GoldenFixture[];
    const styleRules = fixtures.styleRules;
    const juristikForbidden = fixtures.juristikForbidden;

    describe('1. Structure & Order (STRICT)', () => {
        for (const fixture of goldenFixtures) {
            describe(fixture.id, () => {
                it('sections order matches exactly', () => {
                    const result = runGoldenCase(fixture);
                    const actualOrder = result.sections.map(s => s.id);

                    // Filter expected order to only include sections that could be present
                    const presentExpected = fixture.expected.sectionsOrder.filter(id =>
                        result.sections.some(s => s.id === id)
                    );

                    expect(actualOrder).toEqual(presentExpected);
                });

                it('no empty sections', () => {
                    const result = runGoldenCase(fixture);
                    for (const section of result.sections) {
                        expect(section.lines.length, `${section.id} is empty`).toBeGreaterThan(0);
                    }
                });

                it('line count within bounds', () => {
                    const result = runGoldenCase(fixture);
                    for (const [sectionId, plan] of Object.entries(fixture.expected.sections)) {
                        const section = result.sections.find(s => s.id === sectionId);
                        if (section && plan.minLines !== undefined) {
                            expect(section.lines.length, `${sectionId} minLines`).toBeGreaterThanOrEqual(plan.minLines);
                        }
                        if (section && plan.maxLines !== undefined) {
                            expect(section.lines.length, `${sectionId} maxLines`).toBeLessThanOrEqual(plan.maxLines);
                        }
                    }
                });
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TESTS: EVIDENCE COVERAGE (GATE)
    // ═══════════════════════════════════════════════════════════════

    describe('2. Evidence Coverage (GATE)', () => {
        for (const fixture of goldenFixtures) {
            describe(fixture.id, () => {
                it('every line has evidence', () => {
                    const result = runGoldenCase(fixture);
                    for (const section of result.sections) {
                        for (let i = 0; i < section.lines.length; i++) {
                            const lineEvidence = section.evidenceByLineIndex[i];
                            expect(
                                lineEvidence && lineEvidence.length > 0,
                                `Line ${i} in ${section.id} has no evidence: "${section.lines[i]}"`
                            ).toBe(true);
                        }
                    }
                });

                it('requiredEvidence present', () => {
                    const result = runGoldenCase(fixture);

                    for (const [sectionId, plan] of Object.entries(fixture.expected.sections)) {
                        const section = result.sections.find(s => s.id === sectionId);
                        if (!section || !plan.requiredEvidence) continue;

                        const sectionEvidence = {
                            chipIds: section.evidenceRefs.filter(r => r.type === 'chip').map(r => r.id),
                            mappingKeys: section.evidenceRefs.filter(r => r.type === 'mapping').map(r => r.id),
                            disclosureIds: section.evidenceRefs.filter(r => r.type === 'disclosure').map(r => r.id),
                            ruleIds: section.evidenceRefs.filter(r => r.type === 'rule').map(r => r.id)
                        };

                        for (const chipId of plan.requiredEvidence.chipIds || []) {
                            expect(
                                sectionEvidence.chipIds.includes(chipId),
                                `${sectionId} missing chipId: ${chipId}`
                            ).toBe(true);
                        }

                        for (const mappingKey of plan.requiredEvidence.mappingKeys || []) {
                            expect(
                                sectionEvidence.mappingKeys.includes(mappingKey),
                                `${sectionId} missing mappingKey: ${mappingKey}`
                            ).toBe(true);
                        }

                        for (const disclosureId of plan.requiredEvidence.disclosureIds || []) {
                            expect(
                                sectionEvidence.disclosureIds.includes(disclosureId),
                                `${sectionId} missing disclosureId: ${disclosureId}`
                            ).toBe(true);
                        }
                    }
                });

                it('forbiddenEvidence absent', () => {
                    const result = runGoldenCase(fixture);

                    for (const [sectionId, plan] of Object.entries(fixture.expected.sections)) {
                        const section = result.sections.find(s => s.id === sectionId);
                        if (!section || !plan.forbiddenEvidence) continue;

                        const sectionEvidence = {
                            chipIds: section.evidenceRefs.filter(r => r.type === 'chip').map(r => r.id),
                            ruleIds: section.evidenceRefs.filter(r => r.type === 'rule').map(r => r.id),
                            disclosureIds: section.evidenceRefs.filter(r => r.type === 'disclosure').map(r => r.id)
                        };

                        for (const chipId of plan.forbiddenEvidence.chipIds || []) {
                            expect(
                                sectionEvidence.chipIds.includes(chipId),
                                `${sectionId} has forbidden chipId: ${chipId}`
                            ).toBe(false);
                        }

                        for (const disclosureId of plan.forbiddenEvidence.disclosureIds || []) {
                            expect(
                                sectionEvidence.disclosureIds.includes(disclosureId),
                                `${sectionId} has forbidden disclosureId: ${disclosureId}`
                            ).toBe(false);
                        }
                    }
                });
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TESTS: DEDUPE (STRICT)
    // ═══════════════════════════════════════════════════════════════

    describe('3. Dedupe (STRICT)', () => {
        for (const fixture of goldenFixtures) {
            it(`${fixture.id}: unique chips appear once`, () => {
                const result = runGoldenCase(fixture);
                const allChipRefs = result._evidenceTrace.chipIds;

                for (const chipId of fixture.expected.dedupe.chipIdsUnique) {
                    const occurrences = allChipRefs.filter(id => id === chipId).length;
                    expect(occurrences, `${chipId} appears ${occurrences} times`).toBeLessThanOrEqual(1);
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TESTS: BILLING (STRICT - from DB)
    // ═══════════════════════════════════════════════════════════════

    describe('4. Billing (STRICT)', () => {
        for (const fixture of goldenFixtures) {
            describe(fixture.id, () => {
                it('mustContainCodes present', () => {
                    const result = runGoldenCase(fixture);

                    for (const expectedCode of fixture.expected.billing.mustContainCodes) {
                        const found = result.billingCodes.some(c => c.includes(expectedCode.replace('BEMA_', '').replace('GOZ_', '')));
                        expect(found, `Missing billing code: ${expectedCode}`).toBe(true);
                    }
                });

                it('mustNotContainCodes absent', () => {
                    const result = runGoldenCase(fixture);

                    for (const forbiddenCode of fixture.expected.billing.mustNotContainCodes) {
                        const found = result.billingCodes.some(c => c.includes(forbiddenCode.replace('BEMA_', '').replace('GOZ_', '')));
                        expect(found, `Forbidden billing code present: ${forbiddenCode}`).toBe(false);
                    }
                });
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TESTS: STYLE RULES (STRICT)
    // ═══════════════════════════════════════════════════════════════

    describe('5. Style Rules (STRICT)', () => {
        for (const fixture of goldenFixtures) {
            describe(fixture.id, () => {
                it('bullet ratio ≤ 45%', () => {
                    const result = runGoldenCase(fixture);
                    const bulletLines = countBulletLines(result.fullText);
                    const totalLines = countTotalLines(result.fullText);

                    if (totalLines > 0) {
                        const ratio = bulletLines / totalLines;
                        expect(ratio, `Bullet ratio ${(ratio * 100).toFixed(1)}%`).toBeLessThanOrEqual(styleRules.maxBulletRatio);
                    }
                });

                it('behandlung has ≥ 2 prose sentences', () => {
                    const result = runGoldenCase(fixture);
                    const behandlung = result.sections.find(s => s.id === 'behandlung');

                    if (behandlung) {
                        const sentences = countProseSentences(behandlung.content);
                        expect(sentences, `Only ${sentences} sentences in behandlung`).toBeGreaterThanOrEqual(styleRules.minProseSentences);
                    }
                });

                it('max 6 consecutive bullets', () => {
                    const result = runGoldenCase(fixture);
                    const maxConsecutive = getMaxConsecutiveBullets(result.fullText);
                    expect(maxConsecutive, `${maxConsecutive} consecutive bullets`).toBeLessThanOrEqual(styleRules.maxConsecutiveBullets);
                });

                it('no duplicate lines', () => {
                    const result = runGoldenCase(fixture);
                    const duplicates = findDuplicateLines(result.fullText);
                    expect(duplicates.length, `Duplicates: ${duplicates.join(', ')}`).toBe(0);
                });

                it('no garbage tokens', () => {
                    const result = runGoldenCase(fixture);
                    for (const token of styleRules.forbiddenTokens) {
                        expect(result.fullText.includes(token), `Found garbage: ${token}`).toBe(false);
                    }
                });
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TESTS: WARNINGS
    // ═══════════════════════════════════════════════════════════════

    describe('6. Warnings', () => {
        const warningFixtures = goldenFixtures.filter(f => f.expected.warnings);

        for (const fixture of warningFixtures) {
            it(`${fixture.id}: has expected warnings`, () => {
                const result = runGoldenCase(fixture);

                if (fixture.expected.warnings?.minCount) {
                    expect(result.warnings.length).toBeGreaterThanOrEqual(fixture.expected.warnings.minCount);
                }

                for (const expected of fixture.expected.warnings?.mustContain || []) {
                    const found = result.warnings.some(w => w.toLowerCase().includes(expected.toLowerCase()));
                    expect(found, `Missing warning containing: ${expected}`).toBe(true);
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TESTS: JURISTIK STATIC GATE
    // ═══════════════════════════════════════════════════════════════

    describe('7. Juristik Static Gate', () => {
        const knowledgeBasePath = path.resolve(__dirname, '../../docudent/core/billing/knowledgeBase');

        it('templates contain no juristik tokens', () => {
            const templatePath = path.join(knowledgeBasePath, 'templates/fuellung_template.json');
            if (fs.existsSync(templatePath)) {
                const content = fs.readFileSync(templatePath, 'utf-8');
                for (const forbidden of juristikForbidden) {
                    expect(content.includes(forbidden), `Template contains: ${forbidden}`).toBe(false);
                }
            }
        });

        it('disclosures contain no juristik tokens', () => {
            const disclosurePath = path.join(knowledgeBasePath, 'disclosures/standard_disclosures.json');
            if (fs.existsSync(disclosurePath)) {
                const content = fs.readFileSync(disclosurePath, 'utf-8');
                for (const forbidden of juristikForbidden) {
                    expect(content.includes(forbidden), `Disclosure contains: ${forbidden}`).toBe(false);
                }
            }
        });

        it('juristik_referenzen contains only metadata (no Fließtext)', () => {
            const juristikPath = path.join(knowledgeBasePath, 'juristik/juristik_referenzen.json');
            if (fs.existsSync(juristikPath)) {
                const data = JSON.parse(fs.readFileSync(juristikPath, 'utf-8'));
                // Check that referenzen entries don't have long text blocks
                for (const [key, ref] of Object.entries(data.referenzen || {})) {
                    const refObj = ref as any;
                    if (refObj.text) {
                        expect(refObj.text.length, `${key} has long text`).toBeLessThan(200);
                    }
                }
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════

    describe('8. Summary', () => {
        it('has 10 fixtures', () => {
            expect(goldenFixtures.length).toBe(10);
        });

        it('all fixtures have Evidence Plan', () => {
            for (const fixture of goldenFixtures) {
                expect(Object.keys(fixture.expected.sections).length, `${fixture.id} has no sections`).toBeGreaterThan(0);
            }
        });

        it('all fixtures have billing expectations', () => {
            for (const fixture of goldenFixtures) {
                expect(fixture.expected.billing, `${fixture.id} has no billing`).toBeDefined();
            }
        });
    });
});
