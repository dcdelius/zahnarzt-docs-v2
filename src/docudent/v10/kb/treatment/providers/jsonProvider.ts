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

            // Also compute and cache meta
            const meta: TreatmentKbMeta = {
                treatmentId,
                version: getActiveKbReleaseId() || kb._meta?.version || 'v1',
                hash: computeKbHash(kb),
                source: 'json',
            };
            metaCache.set(treatmentId, meta);
        }

        return kb;
    },

    getMeta(treatmentId: string): TreatmentKbMeta | null {
        // Ensure KB is loaded first
        if (!kbCache.has(treatmentId)) {
            this.getTreatmentKb(treatmentId);
        }
        return metaCache.get(treatmentId) ?? null;
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
