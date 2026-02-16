import type { CombinabilityGolden } from '../types';

export const extractionCombinabilityGoldens: CombinabilityGolden[] = [
    {
        id: 'EXTR_PASS_01',
        description: 'Simple extraction with infiltration anesthesia',
        codes: ['BEMA_40', 'BEMA_41a'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'EXTR_PASS_02',
        description: 'PKV extraction with GOZ extraction and anesthesia',
        codes: ['GOZ_3000', 'GOZ_0090'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'EXTR_BLOCK_01',
        description: 'GOZ 2197 may not be combined with GOZ 2060',
        codes: ['GOZ_2197', 'GOZ_2060'],
        expectedVerdict: 'BLOCK',
        expectedRuleId: 'regel_goz2197_nicht_neben_2060',
    },
];
