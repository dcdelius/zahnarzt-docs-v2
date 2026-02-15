/**
 * V10 Facts — Barrel Export
 */

export type {
    TreatmentFacts,
    CariesDepth,
    YesNoUnknown,
    CappingFact,
    CounselingFact,
    BleedingFact,
    SensitivityFact,
    ExtractedDataLike,
    BuildFactsParams,
} from './types';

export { MEDICAL_QUESTION_IDS } from './types';

export {
    buildFactsFromExtraction,
    detectCariesDepth,
    detectBleeding,
    detectSensitivity,
} from './buildFactsFromExtraction';

export {
    applyAnswersToFacts,
    normalizeYesNo,
    normalizeCariesDepth,
} from './applyAnswersToFacts';
