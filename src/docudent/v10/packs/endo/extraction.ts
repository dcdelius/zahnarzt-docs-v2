/**
 * Endo extraction hints.
 */

import type { ExtractionHints } from '../types';

export const endoExtractionHints: ExtractionHints = {
    treatmentKeywords: [
        'wurzel', 'endo', 'kanal', 'trepan', 'aufbereitung',
        'wurzelfüllung', 'guttapercha', 'devital', 'nekros',
    ],
    entityPatterns: {
        tooth: /\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/,
        canals: /\b([1-4])\s*(?:kanal|kanäle|k)\b/i,
    },
};
