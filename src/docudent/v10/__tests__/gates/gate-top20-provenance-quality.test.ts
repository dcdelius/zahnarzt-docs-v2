import { describe, expect, it } from 'vitest';

import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';
import { TOP20_SMOKE_CASES } from '../helpers/top20SmokeCases';

describe('Gate: top20 provenance quality', () => {
    it('contains no unknown emitters and askbacks carry fact triggers', async () => {
        const violations: Array<{ treatmentId: string; kind: string; detail: string }> = [];

        for (const testCase of TOP20_SMOKE_CASES) {
            const result = await runV10WithAutoAnswers({
                dictation: testCase.dictation,
                treatmentId: testCase.treatmentId,
                insuranceType: testCase.insuranceType,
                textLength: 'mittel',
                answers: new Map(),
            });

            if (result.state !== 'output') continue;
            const provenance = result.meta?.provenance as {
                chips?: Array<{ chipId?: string; emittedByRuleId?: string }>;
                askbacks?: Array<{ askbackId?: string; ruleId?: string; triggeredByFacts?: string[] }>;
            } | undefined;
            if (!provenance) continue;

            for (const chip of provenance.chips ?? []) {
                if (!chip.emittedByRuleId || chip.emittedByRuleId === 'unknown') {
                    violations.push({
                        treatmentId: testCase.treatmentId,
                        kind: 'chip_emitter',
                        detail: `${chip.chipId ?? 'unknown_chip'} -> ${chip.emittedByRuleId ?? 'missing'}`,
                    });
                }
            }

            for (const askback of provenance.askbacks ?? []) {
                if (!askback.ruleId) {
                    violations.push({
                        treatmentId: testCase.treatmentId,
                        kind: 'askback_rule_id',
                        detail: `${askback.askbackId ?? 'unknown_askback'} missing ruleId`,
                    });
                }
                const triggers = askback.triggeredByFacts ?? [];
                if (triggers.length === 0) {
                    violations.push({
                        treatmentId: testCase.treatmentId,
                        kind: 'askback_triggers',
                        detail: `${askback.askbackId ?? 'unknown_askback'} has no triggeredByFacts`,
                    });
                }
            }
        }

        expect(violations).toEqual([]);
    });
});
