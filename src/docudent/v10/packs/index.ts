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
