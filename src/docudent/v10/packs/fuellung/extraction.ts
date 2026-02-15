/**
 * Fuellung extraction hints.
 */

import type { ExtractionHints } from '../types';

export const fuellungExtractionHints: ExtractionHints = {
    treatmentKeywords: [
        'füllung', 'filling', 'komposit', 'composit', 'kavität',
        'karies', 'caries', 'amalgam', 'kunststoff',
    ],
    entityPatterns: {
        tooth: /\b(1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/,
        surfaces: /\b([MOD]{1,5}|mesial|okklusal|distal|bukkal|lingual)\b/i,
    },
};
