/**
 * Treatment KB Firestore Provider (Stub)
 *
 * Feature-flagged stub for Firestore-based Treatment KB.
 * Falls back to JSON provider if Firestore unavailable.
 */

import type { TreatmentKbProvider, TreatmentKbMeta, TreatmentKb } from '../types';
import { jsonTreatmentKbProvider } from './jsonProvider';
import { getActiveKbReleaseId } from '../../release';

// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG
// ═══════════════════════════════════════════════════════════════

function readFlagValue(key: string): string | null {
    if (typeof window !== 'undefined') {
        const localValue = localStorage?.getItem(key);
        if (localValue !== null) return localValue;
        // @ts-ignore
        const envValue = import.meta?.env?.[key];
        if (typeof envValue === 'string') return envValue;
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || null;
    }
    return null;
}

export function isFirestoreEnabled(): boolean {
    const value = readFlagValue('VITE_KB_FIRESTORE');
    return value === 'true';
}

function getFirestoreTreatmentAllowlist(): string[] | null {
    const value = readFlagValue('VITE_KB_FIRESTORE_TREATMENTS');
    if (!value) return null;
    return value.split(',').map(v => v.trim()).filter(Boolean);
}

function isFirestoreAllowedForTreatment(treatmentId: string): boolean {
    const allowlist = getFirestoreTreatmentAllowlist();
    if (!allowlist) {
        // Default allowlist: only treatments with verified Firestore KB
        return treatmentId === 'fuellung' || treatmentId === 'endo';
    }
    return allowlist.includes(treatmentId);
}

function getFirestoreVersion(): string | null {
    return getActiveKbReleaseId() || readFlagValue('VITE_KB_FIRESTORE_VERSION');
}

type CacheEntry = {
    kb: TreatmentKb;
    meta: TreatmentKbMeta;
};

const firestoreCache = new Map<string, CacheEntry>();
const firestoreLoads = new Map<string, Promise<void>>();
const fallbackLogged = new Set<string>();

function logFallbackOnce(treatmentId: string, reason: string): void {
    const key = `${treatmentId}:${reason}`;
    if (fallbackLogged.has(key)) return;
    fallbackLogged.add(key);
    console.info(`[FirestoreTreatmentKbProvider] Fallback to JSON for ${treatmentId} (${reason}).`);
}

async function loadFromFirestore(treatmentId: string): Promise<void> {
    if (firestoreLoads.has(treatmentId)) {
        await firestoreLoads.get(treatmentId);
        return;
    }

    const loadPromise = (async () => {
        try {
            const [{ db }, firestore] = await Promise.all([
                import('../../../../../firebase'),
                import('firebase/firestore'),
            ]);
            const { doc, getDoc } = firestore;
            const jsonMeta = jsonTreatmentKbProvider.getMeta(treatmentId);
            const version = getFirestoreVersion() || jsonMeta?.version;
            if (!version) {
                logFallbackOnce(treatmentId, 'missing version');
                return;
            }

            const kbDoc = doc(db, 'medical_kb', version, 'treatments', treatmentId);
            const snap = await getDoc(kbDoc);
            if (!snap.exists()) {
                logFallbackOnce(treatmentId, `no doc at medical_kb/${version}/treatments/${treatmentId}`);
                return;
            }

            const data = snap.data() as TreatmentKb;
            if (!data || !data._meta?.id) {
                return;
            }

            const meta: TreatmentKbMeta = {
                treatmentId,
                version: data._meta.version ?? version,
                hash: jsonMeta?.hash ?? '',
                source: 'firestore',
            };

            firestoreCache.set(treatmentId, { kb: data, meta });
        } catch (error) {
            console.warn('[FirestoreTreatmentKbProvider] Failed to load from Firestore; using JSON fallback', error);
            logFallbackOnce(treatmentId, 'load error');
        }
    })();

    firestoreLoads.set(treatmentId, loadPromise);
    await loadPromise;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER STUB
// ═══════════════════════════════════════════════════════════════

/**
 * Firestore-based Treatment KB Provider (STUB).
 *
 * Currently falls back to JSON provider.
 * When Firestore is implemented, will load from:
 * - medical_kb/{activeVersion}/treatments/{treatmentId}
 */
export const firestoreTreatmentKbProvider: TreatmentKbProvider = {
    getTreatmentKb(treatmentId: string): TreatmentKb | null {
        if (!isFirestoreEnabled()) {
            return jsonTreatmentKbProvider.getTreatmentKb(treatmentId);
        }
        if (!isFirestoreAllowedForTreatment(treatmentId)) {
            return jsonTreatmentKbProvider.getTreatmentKb(treatmentId);
        }

        const cached = firestoreCache.get(treatmentId);
        if (cached) {
            return cached.kb;
        }

        // Fire-and-forget load; return JSON fallback for now
        void loadFromFirestore(treatmentId);

        return jsonTreatmentKbProvider.getTreatmentKb(treatmentId);
    },

    getMeta(treatmentId: string): TreatmentKbMeta | null {
        if (isFirestoreEnabled() && !isFirestoreAllowedForTreatment(treatmentId)) {
            const jsonMeta = jsonTreatmentKbProvider.getMeta(treatmentId);
            return jsonMeta ? { ...jsonMeta, source: 'forced' } : null;
        }
        const cached = firestoreCache.get(treatmentId);
        if (cached) {
            return cached.meta;
        }

        const jsonMeta = jsonTreatmentKbProvider.getMeta(treatmentId);
        if (!jsonMeta) return null;

        // M13.1: Mark source as firestore_fallback when flag enabled but using JSON
        if (isFirestoreEnabled()) {
            void loadFromFirestore(treatmentId);
            return {
                ...jsonMeta,
                source: 'firestore_fallback', // Flag enabled but Firestore unavailable
            };
        }

        return jsonMeta;
    },

    getAllMetas(): TreatmentKbMeta[] {
        const jsonMetas = jsonTreatmentKbProvider.getAllMetas();
        return jsonMetas.map(meta => {
            const cached = firestoreCache.get(meta.treatmentId);
            return cached?.meta ?? meta;
        });
    },
};

export async function preloadTreatmentKbFromFirestore(treatmentId: string): Promise<void> {
    if (!isFirestoreEnabled()) return;
    await loadFromFirestore(treatmentId);
}
