import { describe, it, expect } from 'vitest';

import {
    CORE_BILLING_TREATMENT_IDS,
    V10_KZV_TREATMENT_IDS,
    PREANALYSIS_TREATMENT_IDS_V1,
    CLASSIFIER_TREATMENT_IDS as MANIFEST_CLASSIFIER_TREATMENT_IDS,
    UI_SELECTOR_TREATMENT_IDS,
} from '@/docudent/contracts/treatments.manifest';
import { KNOWN_TREATMENTS as CORE_KNOWN_TREATMENTS } from '@/docudent/core/billing/knowledgeBase/registry/treatmentRegistry';
import { KNOWN_TREATMENTS as V10_KZV_KNOWN_TREATMENTS } from '@/docudent/v10/kzv/registry/treatmentRegistry';
import { PREANALYSIS_TREATMENT_IDS } from '@/docudent/v10/preanalysis/treatmentIntentContract';
import { CLASSIFIER_TREATMENT_IDS } from '@/docudent/v10/multitreatment/classifyTreatment';
import { listPackIds } from '@/docudent/v10/packs';
import { SETTINGS_TREATMENT_IDS } from '@/docudent/v10/settings/settingsTreatmentIds';

describe('Gate: treatment manifest single source', () => {
    it('core billing treatment list is derived from manifest', () => {
        expect([...CORE_KNOWN_TREATMENTS]).toEqual([...CORE_BILLING_TREATMENT_IDS]);
    });

    it('v10 kzv treatment list is derived from manifest', () => {
        expect([...V10_KZV_KNOWN_TREATMENTS]).toEqual([...V10_KZV_TREATMENT_IDS]);
    });

    it('preanalysis allowlist is derived from manifest', () => {
        expect([...PREANALYSIS_TREATMENT_IDS]).toEqual([...PREANALYSIS_TREATMENT_IDS_V1]);
    });

    it('classifier allowlist is derived from manifest', () => {
        expect([...CLASSIFIER_TREATMENT_IDS]).toEqual([...MANIFEST_CLASSIFIER_TREATMENT_IDS]);
    });

    it('ui selector ids must all have registered packs', () => {
        const packIds = new Set(listPackIds());
        const missing = [...UI_SELECTOR_TREATMENT_IDS].filter(id => !packIds.has(id));
        expect(missing).toEqual([]);
    });

    it('settings treatment ids are derived from manifest ui selector ids', () => {
        expect([...SETTINGS_TREATMENT_IDS]).toEqual([...UI_SELECTOR_TREATMENT_IDS]);
    });
});
