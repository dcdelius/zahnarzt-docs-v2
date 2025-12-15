/**
 * Registry Module — Re-exports for convenient imports
 */

export {
    KNOWN_TREATMENTS,
    type TreatmentId,
    isKnownTreatment,
    assertKnownTreatment,
    getKnownTreatment,
    getTreatmentCapabilities,
    hasCapability,
    type TreatmentCapabilities,
} from './treatmentRegistry';

export {
    loadUnifiedConfig,
    loadAnswerMapConfig,
    loadQuestionBankConfig,
    loadTemplateConfig,
    loadFindingMapConfig,
    loaders,
    type UnifiedConfig,
    type AnswerMapConfig,
    type QuestionBankConfig,
    type TemplateConfig,
    type FindingMapConfig,
} from './loaders';
