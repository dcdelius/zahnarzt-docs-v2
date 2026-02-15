/**
 * Medical KB JSON Provider
 *
 * Default provider that loads Medical KB from medical_kb.v1.json.
 * Caches loaded KB and computes stable hash.
 */

import type { MedicalKbProvider, MedicalKbMeta, MedicalKB } from '../types';
import { computeKbHash } from '../../util';
import { getActiveKbReleaseId } from '../../release';

// Import the KB JSON
import medicalKbJson from '../../../../medical_kb/medical_kb.v1.json';

// ═══════════════════════════════════════════════════════════════
// CACHED STATE
// ═══════════════════════════════════════════════════════════════

let cachedKb: MedicalKB | null = null;
let cachedMeta: MedicalKbMeta | null = null;

// ═══════════════════════════════════════════════════════════════
// PROVIDER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════

/**
 * JSON-based Medical KB Provider.
 *
 * Loads from medical_kb.v1.json and caches in memory.
 */
export const jsonMedicalKbProvider: MedicalKbProvider = {
    getMedicalKb(): MedicalKB {
        if (!cachedKb) {
            cachedKb = medicalKbJson as unknown as MedicalKB;
        }
        return cachedKb;
    },

    getMeta(): MedicalKbMeta {
        if (!cachedMeta) {
            const kb = this.getMedicalKb();
            cachedMeta = {
                version: getActiveKbReleaseId() || kb.version || 'v1',
                hash: computeKbHash(kb),
                source: 'json',
            };
        }
        return cachedMeta;
    },
};

/**
 * Clear cached KB (for testing).
 */
export function clearMedicalKbCache(): void {
    cachedKb = null;
    cachedMeta = null;
}
