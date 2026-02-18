/**
 * M18: Treatment Packs Module
 *
 * Barrel export for treatment pack system.
 */

// Types
export type { TreatmentPack, CombinabilityGolden, MedicalKbOverlay, ExtractionHints, CoverageConfig } from './types';

// Registry
export { PACKS, TREATMENT_IDS, getPack, hasPack, listPacks, listPackIds } from './registry';
export type { TreatmentId } from './registry';

// Individual packs (for direct access if needed)
export { createFuellungPack } from './fuellung/pack';
export { createEndoPack } from './endo/pack';
export { createExtractionPack } from './extraction/pack';
export { createCrownPrepPack } from './crown_prep/pack';
export { createPzrPack } from './pzr/pack';
export { createUeberkappungPack } from './ueberkappung/pack';
export { createFissurenversiegelungPack } from './fissurenversiegelung/pack';
export { createParodontologiePack } from './parodontologie/pack';
export { createUptPack } from './upt/pack';
export { createKronePack } from './krone/pack';
export { createBrueckePack } from './bruecke/pack';
export { createTeilkronePack } from './teilkrone/pack';
export { createWSRPack } from './wsr/pack';
export { createTraumaPack } from './trauma/pack';
export { createImplantPack } from './implant/pack';
export { createSchienePack } from './schiene/pack';
export { createTeilprothesePack } from './teilprothese/pack';
export { createTotalprothesePack } from './totalprothese/pack';
export { createUntersuchungPack } from './untersuchung/pack';
export { createRoentgenPack } from './roentgen/pack';
