/**
 * Fuellung combinability goldens.
 */

import type { CombinabilityGolden } from '../types';

export const fuellungCombinabilityGoldens: CombinabilityGolden[] = [
    {
        id: 'FUELLUNG_PASS_01',
        description: 'Standard GKV filling: 13a/b + Cp',
        codes: ['BEMA_13a', 'BEMA_13b', 'BEMA_Cp'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'FUELLUNG_PASS_02',
        description: 'PKV filling with etching and bonding',
        codes: ['GOZ_2060', 'GOZ_2080', 'GOZ_2100'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'FUELLUNG_PASS_03',
        description: 'Filling with anesthesia',
        codes: ['BEMA_41a', 'BEMA_13a'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'FUELLUNG_BLOCK_01',
        description: 'GOZ 2197 not with GOZ 2060 (adhäsiv inkludiert)',
        codes: ['GOZ_2197', 'GOZ_2060'],
        expectedVerdict: 'BLOCK',
        expectedRuleId: 'regel_goz2197_nicht_neben_2060',
    },
    {
        id: 'FUELLUNG_BLOCK_02',
        description: 'GOZ 2197 not with GOZ 2080',
        codes: ['GOZ_2197', 'GOZ_2080'],
        expectedVerdict: 'BLOCK',
        expectedRuleId: 'regel_goz2197_nicht_neben_2060',
    },
];
