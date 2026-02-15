import { describe, it, expect } from 'vitest';

import { listPackIds } from '../../packs';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import { getBundleMetaMap } from '../../procedure/bundleMeta';
import {
    loadUnifiedConfig,
    loadAnswerMapConfig,
    loadQuestionBankConfig,
    loadTemplateConfig,
} from '../../../core/billing/knowledgeBase/registry/loaders';
import { isKnownTreatment } from '../../../core/billing/knowledgeBase/registry/treatmentRegistry';

describe('Gate: treatment pack onboarding contract', () => {
    const treatmentIds = listPackIds().filter(isKnownTreatment);

    it('every registered treatment pack has KB assets + procedure graph + bundle meta', () => {
        expect(treatmentIds.length).toBeGreaterThan(0);

        for (const treatmentId of treatmentIds) {
            const unified = loadUnifiedConfig(treatmentId);
            const answerMap = loadAnswerMapConfig(treatmentId);
            const questionBank = loadQuestionBankConfig(treatmentId);
            const template = loadTemplateConfig(treatmentId);
            const graph = getProcedureGraphForTreatment(treatmentId);
            const bundleMeta = getBundleMetaMap(treatmentId);

            expect(unified?._meta?.id).toBeTruthy();
            expect(unified?.chips?.length).toBeGreaterThan(0);
            expect(answerMap?._meta?.treatmentId).toBe(treatmentId);
            expect(Array.isArray(questionBank?.questions)).toBe(true);
            expect(questionBank?.questions?.length).toBeGreaterThan(0);
            expect(template?._meta?.id).toContain(treatmentId);
            expect(template?.sections?.length).toBeGreaterThan(0);
            expect(graph?.nodes?.length ?? 0).toBeGreaterThan(0);
            expect(bundleMeta.size).toBeGreaterThan(0);
        }
    });
});
