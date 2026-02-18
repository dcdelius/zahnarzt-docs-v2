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
import { createUeberkappungPack } from './ueberkappung/pack';
import { createFissurenversiegelungPack } from './fissurenversiegelung/pack';
import { createParodontologiePack } from './parodontologie/pack';
import { createUptPack } from './upt/pack';
import { createKronePack } from './krone/pack';
import { createBrueckePack } from './bruecke/pack';
import { createTeilkronePack } from './teilkrone/pack';
import { createWSRPack } from './wsr/pack';
import { createTraumaPack } from './trauma/pack';
import { createImplantPack } from './implant/pack';
import { createSchienePack } from './schiene/pack';
import { createTeilprothesePack } from './teilprothese/pack';
import { createTotalprothesePack } from './totalprothese/pack';
import { createPzrPack } from './pzr/pack';
import { createUntersuchungPack } from './untersuchung/pack';
import { createRoentgenPack } from './roentgen/pack';
import { V10_PACK_TREATMENT_IDS } from '@/docudent/contracts/treatments.manifest';

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
    pzr: createPzrPack(),
    crown_prep: createCrownPrepPack(),
    ueberkappung: createUeberkappungPack(),
    fissurenversiegelung: createFissurenversiegelungPack(),
    parodontologie: createParodontologiePack(),
    upt: createUptPack(),
    krone: createKronePack(),
    teilkrone: createTeilkronePack(),
    wsr: createWSRPack(),
    trauma: createTraumaPack(),
    implant: createImplantPack(),
    bruecke: createBrueckePack(),
    schiene: createSchienePack(),
    teilprothese: createTeilprothesePack(),
    totalprothese: createTotalprothesePack(),
    untersuchung: createUntersuchungPack(),
    roentgen: createRoentgenPack(),
    extraction_stub: createExtractionStubPack(), // M48: Stub for UI dry run
} as const;

/**
 * Treatment ID type derived from registered packs.
 */
export type TreatmentId = keyof typeof PACKS;

/**
 * List of all treatment IDs.
 */
export const TREATMENT_IDS: TreatmentId[] = [...V10_PACK_TREATMENT_IDS] as TreatmentId[];

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
    return TREATMENT_IDS.map(id => PACKS[id]);
}

/**
 * Get all pack IDs.
 */
export function listPackIds(): TreatmentId[] {
    return TREATMENT_IDS;
}
