import { describe, expect, it } from 'vitest';

import billingDbJson from '@/docudent/core/billing/billing_db/billing_db.v1.json';
import { normalizeBillingRefId } from '@/docudent/core/billing/billingRefNormalization';
import { hasBillingCatalogEntry } from '@/docudent/v10/billing/billingCatalog';
import { planFromDictation } from '@/docudent/v10/multitreatment/planFromDictation';
import { runV10Bundle } from '@/docudent/v10/pipeline/runV10Bundle';

type BillingDbShape = {
    treatments?: Record<string, {
        billingRefs?: Record<string, { GKV?: string; PKV?: string; MKV?: string; MKV_addon?: string }>;
        surfaceMapping?: Record<string, { GKV?: string; PKV?: string; MKV?: string; MKV_addon?: string }>;
    }>;
};

type PracticeScenario = {
    id: string;
    dictation: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    expectedTreatments: string[];
    answers?: Record<string, unknown>;
};

const PRACTICE_SCENARIOS: PracticeScenario[] = [
    {
        id: 'mt01',
        insuranceType: 'MKV',
        dictation: 'Endo Zahn 36. ViPr negativ, Perkussion negativ. Leitungsanästhesie. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült NaOCl und EDTA. Wurzelfüllung warm vertikal.; Füllung Zahn 26 MOD Komposit. ViPr positiv, Perkussion negativ. Kofferdam. Leitungsanästhesie. Mehrkostenvereinbarung liegt vor.; Extraktion Zahn 28. Infiltrationsanästhesie.',
        expectedTreatments: ['endo', 'fuellung', 'extraction'],
        answers: {
            'surfaces::tooth:26': 'm,o,d',
        },
    },
    {
        id: 'mt02',
        insuranceType: 'MKV',
        dictation: 'Endo Zahn 36. ViPr negativ, Perkussion negativ. Leitungsanästhesie. Kofferdam. Trepanation. 3 Kanäle aufbereitet. Arbeitslänge elektronisch. Gespült NaOCl und EDTA. Wurzelfüllung warm vertikal.; Füllung Zahn 26 MOD Komposit, nur Kasse. ViPr positiv, Perkussion negativ. Kofferdam. Leitungsanästhesie.; Extraktion Zahn 28. Infiltrationsanästhesie.',
        expectedTreatments: ['endo', 'fuellung', 'extraction'],
        answers: {
            'surfaces::tooth:26': 'm,o,d',
        },
    },
    {
        id: 'mt03',
        insuranceType: 'GKV',
        dictation: 'Roentgenaufnahme Zahn 36 erstellt.; Fissurenversiegelung Zahn 16 durchgeführt.',
        expectedTreatments: ['roentgen', 'fissurenversiegelung'],
    },
    {
        id: 'mt04',
        insuranceType: 'GKV',
        dictation: 'Parodontalbehandlung Zahn 36 durchgeführt.; UPT Zahn 36 Grad A.',
        expectedTreatments: ['parodontologie', 'upt'],
    },
    {
        id: 'mt05',
        insuranceType: 'PKV',
        dictation: 'Trauma Zahn 11 mit Schienung.; Roentgenaufnahme Zahn 11 erstellt.',
        expectedTreatments: ['trauma', 'roentgen'],
    },
    {
        id: 'mt06',
        insuranceType: 'PKV',
        dictation: 'Teilkronenversorgung Zahn 16 definitiv.; Brückenversorgung definitiv regio 14-16.',
        expectedTreatments: ['teilkrone', 'bruecke'],
    },
    {
        id: 'mt07',
        insuranceType: 'PKV',
        dictation: 'Implantologische Behandlung regio 36 Insertion.; Schiene eingegliedert Okklusionsschiene.',
        expectedTreatments: ['implant', 'schiene'],
    },
];

function collectBillingDbCodes(db: BillingDbShape): Set<string> {
    const codes = new Set<string>();
    for (const treatment of Object.values(db.treatments ?? {})) {
        for (const branches of Object.values(treatment.billingRefs ?? {})) {
            for (const rawCode of Object.values(branches ?? {})) {
                if (!rawCode) continue;
                codes.add(normalizeBillingRefId(rawCode));
            }
        }
        for (const branches of Object.values(treatment.surfaceMapping ?? {})) {
            for (const rawCode of Object.values(branches ?? {})) {
                if (!rawCode) continue;
                codes.add(normalizeBillingRefId(rawCode));
            }
        }
    }
    return codes;
}

describe('Gate: practice multitreatment readiness', () => {
    const allowedDbCodes = collectBillingDbCodes(billingDbJson as BillingDbShape);

    it('real-world multi dictations converge to coherent output and DB-backed billing', async () => {
        const violations: Array<{ scenarioId: string; issue: string; detail: string }> = [];

        for (const scenario of PRACTICE_SCENARIOS) {
            const segments = planFromDictation({
                dictation: scenario.dictation,
                insuranceType: scenario.insuranceType,
                textLength: 'mittel',
            });

            if (segments.length < scenario.expectedTreatments.length) {
                violations.push({
                    scenarioId: scenario.id,
                    issue: 'segment_count',
                    detail: `expected >=${scenario.expectedTreatments.length}, got ${segments.length}`,
                });
            }

            const segmentTreatmentIds = segments.map(segment => segment.treatmentId);
            for (const expectedId of scenario.expectedTreatments) {
                if (!segmentTreatmentIds.includes(expectedId)) {
                    violations.push({
                        scenarioId: scenario.id,
                        issue: 'missing_treatment',
                        detail: `${expectedId} not found in [${segmentTreatmentIds.join(', ')}]`,
                    });
                }
            }

            const result = await runV10Bundle({
                dictation: scenario.dictation,
                segments,
                globalAnswers: new Map(Object.entries(scenario.answers ?? {})),
            }, {
                autoAnswerAllQuestions: true,
            });

            if (result.state !== 'output') {
                violations.push({
                    scenarioId: scenario.id,
                    issue: 'bundle_state',
                    detail: `expected output, got ${result.state}`,
                });
                continue;
            }

            if (!result.output.fullText || result.output.fullText.trim().length < 40) {
                violations.push({
                    scenarioId: scenario.id,
                    issue: 'fulltext',
                    detail: 'fullText too short/empty',
                });
            }

            if ((result.output.segments ?? []).some(segment => !segment.text || segment.text.trim().length === 0)) {
                violations.push({
                    scenarioId: scenario.id,
                    issue: 'segment_text',
                    detail: 'at least one segment has empty text',
                });
            }

            if (result.meta?.combinability?.verdict === 'BLOCK') {
                violations.push({
                    scenarioId: scenario.id,
                    issue: 'combinability',
                    detail: 'session combinability verdict BLOCK',
                });
            }

            const scopedCodes = result.output.billingCodes ?? [];
            for (const scoped of scopedCodes) {
                if (!scoped.instanceId || scoped.instanceId.trim().length === 0) {
                    violations.push({
                        scenarioId: scenario.id,
                        issue: 'billing_scope_instance',
                        detail: `billing code ${scoped.code} has no instanceId`,
                    });
                }
                const code = normalizeBillingRefId(scoped.code);
                if (!allowedDbCodes.has(code)) {
                    violations.push({
                        scenarioId: scenario.id,
                        issue: 'billing_db_ref',
                        detail: `${code} not found in billing_db.v1 refs`,
                    });
                }
                if (!hasBillingCatalogEntry(code)) {
                    violations.push({
                        scenarioId: scenario.id,
                        issue: 'billing_catalog_ref',
                        detail: `${code} not resolvable in catalog`,
                    });
                }
            }

            for (const chip of result.meta?.provenance?.chips ?? []) {
                if (!chip.emittedByRuleId || chip.emittedByRuleId === 'unknown') {
                    violations.push({
                        scenarioId: scenario.id,
                        issue: 'chip_provenance',
                        detail: `${chip.chipId} has invalid emittedByRuleId`,
                    });
                }
            }
        }

        expect(violations).toEqual([]);
    }, 120_000);
});
