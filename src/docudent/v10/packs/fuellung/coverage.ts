/**
 * Fuellung coverage config.
 */

import type { CoverageConfig } from '../types';

/**
 * M24: All billing chips now covered by scenarios.
 * Allowlist reduced from 6 to 0.
 */
export const fuellungCoverageConfig: CoverageConfig = {
    uncoveredBillingChipIds: [
        // M24: All chips now covered! ✅
    ],
};
