/**
 * M18: Treatment Pack Registry
 *
 * Central registry for all treatment packs.
 * Uses factory functions to avoid import cycles.
 */

import type { TreatmentPack } from './types';
import { createFuellungPack } from './fuellung/pack';
import { createEndoPack } from './endo/pack';
import { createExtractionPack } from './extraction/pack';
import { createExtractionStubPack } from './extraction_stub/pack';
import { createCrownPrepPack } from './crown_prep/pack';

// ═══════════════════════════════════════════════════════════════
// PACK REGISTRY
// ═══════════════════════════════════════════════════════════════

/**
 * All registered treatment packs.
 * Uses factory functions to create packs lazily and avoid import cycles.
 */
export const PACKS = {
    fuellung: createFuellungPack(),
    endo: createEndoPack(),
    extraction: createExtractionPack(),
    crown_prep: createCrownPrepPack(),
    extraction_stub: createExtractionStubPack(), // M48: Stub for UI dry run
} as const;

/**
 * Treatment ID type derived from registered packs.
 */
export type TreatmentId = keyof typeof PACKS;

/**
 * List of all treatment IDs.
 */
export const TREATMENT_IDS: TreatmentId[] = Object.keys(PACKS) as TreatmentId[];

// ═══════════════════════════════════════════════════════════════
// REGISTRY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get a treatment pack by ID.
 * @returns The pack or undefined if not found
 */
export function getPack(id: TreatmentId): TreatmentPack {
    return PACKS[id];
}

/**
 * Check if a pack exists for the given treatment ID.
 */
export function hasPack(id: string): id is TreatmentId {
    return id in PACKS;
}

/**
 * List all registered packs.
 */
export function listPacks(): TreatmentPack[] {
    return Object.values(PACKS);
}

/**
 * Get all pack IDs.
 */
export function listPackIds(): TreatmentId[] {
    return TREATMENT_IDS;
}
