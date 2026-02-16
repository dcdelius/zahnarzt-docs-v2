/**
 * M70: Build Info — Runtime-accessible build metadata
 * 
 * Provides git SHA, build timestamp, and pack registry info.
 * Used by Debug Drawer to verify UI matches test environment.
 */

import { listPackIds } from '../packs';
import { defaultMedicalKbProvider } from '../kb/medical';
import { defaultTreatmentKbProvider } from '../kb/treatment';

// Build-time constants (injected by Vite)
const BUILD_SHA = import.meta.env?.VITE_GIT_SHA ?? 'dev';
const BUILD_TIME = import.meta.env?.VITE_BUILD_TIME ?? new Date().toISOString();
const BUILD_MODE = import.meta.env?.MODE ?? 'development';

export interface BuildInfo {
    gitSha: string;
    buildTime: string;
    buildMode: string;
    packs: string[];
    llmPath: 'gateway-only';
    kb: {
        medical: { version: string; hash: string } | null;
        combinability: { version: string; hash: string } | null;
    };
}

/**
 * Get current build info with KB metadata.
 */
export function getBuildInfo(): BuildInfo {
    const medicalMeta = defaultMedicalKbProvider.getMeta();

    return {
        gitSha: BUILD_SHA,
        buildTime: BUILD_TIME,
        buildMode: BUILD_MODE,
        packs: listPackIds(),
        llmPath: 'gateway-only',
        kb: {
            medical: medicalMeta ? {
                version: medicalMeta.version,
                hash: medicalMeta.hash.slice(0, 12),
            } : null,
            combinability: null, // TODO: Add combinability KB provider meta
        },
    };
}

/**
 * Get treatment-specific KB info.
 */
export function getTreatmentKbInfo(treatmentId: string): { version: string; hash: string } | null {
    const meta = defaultTreatmentKbProvider.getMeta(treatmentId);
    if (!meta) return null;
    return {
        version: meta.version,
        hash: meta.hash.slice(0, 12),
    };
}
