/**
 * Endo combinability goldens.
 */

import type { CombinabilityGolden } from '../types';

export const endoCombinabilityGoldens: CombinabilityGolden[] = [
    // PASS cases - valid endo combinations
    {
        id: 'ENDO_PASS_01',
        description: 'Standard endo: Trep + Aufbereitung + WF',
        codes: ['BEMA_31', 'BEMA_32', 'BEMA_34'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'ENDO_PASS_02',
        description: 'Endo with LA and Kofferdam',
        codes: ['BEMA_41a', 'BEMA_12', 'BEMA_31', 'BEMA_32'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'ENDO_PASS_03',
        description: 'PKV Endo with electronic length measurement',
        codes: ['GOZ_2360', 'GOZ_2400', 'GOZ_2410', 'GOZ_2440'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'ENDO_PASS_04',
        description: 'Endo with med. Einlage',
        codes: ['BEMA_31', 'BEMA_32', 'BEMA_35'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'ENDO_PASS_05',
        description: 'Multi-canal endo (3K)',
        codes: ['BEMA_31', 'BEMA_32', 'BEMA_32', 'BEMA_32', 'BEMA_34', 'BEMA_34', 'BEMA_34'],
        expectedVerdict: 'PASS',
    },
    {
        id: 'ENDO_PASS_06',
        description: 'Endo with X-ray control',
        codes: ['BEMA_31', 'BEMA_32', 'BEMA_34', 'BEMA_Ä925a'],
        expectedVerdict: 'PASS',
    },

    // BLOCK cases - regress-level exclusions
    {
        id: 'ENDO_BLOCK_01',
        description: 'GOZ 2390 not with GOZ 2440 (from truthset)',
        codes: ['GOZ_2390', 'GOZ_2440'],
        expectedVerdict: 'BLOCK',
        expectedRuleId: 'regel_goz2390_nicht_neben_endo',
    },
    {
        id: 'ENDO_BLOCK_02',
        description: 'GOZ 2012 not with GOZ 2410 (from truthset)',
        codes: ['PHANTOM_REMOVED', 'GOZ_2410'],
        expectedVerdict: 'BLOCK',
        expectedRuleId: 'regel_goz2012_nicht_neben_impl_kfo',
    },
    {
        id: 'ENDO_BLOCK_03',
        description: 'GOZ 2197 not with GOZ 2060 (adhäsiv inkludiert)',
        codes: ['GOZ_2197', 'GOZ_2060'],
        expectedVerdict: 'BLOCK',
        expectedRuleId: 'regel_goz2197_nicht_neben_2060',
    },
    {
        id: 'ENDO_BLOCK_04',
        description: 'GOZ 2197 not with GOZ 2080',
        codes: ['GOZ_2197', 'GOZ_2080'],
        expectedVerdict: 'BLOCK',
        expectedRuleId: 'regel_goz2197_nicht_neben_2060',
    },
];
