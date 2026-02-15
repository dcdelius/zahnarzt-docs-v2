/**
 * Treatment KB JSON Provider
 *
 * Default provider that loads Treatment KBs from unified.json files.
 * Caches loaded KBs and computes stable hashes.
 * 
 * NOTE: Uses the registry loader (static imports) to work in browser (Vite/ESM).
 */

import type { TreatmentKbProvider, TreatmentKbMeta, TreatmentKb } from '../types';
import { computeKbHash } from '../../util';
import { loadUnifiedConfig } from '../../../../core/billing/knowledgeBase/registry/loaders';
import { getActiveKbReleaseId } from '../../release';

// ═══════════════════════════════════════════════════════════════
// CACHED STATE
// ═══════════════════════════════════════════════════════════════

const kbCache: Map<string, TreatmentKb> = new Map();
const metaCache: Map<string, TreatmentKbMeta> = new Map();

function getMetaCacheKey(treatmentId: string, releaseId?: string): string {
    return `${treatmentId}::${releaseId || '__default__'}`;
}

// ═══════════════════════════════════════════════════════════════
// KB LOADER
// ═══════════════════════════════════════════════════════════════

function loadKbFromFile(treatmentId: string): TreatmentKb | null {
    try {
        const kb = loadUnifiedConfig(treatmentId) as unknown as TreatmentKb;
        return kb;
    } catch (error) {
        console.warn(`[TreatmentKbProvider] No KB found for ${treatmentId}`, error);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════

/**
 * JSON-based Treatment KB Provider.
 *
 * Loads from unified.json files and caches in memory.
 */
export const jsonTreatmentKbProvider: TreatmentKbProvider = {
    getTreatmentKb(treatmentId: string): TreatmentKb | null {
        if (kbCache.has(treatmentId)) {
            return kbCache.get(treatmentId)!;
        }

        const kb = loadKbFromFile(treatmentId);
        if (kb) {
            kbCache.set(treatmentId, kb);
        }

        return kb;
    },

    getMeta(treatmentId: string, releaseId?: string): TreatmentKbMeta | null {
        // Ensure KB is loaded first
        if (!kbCache.has(treatmentId)) {
            this.getTreatmentKb(treatmentId);
        }
        const kb = kbCache.get(treatmentId);
        if (!kb) return null;

        const resolvedRelease = releaseId || getActiveKbReleaseId() || kb._meta?.version || 'v1';
        const cacheKey = getMetaCacheKey(treatmentId, resolvedRelease);
        const cached = metaCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const meta: TreatmentKbMeta = {
            treatmentId,
            version: resolvedRelease,
            hash: computeKbHash(kb),
            source: 'json',
        };
        metaCache.set(cacheKey, meta);
        return meta;
    },

    getAllMetas(): TreatmentKbMeta[] {
        return Array.from(metaCache.values());
    },
};

/**
 * Clear cached KBs (for testing).
 */
export function clearTreatmentKbCache(): void {
    kbCache.clear();
    metaCache.clear();
}
