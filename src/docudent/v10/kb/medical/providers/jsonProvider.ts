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
const cachedMetaByRelease = new Map<string, MedicalKbMeta>();

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

    getMeta(releaseId?: string): MedicalKbMeta {
        const kb = this.getMedicalKb();
        const resolvedRelease = releaseId || getActiveKbReleaseId() || kb.version || 'v1';
        const cacheKey = resolvedRelease || 'v1';
        const cached = cachedMetaByRelease.get(cacheKey);
        if (cached) {
            return cached;
        }

        const meta: MedicalKbMeta = {
            version: resolvedRelease,
            hash: computeKbHash(kb),
            source: 'json',
        };
        cachedMetaByRelease.set(cacheKey, meta);
        return meta;
    },
};

/**
 * Clear cached KB (for testing).
 */
export function clearMedicalKbCache(): void {
    cachedKb = null;
    cachedMetaByRelease.clear();
}
